#!/usr/bin/env node

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const AUTOMATIONS_DIR = dirname(__dirname);
const OUTPUT_DIR = join(AUTOMATIONS_DIR, 'output');
const JOURNAL_DIR = join(OUTPUT_DIR, 'journal');
const SUMMARIES_DIR = join(JOURNAL_DIR, 'summaries');

// Parse time range arguments
function parseTimeRange(range) {
  const endDate = new Date();
  let startDate;
  
  switch (range) {
    case '1d':
    case 'today':
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      break;
      
    case '3d':
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 3);
      break;
      
    case '7d':
    case 'last_week':
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);
      break;
      
    case '30d':
    case 'last_month':
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);
      break;
      
    case '90d':
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 90);
      break;
      
    default:
      // Try to parse as number of days
      const days = parseInt(range);
      if (!isNaN(days)) {
        startDate = new Date();
        startDate.setDate(endDate.getDate() - days);
      } else {
        return null;
      }
  }
  
  return { startDate, endDate };
}

// Parse month argument (YYYY-MM)
function parseMonth(monthStr) {
  if (!/^\d{4}-\d{2}$/.test(monthStr)) {
    return null;
  }
  
  const [year, month] = monthStr.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Last day of month
  endDate.setHours(23, 59, 59, 999);
  
  return { startDate, endDate };
}

// Parse week argument (YYYY-WXX)
function parseWeek(weekStr) {
  if (!/^\d{4}-W\d{2}$/.test(weekStr)) {
    return null;
  }
  
  const [year, weekNum] = weekStr.split('-W').map(Number);
  
  // Calculate start date of the week
  const firstDayOfYear = new Date(year, 0, 1);
  const daysOffset = (weekNum - 1) * 7 - firstDayOfYear.getDay();
  const startDate = new Date(firstDayOfYear.getTime() + daysOffset * 24 * 60 * 60 * 1000);
  
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);
  
  return { startDate, endDate };
}

// Parse date argument (YYYY-MM-DD)
function parseDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return null;
  }
  
  const startDate = new Date(dateStr + 'T00:00:00.000Z');
  const endDate = new Date(dateStr + 'T23:59:59.999Z');
  
  return { startDate, endDate };
}

