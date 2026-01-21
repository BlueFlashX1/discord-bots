const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const logger = require('./logger');

// Process cleanup TTL (30 minutes after completion)
const PROCESS_TTL_MS = 30 * 60 * 1000;
// Default process timeout (0 = no timeout)
const DEFAULT_TIMEOUT_MS = 0;

class ProcessManager {
  constructor() {
    this.processes = new Map(); // processId -> { process, message, command, startTime, output, error }
    this.cleanupTimers = new Map(); // processId -> timeoutId
    logger.debug('ProcessManager initialized');
  }

  isAdmin(userId, adminIds) {
    if (!adminIds) {
      logger.debug('Admin check failed: no adminIds provided', { userId });
      return false;
    }
    const adminArray = Array.isArray(adminIds) ? adminIds : adminIds.split(',').map(id => id.trim());
    const isAdmin = adminArray.includes(userId);
    logger.debug('Admin check', { userId, isAdmin, adminCount: adminArray.length });
    return isAdmin;
  }

  generateProcessId() {
    const id = `proc_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    logger.debug('Generated process ID', { processId: id });
    return id;
  }

  scheduleCleanup(processId, ttl = PROCESS_TTL_MS) {
    logger.debug('Scheduling cleanup', { processId, ttlMs: ttl });

    // Clear any existing cleanup timer
    if (this.cleanupTimers.has(processId)) {
      clearTimeout(this.cleanupTimers.get(processId));
      logger.debug('Cleared existing cleanup timer', { processId });
    }

    const timerId = setTimeout(() => {
      logger.debug('Cleanup timer fired', { processId });
      this.removeProcess(processId);
      this.cleanupTimers.delete(processId);
      logger.info('Process cleaned up after TTL', { processId });
    }, ttl);

    this.cleanupTimers.set(processId, timerId);
  }

  cancelCleanup(processId) {
    if (this.cleanupTimers.has(processId)) {
      clearTimeout(this.cleanupTimers.get(processId));
      this.cleanupTimers.delete(processId);
      logger.debug('Cancelled cleanup timer', { processId });
    }
  }

  expandPath(filePath) {
    if (filePath.startsWith('~/')) {
      const expanded = filePath.replace('~', os.homedir());
      logger.debug('Expanded path', { original: filePath, expanded });
      return expanded;
    }
    return filePath;
  }

  async startProcess(commandConfig, message, userId, adminIds) {
    const timer = logger.startTimer('startProcess');

    logger.debug('Starting process', {
      commandId: commandConfig.id,
      command: commandConfig.command,
      directory: commandConfig.directory,
      userId,
      timeout: commandConfig.timeout || 'none'
    });

    if (!this.isAdmin(userId, adminIds)) {
      logger.warn('Non-admin attempted to start process', { userId, commandId: commandConfig.id });
      throw new Error('Only admins can execute commands');
    }

    const processId = this.generateProcessId();
    const directory = this.expandPath(commandConfig.directory);
    const commandParts = commandConfig.command.split(' ');
    const command = commandParts[0];
    const args = commandParts.slice(1);
    const timeoutMs = commandConfig.timeout || DEFAULT_TIMEOUT_MS;

    logger.debug('Process configuration', {
      processId,
      command,
      args,
      directory,
      timeoutMs
    });

    const processData = {
      process: null,
      message,
      command: commandConfig,
      startTime: Date.now(),
      output: [],
      fullOutput: [],
      error: [],
      fullError: [],
      processId,
      status: 'starting',
      timeoutId: null,
    };

    try {
      logger.debug('Spawning child process', { processId, command, args, cwd: directory });

      const childProcess = spawn(command, args, {
        cwd: directory,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      processData.process = childProcess;
      processData.status = 'running';
      this.processes.set(processId, processData);

      logger.debug('Child process spawned', { processId, pid: childProcess.pid });

      // Set up process timeout if configured
      if (timeoutMs > 0) {
        logger.debug('Setting up process timeout', { processId, timeoutMs });
        processData.timeoutId = setTimeout(() => {
          if (processData.status === 'running') {
            logger.warn('Process timeout triggered', { processId, timeoutMs });
            processData.status = 'timeout';
            processData.error.push(`Process timed out after ${timeoutMs / 1000}s`);
            processData.fullError.push(`Process timed out after ${timeoutMs / 1000}s`);
            processData.endTime = Date.now();
            childProcess.kill('SIGTERM');
            logger.info('Process timed out and killed', { processId, timeout: timeoutMs });
          }
        }, timeoutMs);
      }

      // Capture stdout
      childProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        processData.fullOutput.push(...lines);
        processData.output.push(...lines);
        logger.debug('stdout received', { processId, lineCount: lines.length, totalLines: processData.fullOutput.length });
        // Keep only last 50 lines for display
        if (processData.output.length > 50) {
          processData.output = processData.output.slice(-50);
        }
        // Keep only last 500 lines for full output
        if (processData.fullOutput.length > 500) {
          processData.fullOutput = processData.fullOutput.slice(-500);
        }
      });

      // Capture stderr
      childProcess.stderr.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        processData.fullError.push(...lines);
        processData.error.push(...lines);
        logger.debug('stderr received', { processId, lineCount: lines.length, totalLines: processData.fullError.length });
        // Keep only last 50 lines for display
        if (processData.error.length > 50) {
          processData.error = processData.error.slice(-50);
        }
        // Keep only last 500 lines for full error
        if (processData.fullError.length > 500) {
          processData.fullError = processData.fullError.slice(-500);
        }
      });

      // Handle process exit
      childProcess.on('exit', (code, signal) => {
        const duration = Date.now() - processData.startTime;
        logger.debug('Process exited', { processId, code, signal, durationMs: duration });

        // Clear timeout if set
        if (processData.timeoutId) {
          clearTimeout(processData.timeoutId);
          processData.timeoutId = null;
          logger.debug('Cleared timeout on exit', { processId });
        }
        // Don't override timeout status
        if (processData.status !== 'timeout') {
          processData.status = code === 0 ? 'completed' : 'error';
        }
        processData.exitCode = code;
        processData.signal = signal;
        processData.endTime = Date.now();

        logger.info('Process finished', {
          processId,
          status: processData.status,
          exitCode: code,
          signal,
          durationMs: duration,
          outputLines: processData.fullOutput.length,
          errorLines: processData.fullError.length
        });
      });

      // Handle process error
      childProcess.on('error', (error) => {
        logger.error('Process spawn error', { processId, error: error.message });
        if (processData.timeoutId) {
          clearTimeout(processData.timeoutId);
          processData.timeoutId = null;
        }
        processData.status = 'error';
        processData.error.push(error.message);
        processData.fullError.push(error.message);
        processData.endTime = Date.now();
        logger.logError(error, { processId, command: commandConfig.id });
      });

      timer.end({ processId, commandId: commandConfig.id });
      return processId;
    } catch (error) {
      logger.logError(error, { processId, command: commandConfig.id, phase: 'spawn' });
      throw error;
    }
  }

  stopProcess(processId, userId, adminIds) {
    logger.debug('Stop process requested', { processId, userId });

    if (!this.isAdmin(userId, adminIds)) {
      logger.warn('Non-admin attempted to stop process', { userId, processId });
      throw new Error('Only admins can stop processes');
    }

    const processData = this.processes.get(processId);
    if (!processData) {
      logger.warn('Stop requested for non-existent process', { processId });
      throw new Error('Process not found');
    }

    if (processData.status !== 'running') {
      logger.warn('Stop requested for non-running process', { processId, status: processData.status });
      throw new Error('Process is not running');
    }

    try {
      const pid = processData.process.pid;
      logger.debug('Sending SIGTERM to process', { processId, pid });
      processData.process.kill('SIGTERM');
      processData.status = 'stopped';
      processData.endTime = Date.now();

      // SIGKILL fallback after 3 seconds if process doesn't terminate
      setTimeout(() => {
        try {
          // Check if process is still running by sending signal 0
          process.kill(pid, 0);
          // If we get here, process is still alive - send SIGKILL
          logger.warn('Process did not respond to SIGTERM, sending SIGKILL', { processId, pid });
          processData.process.kill('SIGKILL');
          logger.info('SIGKILL sent to process', { processId, pid });
        } catch (e) {
          // Error means process already terminated (ESRCH) - this is expected
          logger.debug('Process already terminated after SIGTERM', { processId, pid });
        }
      }, 3000);

      const duration = processData.endTime - processData.startTime;
      logger.info('Process stopped', { processId, durationMs: duration, userId });
      return true;
    } catch (error) {
      logger.logError(error, { processId, action: 'stop' });
      throw error;
    }
  }

  getProcess(processId) {
    const process = this.processes.get(processId);
    logger.debug('getProcess', { processId, found: !!process });
    return process;
  }

  getAllProcesses() {
    const processes = Array.from(this.processes.values());
    logger.debug('getAllProcesses', { count: processes.length });
    return processes;
  }

  removeProcess(processId) {
    const existed = this.processes.has(processId);
    this.processes.delete(processId);
    logger.debug('removeProcess', { processId, existed });
  }
}

module.exports = new ProcessManager();
