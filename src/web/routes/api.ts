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
      'text/plain', 'text/markdown', 'text/csv', 'text/html', 'text/x-python', 'text/x-java-source', 'text/x-c', 'text/x-c++',
      'application/json', 'application/xml', 'application/x-yaml',
      'application/javascript', 'application/typescript', 'text/javascript'
    ];
    const allowedExtensions = [
      '.txt', '.md', '.csv', '.html', '.htm', '.json', '.xml',
      '.py', '.js', '.ts', '.java', '.c', '.cpp', '.h', '.hpp',
      '.yaml'
    ];
    
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

// Store active research agents for cancellation (in production, use Redis or database)
const researchAgents = new Map<string, any>(); // Store DeepResearchAgent instances

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

    const { query, depth = 'deep', format = 'markdown', sources = 'all', citations = false, refineWithThinking = false } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_QUERY', message: 'Query is required' }
      });
    }

    // Load uploaded files
    let documents: DocumentInput[] = [];
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
      interactionId: undefined, // 将在创建交互时设置
    });

    // Store agent instance for cancellation
    researchAgents.set(resultId, agent);

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
            refineWithThinking: refineWithThinking === 'true' || refineWithThinking === true,
          },
        },
        (event) => {
          // Update progress and capture interaction ID
          const current = researchResults.get(resultId);
          if (current) {
            // Handle error events immediately
            if (event.type === 'error') {
              console.error('[API] Research failed via event:', event.data?.error);
              current.status = 'failed';
              current.error = event.data?.error || 'Unknown error occurred during research';
              current.completedAt = new Date();
              researchResults.set(resultId, current);

              // Clean up agent on error asynchronously
              const agent = researchAgents.get(resultId);
              if (agent) {
                // Schedule cleanup without awaiting
                setImmediate(async () => {
                  try {
                    await agent.closeSession();
                  } catch (closeError) {
                    console.warn('[API] Failed to close agent session on error:', closeError);
                  }
                });
                researchAgents.delete(resultId);
              }
              return;
            }

            if (event.data?.progress) {
              current.progress = event.data.progress;
            }
            // Capture interaction ID if available
            if (event.data?.interactionId) {
              current.interactionId = event.data.interactionId;
            }
            researchResults.set(resultId, current);
          }
        }
      );

      // Store completed result
      researchResults.set(resultId, result);

      // Close session and clean up agent
      await agent.closeSession();
      researchAgents.delete(resultId);
    } catch (error) {
      // Store error result
      researchResults.set(resultId, {
        id: resultId,
        query,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        createdAt: new Date(),
      });

      // Clean up agent on error
      try {
        await agent.closeSession();
      } catch (closeError) {
        console.warn('[API] Failed to close agent session:', closeError);
      }
      researchAgents.delete(resultId);
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
 * POST /api/research/:id/cancel
 * Cancel an ongoing research
 */
router.post('/research/:id/cancel', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: { code: 'NO_API_KEY', message: 'GEMINI_API_KEY is not configured' }
      });
    }

    // Check if research exists and is still processing
    const research = researchResults.get(id);
    if (!research) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Research not found' }
      });
    }

    if (research.status !== 'processing') {
      return res.status(400).json({
        success: false,
        error: { code: 'NOT_PROCESSING', message: 'Research is not currently processing' }
      });
    }

    // Mark the research as cancelled locally to ensure immediate response
    console.log(`[API] Marking research ${id} as cancelled`);
    research.status = 'cancelled';
    researchResults.set(id, research);

    // Try to cancel the interaction using the existing DeepResearchAgent
    const agent = researchAgents.get(id);

    if (research.interactionId && agent) {
      try {
        console.log(`[API] Attempting to cancel interaction: ${research.interactionId}`);
        const cancelSuccess = await agent.cancelInteraction(research.interactionId);

        if (cancelSuccess) {
          console.log(`[API] Cancel request sent successfully for interaction: ${research.interactionId}`);
        } else {
          console.warn(`[API] Cancel request failed for interaction: ${research.interactionId}, but research is marked as cancelled locally`);
        }
      } catch (cancelError) {
        console.warn('[API] Cancel request failed, but research is marked as cancelled locally:', cancelError);
        // Even if cancel request fails, we still consider the research cancelled
      }
    } else {
      if (!research.interactionId) {
        console.warn('[API] No interaction ID available for research:', id, '- marking as cancelled locally');
      }
      if (!agent) {
        console.warn('[API] No agent instance found for research:', id, '- marking as cancelled locally');
      }
    }

    // Clean up agent after cancellation attempt
    if (agent) {
      try {
        await agent.closeSession();
        researchAgents.delete(id);
        console.log('[API] Agent session closed and cleaned up after cancellation');
      } catch (closeError) {
        console.warn('[API] Failed to close agent session after cancellation:', closeError);
        researchAgents.delete(id); // Still try to remove from map
      }
    }

    res.json({
      success: true,
      message: 'Research cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel research error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CANCEL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to cancel research'
      }
    });
  }
});

/**
 * DELETE /api/research/:id
 * Delete research result
 */
router.delete('/research/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Clean up agent instance if exists
    const agent = researchAgents.get(id);
    if (agent) {
      try {
        await agent.closeSession();
        console.log(`[API] Cleaned up agent session for deleted research: ${id}`);
      } catch (closeError) {
        console.warn(`[API] Failed to close agent session for deleted research ${id}:`, closeError);
      }
      researchAgents.delete(id);
    }

    if (researchResults.has(id)) {
      researchResults.delete(id);
      res.json({ success: true, message: 'Result deleted' });
    } else {
      // If not found (maybe already expired or cleaned up), still return success for idempotency
      res.json({ success: true, message: 'Result not found or already deleted' });
    }
  } catch (error) {
    console.error('Delete research error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete research'
      }
    });
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