// Find the best summary files for a time range
function findBestSummaryFiles(startDate, endDate) {
  const files = [];
  
  // Check for monthly summary first (most efficient)
  if (!existsSync(SUMMARIES_DIR)) {
    return files;
  }
  
  const allFiles = readdirSync(SUMMARIES_DIR).filter(f => f.endsWith('.md'));
  
  // Sort files by priority: monthly > weekly > daily
  const monthlyFiles = allFiles.filter(f => /^\d{4}-\d{2}\.md$/.test(f));
  const weeklyFiles = allFiles.filter(f => /^\d{4}-W\d{2}\.md$/.test(f));
  const dailyFiles = allFiles.filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f));
  
  // Try to use monthly summaries if the range spans a month or more
  const daysInRange = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  
  if (daysInRange >= 25) {
    // Use monthly summaries
    for (const file of monthlyFiles) {
      const [year, month] = file.replace('.md', '').split('-');
      const fileDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      
      if (fileDate >= startDate && fileDate <= endDate) {
        files.push({
          type: 'monthly',
          date: file.replace('.md', ''),
          path: join(SUMMARIES_DIR, file)
        });
      }
    }
  }
  
  // If we couldn't find good monthly coverage, try weekly
  if (files.length === 0 || daysInRange >= 7) {
    for (const file of weeklyFiles) {
      const weekRange = parseWeek(file.replace('.md', ''));
      if (!weekRange) continue;
      
      // Check if this week overlaps with our search range
      if (weekRange.startDate <= endDate && weekRange.endDate >= startDate) {
        files.push({
          type: 'weekly',
          date: file.replace('.md', ''),
          path: join(SUMMARIES_DIR, file)
        });
      }
    }
  }
  
  // Fall back to daily journals if needed
  if (files.length === 0 || daysInRange < 7) {
    // Search for daily journals
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const [year, month] = dateStr.split('-');
      const journalPath = join(JOURNAL_DIR, year, month, `${dateStr}.md`);
      
      if (existsSync(journalPath)) {
        files.push({
          type: 'daily',
          date: dateStr,
          path: journalPath
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  return files.sort((a, b) => a.date.localeCompare(b.date));
}

// Search for files containing specific keywords
function searchByKeyword(query) {
  const results = [];
  
  // Search in summaries first
  if (existsSync(SUMMARIES_DIR)) {
    const summaryFiles = readdirSync(SUMMARIES_DIR).filter(f => f.endsWith('.md'));
    
    for (const file of summaryFiles) {
      const filePath = join(SUMMARIES_DIR, file);
      const content = readFileSync(filePath, 'utf8').toLowerCase();
      
      if (content.includes(query.toLowerCase())) {
        results.push({
          type: file.includes('-W') ? 'weekly' : (file.length === 7 ? 'monthly' : 'daily'),
          date: file.replace('.md', ''),
          path: filePath,
          preview: extractPreview(content, query)
        });
      }
    }
  }
  
  // Search in daily journals if needed
  if (results.length < 5) {
    if (existsSync(JOURNAL_DIR)) {
      const years = readdirSync(JOURNAL_DIR);
      
      for (const year of years) {
        const yearDir = join(JOURNAL_DIR, year);
        if (!yearDir.isDirectory()) continue;
        
        const months = readdirSync(yearDir);
        
        for (const month of months) {
          const monthDir = join(yearDir, month);
          if (!monthDir.isDirectory()) continue;
          
          const dailyFiles = readdirSync(monthDir).filter(f => f.endsWith('.md'));
          
          for (const file of dailyFiles) {
            const filePath = join(monthDir, file);
            const content = readFileSync(filePath, 'utf8').toLowerCase();
            
            if (content.includes(query.toLowerCase())) {
              results.push({
                type: 'daily',
                date: file.replace('.md', ''),
                path: filePath,
                preview: extractPreview(content, query)
              });
            }
          }
        }
      }
    }
  }
  
  return results.sort((a, b) => b.date.localeCompare(a.date)); // Most recent first
}

// Extract preview around matched keyword
function extractPreview(content, query) {
  const queryLower = query.toLowerCase();
  const index = content.indexOf(queryLower);
  
  if (index === -1) return content.substring(0, 200) + '...';
  
  const start = Math.max(0, index - 100);
  const end = Math.min(content.length, index + query.length + 100);
  
  let preview = content.substring(start, end);
  
  if (start > 0) preview = '...' + preview;
  if (end < content.length) preview = preview + '...';
  
  return preview;
}

// Read and concatenate file contents
function readFileContents(files) {
  let combinedContent = '';
  
  for (const file of files) {
    try {
      const content = readFileSync(file.path, 'utf8');
      combinedContent += `\n\n# ${file.type.toUpperCase()} - ${file.date}\n\n`;
      combinedContent += content;
    } catch (error) {
      console.warn(`Error reading ${file.path}: ${error.message}`);
    }
  }
  
  return combinedContent.trim();
}

// Main query function
function queryMemory(query, options = {}) {
  const { range, month, week, date, keyword } = options;
  
  let files = [];
  let queryContext = '';
  
  if (keyword) {
    // Keyword search
    console.log(`Searching for keyword: "${keyword}"`);
    files = searchByKeyword(keyword);
    queryContext = `Search results for "${keyword}":\n\n`;
    
    // Show file list first for keyword searches
    if (files.length > 0) {
      console.log(`\nFound ${files.length} matching files:`);
      files.forEach((file, i) => {
        console.log(`${i + 1}. [${file.type.toUpperCase()}] ${file.date}`);
        if (file.preview) {
          console.log(`   Preview: ${file.preview.substring(0, 150)}...`);
        }
      });
      console.log('');
    } else {
      console.log(`No results found for "${keyword}"`);
      return '';
    }
    
  } else if (range) {
    // Time range query
    const timeRange = parseTimeRange(range);
    if (!timeRange) {
      console.error(`Invalid time range: ${range}`);
      return '';
    }
    
    console.log(`Querying memory from ${timeRange.startDate.toDateString()} to ${timeRange.endDate.toDateString()}`);
    files = findBestSummaryFiles(timeRange.startDate, timeRange.endDate);
    queryContext = `Memory from ${range} (${timeRange.startDate.toDateString()} - ${timeRange.endDate.toDateString()}):\n\n`;
    
  } else if (month) {
    // Month query
    const monthRange = parseMonth(month);
    if (!monthRange) {
      console.error(`Invalid month format: ${month}. Use YYYY-MM`);
      return '';
    }
    
    console.log(`Querying memory for ${month}`);
    files = findBestSummaryFiles(monthRange.startDate, monthRange.endDate);
    queryContext = `Memory for ${month}:\n\n`;
    
  } else if (week) {
    // Week query
    const weekRange = parseWeek(week);
    if (!weekRange) {
      console.error(`Invalid week format: ${week}. Use YYYY-WXX`);
      return '';
    }
    
    console.log(`Querying memory for week ${week}`);
    files = findBestSummaryFiles(weekRange.startDate, weekRange.endDate);
    queryContext = `Memory for week ${week}:\n\n`;
    
  } else if (date) {
    // Date query
    const dateRange = parseDate(date);
    if (!dateRange) {
      console.error(`Invalid date format: ${date}. Use YYYY-MM-DD`);
      return '';
    }
    
    console.log(`Querying memory for ${date}`);
    files = findBestSummaryFiles(dateRange.startDate, dateRange.endDate);
    queryContext = `Memory for ${date}:\n\n`;
    
  } else {
    // Default to last 7 days
    const timeRange = parseTimeRange('7d');
    files = findBestSummaryFiles(timeRange.startDate, timeRange.endDate);
    queryContext = `Memory from last 7 days:\n\n`;
  }
  
  if (files.length === 0) {
    console.log('No relevant memory files found');
    return '';
  }
  
  console.log(`Reading ${files.length} memory files...`);
  
  const content = readFileContents(files);
  
  if (query) {
    return queryContext + content + `\n\nBased on the above memory, please answer: ${query}`;
  } else {
    return queryContext + content;
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let query = '';
  let range = null;
  let month = null;
  let week = null;
  let date = null;
  let keyword = null;
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--query':
        if (i + 1 < args.length) {
          query = args[i + 1];
          i++;
        }
        break;
      case '--range':
        if (i + 1 < args.length) {
          range = args[i + 1];
          i++;
        }
        break;
      case '--month':
        if (i + 1 < args.length) {
          month = args[i + 1];
          i++;
        }
        break;
      case '--week':
        if (i + 1 < args.length) {
          week = args[i + 1];
          i++;
        }
        break;
      case '--date':
        if (i + 1 < args.length) {
          date = args[i + 1];
          i++;
        }
        break;
      case '--keyword':
        if (i + 1 < args.length) {
          keyword = args[i + 1];
          i++;
        }
        break;
      case '--help':
        console.log(`
Memory Query Tool

Usage: node query_memory.js [options]

Options:
  --query "<text>"     Question to answer based on memory
  --range <range>      Time range (1d, 3d, 7d, 30d, 90d, today, last_week, last_month)
  --month <YYYY-MM>    Specific month
  --week <YYYY-WXX>    Specific week
  --date <YYYY-MM-DD>  Specific date
  --keyword "<text>"   Search for keyword in all memory
  --help               Show this help

Examples:
  node query_memory.js --query "What did I work on last week?" --range "7d"
  node query_memory.js --month "2026-01"
  node query_memory.js --keyword "security"
  node query_memory.js --query "Progress on major projects" --range "30d"
        `);
        return;
    }
  }
  
  const result = queryMemory(query, { range, month, week, date, keyword });
  
  if (result) {
    console.log('\n' + '='.repeat(60));
    console.log('MEMORY QUERY RESULTS:');
    console.log('='.repeat(60));
    console.log(result);
  }
}

// Run the script
main().catch(console.error);