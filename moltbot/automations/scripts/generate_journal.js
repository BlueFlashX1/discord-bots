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
const JOURNAL_DIR = join(OUTPUT_DIR, 'journal');
const SUMMARIES_DIR = join(JOURNAL_DIR, 'summaries');

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
    max_tokens: 3000,
    messages
  });
}

// Ensure directory exists
function ensureDirectory(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

// Get week string from date
function getWeekString(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const week = Math.ceil((((d - new Date(year, 0, 1)) / 86400000) + d.getDay() + 1) / 7);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

// Read all data for a specific date
function readDataForDate(dateStr) {
  const startDate = new Date(dateStr + 'T00:00:00.000Z');
  const endDate = new Date(dateStr + 'T23:59:59.999Z');
  const data = {};
  
  if (!existsSync(RAW_DIR)) {
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
        const targetFile = join(channelPath, `${dateStr}.jsonl`);
        
        if (existsSync(targetFile)) {
          const fileContent = readFileSync(targetFile, 'utf8');
          const lines = fileContent.trim().split('\n').filter(Boolean);
          
          for (const line of lines) {
            try {
              const message = JSON.parse(line);
              const messageTime = new Date(message.timestamp).getTime();
              
              if (messageTime >= startDate.getTime() && messageTime <= endDate.getTime()) {
                channelData.push(message);
              }
            } catch (parseError) {
              console.warn(`Failed to parse line in ${targetFile}: ${parseError.message}`);
            }
          }
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

// Read digest files for a date
function readDigestsForDate(dateStr) {
  const digests = [];
  
  if (!existsSync(DIGESTS_DIR)) {
    return digests;
  }
  
  try {
    const files = readdirSync(DIGESTS_DIR).filter(f => 
      f.includes(dateStr) && f.endsWith('.md')
    );
    
    for (const file of files) {
      const content = readFileSync(join(DIGESTS_DIR, file), 'utf8');
      digests.push({
        file,
        content
      });
    }
  } catch (error) {
    console.warn(`Error reading digests for ${dateStr}: ${error.message}`);
  }
  
  return digests;
}

// Read existing journal file
function readExistingJournal(dateStr) {
  const [year, month] = dateStr.split('-');
  const journalPath = join(JOURNAL_DIR, year, month, `${dateStr}.md`);
  
  if (existsSync(journalPath)) {
    return readFileSync(journalPath, 'utf8');
  }
  
  return null;
}

// Read previous day's journal for comparison
function readPreviousJournal(dateStr) {
  const prevDate = new Date(dateStr);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDateStr = prevDate.toISOString().split('T')[0];
  
  return readExistingJournal(prevDateStr);
}

// Format data for AI processing
function formatJournalData(data, digests, existingJournal, previousJournal) {
  let formatted = '';
  
  // Current data
  if (Object.keys(data).length > 0) {
    formatted += '## TODAY\'S RAW DATA\n\n';
    for (const [category, channels] of Object.entries(data)) {
      if (Object.keys(channels).length === 0) continue;
      
      formatted += `### ${category.toUpperCase()}\n\n`;
      for (const [channel, messages] of Object.entries(channels)) {
        formatted += `#### ${channel}\n\n`;
        messages.forEach(message => {
          const time = new Date(message.timestamp).toLocaleTimeString();
          const author = message.author.displayName || message.author.username;
          formatted += `- **${author}** (${time}): ${message.content || '[No content]'}\n`;
        });
        formatted += '\n';
      }
    }
  }
  
  // Digests
  if (digests.length > 0) {
    formatted += '## TODAY\'S DIGESTS\n\n';
    digests.forEach(digest => {
      formatted += `### ${digest.file}\n\n${digest.content}\n\n`;
    });
  }
  
  // Previous journal (for comparison)
  if (previousJournal) {
    formatted += '## PREVIOUS DAY\'S JOURNAL (for comparison)\n\n';
    formatted += previousJournal + '\n\n';
  }
  
  // Existing journal (to update/extend)
  if (existingJournal) {
    formatted += '## EXISTING JOURNAL ENTRY (to update/extend)\n\n';
    formatted += existingJournal + '\n\n';
  }
  
  return formatted;
}

// Generate journal using AI
async function generateJournal(data, digests, existingJournal, previousJournal, dateStr) {
  const formattedData = formatJournalData(data, digests, existingJournal, previousJournal);
  
  const hasNewData = Object.keys(data).length > 0 || digests.length > 0;
  
  const prompt = `Please create or update a daily journal entry for ${dateStr}.

CONTEXT:
${hasNewData ? formattedData : 'No new data available for this date.'}

INSTRUCTIONS:
1. Create a comprehensive journal entry that synthesizes the day's activities
2. If updating existing journal, integrate new information seamlessly
3. Include these sections:
   - **Key Events & Updates**: Important happenings
   - **Progress & Achievements**: What was accomplished
   - **Learnings & Insights**: New knowledge gained
   - **Challenges & Issues**: Problems encountered
   - **Decisions Made**: Important choices
   - **Action Items**: Tasks to follow up on
4. Add relevant YAML frontmatter with tags for easy searching
5. Keep the tone reflective and personal
6. Focus on synthesis, not just listing
7. If no new data, suggest potential areas to reflect on

${existingJournal ? 'IMPORTANT: This is an UPDATE to an existing journal. Integrate new information while preserving existing insights.' : 'IMPORTANT: This is a NEW journal entry.'}`;

  try {
    const response = await callAnthropic([
      {
        role: 'user',
        content: prompt
      }
    ]);
    
    return response.content[0].text;
  } catch (error) {
    console.error('Error generating journal:', error);
    return `Failed to generate journal: ${error.message}`;
  }
}

// Save journal entry
function saveJournal(content, dateStr) {
  const [year, month] = dateStr.split('-');
  const yearDir = join(JOURNAL_DIR, year);
  const monthDir = join(yearDir, month);
  
  ensureDirectory(monthDir);
  
  const journalPath = join(monthDir, `${dateStr}.md`);
  writeFileSync(journalPath, content);
  
  console.log(`Journal saved to: ${journalPath}`);
  return journalPath;
}

// Generate weekly summary
async function generateWeeklySummary(weekStr) {
  // Get all daily journals for the week
  const journals = [];
  const year = weekStr.split('-W')[0];
  const weekNum = parseInt(weekStr.split('-W')[1]);
  
  // Calculate the start and end dates for this week
  const firstDayOfYear = new Date(year, 0, 1);
  const daysOffset = (weekNum - 1) * 7 - firstDayOfYear.getDay();
  const startDate = new Date(firstDayOfYear.getTime() + daysOffset * 24 * 60 * 60 * 1000);
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    const [y, m] = dateStr.split('-');
    const journalPath = join(JOURNAL_DIR, y, m, `${dateStr}.md`);
    
    if (existsSync(journalPath)) {
      const content = readFileSync(journalPath, 'utf8');
      journals.push({
        date: dateStr,
        content
      });
    }
  }
  
  if (journals.length === 0) {
    console.log(`No journals found for week ${weekStr}`);
    return;
  }
  
  const prompt = `Create a comprehensive weekly summary for week ${weekStr} based on these daily journals:

${journals.map(j => `## ${j.date}\n${j.content}`).join('\n\n')}

Create a structured weekly summary with:
- **Overview**: Key theme of the week
- **Major Accomplishments**: Significant achievements
- **Progress Towards Goals**: How goals advanced
- **Challenges & Solutions**: Problems faced and resolved
- **Key Learnings**: Important insights gained
- **Next Week Priorities**: What to focus on next`;

  try {
    const response = await callAnthropic([
      {
        role: 'user',
        content: prompt
      }
    ]);
    
    const summary = response.content[0].text;
    ensureDirectory(SUMMARIES_DIR);
    
    const summaryPath = join(SUMMARIES_DIR, `${weekStr}.md`);
    const content = `# Weekly Summary - ${weekStr}\n\nGenerated: ${new Date().toLocaleString()}\n\n${summary}`;
    
    writeFileSync(summaryPath, content);
    console.log(`Weekly summary saved to: ${summaryPath}`);
    
  } catch (error) {
    console.error('Error generating weekly summary:', error);
  }
}

// Generate monthly summary
async function generateMonthlySummary(yearMonth) {
  // Get all weekly summaries for the month
  const summaries = [];
  const [year, month] = yearMonth.split('-');
  
  if (existsSync(SUMMARIES_DIR)) {
    const files = readdirSync(SUMMARIES_DIR)
      .filter(f => f.startsWith(year) && f.endsWith('.md'))
      .filter(f => f.includes('-W'));
    
    for (const file of files) {
      const content = readFileSync(join(SUMMARIES_DIR, file), 'utf8');
      summaries.push({
        week: file.replace('.md', ''),
        content
      });
    }
  }
  
  if (summaries.length === 0) {
    console.log(`No weekly summaries found for ${yearMonth}`);
    return;
  }
  
  const prompt = `Create a comprehensive monthly summary for ${yearMonth} based on these weekly summaries:

${summaries.map(s => `## ${s.week}\n${s.content}`).join('\n\n')}

Create a strategic monthly review with:
- **Monthly Theme**: Overall focus area
- **Major Achievements**: Significant wins
- **Goal Progress**: Towards monthly/quarterly objectives
- **Key Projects**: Status and outcomes
- **Challenges Overcome**: Major obstacles resolved
- **Strategic Insights**: High-level learnings
- **Next Month Focus**: Priorities and direction`;

  try {
    const response = await callAnthropic([
      {
        role: 'user',
        content: prompt
      }
    ]);
    
    const summary = response.content[0].text;
    ensureDirectory(SUMMARIES_DIR);
    
    const summaryPath = join(SUMMARIES_DIR, `${yearMonth}.md`);
    const content = `# Monthly Summary - ${yearMonth}\n\nGenerated: ${new Date().toLocaleString()}\n\n${summary}`;
    
    writeFileSync(summaryPath, content);
    console.log(`Monthly summary saved to: ${summaryPath}`);
    
  } catch (error) {
    console.error('Error generating monthly summary:', error);
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let targetDate = new Date().toISOString().split('T')[0]; // today
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--date' && i + 1 < args.length) {
      targetDate = args[i + 1];
    }
  }
  
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    console.error('Invalid date format. Use YYYY-MM-DD');
    process.exit(1);
  }
  
  console.log(`Generating journal for ${targetDate}...`);
  
  // Read data for the date
  const data = readDataForDate(targetDate);
  const digests = readDigestsForDate(targetDate);
  const existingJournal = readExistingJournal(targetDate);
  const previousJournal = readPreviousJournal(targetDate);
  
  let totalMessages = 0;
  for (const category of Object.values(data)) {
    for (const messages of Object.values(category)) {
      totalMessages += messages.length;
    }
  }
  
  console.log(`Found ${totalMessages} messages and ${digests.length} digests`);
  
  // Generate journal
  const journalContent = await generateJournal(data, digests, existingJournal, previousJournal, targetDate);
  
  // Save journal
  const journalPath = saveJournal(journalContent, targetDate);
  
  console.log(`Journal generated and saved to: ${journalPath}`);
  
  // Check if it's Sunday (end of week) for weekly summary
  const targetDateObj = new Date(targetDate);
  if (targetDateObj.getDay() === 0) { // Sunday
    const weekStr = getWeekString(targetDateObj);
    console.log(`\nGenerating weekly summary for ${weekStr}...`);
    await generateWeeklySummary(weekStr);
  }
  
  // Check if it's the 1st of the month for monthly summary
  if (targetDateObj.getDate() === 1) {
    const yearMonth = targetDate.substring(0, 7); // YYYY-MM
    console.log(`\nGenerating monthly summary for ${yearMonth}...`);
    await generateMonthlySummary(yearMonth);
  }
}

// Run the script
main().catch(console.error);