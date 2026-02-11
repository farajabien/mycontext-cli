import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { ProjectContext } from '../types';
import { CONTEXT_FILES } from '../constants/fileNames';

// Re-export ProjectContext for external use
export type { ProjectContext };

export interface ContextCompactionOptions {
  maxContextSize?: number;
  preserveRecent?: boolean;
  compressionLevel?: 'low' | 'medium' | 'high';
}

export class ContextManager {
  private contextDir: string;
  private contextFile: string;
  private maxContextSize: number;
  private compressionLevel: 'low' | 'medium' | 'high';

  constructor(workingDirectory?: string) {
    this.contextDir = path.join(workingDirectory || process.cwd(), '.mycontext');
    this.contextFile = path.join(this.contextDir, CONTEXT_FILES.CONTEXT_MEMORY);
    this.maxContextSize = 50000; // Default 50KB context limit
    this.compressionLevel = 'medium';
  }

  /**
   * Load project context from files and memory
   */
  async loadContext(): Promise<ProjectContext> {
    const context: ProjectContext = {
      workingDirectory: this.contextDir.replace('/.mycontext', ''),
      contextVersion: '1.0',
      lastUpdated: new Date().toISOString(),
    };

    try {
      // Load from context files
      await this.loadContextFiles(context);
      
      // Load from memory file if exists
      await this.loadMemoryContext(context);

      console.log(chalk.green('✅ Context loaded successfully'));
      return context;
    } catch (error: any) {
      console.log(chalk.yellow(`⚠️ Context loading warning: ${error.message}`));
      return context;
    }
  }

  /**
   * Save context to memory for persistence
   */
  async saveContext(context: ProjectContext): Promise<void> {
    try {
      // Ensure context directory exists
      if (!fs.existsSync(this.contextDir)) {
        fs.mkdirSync(this.contextDir, { recursive: true });
      }

      // Update metadata
      context.lastUpdated = new Date().toISOString();
      context.contextVersion = context.contextVersion || '1.0';

      // Save to memory file
      fs.writeFileSync(this.contextFile, JSON.stringify(context, null, 2));
      
      console.log(chalk.green('✅ Context saved successfully'));
    } catch (error: any) {
      console.log(chalk.red(`❌ Context save failed: ${error.message}`));
    }
  }

  /**
   * Compact context to reduce size while preserving important information
   */
  async compactContext(
    context: ProjectContext,
    options: ContextCompactionOptions = {}
  ): Promise<ProjectContext> {
    const maxSize = options.maxContextSize || this.maxContextSize;
    const preserveRecent = options.preserveRecent !== false;
    const compressionLevel = options.compressionLevel || this.compressionLevel;

    const compactedContext = { ...context };

    try {
      // Calculate current context size
      const currentSize = this.calculateContextSize(context);
      
      if (currentSize <= maxSize) {
        console.log(chalk.green('✅ Context size is within limits'));
        return context;
      }

      console.log(chalk.yellow(`⚠️ Context size (${currentSize} bytes) exceeds limit (${maxSize} bytes). Compacting...`));

      // Apply compression based on level
      switch (compressionLevel) {
        case 'low':
          compactedContext.prd = this.compressText(context.prd || '', 0.8);
          compactedContext.brand = this.compressText(context.brand || '', 0.8);
          break;
        
        case 'medium':
          compactedContext.prd = this.compressText(context.prd || '', 0.6);
          compactedContext.brand = this.compressText(context.brand || '', 0.6);
          compactedContext.projectStructure = this.compressText(context.projectStructure || '', 0.7);
          break;
        
        case 'high':
          compactedContext.prd = this.compressText(context.prd || '', 0.4);
          compactedContext.brand = this.compressText(context.brand || '', 0.4);
          compactedContext.projectStructure = this.compressText(context.projectStructure || '', 0.5);
          compactedContext.types = this.compressText(context.types || '', 0.6);
          break;
      }

      // Preserve recent outputs if requested
      if (preserveRecent && context.previousOutputs) {
        compactedContext.previousOutputs = this.preserveRecentOutputs(context.previousOutputs);
      }

      // Update metadata
      compactedContext.lastUpdated = new Date().toISOString();
      compactedContext.contextVersion = '1.0-compacted';

      const newSize = this.calculateContextSize(compactedContext);
      console.log(chalk.green(`✅ Context compacted: ${currentSize} → ${newSize} bytes`));

      return compactedContext;
    } catch (error: any) {
      console.log(chalk.red(`❌ Context compaction failed: ${error.message}`));
      return context;
    }
  }

  /**
   * Merge new context with existing context
   */
  async mergeContext(
    existingContext: ProjectContext,
    newContext: Partial<ProjectContext>
  ): Promise<ProjectContext> {
    const mergedContext: ProjectContext = {
      ...existingContext,
      ...newContext,
      lastUpdated: new Date().toISOString(),
    };

    // Merge previous outputs intelligently
    if (existingContext.previousOutputs && newContext.previousOutputs) {
      mergedContext.previousOutputs = {
        ...existingContext.previousOutputs,
        ...newContext.previousOutputs,
      };
    }

    // Check if compaction is needed
    const size = this.calculateContextSize(mergedContext);
    if (size > this.maxContextSize) {
      console.log(chalk.yellow('⚠️ Merged context exceeds size limit, compacting...'));
      return await this.compactContext(mergedContext);
    }

    return mergedContext;
  }

