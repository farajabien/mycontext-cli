import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

export type PermissionMode = 'strict' | 'permissive' | 'custom';
export type ToolCategory = 'file' | 'code' | 'web' | 'database' | 'api' | 'system' | 'custom';

export interface ToolPermission {
  name: string;
  category: ToolCategory;
  allowed: boolean;
  reason?: string;
  restrictions?: string[];
}

export interface PermissionConfig {
  mode: PermissionMode;
  allowedTools: string[];
  disallowedTools: string[];
  categoryPermissions: Record<ToolCategory, boolean>;
  customPermissions: Record<string, ToolPermission>;
  restrictions: {
    maxFileSize?: number;
    allowedFileTypes?: string[];
    blockedDomains?: string[];
    maxApiCalls?: number;
    allowedDirectories?: string[];
  };
}

export class ToolPermissionManager {
  private config: PermissionConfig;
  private configFile: string;
  private workingDirectory: string;

  constructor(workingDirectory?: string) {
    this.workingDirectory = workingDirectory || process.cwd();
    this.configFile = path.join(this.workingDirectory, '.mycontext', 'permissions.json');
    this.config = this.getDefaultConfig();
    this.loadConfig();
  }

  /**
   * Check if a tool is allowed
   */
  isToolAllowed(toolName: string, category?: ToolCategory): boolean {
    // Check explicit disallowed tools first
    if (this.config.disallowedTools.includes(toolName)) {
      return false;
    }

    // Check explicit allowed tools
    if (this.config.allowedTools.includes(toolName)) {
      return true;
    }

    // Check category permissions
    if (category && this.config.categoryPermissions[category] !== undefined) {
      return this.config.categoryPermissions[category];
    }

    // Check custom permissions
    if (this.config.customPermissions[toolName]) {
      return this.config.customPermissions[toolName].allowed;
    }

    // Apply mode-based permissions
    switch (this.config.mode) {
      case 'strict':
        return false; // Deny by default
      case 'permissive':
        return true; // Allow by default
      case 'custom':
        return false; // Deny by default, require explicit permission
      default:
        return false;
    }
  }

  /**
   * Get permission reason for a tool
   */
  getPermissionReason(toolName: string): string {
    if (this.config.disallowedTools.includes(toolName)) {
      return `Tool '${toolName}' is explicitly disallowed`;
    }

    if (this.config.allowedTools.includes(toolName)) {
      return `Tool '${toolName}' is explicitly allowed`;
    }

    const customPermission = this.config.customPermissions[toolName];
    if (customPermission && customPermission.reason) {
      return customPermission.reason;
    }

    switch (this.config.mode) {
      case 'strict':
        return `Tool '${toolName}' denied by strict mode`;
      case 'permissive':
        return `Tool '${toolName}' allowed by permissive mode`;
      case 'custom':
        return `Tool '${toolName}' requires explicit permission`;
      default:
        return `Tool '${toolName}' permission unknown`;
    }
  }

  /**
   * Get all allowed tools
   */
  getAllowedTools(): string[] {
    const allowedTools = new Set<string>();

    // Add explicitly allowed tools
    this.config.allowedTools.forEach(tool => allowedTools.add(tool));

    // Add tools allowed by category permissions
    Object.entries(this.config.categoryPermissions).forEach(([category, allowed]) => {
      if (allowed) {
        const categoryTools = this.getToolsByCategory(category as ToolCategory);
        categoryTools.forEach(tool => allowedTools.add(tool));
      }
    });

    // Add custom allowed tools
    Object.entries(this.config.customPermissions).forEach(([tool, permission]) => {
      if (permission.allowed) {
        allowedTools.add(tool);
      }
    });

    // Remove explicitly disallowed tools
    this.config.disallowedTools.forEach(tool => allowedTools.delete(tool));

    return Array.from(allowedTools);
  }

