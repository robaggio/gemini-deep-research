/**
 * File Manager
 * Handles multi-file uploads and folder scanning for the Deep Research Agent
 */

import * as fs from 'fs';
import * as path from 'path';
import * as mimeTypes from 'mime-types';
import {
  DocumentInput,
  FileFilters,
  ScanResult,
  ScannedFile,
  SkippedFile,
} from './types.js';

// Default supported file types for research
const DEFAULT_EXTENSIONS = [
  '.txt', '.md', '.csv', '.json', '.xml', '.html', '.htm',
  '.py', '.js', '.ts', '.java', '.c', '.cpp', '.h',
  '.yaml'
];

// Default max file size (10MB)
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

// Default exclude patterns
const DEFAULT_EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  '.svn',
  '__pycache__',
  '.DS_Store',
  'Thumbs.db',
  '*.log',
  '*.lock',
];

export class FileManager {
  private filters: FileFilters;

  constructor(filters?: FileFilters) {
    this.filters = {
      extensions: filters?.extensions || DEFAULT_EXTENSIONS,
      maxFileSize: filters?.maxFileSize || DEFAULT_MAX_FILE_SIZE,
      excludePatterns: filters?.excludePatterns || DEFAULT_EXCLUDE_PATTERNS,
      recursive: filters?.recursive ?? true,
    };
  }

