/**
 * Gemini Interactions API Client
 * Low-level client for communicating with the Gemini Interactions API
 */

import axios from 'axios';

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

// Use v1beta for Interactions API (confirmed working with curl)
const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
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
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await axios.request<T>({
        url,
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        data: body,
        timeout: this.timeout,
      });

      return { success: true, data: response.data };
    } catch (error: any) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return {
          success: false,
          error: { code: 'TIMEOUT', message: 'Request timed out' },
        };
      }

      if (error.response) {
        return {
          success: false,
          error: {
            code: `HTTP_${error.response.status}`,
            message: error.response.data?.error?.message || error.response.statusText,
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || 'Unknown error',
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
    if (params.length > 0) endpoint += `?${params.join('&')}`;
    
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
    const url = `https://generativelanguage.googleapis.com/upload/v1beta/files`;
    
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
      const initResponse = await axios.post(url, metadata, {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': String(Buffer.byteLength(base64Content, 'base64')),
          'X-Goog-Upload-Header-Content-Type': mimeType,
        },
        timeout: this.timeout,
      });

      if (initResponse.status < 200 || initResponse.status >= 300) {
        // Try simple upload instead
        return this.simpleUpload(fileContent, mimeType, displayName);
      }

      const uploadUrl = initResponse.headers['x-goog-upload-url'];
      
      if (!uploadUrl) {
        return this.simpleUpload(fileContent, mimeType, displayName);
      }

      // Upload the actual content
      const bodyContent = Buffer.isBuffer(fileContent) ? new Uint8Array(fileContent) : new Uint8Array(Buffer.from(fileContent));
      const uploadResponse = await axios.put(uploadUrl, bodyContent, {
        headers: {
          'Content-Type': mimeType,
          'X-Goog-Upload-Command': 'upload, finalize',
          'X-Goog-Upload-Offset': '0',
        },
        timeout: this.timeout,
      });

      if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
        return {
          success: false,
          error: {
            code: `HTTP_${uploadResponse.status}`,
            message: uploadResponse.data?.error?.message || uploadResponse.statusText,
          },
        };
      }

      return { success: true, data: uploadResponse.data.file };
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
    if (params.length > 0) endpoint += `?${params.join('&')}`;
    
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
