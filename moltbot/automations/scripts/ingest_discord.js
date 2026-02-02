#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const AUTOMATIONS_DIR = dirname(__dirname);
const CONFIG_DIR = join(AUTOMATIONS_DIR, 'config');
const DATA_DIR = join(AUTOMATIONS_DIR, 'data');
const RAW_DIR = join(DATA_DIR, 'raw');

// Load configuration
const channelsConfig = JSON.parse(readFileSync(join(CONFIG_DIR, 'channels.json'), 'utf8'));
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!DISCORD_BOT_TOKEN) {
  console.error('DISCORD_BOT_TOKEN environment variable is required');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);

// Ensure directories exist
function ensureDirectory(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

// Load watermarks (last processed message IDs)
function loadWatermarks() {
  const watermarkFile = join(DATA_DIR, channelsConfig.ingestion.watermarkFile);
  if (existsSync(watermarkFile)) {
    return JSON.parse(readFileSync(watermarkFile, 'utf8'));
  }
  return {};
}

// Save watermarks
function saveWatermarks(watermarks) {
  const watermarkFile = join(DATA_DIR, channelsConfig.ingestion.watermarkFile);
  writeFileSync(watermarkFile, JSON.stringify(watermarks, null, 2));
}

// Format message for storage
function formatMessage(message) {
  return {
    id: message.id,
    channelId: message.channel_id,
    author: {
      id: message.author?.id || 'unknown',
      username: message.author?.username || 'unknown',
      displayName: message.author?.global_name || message.author?.username || 'unknown'
    },
    content: message.content || '',
    timestamp: message.timestamp,
    editedTimestamp: message.edited_timestamp,
    attachments: message.attachments || [],
    embeds: message.embeds || [],
    reactions: message.reactions || [],
    type: message.type,
    mentions: message.mentions || []
  };
}

// Get date string from timestamp
function getDateString(timestamp) {
  return new Date(timestamp).toISOString().split('T')[0]; // YYYY-MM-DD
}

// Get ISO week string
function getWeekString(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const week = Math.ceil((((d - new Date(year, 0, 1)) / 86400000) + d.getDay() + 1) / 7);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

// Save messages to appropriate files
function saveMessages(messages, category, channelName) {
  const messagesByDate = {};
  
  // Group messages by date
  messages.forEach(message => {
    const dateStr = getDateString(message.timestamp);
    if (!messagesByDate[dateStr]) {
      messagesByDate[dateStr] = [];
    }
    messagesByDate[dateStr].push(message);
  });
  
  // Save to daily files
  Object.entries(messagesByDate).forEach(([dateStr, dayMessages]) => {
    const categoryDir = join(RAW_DIR, category, channelName);
    ensureDirectory(categoryDir);
    
    const filePath = join(categoryDir, `${dateStr}.jsonl`);
    const existingContent = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
    
    // Append new messages
    const newContent = dayMessages.map(msg => JSON.stringify(msg)).join('\n') + '\n';
    writeFileSync(filePath, existingContent + newContent);
    
    console.log(`Saved ${dayMessages.length} messages to ${filePath}`);
  });
}

// Fetch messages from a channel
async function fetchChannelMessages(channelId, watermark = null) {
  try {
    let url = Routes.channelMessages(channelId);
    if (watermark) {
      url += `?after=${watermark}`;
    }
    
    const messages = await rest.get(url);
    return messages.reverse(); // Process in chronological order
  } catch (error) {
    console.error(`Error fetching messages from channel ${channelId}:`, error);
    return [];
  }
}

// Get channel name
async function getChannelName(channelId) {
  try {
    const channel = await rest.get(Routes.channel(channelId));
    return channel.name || `channel-${channelId}`;
  } catch (error) {
    console.error(`Error getting channel name for ${channelId}:`, error);
    return `channel-${channelId}`;
  }
}

// Main ingestion function
async function ingestDiscord() {
  console.log('Starting Discord data ingestion...');
  
  ensureDirectory(RAW_DIR);
  const watermarks = loadWatermarks();
  const newWatermarks = { ...watermarks };
  
  const enabledChannels = Object.entries(channelsConfig.channels)
    .filter(([_, config]) => config.enabled);
  
  console.log(`Processing ${enabledChannels.length} channels...`);
  
  for (const [channelId, config] of enabledChannels) {
    console.log(`\nProcessing channel: ${config.category} (${channelId})`);
    
    const channelName = await getChannelName(channelId);
    const lastWatermark = watermarks[channelId];
    
    const messages = await fetchChannelMessages(channelId, lastWatermark);
    
    if (messages.length === 0) {
      console.log('No new messages found');
      continue;
    }
    
    // Filter messages by age (don't ingest very old messages)
    const maxAgeTimestamp = Date.now() - (channelsConfig.ingestion.maxAgeDays * 24 * 60 * 60 * 1000);
    const recentMessages = messages.filter(msg => 
      new Date(msg.timestamp).getTime() > maxAgeTimestamp
    );
    
    if (recentMessages.length === 0) {
      console.log('No recent messages (all older than max age)');
      continue;
    }
    
    // Format and save messages
    const formattedMessages = recentMessages.map(formatMessage);
    saveMessages(formattedMessages, config.category, channelName);
    
    // Update watermark to the newest message ID
    newWatermarks[channelId] = recentMessages[recentMessages.length - 1].id;
    
    console.log(`Processed ${recentMessages.length} recent messages`);
    
    // Rate limiting
    if (enabledChannels.indexOf([channelId, config]) < enabledChannels.length - 1) {
      console.log(`Waiting ${channelsConfig.ingestion.rateLimitDelay}ms before next channel...`);
      await new Promise(resolve => setTimeout(resolve, channelsConfig.ingestion.rateLimitDelay));
    }
  }
  
  saveWatermarks(newWatermarks);
  console.log('\nIngestion completed successfully!');
}

// CLI argument handling
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

if (isDryRun) {
  console.log('DRY RUN: Would fetch data but not save files');
  console.log('Configuration loaded successfully');
  console.log(`Enabled channels: ${Object.values(channelsConfig.channels).filter(c => c.enabled).length}`);
  process.exit(0);
}

// Run ingestion
ingestDiscord().catch(console.error);