  /**
   * Scan a folder for files
   */
  scanFolder(folderPath: string, filters?: FileFilters): ScanResult {
    const activeFilters = { ...this.filters, ...filters };
    const result: ScanResult = {
      files: [],
      totalSize: 0,
      skipped: [],
    };

    const absolutePath = path.resolve(folderPath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Folder not found: ${absolutePath}`);
    }

    if (!fs.statSync(absolutePath).isDirectory()) {
      throw new Error(`Path is not a directory: ${absolutePath}`);
    }

    this.scanDirectory(absolutePath, result, activeFilters, absolutePath);

    return result;
  }

  /**
   * Recursively scan directory
   */
  private scanDirectory(
    dirPath: string,
    result: ScanResult,
    filters: FileFilters,
    basePath: string
  ): void {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);

      // Check exclude patterns
      if (this.shouldExclude(entry.name, relativePath, filters.excludePatterns || [])) {
        result.skipped.push({
          path: relativePath,
          reason: 'Matches exclude pattern',
        });
        continue;
      }

      if (entry.isDirectory()) {
        if (filters.recursive) {
          this.scanDirectory(fullPath, result, filters, basePath);
        }
      } else if (entry.isFile()) {
        const fileResult = this.processFile(fullPath, relativePath, filters);
        if (fileResult.file) {
          result.files.push(fileResult.file);
          result.totalSize += fileResult.file.size;
        } else if (fileResult.skipped) {
          result.skipped.push(fileResult.skipped);
        }
      }
    }
  }

  /**
   * Process a single file
   */
  private processFile(
    fullPath: string,
    relativePath: string,
    filters: FileFilters
  ): { file?: ScannedFile; skipped?: SkippedFile } {
    const ext = path.extname(fullPath).toLowerCase();
    const stats = fs.statSync(fullPath);

    // Check extension
    if (filters.extensions && filters.extensions.length > 0) {
      if (!filters.extensions.includes(ext)) {
        return {
          skipped: {
            path: relativePath,
            reason: `Extension ${ext} not in allowed list`,
          },
        };
      }
    }

    // Check file size
    if (filters.maxFileSize && stats.size > filters.maxFileSize) {
      return {
        skipped: {
          path: relativePath,
          reason: `File size ${this.formatBytes(stats.size)} exceeds limit ${this.formatBytes(filters.maxFileSize)}`,
        },
      };
    }

    // Get mime type
    const mimeType = mimeTypes.lookup(fullPath) || 'application/octet-stream';

    return {
      file: {
        path: fullPath,
        name: path.basename(fullPath),
        size: stats.size,
        mimeType,
      },
    };
  }

  /**
   * Check if path should be excluded
   */
  private shouldExclude(name: string, relativePath: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      // Simple pattern matching
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        if (regex.test(name)) return true;
      } else {
        if (name === pattern || relativePath.includes(pattern)) return true;
      }
    }
    return false;
  }

  /**
   * Load files as DocumentInput array
   */
  async loadFiles(files: ScannedFile[]): Promise<DocumentInput[]> {
    const documents: DocumentInput[] = [];

    for (const file of files) {
      const doc = await this.loadFile(file.path);
      if (doc) {
        documents.push(doc);
      }
    }

    return documents;
  }

  /**
   * Load a single file as DocumentInput
   */
  async loadFile(filePath: string): Promise<DocumentInput | null> {
    try {
      const absolutePath = path.resolve(filePath);
      
      if (!fs.existsSync(absolutePath)) {
        console.error(`File not found: ${absolutePath}`);
        return null;
      }

      const stats = fs.statSync(absolutePath);
      const mimeType = mimeTypes.lookup(absolutePath) || 'text/plain';

      // For text-only support, always read as UTF-8
      const content = fs.readFileSync(absolutePath, 'utf-8');

      return {
        name: path.basename(absolutePath),
        mimeType,
        content,
        size: stats.size,
      };
    } catch (error) {
      console.error(`Error loading file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Load multiple files from paths
   */
  async loadFilesFromPaths(filePaths: string[]): Promise<DocumentInput[]> {
    const documents: DocumentInput[] = [];

    for (const filePath of filePaths) {
      const doc = await this.loadFile(filePath);
      if (doc) {
        documents.push(doc);
      }
    }

    return documents;
  }

  /**
   * Scan folder and load all files
   */
  async loadFolder(folderPath: string, filters?: FileFilters): Promise<{
    documents: DocumentInput[];
    scanResult: ScanResult;
  }> {
    const scanResult = this.scanFolder(folderPath, filters);
    const documents = await this.loadFiles(scanResult.files);

    return { documents, scanResult };
  }

  /**
   * Check if mime type is text-based
   */
  private isTextMimeType(mimeType: string): boolean {
    return (
      mimeType.startsWith('text/') ||
      mimeType === 'application/json' ||
      mimeType === 'application/xml' ||
      mimeType === 'application/javascript' ||
      mimeType === 'application/x-yaml' ||
      mimeType === 'application/toml'
    );
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get supported extensions
   */
  getSupportedExtensions(): string[] {
    return this.filters.extensions || DEFAULT_EXTENSIONS;
  }

  /**
   * Update filters
   */
  setFilters(filters: Partial<FileFilters>): void {
    this.filters = { ...this.filters, ...filters };
  }

  /**
   * Validate files before upload
   */
  validateFiles(files: ScannedFile[]): {
    valid: ScannedFile[];
    invalid: { file: ScannedFile; reason: string }[];
  } {
    const valid: ScannedFile[] = [];
    const invalid: { file: ScannedFile; reason: string }[] = [];

    for (const file of files) {
      const ext = path.extname(file.path).toLowerCase();
      
      if (this.filters.extensions && !this.filters.extensions.includes(ext)) {
        invalid.push({ file, reason: `Unsupported extension: ${ext}` });
        continue;
      }

      if (this.filters.maxFileSize && file.size > this.filters.maxFileSize) {
        invalid.push({
          file,
          reason: `File too large: ${this.formatBytes(file.size)}`,
        });
        continue;
      }

      valid.push(file);
    }

    return { valid, invalid };
  }
}

/**
 * Create a file manager with default settings
 */
export function createFileManager(filters?: FileFilters): FileManager {
  return new FileManager(filters);
}

/**
 * Quick utility to load a single file
 */
export async function loadDocument(filePath: string): Promise<DocumentInput | null> {
  const manager = new FileManager();
  return manager.loadFile(filePath);
}

/**
 * Quick utility to load files from a folder
 */
export async function loadDocumentsFromFolder(
  folderPath: string,
  options?: {
    extensions?: string[];
    maxFileSize?: number;
    recursive?: boolean;
  }
): Promise<DocumentInput[]> {
  const manager = new FileManager({
    extensions: options?.extensions,
    maxFileSize: options?.maxFileSize,
    recursive: options?.recursive,
  });

  const { documents } = await manager.loadFolder(folderPath);
  return documents;
}
