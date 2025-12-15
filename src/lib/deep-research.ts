/**
 * Deep Research Agent
 * High-level interface for conducting research using Gemini Deep Research
 *
 * Based on: https://ai.google.dev/gemini-api/docs/deep-research
 *
 * The Gemini Deep Research Agent autonomously plans, executes, and synthesizes
 * multi-step research tasks. Powered by Gemini 3 Pro, it navigates complex
 * information landscapes using web search and your own data to produce
 * detailed, cited reports.
 *
 * IMPORTANT: Deep Research is ONLY available through the Interactions API.
 * You cannot access it through generate_content.
 */

import axios from 'axios';
import { GeminiClient } from './client.js';
import {
  GeminiConfig,
  ResearchOptions,
  ResearchRequest,
  ResearchResult,
  ResearchEvent,
  ResearchEventCallback,
  DocumentInput,
  Content,
  InteractionResponse,
  Session,
  SourceInfo,
  ResearchDepth,
  ApiResponse,
  GenerateContentRequest,
} from './types.js';

// Deep Research Pro Preview Agent
// See: https://ai.google.dev/gemini-api/docs/deep-research
const DEEP_RESEARCH_AGENT = 'deep-research-pro-preview-12-2025';
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const POLL_INTERVAL = 10000; // 10 seconds as recommended by docs
const MAX_RESEARCH_TIME = 60 * 60 * 1000; // 60 minutes max

export class DeepResearchAgent {
  private client: GeminiClient;
  private config: GeminiConfig;
  private activeSession: Session | null = null;

  constructor(config: GeminiConfig) {
    this.config = config;
    this.client = new GeminiClient(config);
  }

  /**
   * Start a new research session (not used for Deep Research - kept for compatibility)
   */
  async startSession(displayName?: string): Promise<Session> {
    // Deep Research doesn't use sessions - it uses the Interactions API directly
    const mockSession: Session = {
      name: `sessions/deep-research-${Date.now()}`,
      displayName: displayName || `Research Session ${new Date().toISOString()}`,
      model: DEEP_RESEARCH_AGENT,
      createTime: new Date().toISOString(),
    };
    this.activeSession = mockSession;
    return mockSession;
  }

