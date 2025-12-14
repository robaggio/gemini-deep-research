/**
 * Gemini Interactions API Client
 * Low-level client for communicating with the Gemini Interactions API
 */

import {
  GeminiConfig,
  Session,
  CreateSessionRequest,
  InteractionRequest,
  InteractionResponse,
  InteractionState,
  Content,
  FileUploadResult,
  ApiResponse,
  ErrorInfo,
  GenerateContentRequest,
  GenerateContentResponse,
} from './types.js';

// Try alpha first for Interactions API, fall back to beta for standard API
const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1alpha';
const FALLBACK_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_TIMEOUT = 300000; // 5 minutes for long research tasks
const POLL_INTERVAL = 2000; // 2 seconds

export class GeminiClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  constructor(config: GeminiConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required. Set GEMINI_API_KEY environment variable or pass it in config.');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    this.timeout = config.timeout || DEFAULT_TIMEOUT;
  }

  /**
   * Make an authenticated request to the Gemini API
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}?key=${this.apiKey}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: errorData.error?.message || response.statusText,
          },
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: { code: 'TIMEOUT', message: 'Request timed out' },
        };
      }

      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  // ============================================
  // Session Management
  // ============================================

  /**
   * Create a new interaction session
   * Uses the Gemini Interactions API (v1alpha)
   */
  async createSession(request?: CreateSessionRequest): Promise<ApiResponse<Session>> {
    const body = {
      model: request?.model || 'deep-research-pro-preview-12-2025',
      displayName: request?.displayName,
      systemInstruction: request?.systemInstruction,
    };

    console.log('[GeminiClient] Creating session with model:', body.model);
    
    return this.request<Session>('POST', '/sessions', body);
  }

  /**
   * Get an existing session by name
   */
  async getSession(sessionName: string): Promise<ApiResponse<Session>> {
    return this.request<Session>('GET', `/${sessionName}`);
  }

  /**
   * List all sessions
   */
  async listSessions(pageSize?: number, pageToken?: string): Promise<ApiResponse<{ sessions: Session[]; nextPageToken?: string }>> {
    let endpoint = '/sessions';
    const params: string[] = [];
    if (pageSize) params.push(`pageSize=${pageSize}`);
    if (pageToken) params.push(`pageToken=${pageToken}`);
    if (params.length > 0) endpoint += `&${params.join('&')}`;
    
    return this.request('GET', endpoint);
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionName: string): Promise<ApiResponse<void>> {
    return this.request<void>('DELETE', `/${sessionName}`);
  }

  // ============================================
  // Interactions
  // ============================================

  /**
   * Send an interaction to a session
   */
  async sendInteraction(
    sessionName: string,
    request: InteractionRequest
  ): Promise<ApiResponse<InteractionResponse>> {
    return this.request<InteractionResponse>(
      'POST',
      `/${sessionName}/interactions`,
      request
    );
  }

  /**
   * Get the status of an interaction
   */
  async getInteraction(interactionName: string): Promise<ApiResponse<InteractionResponse>> {
    return this.request<InteractionResponse>('GET', `/${interactionName}`);
  }

  /**
   * Poll for interaction completion
   */
  async waitForCompletion(
    interactionName: string,
    onProgress?: (response: InteractionResponse) => void,
    maxWaitTime: number = this.timeout
  ): Promise<ApiResponse<InteractionResponse>> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const result = await this.getInteraction(interactionName);
      
      if (!result.success) {
        return result;
      }

      const response = result.data!;
      
      if (onProgress) {
        onProgress(response);
      }

      if (response.state === 'COMPLETE' || response.state === 'FAILED') {
        return result;
      }

      // Wait before polling again
      await this.sleep(POLL_INTERVAL);
    }

    return {
      success: false,
      error: { code: 'TIMEOUT', message: 'Interaction did not complete in time' },
    };
  }

  // ============================================
  // Standard Generation (Thinking Models)
  // ============================================

  /**
   * Generate content using standard Gemini API
   */
  async generateContent(request: GenerateContentRequest): Promise<ApiResponse<GenerateContentResponse>> {
    const modelId = request.model.startsWith('models/') ? request.model : `models/${request.model}`;
    const endpoint = `/${modelId}:generateContent`;
    
    const body = {
      contents: Array.isArray(request.contents) ? request.contents : [request.contents],
      generationConfig: request.generationConfig,
    };

    console.log('[GeminiClient] Generating content with model:', modelId);
    
    return this.request<GenerateContentResponse>('POST', endpoint, body);
  }

  // ============================================
  // File Upload
  // ============================================

  /**
   * Upload a file to the Gemini API
   */
  async uploadFile(
    fileContent: Buffer | string,
    mimeType: string,
    displayName: string
  ): Promise<ApiResponse<FileUploadResult>> {
    const url = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${this.apiKey}`;
    
    // Convert to base64 if Buffer
    const base64Content = Buffer.isBuffer(fileContent) 
      ? fileContent.toString('base64')
      : Buffer.from(fileContent).toString('base64');

    const metadata = {
      file: {
        displayName,
      },
    };

    try {
      // First, initiate the upload
      const initResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': String(Buffer.byteLength(base64Content, 'base64')),
          'X-Goog-Upload-Header-Content-Type': mimeType,
        },
        body: JSON.stringify(metadata),
      });

      if (!initResponse.ok) {
        // Try simple upload instead
        return this.simpleUpload(fileContent, mimeType, displayName);
      }

      const uploadUrl = initResponse.headers.get('X-Goog-Upload-URL');
      
      if (!uploadUrl) {
        return this.simpleUpload(fileContent, mimeType, displayName);
      }

      // Upload the actual content
      const bodyContent = Buffer.isBuffer(fileContent) ? new Uint8Array(fileContent) : new Uint8Array(Buffer.from(fileContent));
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': mimeType,
          'X-Goog-Upload-Command': 'upload, finalize',
          'X-Goog-Upload-Offset': '0',
        },
        body: bodyContent,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        return {
          success: false,
          error: {
            code: `HTTP_${uploadResponse.status}`,
            message: errorData.error?.message || uploadResponse.statusText,
          },
        };
      }

      const data = await uploadResponse.json();
      return { success: true, data: data.file };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: error instanceof Error ? error.message : 'Upload failed',
        },
      };
    }
  }

  /**
   * Simple file upload (fallback method)
   */
  private async simpleUpload(
    fileContent: Buffer | string,
    mimeType: string,
    displayName: string
  ): Promise<ApiResponse<FileUploadResult>> {
    const url = `https://generativelanguage.googleapis.com/v1beta/files?key=${this.apiKey}`;
    
    const base64Content = Buffer.isBuffer(fileContent) 
      ? fileContent.toString('base64')
      : Buffer.from(fileContent).toString('base64');

    const body = {
      file: {
        displayName,
        mimeType,
      },
      inlineData: {
        mimeType,
        data: base64Content,
      },
    };

    return this.request<FileUploadResult>('POST', '/files', body);
  }

  /**
   * Get file metadata
   */
  async getFile(fileName: string): Promise<ApiResponse<FileUploadResult>> {
    return this.request<FileUploadResult>('GET', `/${fileName}`);
  }

  /**
   * Delete a file
   */
  async deleteFile(fileName: string): Promise<ApiResponse<void>> {
    return this.request<void>('DELETE', `/${fileName}`);
  }

  /**
   * List uploaded files
   */
  async listFiles(pageSize?: number, pageToken?: string): Promise<ApiResponse<{ files: FileUploadResult[]; nextPageToken?: string }>> {
    let endpoint = '/files';
    const params: string[] = [];
    if (pageSize) params.push(`pageSize=${pageSize}`);
    if (pageToken) params.push(`pageToken=${pageToken}`);
    if (params.length > 0) endpoint += `&${params.join('&')}`;
    
    return this.request('GET', endpoint);
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Create a text content object
   */
  static createTextContent(text: string, role: 'user' | 'model' = 'user'): Content {
    return {
      role,
      parts: [{ text }],
    };
  }

  /**
   * Create a file content object
   */
  static createFileContent(fileUri: string, mimeType: string, role: 'user' | 'model' = 'user'): Content {
    return {
      role,
      parts: [{ fileData: { fileUri, mimeType } }],
    };
  }

  /**
   * Create inline data content
   */
  static createInlineDataContent(data: string, mimeType: string, role: 'user' | 'model' = 'user'): Content {
    return {
      role,
      parts: [{ inlineData: { mimeType, data } }],
    };
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
