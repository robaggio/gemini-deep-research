/**
 * API Routes
 * RESTful API endpoints for the Gemini Deep Research Agent
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createDeepResearchAgent, FileManager } from '../../lib/index.js';
import { ResearchDepth, OutputFormat, SourceType, DocumentInput, ResearchResult } from '../../lib/types.js';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/plain', 'text/markdown', 'text/csv', 'text/html',
      'application/pdf', 'application/json', 'application/xml',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const allowedExtensions = ['.txt', '.md', '.csv', '.html', '.pdf', '.json', '.xml', '.doc', '.docx'];
    
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  }
});

// Store active research results in memory (in production, use Redis or database)
const researchResults = new Map<string, ResearchResult>();

// ============================================
// Research Endpoints
// ============================================

/**
 * POST /api/research
 * Start a new research query
 */
router.post('/research', upload.array('files', 20), async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: { code: 'NO_API_KEY', message: 'GEMINI_API_KEY is not configured' }
      });
    }

    const { query, depth = 'deep', format = 'markdown', sources = 'all', citations = false } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_QUERY', message: 'Query is required' }
      });
    }

    // Auto-detect GitHub URLs in the query and clone them
    let repoDocs: DocumentInput[] = [];
    const githubUrlRegex = /https?:\/\/github\.com\/[\w-]+\/[\w.-]+/gi;
    const githubUrls = query.match(githubUrlRegex) || [];
    
    if (githubUrls.length > 0) {
      try {
        const { loadDocumentsFromFolder } = await import('../../lib/index.js');
        const { simpleGit } = await import('simple-git');
        const git = simpleGit();
        
        for (const repoUrl of githubUrls) {
          // Create temp dir for each repo
          const tempDir = path.join(process.cwd(), 'temp_repos', `repo-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`);
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          
          // Clone repo using simple-git library
          console.log(`[AutoClone] Cloning ${repoUrl} to ${tempDir}`);
          await git.clone(repoUrl, tempDir, ['--depth', '1']);
          
          // Load documents
          const allowedExtensions = ['.ts', '.js', '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.md', '.txt', '.json', '.xml', '.html', '.css', '.go', '.rs'];
          const docs = await loadDocumentsFromFolder(tempDir, {
            recursive: true,
            extensions: allowedExtensions,
          });
          repoDocs.push(...docs);
          
          // Cleanup repo
          fs.rmSync(tempDir, { recursive: true, force: true });
          console.log(`[AutoClone] Loaded ${docs.length} files from ${repoUrl}`);
        }
      } catch (err) {
        console.error('Repo clone error:', err);
        // Continue without repo documents
      }
    }

    // Load uploaded files
    let documents: DocumentInput[] = [];
    if (repoDocs && repoDocs.length > 0) {
      documents.push(...repoDocs);
    }
    const files = req.files as Express.Multer.File[];
    
    if (files && files.length > 0) {
      const fileManager = new FileManager();
      for (const file of files) {
        const doc = await fileManager.loadFile(file.path);
        if (doc) {
          documents.push(doc);
        }
        // Clean up uploaded file after loading
        fs.unlink(file.path, () => {});
      }
    }

    // Create agent and start research
    const agent = createDeepResearchAgent(apiKey);
    
    // Generate result ID
    const resultId = `research_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store initial status
    researchResults.set(resultId, {
      id: resultId,
      query,
      status: 'processing',
      progress: 0,
      createdAt: new Date(),
    });

    // Return immediately with result ID (async processing)
    res.json({
      success: true,
      data: {
        id: resultId,
        status: 'processing',
        message: 'Research started',
      }
    });

    // Process research in background
    try {
      const result = await agent.research(
        {
          query,
          documents: documents.length > 0 ? documents : undefined,
          options: {
            depth: depth as ResearchDepth,
            outputFormat: format as OutputFormat,
            sources: sources as SourceType,
            includeCitations: citations === 'true' || citations === true,
          },
        },
        (event) => {
          // Update progress
          const current = researchResults.get(resultId);
          if (current && event.data?.progress) {
            current.progress = event.data.progress;
            researchResults.set(resultId, current);
          }
        }
      );

      // Store completed result
      researchResults.set(resultId, result);
      
      // Close session
      await agent.closeSession();
    } catch (error) {
      // Store error result
      researchResults.set(resultId, {
        id: resultId,
        query,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        createdAt: new Date(),
      });
    }
  } catch (error) {
    console.error('Research error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'RESEARCH_ERROR',
        message: error instanceof Error ? error.message : 'Research failed'
      }
    });
  }
});

/**
 * GET /api/research/:id
 * Get research result by ID
 */
router.get('/research/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const result = researchResults.get(id);

  if (!result) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Research result not found' }
    });
  }

  res.json({
    success: true,
    data: result
  });
});

/**
 * DELETE /api/research/:id
 * Delete research result
 */
router.delete('/research/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (researchResults.has(id)) {
    researchResults.delete(id);
    res.json({ success: true, message: 'Result deleted' });
  } else {
    // If not found (maybe already expired or cleaned up), still return success for idempotency
    res.json({ success: true, message: 'Result not found or already deleted' });
  }
});

/**
 * GET /api/research
 * List recent research results
 */
router.get('/research', (req: Request, res: Response) => {
  const results = Array.from(researchResults.values())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 20);

  res.json({
    success: true,
    data: {
      results,
      count: results.length
    }
  });
});

// ============================================
// File Upload Endpoints
// ============================================

/**
 * POST /api/upload
 * Upload files for analysis
 */
router.post('/upload', upload.array('files', 20), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILES', message: 'No files uploaded' }
      });
    }

    const fileManager = new FileManager();
    const results: { name: string; size: number; type: string; loaded: boolean }[] = [];

    for (const file of files) {
      const doc = await fileManager.loadFile(file.path);
      results.push({
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
        loaded: doc !== null
      });
      
      // Clean up
      fs.unlink(file.path, () => {});
    }

    res.json({
      success: true,
      data: {
        files: results,
        count: results.filter(r => r.loaded).length
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: error instanceof Error ? error.message : 'Upload failed'
      }
    });
  }
});

// ============================================
// Session Endpoints
// ============================================

/**
 * GET /api/sessions
 * List active sessions
 */
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: { code: 'NO_API_KEY', message: 'GEMINI_API_KEY is not configured' }
      });
    }

    const { GeminiClient } = await import('../../lib/client.js');
    const client = new GeminiClient({ apiKey });
    const result = await client.listSessions(20);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Sessions error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SESSIONS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch sessions'
      }
    });
  }
});

// ============================================
// Configuration Endpoints
// ============================================

/**
 * GET /api/config
 * Get current configuration (safe values only)
 */
router.get('/config', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      hasApiKey: !!process.env.GEMINI_API_KEY,
      version: '1.0.0',
      supportedDepths: ['quick', 'standard', 'deep', 'maximum'],
      supportedFormats: ['summary', 'detailed', 'markdown', 'json'],
      supportedSources: ['web', 'academic', 'news', 'all'],
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxFiles: 20,
    }
  });
});

export { router as apiRouter };
