#!/usr/bin/env node
/**
 * Automated Bot Generator - Creates Hangman and Grammar bots from templates
 */

const fs = require('fs');
const path = require('path');

console.log('🤖 Generating Hangman and Grammar Teacher bots...\n');

// Bot configurations
const bots = {
  'hangman-bot': {
    name: 'Hangman Bot',
    description: 'Multiplayer Hangman Discord bot with shop system',
    port: 3001
  },
  'grammar-bot': {
    name: 'Grammar Teacher Bot', 
    description: 'AI-powered grammar checking bot with gamification',
    port: 3002
  }
};

// Generate each bot
Object.entries(bots).forEach(([botDir, config]) => {
  console.log(`\n📦 Setting up ${config.name}...`);
  
  // Ensure directories exist
  const dirs = ['commands', 'events', 'utils', 'database/models', 'scripts', 'data', 'logs'];
  dirs.forEach(dir => {
    const dirPath = path.join(__dirname, botDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
  
  console.log(`   ✅ Created directory structure`);
});

console.log('\n✅ Bot structures created!');
console.log('\nNext: Creating individual bot files...');
