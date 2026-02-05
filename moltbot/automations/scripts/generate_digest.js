#!/usr/bin/env node

import dotenv from 'dotenv';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { REST, Routes } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
dotenv.config({ path: resolve(__dirname, '../../.env') });

// Import transfer utility
import FileTransfer from '../utils/transfer.js';

const transfer = new FileTransfer();

// Discord REST client for posting
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Discord limits
const EMBED_DESC_LIMIT = 4096;
const EMBED_TITLE_LIMIT = 256;
const EMBEDS_PER_MESSAGE = 10;

const AUTOMATIONS_DIR = dirname(__dirname);
const DATA_DIR = join(AUTOMATIONS_DIR, 'data');
const RAW_DIR = join(DATA_DIR, 'raw');
const OUTPUT_DIR = join(AUTOMATIONS_DIR, 'output');
const DIGESTS_DIR = join(OUTPUT_DIR, 'digests');

// Import AI client
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Helper function to call Anthropic API
async function callAnthropic(messages) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  return await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    messages,
  });
}

// Ensure directory exists
function ensureDirectory(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

// Read all raw data files within the time window
function readRawData(hoursBack) {
  const cutoffTime = Date.now() - hoursBack * 60 * 60 * 1000;
  const data = {};

  if (!existsSync(RAW_DIR)) {
    console.log('No raw data directory found');
    return data;
  }

  const categories = readdirSync(RAW_DIR);

  for (const category of categories) {
    const categoryPath = join(RAW_DIR, category);
    if (!statSync(categoryPath).isDirectory()) continue;

    data[category] = {};

    try {
      const channels = readdirSync(categoryPath);

      for (const channel of channels) {
        const channelPath = join(categoryPath, channel);
        if (!statSync(channelPath).isDirectory()) continue;

        const channelData = [];

        try {
          const files = readdirSync(channelPath).filter((f) => f.endsWith('.jsonl'));

          for (const file of files) {
            const filePath = join(channelPath, file);
            const fileContent = readFileSync(filePath, 'utf8');

            const lines = fileContent.trim().split('\n').filter(Boolean);
            for (const line of lines) {
              try {
                const message = JSON.parse(line);
                const messageTime = new Date(message.timestamp).getTime();

                if (messageTime > cutoffTime) {
                  channelData.push(message);
                }
              } catch (parseError) {
                console.warn(`Failed to parse line in ${filePath}: ${parseError.message}`);
              }
            }
          }
        } catch (error) {
          console.warn(`Error reading channel ${channel}: ${error.message}`);
        }

        if (channelData.length > 0) {
          data[category][channel] = channelData;
        }
      }
    } catch (error) {
      console.warn(`Error reading category ${category}: ${error.message}`);
    }
  }

  return data;
}

// Format data for AI summarization
function formatDataForAI(data) {
  let formatted = '';

  for (const [category, channels] of Object.entries(data)) {
    if (Object.keys(channels).length === 0) continue;

    formatted += `## ${category.toUpperCase()}\n\n`;

    for (const [channel, messages] of Object.entries(channels)) {
      if (messages.length === 0) continue;

      formatted += `### ${channel}\n\n`;

      // Group messages by conversation flow (simplified)
      messages.forEach((message) => {
        const time = new Date(message.timestamp).toLocaleString();
        const author = message.author.displayName || message.author.username;
        formatted += `**${author}** (${time}):\n`;

        if (message.content) {
          formatted += `${message.content}\n`;
        }

        if (message.embeds && message.embeds.length > 0) {
          message.embeds.forEach((embed) => {
            if (embed.title) formatted += `📎 ${embed.title}\n`;
            if (embed.description) formatted += `${embed.description}\n`;
          });
        }

        formatted += '\n';
      });

      formatted += '\n';
    }
  }

  return formatted;
}

// Generate digest using AI
async function generateDigest(data, hours) {
  const formattedData = formatDataForAI(data);

  if (formattedData.trim().length === 0) {
    return `No data found in the last ${hours} hours.`;
  }

  const prompt = `Please create a concise digest of the following Discord activity from the last ${hours} hours.

Focus on:
- Key events and updates
- Important notifications or alerts
- Notable conversations or decisions
- Action items or follow-ups needed

Organize by category and provide the most relevant information. Keep it concise but comprehensive.

DATA TO DIGEST:
${formattedData}`;

  try {
    const response = await callAnthropic([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    return response.content[0].text;
  } catch (error) {
    console.error('Error generating digest:', error);
    return `Failed to generate digest: ${error.message}`;
  }
}

// Save digest to file
async function saveDigest(digest, hours) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `digest_${timestamp}_${hours}h.md`;
  const content = `# Digest - Last ${hours} Hours\n\nGenerated: ${new Date().toLocaleString()}\n\n${digest}`;

  try {
    const savedPath = await transfer.saveAndTransfer(content, filename, 'digests');
    console.log(`Digest saved to: ${savedPath}`);
    return savedPath;
  } catch (error) {
    console.error('Failed to save digest:', error.message);
    throw error;
  }
}

// Split digest into chunks at section boundaries
function splitDigestIntoChunks(digest, maxLength = EMBED_DESC_LIMIT - 100) {
  const chunks = [];
  const sections = digest.split(/(?=^## )/m); // Split at ## headers
  
  let currentChunk = '';
  
  for (const section of sections) {
    // If single section is too long, split by subsections or paragraphs
    if (section.length > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      // Try splitting by ### headers
      const subsections = section.split(/(?=^### )/m);
      for (const subsection of subsections) {
        if (subsection.length > maxLength) {
          // Split by paragraphs as last resort
          const paragraphs = subsection.split(/\n\n+/);
          for (const para of paragraphs) {
            if (currentChunk.length + para.length + 2 > maxLength) {
              if (currentChunk) chunks.push(currentChunk.trim());
              currentChunk = para;
            } else {
              currentChunk += (currentChunk ? '\n\n' : '') + para;
            }
          }
        } else if (currentChunk.length + subsection.length > maxLength) {
          chunks.push(currentChunk.trim());
          currentChunk = subsection;
        } else {
          currentChunk += subsection;
        }
      }
    } else if (currentChunk.length + section.length > maxLength) {
      chunks.push(currentChunk.trim());
      currentChunk = section;
    } else {
      currentChunk += section;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// Extract title from chunk (first header or first line)
function extractChunkTitle(chunk, index, total) {
  const headerMatch = chunk.match(/^#+ (.+)$/m);
  const baseTitle = headerMatch ? headerMatch[1] : `Digest Part ${index + 1}`;
  return total > 1 ? `${baseTitle} (${index + 1}/${total})` : baseTitle;
}

// Post digest to Discord channel
async function postToDiscord(digest, hours, channelId) {
  if (!process.env.DISCORD_TOKEN) {
    throw new Error('DISCORD_TOKEN environment variable is required for posting');
  }
  
  if (!channelId) {
    throw new Error('Channel ID is required for posting. Use --channel <id>');
  }
  
  console.log(`Posting digest to Discord channel ${channelId}...`);
  
  const chunks = splitDigestIntoChunks(digest);
  console.log(`Split into ${chunks.length} embed(s)`);
  
  // Color for embeds (purple theme)
  const embedColor = 0x9B59B6;
  
  // Create embeds for each chunk
  const embeds = chunks.map((chunk, index) => ({
    title: extractChunkTitle(chunk, index, chunks.length).slice(0, EMBED_TITLE_LIMIT),
    description: chunk.slice(0, EMBED_DESC_LIMIT),
    color: embedColor,
    footer: index === chunks.length - 1 ? {
      text: `Generated: ${new Date().toLocaleString()} | Last ${hours} hours`
    } : undefined
  }));
  
  // Discord allows max 10 embeds per message, so batch if needed
  const batches = [];
  for (let i = 0; i < embeds.length; i += EMBEDS_PER_MESSAGE) {
    batches.push(embeds.slice(i, i + EMBEDS_PER_MESSAGE));
  }
  
  let messageCount = 0;
  for (const batch of batches) {
    try {
      await rest.post(Routes.channelMessages(channelId), {
        body: { embeds: batch }
      });
      messageCount++;
      
      // Rate limit protection
      if (batches.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Failed to post message batch ${messageCount + 1}:`, error.message);
      throw error;
    }
  }
  
  console.log(`Successfully posted ${messageCount} message(s) with ${embeds.length} embed(s)`);
  return messageCount;
}

// Main function
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let hours = 6; // default
  let testMode = false;
  let postToChannel = false;
  let channelId = process.env.DIGEST_CHANNEL_ID; // Default from env

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--hours' && i + 1 < args.length) {
      hours = parseInt(args[i + 1]);
    } else if (args[i] === '--test') {
      testMode = true;
    } else if (args[i] === '--post') {
      postToChannel = true;
    } else if (args[i] === '--channel' && i + 1 < args.length) {
      channelId = args[i + 1];
      postToChannel = true; // Implicitly enable posting if channel specified
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Usage: node generate_digest.js [options]

Options:
  --hours <n>      Hours to look back (default: 6)
  --post           Post digest to Discord channel
  --channel <id>   Discord channel ID to post to (enables --post)
  --test           Use mock data for testing
  --help, -h       Show this help message

Environment variables:
  DIGEST_CHANNEL_ID    Default channel for posting digests
  DISCORD_TOKEN        Bot token (required for --post)
  ANTHROPIC_API_KEY    API key for AI summarization
`);
      process.exit(0);
    }
  }

  if (isNaN(hours) || hours <= 0) {
    console.error('Invalid hours value. Use --hours <number>');
    process.exit(1);
  }

  console.log(`Generating digest for the last ${hours} hours...`);

  if (testMode) {
    console.log('TEST MODE: Using mock data');
    // In test mode, create a simple test digest
    const mockDigest = `# Test Digest - Last ${hours} Hours\n\nThis is a test digest generated in test mode.\n\n## Categories\n\n### News\n- Test news item 1\n- Test news item 2\n\n### Development\n- Test commit: Fix bug in authentication\n- Test PR: Merge feature branch\n\nThis digest was generated in test mode and doesn't reflect real data.`;

    const filepath = await saveDigest(mockDigest, hours);
    console.log('\n' + mockDigest);
    console.log(`\nTest digest saved to: ${filepath}`);
    return;
  }

  // Read raw data
  const data = readRawData(hours);

  let totalMessages = 0;
  for (const category of Object.values(data)) {
    for (const messages of Object.values(category)) {
      totalMessages += messages.length;
    }
  }

  console.log(`Found ${totalMessages} messages across ${Object.keys(data).length} categories`);

  if (totalMessages === 0) {
    console.log('No messages found in the specified time range');
    return;
  }

  // Generate digest
  const digest = await generateDigest(data, hours);

  // Save digest
  const filepath = await saveDigest(digest, hours);

  // Output preview to stdout (first 50 lines to avoid buffer truncation)
  console.log('\n' + '='.repeat(50));
  console.log('DIGEST CONTENT (preview - see file for full content):');
  console.log('='.repeat(50));
  const previewLines = digest.split('\n').slice(0, 50).join('\n');
  console.log('\n' + previewLines);
  if (digest.split('\n').length > 50) {
    console.log('\n... [truncated - see saved file for full digest]');
  }

  // Post to Discord if requested
  if (postToChannel) {
    try {
      await postToDiscord(digest, hours, channelId);
      console.log('\nDigest posted to Discord successfully!');
    } catch (error) {
      console.error('\nFailed to post to Discord:', error.message);
      process.exit(1);
    }
  }
}

// Run the script
main().catch(console.error);
