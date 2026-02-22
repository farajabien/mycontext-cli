import { ASL, EntitySpec, PermissionSpec, PageSpec } from "../types/asl";
import { ComponentInferenceEngine } from "./ComponentInferenceEngine";
import chalk from "chalk";

export interface ScaffoldManifest {
  fileTree: string;
  componentsSummary: {
    shadcn: string[];
    custom: number;
  };
  features: string[];
  totalFiles: number;
  estimatedTime: string;
}

/**
 * ScaffoldPreview - Generate human-readable preview of scaffold output
 *
 * Shows users exactly what will be generated before running scaffold:
 * - Complete file tree with descriptions
 * - Component counts and types
 * - Feature list
 * - Estimated generation time
 */
export class ScaffoldPreview {
  private componentInference: ComponentInferenceEngine;

  constructor(private asl: ASL) {
    this.componentInference = new ComponentInferenceEngine();
  }

  /**
   * Generate complete scaffold manifest for user review
   */
  generateManifest(): ScaffoldManifest {
    const fileTree = this.buildFileTree();
    const componentsSummary = this.summarizeComponents();
    const features = this.listFeatures();
    const totalFiles = this.countFiles();
    const estimatedTime = this.estimateTime();

    return {
      fileTree,
      componentsSummary,
      features,
      totalFiles,
      estimatedTime
    };
  }

