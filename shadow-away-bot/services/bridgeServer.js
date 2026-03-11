const http = require('http');
const crypto = require('crypto');

function parseBoolean(value) {
  return String(value || '').toLowerCase() === 'true';
}

function parseCsvSet(value) {
  if (!value) return new Set();
  return new Set(
    String(value)
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
  );
}

function normalizeIp(rawAddress) {
  const address = String(rawAddress || '').trim();
  if (!address) return '';
  if (address === '::1') return '127.0.0.1';
  if (address.startsWith('::ffff:')) return address.slice(7);
  return address;
}

function normalizeBridgePath(rawPath) {
  const value = String(rawPath || '').trim();
  if (!value) return '/shadowaway/bridge';
  return value.startsWith('/') ? value : `/${value}`;
}

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function resolveCorsOrigin(origin, allowedOrigins, allowAnyOrigin) {
  if (!origin) return '*';
  if (allowAnyOrigin) return origin;
  if (allowedOrigins.has(origin)) return origin;
  return null;
}

function setCorsHeaders(res, corsOrigin) {
  if (!corsOrigin) return;
  res.setHeader('access-control-allow-origin', corsOrigin);
  res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
  res.setHeader('access-control-max-age', '600');
  res.setHeader('vary', 'Origin');
}

function readJson(req, maxBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let chunks = '';

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('payload_too_large'));
        req.destroy();
        return;
      }
      chunks += chunk;
    });

    req.on('end', () => {
      try {
        resolve(chunks ? JSON.parse(chunks) : {});
      } catch (error) {
        reject(new Error('invalid_json_payload'));
      }
    });

    req.on('error', reject);
  });
}

function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = Buffer.from(a, 'hex');
  const bBuf = Buffer.from(b, 'hex');
  if (aBuf.length === 0 || bBuf.length === 0 || aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function buildBridgeServer({ logger, service }) {
  const enabled = parseBoolean(process.env.SHADOWAWAY_BRIDGE_ENABLED);
  const port = Number(process.env.SHADOWAWAY_BRIDGE_PORT || 8787);
  const host = String(process.env.SHADOWAWAY_BRIDGE_HOST || '127.0.0.1').trim() || '127.0.0.1';
  const path = normalizeBridgePath(process.env.SHADOWAWAY_BRIDGE_PATH || '/shadowaway/bridge');
  const secret = process.env.SHADOWAWAY_BRIDGE_SECRET || '';
  const maxDriftMs = clampInt(process.env.SHADOWAWAY_BRIDGE_MAX_DRIFT_MS, 1000, 3600000, 300000);
  const allowedOrigins = parseCsvSet(process.env.SHADOWAWAY_BRIDGE_ALLOWED_ORIGINS || 'https://discord.com,https://ptb.discord.com,https://canary.discord.com');
  const allowAnyOrigin = allowedOrigins.has('*');
  const trustedIps = parseCsvSet(process.env.SHADOWAWAY_BRIDGE_TRUSTED_IPS || '');

  if (!enabled) {
    logger.info('Shadow-away bridge disabled by env', { event: 'shadowaway_bridge_disabled' });
    return null;
  }

  if (!secret) {
    logger.warn('Shadow-away bridge enabled but secret is missing; bridge will not start', {
      event: 'shadowaway_bridge_missing_secret',
    });
    return null;
  }

  const server = http.createServer(async (req, res) => {
    const remoteIp = normalizeIp(req.socket?.remoteAddress);
    if (trustedIps.size > 0 && !trustedIps.has(remoteIp)) {
      res.writeHead(403, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'ip_not_allowed' }));
      return;
    }

    const origin = req.headers?.origin || '';
    const corsOrigin = resolveCorsOrigin(origin, allowedOrigins, allowAnyOrigin);
    if (origin && !corsOrigin) {
      res.writeHead(403, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'origin_not_allowed' }));
      return;
    }
    setCorsHeaders(res, corsOrigin);

    if (req.method === 'OPTIONS' && req.url === path) {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method !== 'POST' || req.url !== path) {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'not_found' }));
      return;
    }

    try {
      const body = await readJson(req);
      const timestampMs = Number(body.timestampMs);
      const nonce = String(body.nonce || '');
      const signature = String(body.signature || '');
      const eventType = String(body.eventType || '');
      const payload = body.payload || {};

      if (!Number.isFinite(timestampMs) || !nonce || !signature || !eventType) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'missing_required_fields' }));
        return;
      }

      const nowMs = Date.now();
      if (Math.abs(nowMs - timestampMs) > maxDriftMs) {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          ok: false,
          error: 'timestamp_out_of_range',
          serverTimeMs: nowMs,
          maxDriftMs,
        }));
        return;
      }

      const canonicalPayload = JSON.stringify({ eventType, payload });
      const toSign = `${timestampMs}.${nonce}.${canonicalPayload}`;
      const expected = crypto.createHmac('sha256', secret).update(toSign).digest('hex');

      if (!safeEqualHex(signature, expected)) {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'invalid_signature' }));
        return;
      }

      const nonceAccepted = service.rememberNonce(nonce, nowMs);
      if (!nonceAccepted) {
        res.writeHead(409, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'nonce_replay_detected' }));
        return;
      }

      const outcome = await service.handleBridgeEvent({ eventType, payload });
      if (!outcome.ok) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: outcome.reason || 'event_rejected' }));
        return;
      }

      logger.info('Shadow-away bridge event accepted', {
        event: 'shadowaway_bridge_event_accepted',
        bridgeEventType: eventType,
      });

      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, result: outcome }));
    } catch (error) {
      logger.error('Shadow-away bridge request failed', error, {
        event: 'shadowaway_bridge_request_failed',
      });
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'bridge_internal_error' }));
    }
  });

  server.listen(port, host, () => {
    logger.info('Shadow-away bridge server started', {
      event: 'shadowaway_bridge_started',
      host,
      port,
      path,
      allowAnyOrigin,
      allowedOriginCount: allowAnyOrigin ? 1 : allowedOrigins.size,
      trustedIpCount: trustedIps.size,
    });
  });

  return server;
}

module.exports = {
  buildBridgeServer,
};
