#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    max_tokens: 2000,
    messages
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
  const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);
  const data = {};
  
  if (!existsSync(RAW_DIR)) {
    console.log('No raw data directory found');
    return data;
  }
  
  const categories = readdirSync(RAW_DIR);
  
  for (const category of categories) {
    const categoryPath = join(RAW_DIR, category);
    if (!categoryPath.isDirectory()) continue;
    
    data[category] = {};
    
    try {
      const channels = readdirSync(categoryPath);
      
      for (const channel of channels) {
        const channelPath = join(categoryPath, channel);
        if (!channelPath.isDirectory()) continue;
        
        const channelData = [];
        
        try {
          const files = readdirSync(channelPath).filter(f => f.endsWith('.jsonl'));
          
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
      messages.forEach(message => {
        const time = new Date(message.timestamp).toLocaleString();
        const author = message.author.displayName || message.author.username;
        formatted += `**${author}** (${time}):\n`;
        
        if (message.content) {
          formatted += `${message.content}\n`;
        }
        
        if (message.embeds && message.embeds.length > 0) {
          message.embeds.forEach(embed => {
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
        content: prompt
      }
    ]);
    
    return response.content[0].text;
  } catch (error) {
    console.error('Error generating digest:', error);
    return `Failed to generate digest: ${error.message}`;
  }
}

// Save digest to file
function saveDigest(digest, hours) {
  ensureDirectory(DIGESTS_DIR);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `digest_${timestamp}_${hours}h.md`;
  const filepath = join(DIGESTS_DIR, filename);
  
  const content = `# Digest - Last ${hours} Hours\n\nGenerated: ${new Date().toLocaleString()}\n\n${digest}`;
  
  writeFileSync(filepath, content);
  console.log(`Digest saved to: ${filepath}`);
  
  return filepath;
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let hours = 6; // default
  let testMode = false;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--hours' && i + 1 < args.length) {
      hours = parseInt(args[i + 1]);
    } else if (args[i] === '--test') {
      testMode = true;
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
    
    const filepath = saveDigest(mockDigest, hours);
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
  const filepath = saveDigest(digest, hours);
  
  // Output to stdout
  console.log('\n' + '='.repeat(50));
  console.log('DIGEST CONTENT:');
  console.log('='.repeat(50));
  console.log('\n' + digest);
}

// Run the script
main().catch(console.error);