  /**
   * Get all disallowed tools
   */
  getDisallowedTools(): string[] {
    const disallowedTools = new Set<string>();

    // Add explicitly disallowed tools
    this.config.disallowedTools.forEach(tool => disallowedTools.add(tool));

    // Add tools disallowed by category permissions
    Object.entries(this.config.categoryPermissions).forEach(([category, allowed]) => {
      if (!allowed) {
        const categoryTools = this.getToolsByCategory(category as ToolCategory);
        categoryTools.forEach(tool => disallowedTools.add(tool));
      }
    });

    // Add custom disallowed tools
    Object.entries(this.config.customPermissions).forEach(([tool, permission]) => {
      if (!permission.allowed) {
        disallowedTools.add(tool);
      }
    });

    return Array.from(disallowedTools);
  }

  /**
   * Set permission mode
   */
  setPermissionMode(mode: PermissionMode): void {
    this.config.mode = mode;
    this.saveConfig();
    console.log(chalk.green(`✅ Permission mode set to: ${mode}`));
  }

  /**
   * Allow a specific tool
   */
  allowTool(toolName: string, reason?: string): void {
    if (!this.config.allowedTools.includes(toolName)) {
      this.config.allowedTools.push(toolName);
    }
    
    // Remove from disallowed if present
    this.config.disallowedTools = this.config.disallowedTools.filter(t => t !== toolName);

    // Update custom permission
    this.config.customPermissions[toolName] = {
      name: toolName,
      category: this.getToolCategory(toolName),
      allowed: true,
      reason: reason || `Tool '${toolName}' explicitly allowed`,
    };

    this.saveConfig();
    console.log(chalk.green(`✅ Tool '${toolName}' allowed`));
  }

  /**
   * Disallow a specific tool
   */
  disallowTool(toolName: string, reason?: string): void {
    if (!this.config.disallowedTools.includes(toolName)) {
      this.config.disallowedTools.push(toolName);
    }

    // Remove from allowed if present
    this.config.allowedTools = this.config.allowedTools.filter(t => t !== toolName);

    // Update custom permission
    this.config.customPermissions[toolName] = {
      name: toolName,
      category: this.getToolCategory(toolName),
      allowed: false,
      reason: reason || `Tool '${toolName}' explicitly disallowed`,
    };

    this.saveConfig();
    console.log(chalk.red(`❌ Tool '${toolName}' disallowed`));
  }

  /**
   * Set category permissions
   */
  setCategoryPermission(category: ToolCategory, allowed: boolean): void {
    this.config.categoryPermissions[category] = allowed;
    this.saveConfig();
    console.log(chalk.green(`✅ Category '${category}' permission set to: ${allowed ? 'allowed' : 'disallowed'}`));
  }

  /**
   * Get permission configuration for Claude Agent SDK
   */
  getClaudeAgentConfig(): {
    allowedTools?: string[];
    disallowedTools?: string[];
    permissionMode: 'strict' | 'permissive';
  } {
    const allowedTools = this.getAllowedTools();
    const disallowedTools = this.getDisallowedTools();

    return {
      allowedTools: allowedTools.length > 0 ? allowedTools : undefined,
      disallowedTools: disallowedTools.length > 0 ? disallowedTools : undefined,
      permissionMode: this.config.mode === 'custom' ? 'strict' : this.config.mode,
    };
  }

  /**
   * Validate tool usage against restrictions
   */
  validateToolUsage(toolName: string, params: any): { allowed: boolean; reason?: string } {
    if (!this.isToolAllowed(toolName)) {
      return {
        allowed: false,
        reason: this.getPermissionReason(toolName),
      };
    }

    // Check file size restrictions
    if (toolName.includes('file') && params?.filePath) {
      const filePath = params.filePath;
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (this.config.restrictions.maxFileSize && stats.size > this.config.restrictions.maxFileSize) {
          return {
            allowed: false,
            reason: `File size (${stats.size} bytes) exceeds limit (${this.config.restrictions.maxFileSize} bytes)`,
          };
        }
      }
    }

    // Check file type restrictions
    if (toolName.includes('file') && params?.filePath) {
      const ext = path.extname(params.filePath).toLowerCase();
      if (this.config.restrictions.allowedFileTypes && !this.config.restrictions.allowedFileTypes.includes(ext)) {
        return {
          allowed: false,
          reason: `File type '${ext}' is not allowed`,
        };
      }
    }

