/**
 * Gemini Deep Research Agent - Type Definitions
 * Based on the Gemini Interactions API
 */

// ============================================
// API Configuration Types
// ============================================

export interface GeminiConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

// ============================================
// Interaction Types (Gemini Interactions API)
// ============================================

export type InteractionType = 'INTERACTION_TYPE_UNSPECIFIED' | 'QUERY' | 'TOOL_RESPONSE';
export type InteractionState = 'INTERACTION_STATE_UNSPECIFIED' | 'PROCESSING' | 'COMPLETE' | 'FAILED';

export interface Content {
  role: 'user' | 'model';
  parts: Part[];
}

export interface Part {
  text?: string;
  inlineData?: InlineData;
  fileData?: FileData;
}

export interface InlineData {
  mimeType: string;
  data: string; // base64 encoded
}

export interface FileData {
  mimeType: string;
  fileUri: string;
}

// ============================================
// Deep Research Types
// ============================================

export type ResearchDepth = 'quick' | 'standard' | 'deep' | 'maximum';
export type OutputFormat = 'summary' | 'detailed' | 'markdown' | 'json';
export type SourceType = 'web' | 'academic' | 'news' | 'all';

export interface ResearchOptions {
  depth?: ResearchDepth;
  outputFormat?: OutputFormat;
  sources?: SourceType;
  maxSources?: number;
  language?: string;
  includeImages?: boolean;
  includeCitations?: boolean;
  refineWithThinking?: boolean;
}

export interface ResearchRequest {
  query: string;
  options?: ResearchOptions;
  documents?: DocumentInput[];
}

export interface DocumentInput {
  name: string;
  mimeType: string;
  content: string; // base64 encoded for binary, plain text for text files
  size: number;
}

// ============================================
// Session Types
// ============================================

export interface Session {
  name: string; // e.g., "sessions/abc123"
  model?: string;
  displayName?: string;
  systemInstruction?: Content;
  history?: Content[];
  createTime?: string;
  updateTime?: string;
}

export interface CreateSessionRequest {
  model?: string;
  displayName?: string;
  systemInstruction?: Content;
}

// ============================================
// Interaction Request/Response Types
// ============================================

export interface InteractionRequest {
  interactionType: InteractionType;
  userContent: Content;
  toolConfig?: ToolConfig;
}

export interface ToolConfig {
  deepResearch?: DeepResearchConfig;
}

export interface DeepResearchConfig {
  enabled: boolean;
  depth?: ResearchDepth;
}

export interface InteractionResponse {
  name: string; // interaction name/id
  state: InteractionState;
  modelContent?: Content;
  error?: ErrorInfo;
  metadata?: InteractionMetadata;
}

export interface InteractionMetadata {
  startTime?: string;
  endTime?: string;
  tokenCount?: TokenCount;
  sources?: SourceInfo[];
}

export interface TokenCount {
  promptTokens: number;
  responseTokens: number;
  totalTokens: number;
}

export interface SourceInfo {
  title: string;
  url: string;
  snippet?: string;
}

export interface ErrorInfo {
  code: string;
  message: string;
  details?: unknown;
}

// ============================================
// File Upload Types
// ============================================

export interface FileUploadResult {
  name: string;
  displayName: string;
  mimeType: string;
  sizeBytes: string;
  createTime: string;
  updateTime: string;
  expirationTime: string;
  sha256Hash: string;
  uri: string;
  state: 'PROCESSING' | 'ACTIVE' | 'FAILED';
  error?: ErrorInfo;
}

export interface FileFilters {
  extensions?: string[];
  maxFileSize?: number; // in bytes
  excludePatterns?: string[];
  recursive?: boolean;
}

export interface ScanResult {
  files: ScannedFile[];
  totalSize: number;
  skipped: SkippedFile[];
}

export interface ScannedFile {
  path: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface SkippedFile {
  path: string;
  reason: string;
}

// ============================================
// Research Result Types
// ============================================

export interface ResearchResult {
  id: string;
  query: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number; // 0-100
  content?: string;
  sources?: SourceInfo[];
  metadata?: ResearchMetadata;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface ResearchMetadata {
  depth: ResearchDepth;
  outputFormat: OutputFormat;
  documentsUsed: number;
  sourcesFound: number;
  processingTime: number; // in ms
  fallbackUsed?: boolean; // true if standard API was used instead of Interactions API
}

// ============================================
// Event Types (for streaming/progress)
// ============================================

export type ResearchEventType = 'start' | 'progress' | 'content' | 'source' | 'complete' | 'error';

export interface ResearchEvent {
  type: ResearchEventType;
  timestamp: Date;
  data?: {
    progress?: number;
    content?: string;
    source?: SourceInfo;
    error?: string;
  };
}

export type ResearchEventCallback = (event: ResearchEvent) => void;

// ============================================
// Generate Content Types (Standard Gemini API)
// ============================================

export interface ThinkingConfig {
  include_thoughts?: boolean;
  thinking_budget?: number;
  thinking_level?: "low" | "high";
}

export interface GenerateContentConfig {
  thinking_config?: ThinkingConfig;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
}

export interface GenerateContentRequest {
  model: string;
  contents: Content | Content[];
  generationConfig?: GenerateContentConfig;
}

export interface GenerateContentResponse {
  candidates: Candidate[];
  usageMetadata?: any;
}

export interface Candidate {
  content: Content;
  finishReason?: string;
}

// ============================================
// API Response Wrappers
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  nextPageToken?: string;
  totalSize?: number;
}