  /**
   * Build visual file tree showing all generated files
   */
  private buildFileTree(): string {
    const lines: string[] = [];

    lines.push(`Project Structure (${this.countFiles()} files):`);
    lines.push('├── app/');

    // Auth routes (if auth configured)
    if (this.asl.auth) {
      const providerText = Array.isArray(this.asl.auth.provider) 
        ? this.asl.auth.provider.join(' + ')
        : this.asl.auth.provider;
      lines.push('│   ├── (auth)/');
      lines.push('│   │   ├── login/page.tsx          ' + chalk.gray('[Auth form with ' + providerText + ' provider]'));
      lines.push('│   │   └── register/page.tsx       ' + chalk.gray('[Registration flow]'));
    }

    // Dashboard routes (protected)
    lines.push('│   ├── (dashboard)/');
    lines.push('│   │   ├── layout.tsx              ' + chalk.gray('[Protected layout with RBAC]'));

    // Entity routes
    if (this.asl.entities) {
      const entityEntries = Object.entries(this.asl.entities);
      entityEntries.forEach(([entityName, entity], index) => {
        const entityLower = entityName.toLowerCase();
        const isLast = index === entityEntries.length - 1;
        const prefix = isLast ? '│   │   └── ' : '│   │   ├── ';

        lines.push(prefix + entityLower + 's/');
        lines.push(prefix.replace('└── ', '    ').replace('├── ', '│   ') + '├── page.tsx            ' + chalk.gray(`[${entityName}List with table]`));
        lines.push(prefix.replace('└── ', '    ').replace('├── ', '│   ') + '├── [id]/page.tsx       ' + chalk.gray(`[${entityName}Detail view]`));
        lines.push(prefix.replace('└── ', '    ').replace('├── ', '│   ') + '└── new/page.tsx        ' + chalk.gray(`[${entityName}Form]`));
      });
    }

    // Additional pages
    const customPages = this.asl.pages.filter(p =>
      !this.isEntityPage(p.path) && p.path !== '/' && p.path !== '/dashboard'
    );

    customPages.forEach((page, index) => {
      const isLast = index === customPages.length - 1;
      const prefix = isLast ? '│   │   └── ' : '│   │   ├── ';
      lines.push(prefix + page.path.substring(1) + '/page.tsx         ' + chalk.gray(`[${page.name}]`));
    });

    lines.push('│   └── page.tsx                    ' + chalk.gray('[Public landing page]'));

    // Components
    lines.push('├── components/');

    // shadCN components
    const shadcnComps = this.componentInference.inferNeededComponents(this.asl);
    lines.push('│   ├── ui/                         ' + chalk.gray(`[${shadcnComps.length} shadCN components]`));
    shadcnComps.slice(0, 5).forEach((comp, index) => {
      lines.push('│   │   ├── ' + comp + '.tsx');
    });
    if (shadcnComps.length > 5) {
      lines.push('│   │   └── ... (' + (shadcnComps.length - 5) + ' more)');
    }

    // Auth components
    if (this.asl.auth) {
      lines.push('│   ├── auth/');
      lines.push('│   │   ├── LoginForm.tsx           ' + chalk.gray('[Email/password form]'));
      lines.push('│   │   └── RegisterForm.tsx');
    }

    // Entity components
    if (this.asl.entities) {
      const entityEntries = Object.entries(this.asl.entities);
      entityEntries.forEach(([entityName, entity], index) => {
        const entityLower = entityName.toLowerCase();
        const isLast = index === entityEntries.length - 1;
        const prefix = isLast ? '│   └── ' : '│   ├── ';

        lines.push(prefix + entityLower + 's/');
        lines.push(prefix.replace('└── ', '    ').replace('├── ', '│   ') + '├── ' + entityName + 'Card.tsx');
        lines.push(prefix.replace('└── ', '    ').replace('├── ', '│   ') + '├── ' + entityName + 'Form.tsx');
        lines.push(prefix.replace('└── ', '    ').replace('├── ', '│   ') + '└── ' + entityName + 'List.tsx');
      });
    }

    // Actions
    lines.push('├── actions/');
    if (this.asl.auth) {
      lines.push('│   ├── auth.ts                     ' + chalk.gray('[login, register, logout]'));
    }
    if (this.asl.entities) {
      const entityEntries = Object.entries(this.asl.entities);
      entityEntries.forEach(([entityName, entity], index) => {
        const entityLower = entityName.toLowerCase();
        const isLast = index === entityEntries.length - 1 && !this.asl.auth;
        const prefix = isLast ? '│   └── ' : '│   ├── ';
        lines.push(prefix + entityLower + 's.ts                 ' + chalk.gray('[CRUD with RBAC checks]'));
      });
    }

    // Lib
    lines.push('├── lib/');
    if (this.asl.permissions && this.asl.permissions.length > 0) {
      lines.push('│   ├── guards/');
      lines.push('│   │   ├── withAuth.tsx            ' + chalk.gray('[Protected route HOC]'));
      lines.push('│   │   └── withRole.tsx            ' + chalk.gray('[Role-based access]'));
      lines.push('│   ├── instant.ts                  ' + chalk.gray('[InstantDB client]'));
      lines.push('│   └── permissions.ts              ' + chalk.gray('[RBAC helpers]'));
    } else {
      lines.push('│   └── instant.ts                  ' + chalk.gray('[InstantDB client]'));
    }

    // Types
    lines.push('├── types/');
    lines.push('│   └── schema.ts                   ' + chalk.gray('[TypeScript types from schema]'));

    // Root files
    const entityCount = this.asl.entities ? Object.keys(this.asl.entities).length : 0;
    lines.push('├── instant.schema.ts               ' + chalk.gray(`[InstantDB schema - ${entityCount} entities]`));
    if (this.asl.permissions && this.asl.permissions.length > 0) {
      lines.push('├── middleware.ts                   ' + chalk.gray('[Route protection]'));
    }
    lines.push('└── .env.local.example              ' + chalk.gray('[InstantDB + auth keys]'));

    return lines.join('\n');
  }

  /**
   * Summarize shadCN and custom components
   */
  private summarizeComponents(): { shadcn: string[]; custom: number } {
    const shadcnComps = this.componentInference.inferNeededComponents(this.asl);
    const customComps = this.countCustomComponents();

    return {
      shadcn: shadcnComps,
      custom: customComps
    };
  }