    // Check directory restrictions
    if (toolName.includes('file') && params?.filePath) {
      const fileDir = path.dirname(params.filePath);
      if (this.config.restrictions.allowedDirectories) {
        const isAllowed = this.config.restrictions.allowedDirectories.some(allowedDir => 
          fileDir.startsWith(allowedDir)
        );
        if (!isAllowed) {
          return {
            allowed: false,
            reason: `Directory '${fileDir}' is not in allowed directories`,
          };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Get permission summary
   */
  getPermissionSummary(): string {
    const summary = {
      mode: this.config.mode,
      allowedTools: this.config.allowedTools.length,
      disallowedTools: this.config.disallowedTools.length,
      categoryPermissions: this.config.categoryPermissions,
      customPermissions: Object.keys(this.config.customPermissions).length,
      restrictions: this.config.restrictions,
    };

    return JSON.stringify(summary, null, 2);
  }

  /**
   * Reset to default permissions
   */
  resetToDefaults(): void {
    this.config = this.getDefaultConfig();
    this.saveConfig();
    console.log(chalk.green('✅ Permissions reset to defaults'));
  }

  /**
   * Get default permission configuration
   */
  private getDefaultConfig(): PermissionConfig {
    return {
      mode: 'permissive',
      allowedTools: [
        'read_file',
        'write_file',
        'list_directory',
        'search_code',
        'generate_component',
        'compile_prd',
        'validate_component',
      ],
      disallowedTools: [
        'delete_file',
        'execute_command',
        'install_package',
        'run_tests',
      ],
      categoryPermissions: {
        file: true,
        code: true,
        web: false,
        database: false,
        api: false,
        system: false,
        custom: false,
      },
      customPermissions: {},
      restrictions: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedFileTypes: ['.ts', '.tsx', '.js', '.jsx', '.md', '.json', '.css'],
        blockedDomains: [],
        maxApiCalls: 100,
        allowedDirectories: [this.workingDirectory],
      },
    };
  }

  /**
   * Load configuration from file
   */
  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configFile)) {
        const content = fs.readFileSync(this.configFile, 'utf8');
        const loadedConfig = JSON.parse(content);
        this.config = { ...this.getDefaultConfig(), ...loadedConfig };
        console.log(chalk.green('✅ Permission configuration loaded'));
      }
    } catch (error: any) {
      console.log(chalk.yellow(`⚠️ Could not load permission config: ${error.message}`));
    }
  }

  /**
   * Save configuration to file
   */
  private saveConfig(): void {
    try {
      const configDir = path.dirname(this.configFile);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
    } catch (error: any) {
      console.log(chalk.red(`❌ Could not save permission config: ${error.message}`));
    }
  }

  /**
   * Get tools by category
   */
  private getToolsByCategory(category: ToolCategory): string[] {
    const toolCategories: Record<ToolCategory, string[]> = {
      file: ['read_file', 'write_file', 'delete_file', 'list_directory', 'search_files'],
      code: ['generate_component', 'refine_component', 'validate_component', 'compile_prd', 'search_code'],
      web: ['web_search', 'fetch_url', 'scrape_content'],
      database: ['query_database', 'update_database', 'create_table'],
      api: ['api_call', 'webhook_trigger', 'oauth_request'],
      system: ['execute_command', 'install_package', 'run_tests', 'deploy_app'],
      custom: [],
    };

    return toolCategories[category] || [];
  }

  /**
   * Get category for a tool
   */
  private getToolCategory(toolName: string): ToolCategory {
    const categories: Record<string, ToolCategory> = {
      'read_file': 'file',
      'write_file': 'file',
      'delete_file': 'file',
      'list_directory': 'file',
      'search_files': 'file',
      'generate_component': 'code',
      'refine_component': 'code',
      'validate_component': 'code',
      'compile_prd': 'code',
      'search_code': 'code',
      'web_search': 'web',
      'fetch_url': 'web',
      'scrape_content': 'web',
      'query_database': 'database',
      'update_database': 'database',
      'create_table': 'database',
      'api_call': 'api',
      'webhook_trigger': 'api',
      'oauth_request': 'api',
      'execute_command': 'system',
      'install_package': 'system',
      'run_tests': 'system',
      'deploy_app': 'system',
    };

    return categories[toolName] || 'custom';
  }
}