  /**
   * Conduct research with the given query and options
   * Uses the Gemini Interactions API with Deep Research Agent
   * 
   * As per docs: Must use background=True for async execution
   * The API returns a partial Interaction object immediately.
   * Poll for results using the interaction ID.
   */
  async research(
    request: ResearchRequest,
    onEvent?: ResearchEventCallback
  ): Promise<ResearchResult> {
    const startTime = Date.now();
    const resultId = `research_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Emit start event
    this.emitEvent(onEvent, { type: 'start', timestamp: new Date() });

    try {
      console.log('[DeepResearch] Using Gemini Deep Research Agent:', DEEP_RESEARCH_AGENT);
      console.log('[DeepResearch] API Base URL:', API_BASE_URL);

      // Build the research input
      const input = this.buildResearchInput(request);

      this.emitEvent(onEvent, { type: 'progress', timestamp: new Date(), data: { progress: 5 } });

      // Create interaction with background=true (required for Deep Research)
      // POST /v1beta/interactions
      const createUrl = `${API_BASE_URL}/interactions`;
      
      console.log('[DeepResearch] Creating interaction with background=true');

      // Request body per the official API documentation:
      // https://ai.google.dev/gemini-api/docs/deep-research
      const createBody = {
        input: input,
        agent: DEEP_RESEARCH_AGENT,
        background: true,
        store: true, // Required when background=true
        // Use snake_case for agent_config as per REST API conventions
        agent_config: {
          type: 'deep-research',
          thinking_summaries: 'auto',
        },
      };

      console.log('[DeepResearch] Request body:', JSON.stringify(createBody, null, 2).replace(this.config.apiKey, '***'));

      const createResponse = await axios.post(createUrl, createBody, {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.config.apiKey
        },
        timeout: 30000
      });

      if (createResponse.status < 200 || createResponse.status >= 300) {
        console.error('[DeepResearch] Create Interaction Error:', createResponse.data);
        throw new Error(createResponse.data?.error?.message || `API error: ${createResponse.status} ${createResponse.statusText}`);
      }

      const interaction = createResponse.data;
      const interactionId = interaction.id || interaction.name;
      
      console.log('[DeepResearch] Interaction started:', interactionId);
      this.emitEvent(onEvent, { type: 'progress', timestamp: new Date(), data: { progress: 10 } });

      // Poll for results
      const result = await this.pollForCompletion(interactionId, startTime, onEvent);
      
      let finalContent = result.content;

      // Deep Think Refinement
      if (result.status === 'completed' && request.options?.refineWithThinking) {
        finalContent = await this.refineWithThinking(result.content, onEvent);
      }
      
      // Append metadata footer
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      if (result.status === 'completed') {
        const modelName = request.options?.refineWithThinking 
          ? 'Gemini 3 Pro (Deep Think)' 
          : 'Deep Research Pro Preview';
          
        const metadataFooter = [
          '',
          '---',
          '### Research Metadata',
          `- **Query**: ${request.query}`,
          `- **Date**: ${new Date().toLocaleString()}`,
          `- **Model**: ${modelName}`,
          `- **Duration**: ${duration}s`,
        ].join('\n');
        
        finalContent += metadataFooter;
      }

      return {
        id: resultId,
        query: request.query,
        status: result.status === 'completed' ? 'completed' : 'failed',
        progress: 100,
        content: finalContent,
        sources: result.sources || [],
        metadata: {
          depth: request.options?.depth || 'deep',
          outputFormat: request.options?.outputFormat || 'markdown',
          documentsUsed: request.documents?.length || 0,
          sourcesFound: result.sources?.length || 0,
          processingTime: Date.now() - startTime,
        },
        createdAt: new Date(startTime),
        completedAt: new Date(),
        error: result.error,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[DeepResearch] Error:', errorMessage);
      
      this.emitEvent(onEvent, { type: 'error', timestamp: new Date(), data: { error: errorMessage } });
      return {
        id: resultId,
        query: request.query,
        status: 'failed',
        error: errorMessage,
        createdAt: new Date(startTime),
      };
    }
  }

  /**
   * Refine content with Deep Think
   */
  private async refineWithThinking(
    content: string,
    onEvent?: ResearchEventCallback
  ): Promise<string> {
    this.emitEvent(onEvent, { type: 'progress', timestamp: new Date(), data: { progress: 95 } });
    console.log('[DeepResearch] Refining with Deep Think (Gemini 3 Pro)...');

    const prompt = `Review the following research report to ensure logical consistency, depth, and clarity.
Identify any logical gaps, synthesize contradictory evidence, and structure the final argument persuasively.
Maintain all citations and the original report structure where possible, but enhance the prose and reasoning.

RESEARCH REPORT:
${content}`;

    try {
      const result = await this.client.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { role: 'user', parts: [{ text: prompt }] },
        generationConfig: {
          thinking_config: {
            include_thoughts: true,
            thinking_level: "high",
          },
        },
      });

      if (result.success && result.data?.candidates?.[0]?.content?.parts) {
        // Filter out thought parts to get the final answer
        // Note: The API returns thought parts with a 'thought' property set to true
        // We only want the final text logic for replacement
        const parts = result.data.candidates[0].content.parts;
        const answerParts = parts.filter((p: any) => !p.thought);
        
        if (answerParts.length > 0) {
          const refinedContent = answerParts.map((p: any) => p.text).join('\n');
          console.log('[DeepResearch] Deep Think refinement complete');
          
          // Emit content update event
          this.emitEvent(onEvent, { type: 'content', timestamp: new Date(), data: { content: refinedContent } });
          
          return refinedContent;
        }
      }
    } catch (e) {
      console.error('[DeepResearch] Deep Think refinement failed:', e);
      // Fallback to original content
    }
    return content;
  }

  /**
   * Poll for interaction completion
   */
  private async pollForCompletion(
    interactionId: string,
    startTime: number,
    onEvent?: ResearchEventCallback
  ): Promise<{ status: string; content: string; sources?: SourceInfo[]; error?: string }> {
    const getUrl = `${API_BASE_URL}/interactions/${interactionId}`;
    let progressPercent = 10;

    while (Date.now() - startTime < MAX_RESEARCH_TIME) {
      await this.sleep(POLL_INTERVAL);
      
      console.log('[DeepResearch] Polling for results...');
      
      const response = await axios.get(getUrl, {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.config.apiKey
        },
        timeout: 30000
      });

      if (response.status < 200 || response.status >= 300) {
        console.error('[DeepResearch] Poll Error:', response.data);
        throw new Error(response.data?.error?.message || `Poll error: ${response.status}`);
      }

      const interaction = response.data;
      const status = interaction.status || interaction.state;
      
      console.log('[DeepResearch] Status:', status);

      // Update progress
      progressPercent = Math.min(progressPercent + 10, 90);
      this.emitEvent(onEvent, { 
        type: 'progress', 
        timestamp: new Date(), 
        data: { progress: progressPercent } 
      });

      if (status === 'completed' || status === 'COMPLETED') {
        // Extract output text
        const outputs = interaction.outputs || [];
        const content = outputs
          .filter((o: any) => o.text)
          .map((o: any) => o.text)
          .join('\n\n') || 'Research completed but no content returned';

        console.log('[DeepResearch] Research completed!');
        this.emitEvent(onEvent, { type: 'content', timestamp: new Date(), data: { content } });
        this.emitEvent(onEvent, { type: 'complete', timestamp: new Date() });
        
        return { status: 'completed', content };
      }

      if (status === 'failed' || status === 'FAILED') {
        const errorMsg = interaction.error?.message || 'Research failed';
        console.error('[DeepResearch] Research failed:', errorMsg);
        return { status: 'failed', content: '', error: errorMsg };
      }

      // Still in progress
      console.log('[DeepResearch] Still processing...');
    }

    return { 
      status: 'failed', 
      content: '', 
      error: 'Research timed out after 60 minutes' 
    };
  }

  /**
   * Build research input from request
   */
  private buildResearchInput(request: ResearchRequest): string {
    const options = request.options || {};
    let input = request.query;

    // Add depth instructions
    const depthInstructions: Record<ResearchDepth, string> = {
      quick: 'Provide a brief, concise answer focusing on the key points.',
      standard: 'Provide a balanced response with main findings and supporting details.',
      deep: 'Conduct thorough research, exploring multiple perspectives and providing detailed analysis.',
      maximum: 'Perform exhaustive research, covering all aspects comprehensively with detailed citations and analysis from multiple authoritative sources.',
    };

    const depth = options.depth || 'deep';
    input = `${depthInstructions[depth]}\n\nResearch Query: ${input}`;

    // Add format instructions
    if (options.outputFormat === 'markdown') {
      input += '\n\nFormat the output as a detailed report with Markdown headings, bullet points, and proper structure.';
    } else if (options.outputFormat === 'json') {
      input += '\n\nProvide the response in valid JSON format with sections: summary, findings, sources, and conclusions.';
    }

    // Add citation instructions
    if (options.includeCitations) {
      input += '\n\nInclude citations for all factual claims and reference sources clearly.';
    }

    // Add document context if provided
    if (request.documents && request.documents.length > 0) {
      input += `\n\nAnalyze the following ${request.documents.length} document(s) and incorporate relevant information:`;
      for (const doc of request.documents) {
        if (doc.mimeType.startsWith('text/') || doc.mimeType === 'application/json') {
          input += `\n\n--- Document: ${doc.name} ---\n${doc.content}\n--- End Document ---`;
        }
      }
    }

    return input;
  }

  /**
   * Quick research with minimal options
   */
  async quickResearch(query: string): Promise<ResearchResult> {
    return this.research({
      query,
      options: { depth: 'quick', outputFormat: 'summary' },
    });
  }

  /**
   * Deep research with maximum depth
   */
  async deepResearch(query: string, documents?: DocumentInput[]): Promise<ResearchResult> {
    return this.research({
      query,
      documents,
      options: { 
        depth: 'maximum', 
        outputFormat: 'markdown',
        includeCitations: true,
      },
    });
  }

  /**
   * Research with document analysis
   */
  async analyzeDocuments(
    query: string,
    documents: DocumentInput[],
    options?: ResearchOptions
  ): Promise<ResearchResult> {
    return this.research({
      query,
      documents,
      options: {
        ...options,
        depth: options?.depth || 'deep',
      },
    });
  }

  /**
   * Get the current session
   */
  getSession(): Session | null {
    return this.activeSession;
  }

  /**
   * Close the current session
   */
  async closeSession(): Promise<void> {
    if (this.activeSession) {
      await this.client.deleteSession(this.activeSession.name);
      this.activeSession = null;
    }
  }

  /**
   * Build research prompt with options
   */
  private buildResearchPrompt(request: ResearchRequest): string {
    const options = request.options || {};
    let prompt = request.query;

    // Add depth instructions
    const depthInstructions: Record<ResearchDepth, string> = {
      quick: 'Provide a brief, concise answer focusing on the key points.',
      standard: 'Provide a balanced response with main findings and supporting details.',
      deep: 'Conduct thorough research, exploring multiple perspectives and providing detailed analysis.',
      maximum: 'Perform exhaustive research, covering all aspects comprehensively with detailed citations and analysis from multiple authoritative sources.',
    };

    const depth = options.depth || 'deep';
    prompt = `${depthInstructions[depth]}\n\nResearch Query: ${prompt}`;

    // Add format instructions
    if (options.outputFormat === 'json') {
      prompt += '\n\nProvide the response in valid JSON format with sections: summary, findings, sources, and conclusions.';
    } else if (options.outputFormat === 'markdown') {
      prompt += '\n\nFormat the response in Markdown with clear headings, bullet points, and proper structure.';
    }

    // Add document context
    if (request.documents && request.documents.length > 0) {
      prompt += `\n\nAnalyze the following ${request.documents.length} document(s) and incorporate relevant information into your research:`;
    }

    // Add citation instructions
    if (options.includeCitations) {
      prompt += '\n\nInclude citations for all factual claims and reference sources clearly.';
    }

    return prompt;
  }

  /**
   * Extract text content from response
   */
  private extractContent(response: InteractionResponse): string {
    if (!response.modelContent?.parts) {
      return '';
    }

    return response.modelContent.parts
      .filter(part => part.text)
      .map(part => part.text)
      .join('\n\n');
  }

  /**
   * Check if mime type is text-based
   */
  private isTextMimeType(mimeType: string): boolean {
    return (
      mimeType.startsWith('text/') ||
      mimeType === 'application/json' ||
      mimeType === 'application/xml' ||
      mimeType === 'application/javascript'
    );
  }

  /**
   * Emit research event
   */
  private emitEvent(callback: ResearchEventCallback | undefined, event: ResearchEvent): void {
    if (callback) {
      callback(event);
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create a DeepResearchAgent
 */
export function createDeepResearchAgent(apiKey?: string): DeepResearchAgent {
  const key = apiKey || process.env.GEMINI_API_KEY;
  
  if (!key) {
    throw new Error('GEMINI_API_KEY is required. Set it as an environment variable or pass it as an argument.');
  }

  return new DeepResearchAgent({ apiKey: key });
}