  /**
   * Get context summary for debugging
   */
  getContextSummary(context: ProjectContext): string {
    const summary = {
      prd: context.prd ? `${context.prd.length} chars` : 'Not loaded',
      types: context.types ? `${context.types.length} chars` : 'Not loaded',
      brand: context.brand ? `${context.brand.length} chars` : 'Not loaded',
      componentList: context.componentList ? `${Object.keys(context.componentList).length} components` : 'Not loaded',
      projectStructure: context.projectStructure ? `${context.projectStructure.length} chars` : 'Not loaded',
      previousOutputs: context.previousOutputs ? `${Object.keys(context.previousOutputs).length} outputs` : 'None',
      totalSize: `${this.calculateContextSize(context)} bytes`,
      lastUpdated: context.lastUpdated || 'Unknown',
    };

    return JSON.stringify(summary, null, 2);
  }

  /**
   * Clear context memory
   */
  async clearContext(): Promise<void> {
    try {
      if (fs.existsSync(this.contextFile)) {
        fs.unlinkSync(this.contextFile);
        console.log(chalk.green('✅ Context memory cleared'));
      }
    } catch (error: any) {
      console.log(chalk.red(`❌ Context clear failed: ${error.message}`));
    }
  }

  /**
   * Load context from individual files
   */
  private async loadContextFiles(context: ProjectContext): Promise<void> {
    const files = [
      { key: 'prd', file: CONTEXT_FILES.PRD },
      { key: 'types', file: CONTEXT_FILES.TYPES },
      { key: 'brand', file: CONTEXT_FILES.BRANDING },
      { key: 'projectStructure', file: CONTEXT_FILES.PROJECT_STRUCTURE },
      { key: 'features', file: CONTEXT_FILES.FEATURES },
      { key: 'userFlows', file: CONTEXT_FILES.USER_FLOWS },
      { key: 'edgeCases', file: CONTEXT_FILES.EDGE_CASES },
      { key: 'technicalSpecs', file: CONTEXT_FILES.TECHNICAL_SPECS },
    ];

    for (const { key, file } of files) {
      const filePath = path.join(this.contextDir, file);
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          (context as any)[key] = content;
        } catch (error) {
          console.log(chalk.yellow(`⚠️ Could not load ${file}`));
        }
      }
    }

    // Load component list
    const componentListPath = path.join(this.contextDir, CONTEXT_FILES.COMPONENT_LIST);
    if (fs.existsSync(componentListPath)) {
      try {
        const content = fs.readFileSync(componentListPath, 'utf8');
        context.componentList = JSON.parse(content);
      } catch (error) {
        console.log(chalk.yellow('⚠️ Could not load component list'));
      }
    }
  }

  /**
   * Load context from memory file
   */
  private async loadMemoryContext(context: ProjectContext): Promise<void> {
    if (fs.existsSync(this.contextFile)) {
      try {
        const content = fs.readFileSync(this.contextFile, 'utf8');
        const memoryContext = JSON.parse(content);
        
        // Merge memory context with file context
        Object.assign(context, memoryContext);
      } catch (error) {
        console.log(chalk.yellow('⚠️ Could not load memory context'));
      }
    }
  }

  /**
   * Calculate context size in bytes
   */
  private calculateContextSize(context: ProjectContext): number {
    return JSON.stringify(context).length;
  }

  /**
   * Compress text by removing unnecessary whitespace and comments
   */
  private compressText(text: string, compressionRatio: number): string {
    if (!text) return '';

    // Remove excessive whitespace
    let compressed = text.replace(/\s+/g, ' ').trim();
    
    // Remove comments if compression ratio is high
    if (compressionRatio < 0.7) {
      compressed = compressed.replace(/\/\*[\s\S]*?\*\//g, '');
      compressed = compressed.replace(/\/\/.*$/gm, '');
    }

    // Truncate if still too long
    const targetLength = Math.floor(text.length * compressionRatio);
    if (compressed.length > targetLength) {
      compressed = compressed.substring(0, targetLength) + '...';
    }

    return compressed;
  }

  /**
   * Preserve only recent outputs
   */
  private preserveRecentOutputs(outputs: Record<string, any>): Record<string, any> {
    const sortedEntries = Object.entries(outputs)
      .sort(([, a], [, b]) => {
        const timestampA = (a as any).timestamp || '0';
        const timestampB = (b as any).timestamp || '0';
        return new Date(timestampB).getTime() - new Date(timestampA).getTime();
      })
      .slice(0, 10); // Keep only 10 most recent

    return Object.fromEntries(sortedEntries);
  }

  /**
   * Set context size limits
   */
  setContextLimits(maxSize: number, compressionLevel: 'low' | 'medium' | 'high'): void {
    this.maxContextSize = maxSize;
    this.compressionLevel = compressionLevel;
  }

  /**
   * Get context statistics
   */
  getContextStats(context: ProjectContext): {
    totalSize: number;
    fileCount: number;
    lastUpdated: string;
    compressionRatio: number;
  } {
    const totalSize = this.calculateContextSize(context);
    const fileCount = [
      context.prd,
      context.types,
      context.brand,
      context.componentList,
      context.projectStructure,
    ].filter(Boolean).length;

    const originalSize = this.calculateOriginalSize(context);
    const compressionRatio = originalSize > 0 ? totalSize / originalSize : 1;

    return {
      totalSize,
      fileCount,
      lastUpdated: context.lastUpdated || 'Unknown',
      compressionRatio,
    };
  }

  /**
   * Calculate original size before compression
   */
  private calculateOriginalSize(context: ProjectContext): number {
    // This is an approximation - in a real implementation, you'd track original sizes
    return this.calculateContextSize(context) * 1.5;
  }
}
