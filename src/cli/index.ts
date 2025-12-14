#!/usr/bin/env node

/**
 * Gemini Deep Research Agent CLI
 * Command-line interface for conducting research using the Gemini Interactions API
 */

import { Command } from 'commander';
import { config } from 'dotenv';
import { researchCommand } from './commands/research.js';
import { uploadCommand } from './commands/upload.js';
import { statusCommand } from './commands/status.js';

// Load environment variables
config();

const program = new Command();

program
  .name('gemini-research')
  .description('Gemini Deep Research Agent - Conduct comprehensive research using AI')
  .version('1.0.0');

// Main research command
program
  .command('research')
  .alias('r')
  .description('Conduct deep research on a topic')
  .argument('<query>', 'Research query or question')
  .option('-d, --depth <level>', 'Research depth: quick, standard, deep, maximum', 'deep')
  .option('-f, --format <format>', 'Output format: summary, detailed, markdown, json', 'markdown')
  .option('-u, --upload <files...>', 'Upload files for context (can specify multiple)')
  .option('--folder <path>', 'Upload all files from a folder')
  .option('-t, --types <extensions>', 'File extensions to include (comma-separated)', 'pdf,txt,md,docx')
  .option('-o, --output <file>', 'Save output to a file')
  .option('-c, --citations', 'Include citations in output', false)
  .option('-s, --sources <type>', 'Source types: web, academic, news, all', 'all')
  .option('--think', 'Refine output with Gemini Deep Think', false)
  .option('--no-progress', 'Disable progress output')
  .action(researchCommand);

// Quick research (shortcut)
program
  .command('quick')
  .alias('q')
  .description('Quick research with minimal depth')
  .argument('<query>', 'Research query')
  .option('-o, --output <file>', 'Save output to a file')
  .action(async (query, options) => {
    await researchCommand(query, { ...options, depth: 'quick', format: 'summary' });
  });

// Deep research (shortcut)
program
  .command('deep')
  .description('Maximum depth research')
  .argument('<query>', 'Research query')
  .option('-u, --upload <files...>', 'Upload files for context')
  .option('--folder <path>', 'Upload all files from a folder')
  .option('-o, --output <file>', 'Save output to a file')
  .action(async (query, options) => {
    await researchCommand(query, { ...options, depth: 'maximum', format: 'markdown', citations: true });
  });

// Upload files command
program
  .command('upload')
  .description('Upload files for analysis')
  .argument('<files...>', 'Files or folders to upload')
  .option('-r, --recursive', 'Recursively scan folders', true)
  .option('-t, --types <extensions>', 'File extensions to include (comma-separated)')
  .option('--max-size <mb>', 'Maximum file size in MB', '10')
  .action(uploadCommand);

// Status command
program
  .command('status')
  .description('Check the status of a research session')
  .argument('[sessionId]', 'Session ID to check (optional)')
  .option('-l, --list', 'List all sessions')
  .action(statusCommand);

// Analyze documents command
program
  .command('analyze')
  .alias('a')
  .description('Analyze documents with a specific query')
  .argument('<query>', 'Analysis query')
  .argument('<files...>', 'Files to analyze')
  .option('-d, --depth <level>', 'Analysis depth', 'deep')
  .option('-o, --output <file>', 'Save output to a file')
  .action(async (query, files, options) => {
    await researchCommand(query, { ...options, upload: files });
  });

// Parse arguments
program.parse();
