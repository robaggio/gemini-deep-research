/**
 * Research Command
 * Main command for conducting deep research
 */

import * as fs from 'fs';
import * as path from 'path';
import { createDeepResearchAgent, FileManager, loadDocumentsFromFolder } from '../../lib/index.js';
import { ResearchDepth, OutputFormat, SourceType, DocumentInput, ResearchEvent } from '../../lib/types.js';
import { displayResult, displayProgress, displayError, displayInfo, displaySuccess } from '../utils/display.js';

interface ResearchOptions {
  depth: string;
  format: string;
  upload?: string[];
  folder?: string;
  types: string;
  output?: string;
  citations: boolean;
  sources: string;
  progress: boolean;
  think: boolean;
}

export async function researchCommand(query: string, options: ResearchOptions): Promise<void> {
  // Check for API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    displayError('GEMINI_API_KEY environment variable is not set.');
    displayInfo('Set it with: export GEMINI_API_KEY=your-api-key');
    displayInfo('Get your API key at: https://aistudio.google.com/apikey');
    process.exit(1);
  }

  try {
    // Create agent
    const agent = createDeepResearchAgent(apiKey);

    // Load documents if specified
    let documents: DocumentInput[] = [];

    // Load from folder
    if (options.folder) {
      displayInfo(`Scanning folder: ${options.folder}`);
      const extensions = options.types.split(',').map(t => `.${t.trim()}`);
      
      const folderDocs = await loadDocumentsFromFolder(options.folder, {
        extensions,
        recursive: true,
      });
      
      documents.push(...folderDocs);
      displaySuccess(`Loaded ${folderDocs.length} files from folder`);
    }

    // Load individual files
    if (options.upload && options.upload.length > 0) {
      const fileManager = new FileManager();
      
      for (const filePath of options.upload) {
        const absolutePath = path.resolve(filePath);
        
        if (fs.existsSync(absolutePath)) {
          const stats = fs.statSync(absolutePath);
          
          if (stats.isDirectory()) {
            // It's a folder, scan it
            displayInfo(`Scanning directory: ${filePath}`);
            const folderDocs = await loadDocumentsFromFolder(absolutePath);
            documents.push(...folderDocs);
            displaySuccess(`Loaded ${folderDocs.length} files from ${filePath}`);
          } else {
            // It's a file
            const doc = await fileManager.loadFile(absolutePath);
            if (doc) {
              documents.push(doc);
              displayInfo(`Loaded: ${doc.name}`);
            }
          }
        } else {
          displayError(`File not found: ${filePath}`);
        }
      }
    }

    // Display summary
    if (documents.length > 0) {
      displayInfo(`\nTotal documents loaded: ${documents.length}`);
      displayInfo('---');
    }

    displayInfo(`\nStarting research: "${query}"`);
    displayInfo(`Depth: ${options.depth} | Format: ${options.format} | Sources: ${options.sources}`);
    displayInfo('---\n');

    // Conduct research with progress callback
    const result = await agent.research(
      {
        query,
        documents: documents.length > 0 ? documents : undefined,
        options: {
          depth: options.depth as ResearchDepth,
          outputFormat: options.format as OutputFormat,
          sources: options.sources as SourceType,
          includeCitations: options.citations,
          refineWithThinking: options.think,
        },
      },
      options.progress ? createProgressHandler() : undefined
    );

    // Display result
    console.log('\n');
    displayResult(result);

    // Save to file if specified
    if (options.output) {
      const outputPath = path.resolve(options.output);
      let content: string;

      if (options.format === 'json') {
        content = JSON.stringify(result, null, 2);
      } else {
        content = result.content || '';
        
        // Add metadata header
        const header = [
          `# Research: ${result.query}`,
          ``,
          `- **Date**: ${result.createdAt.toISOString()}`,
          `- **Depth**: ${result.metadata?.depth || options.depth}`,
          `- **Processing Time**: ${result.metadata?.processingTime || 0}ms`,
          `- **Sources Found**: ${result.metadata?.sourcesFound || 0}`,
          ``,
          `---`,
          ``,
        ].join('\n');
        
        content = header + content;

        // Add sources if available
        if (result.sources && result.sources.length > 0) {
          content += '\n\n---\n\n## Sources\n\n';
          result.sources.forEach((source, i) => {
            content += `${i + 1}. [${source.title}](${source.url})\n`;
            if (source.snippet) {
              content += `   > ${source.snippet}\n`;
            }
          });
        }
      }

      fs.writeFileSync(outputPath, content);
      displaySuccess(`\nOutput saved to: ${outputPath}`);
    }

    // Close session
    await agent.closeSession();

    // Exit with status based on result
    process.exit(result.status === 'completed' ? 0 : 1);
  } catch (error) {
    displayError(`Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

/**
 * Create progress event handler
 */
function createProgressHandler(): (event: ResearchEvent) => void {
  return (event: ResearchEvent) => {
    switch (event.type) {
      case 'start':
        displayProgress('Research started...');
        break;
      case 'progress':
        if (event.data?.progress) {
          displayProgress(`Progress: ${event.data.progress}%`);
        }
        break;
      case 'content':
        displayProgress('Processing content...');
        break;
      case 'source':
        if (event.data?.source) {
          displayProgress(`Found source: ${event.data.source.title}`);
        }
        break;
      case 'complete':
        displayProgress('Research complete!');
        break;
      case 'error':
        displayError(event.data?.error || 'Unknown error');
        break;
    }
  };
}