  /**
   * List all features that will be generated
   */
  private listFeatures(): string[] {
    const features: string[] = [];

    // Auth
    if (this.asl.auth) {
      const providers = Array.isArray(this.asl.auth.provider)
        ? (this.asl.auth.provider as string[]).map(p => p === 'email' ? 'Email/password' : p.replace('-', ' ')).join(', ')
        : (this.asl.auth.provider === 'email' ? 'Email/password' : this.asl.auth.provider.replace('-', ' '));
      features.push(`✓ ${providers} authentication`);
    }

    // RBAC
    if (this.asl.permissions && this.asl.permissions.length > 0) {
      const roles = [...new Set(this.asl.permissions.map(p => p.role))];
      features.push(`✓ Role-based access control (${roles.join(', ')})`);
    }

    // CRUD
    features.push(`✓ CRUD operations for all entities`);

    // Route protection
    if (this.asl.permissions && this.asl.permissions.length > 0) {
      features.push(`✓ Protected routes with middleware`);
    }

    // Type safety
    features.push(`✓ Type-safe database operations`);

    // Server actions
    features.push(`✓ Server actions with permissions`);

    return features;
  }

  /**
   * Count total files that will be generated
   */
  private countFiles(): number {
    let count = 0;

    // Base structure
    count += 3; // instant.schema.ts, .env.example, middleware.ts (if RBAC)

    // Auth pages
    if (this.asl.auth) {
      count += 2; // login, register
      count += 2; // LoginForm, RegisterForm
      count += 1; // auth actions
    }

    // Entity pages and components
    if (this.asl.entities) {
      const entityCount = Object.keys(this.asl.entities).length;
      count += entityCount * 7; // 3 pages + 3 components + 1 actions file per entity
    }

    // Custom pages
    const customPages = this.asl.pages.filter(p =>
      !this.isEntityPage(p.path) && p.path !== '/' && p.path !== '/dashboard'
    );
    count += customPages.length;

    // Guards and lib
    if (this.asl.permissions && this.asl.permissions.length > 0) {
      count += 3; // withAuth, withRole, permissions.ts
    }
    count += 1; // instant.ts

    // Types
    count += 1; // schema.ts

    // shadCN components
    const shadcnComps = this.componentInference.inferNeededComponents(this.asl);
    count += shadcnComps.length;

    // Layouts
    count += 1; // dashboard layout
    count += 1; // landing page

    return count;
  }

  /**
   * Count custom components (non-shadCN)
   */
  private countCustomComponents(): number {
    let count = 0;

    // Auth components
    if (this.asl.auth) {
      count += 2; // LoginForm, RegisterForm
    }

    // Entity components (Card, Form, List per entity)
    if (this.asl.entities) {
      count += Object.keys(this.asl.entities).length * 3;
    }

    return count;
  }

  /**
   * Estimate generation time based on complexity
   */
  private estimateTime(): string {
    // Base time: 30 seconds
    let seconds = 30;

    // Auth adds 20 seconds
    if (this.asl.auth) {
      seconds += 20;
    }

    // Each entity adds 10 seconds
    if (this.asl.entities) {
      seconds += Object.keys(this.asl.entities).length * 10;
    }

    // shadCN components add 2 seconds each
    const shadcnComps = this.componentInference.inferNeededComponents(this.asl);
    seconds += shadcnComps.length * 2;

    if (seconds < 60) {
      return `~${seconds} seconds`;
    } else {
      const minutes = Math.ceil(seconds / 60);
      return `~${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  }

  /**
   * Check if a page path is an entity page
   */
  private isEntityPage(path: string): boolean {
    if (!this.asl.entities) return false;
    const entityNames = Object.keys(this.asl.entities).map(name => '/' + name.toLowerCase() + 's');
    return entityNames.some(name => path.startsWith(name));
  }

  /**
   * Format and display the complete preview
   */
  display(): void {
    const manifest = this.generateManifest();

    console.log('\n' + chalk.blue('📋 Scaffold Preview - ' + this.asl.project.name));
    console.log(chalk.gray('━'.repeat(60)));
    console.log('\n' + manifest.fileTree);
    console.log('\n' + chalk.bold('Components Summary:'));
    console.log(manifest.componentsSummary);
    console.log('\n' + chalk.bold('Features:'));
    manifest.features.forEach(feature => {
      console.log('  • ' + feature);
    });
    console.log('\n' + chalk.gray(`Estimated time: ${manifest.estimatedTime}`));
    console.log(chalk.gray('━'.repeat(60)) + '\n');
  }
}
