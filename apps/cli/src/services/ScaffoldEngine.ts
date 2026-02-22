import { ASL, EntitySpec, AuthSpec, PermissionSpec, PageSpec } from "../types/asl";
import { EnhancedSpinner } from "../utils/spinner";
import chalk from "chalk";
import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs-extra";
import { ComponentInferenceEngine } from "./ComponentInferenceEngine";
import { TemplateEngine } from "./TemplateEngine";
import { ComponentRegistry } from "./ComponentRegistry";

export interface GenerationStats {
  pages: number;
  components: number;
  actions: number;
}

export interface SchemaStats {
  entities: number;
  fields: number;
  relations: number;
}

/**
 * ScaffoldEngine - Deterministic full-stack generation from ASL
 *
 * Generates a complete Next.js 15 application including:
 * - InstantDB schema
 * - TypeScript types
 * - Auth pages and components
 * - RBAC guards and middleware
 * - CRUD pages and server actions
 * - shadCN UI components (inferred)
 */
export class ScaffoldEngine {
  private componentInference: ComponentInferenceEngine;
  private templateEngine: TemplateEngine;
  private componentRegistry: ComponentRegistry;
  private spinner: EnhancedSpinner;

  constructor() {
    this.componentInference = new ComponentInferenceEngine();
    this.templateEngine = new TemplateEngine();
    this.componentRegistry = new ComponentRegistry();
    this.spinner = new EnhancedSpinner("Scaffolding...");
  }

  /**
   * Main scaffold orchestrator
   * Generates a complete Next.js application from ASL specification
   */
  async scaffold(asl: ASL): Promise<void> {
    const projectPath = path.resolve(process.cwd(), asl.project.name);

    try {
      // Step 1: Bootstrap Next.js
      this.spinner.updateText('[1/8] Bootstrapping Next.js 15 + App Router...');
      this.spinner.start();
      try {
        await this.bootstrapNextJS(projectPath, asl.project.name);
        this.spinner.success({ text: '[1/8] Next.js 15 + App Router ready' });
      } catch (err: any) {
        this.spinner.error({ text: '[1/8] Bootstrap failed' });
        console.error(chalk.red(`  Error bootstrapping: ${err.message}`));
        if (err.stdout) console.log(chalk.gray(`  Stdout: ${err.stdout.toString()}`));
        if (err.stderr) console.error(chalk.red(`  Stderr: ${err.stderr.toString()}`));
        throw err;
      }

      // Step 2: Install InstantDB
      this.spinner.updateText('[2/8] Installing InstantDB SDK...');
      this.spinner.start();
      await this.installInstantDB(projectPath);
      this.spinner.success({ text: '[2/8] InstantDB SDK installed' });

      // Step 3: Infer & Install shadCN components
      this.spinner.updateText('[3/8] Inferring & installing shadCN components...');
      this.spinner.start();
      const components = this.componentInference.inferNeededComponents(asl);
      await this.installShadCN(projectPath, components);
      this.spinner.success({
        text: `[3/8] Installed: ${components.slice(0, 5).join(', ')}${components.length > 5 ? ` + ${components.length - 5} more` : ''}`
      });

      // Step 4: Generate InstantDB schema
      this.spinner.updateText('[4/8] Generating InstantDB schema...');
      this.spinner.start();
      const entityArray = Object.values(asl.entities);
      const projectId = this.generateProjectId(asl.project.name);
      const schemaStats = await this.generateSchema(projectPath, entityArray, projectId);
      this.spinner.success({
        text: `[4/8] ${schemaStats.entities} entities, ${schemaStats.fields} fields, ${schemaStats.relations} relationships`
      });

      // Step 5: Generate TypeScript types
      this.spinner.updateText('[5/8] Generating TypeScript types...');
      this.spinner.start();
      await this.generateTypes(projectPath, entityArray);
      this.spinner.success({ text: '[5/8] Entity types, Insert types, WithRelations' });

      // Step 5.5: Generate root layout and foundational files
      this.spinner.updateText('[5.5/8] Generating app layout & design system...');
      this.spinner.start();
      await this.templateEngine.generateRootLayout(
        projectPath,
        asl.project.name,
        asl.project.description || ''
      );
      await this.templateEngine.generateLandingPage(
        projectPath,
        asl.project.name,
        asl.project.description || ''
      );
      await this.templateEngine.generateErrorBoundary(projectPath);
      await this.templateEngine.generateLoadingBoundary(projectPath);
      await this.templateEngine.generateNotFoundPage(projectPath);
      this.spinner.success({ text: '[5.5/8] App layout, error boundaries, landing page' });

      // Step 6: Generate auth system (if needed)
      if (asl.auth) {
        this.spinner.updateText('[6/8] Generating auth system...');
        this.spinner.start();
        await this.generateAuth(projectPath, asl.auth, asl.permissions || []);
        this.spinner.success({ text: '[6/8] Production auth with RSC + Server Actions' });
      } else {
        console.log(chalk.gray('  [6/8] No auth configured, skipping'));
      }

      // Step 7: Generate pages & components
      this.spinner.updateText('[7/8] Generating pages & components...');
      this.spinner.start();
      const genStats = await this.generatePagesAndComponents(projectPath, asl);
      this.spinner.success({
        text: `[7/8] ${genStats.pages} pages, ${genStats.components} components, ${genStats.actions} actions`
      });

      // Step 8: Initialize Living Brain
      this.spinner.updateText('[8/8] Initializing Living Brain...');
      this.spinner.start();
      await this.initializeBrain(projectPath, asl, components);
      this.spinner.success({ text: '[8/8] context.json, components_registry.json' });

      // Success message
      console.log(chalk.green('\n✅ ' + asl.project.name + ' is ready!'));
      console.log(chalk.gray(`\n   cd ${asl.project.name}`));
      console.log(chalk.gray(`   pnpm dev\n`));
      console.log(chalk.blue(`Then open: http://localhost:3000\n`));

    } catch (error) {
      this.spinner.error({ text: 'Scaffold failed' });
      throw error;
    }
  }

  /**
   * Step 1: Bootstrap Next.js project using create-next-app
   */
  private async bootstrapNextJS(projectPath: string, projectName: string): Promise<void> {
    if (fs.existsSync(projectPath)) {
      console.log(chalk.yellow(`  Directory ${projectName} already exists, skipping bootstrap`));
      return;
    }

    const command = `pnpm create next-app@latest ${projectName} ` +
      `--typescript --tailwind --eslint --app --no-src-dir ` +
      `--import-alias "@/*" --use-pnpm --no-git`;
    
    console.log(chalk.gray(`\n  [DEBUG] CWD: ${process.cwd()}`));
    console.log(chalk.gray(`  [DEBUG] Running: ${command}`));
    
    try {
      execSync(command, {
        stdio: 'inherit', // Change to inherit to see real-time output
        cwd: process.cwd(),
        env: { ...process.env, CI: 'true' } // Set CI=true to help with non-interactive
      });
    } catch (err: any) {
      console.error(chalk.red(`  [DEBUG] execSync threw: ${err.message}`));
      throw err;
    }
    
    if (!fs.existsSync(projectPath)) {
      throw new Error(`Directory ${projectPath} was not created by create-next-app (but no error was thrown)`);
    }
  }

  /**
   * Step 2: Install InstantDB SDK
   */
  private async installInstantDB(projectPath: string): Promise<void> {
    if (!fs.existsSync(projectPath)) {
      throw new Error(`Cannot install InstantDB: Directory ${projectPath} does not exist`);
    }
    
    execSync(
      'pnpm add @instantdb/react @instantdb/admin',
      {
        stdio: 'pipe',
        cwd: projectPath
      }
    );
  }

  /**
   * Step 3: Install shadCN UI and inferred components
   */
  private async installShadCN(projectPath: string, components: string[]): Promise<void> {
    // Initialize shadcn-ui
    execSync(
      'pnpm dlx shadcn-ui@latest init -y -d',
      {
        stdio: 'ignore',
        cwd: projectPath
      }
    );

    // Install each inferred component
    for (const component of components) {
      execSync(
        `pnpm dlx shadcn-ui@latest add ${component} -y`,
        {
          stdio: 'ignore',
          cwd: projectPath
        }
      );
    }
  }

  /**
   * Generate a project ID from name
   */
  private generateProjectId(projectName: string): string {
    return projectName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  /**
   * Step 4: Generate InstantDB schema from ASL entities
   */
  private async generateSchema(
    projectPath: string,
    entities: EntitySpec[],
    projectId: string
  ): Promise<SchemaStats> {
    const stats: SchemaStats = {
      entities: entities.length,
      fields: 0,
      relations: 0
    };

    // Build schema content
    let schemaContent = `import { i } from "@instantdb/react";\n\n`;
    schemaContent += `const graph = i.graph(\n`;
    schemaContent += `  "${projectId}",\n`;
    schemaContent += `  {\n`;

    // Generate each entity
    entities.forEach((entity, index) => {
      stats.fields += entity.fields.length;

      schemaContent += `    ${entity.name}: i.entity({\n`;

      entity.fields.forEach((field, fieldIndex) => {
        // Map ASL field types to InstantDB types
        const instantType = this.mapFieldType(field.type);
        schemaContent += `      ${field.name}: i.${instantType}()`;

        if (fieldIndex < entity.fields.length - 1) {
          schemaContent += ',';
        }
        schemaContent += '\n';
      });

      schemaContent += `    })`;

      if (index < entities.length - 1) {
        schemaContent += ',';
      }
      schemaContent += '\n';
    });

    schemaContent += `  }\n`;
    schemaContent += `);\n\n`;
    schemaContent += `export default graph;\n`;

    // Write schema file
    const schemaPath = path.join(projectPath, 'instant.schema.ts');
    await fs.writeFile(schemaPath, schemaContent, 'utf-8');

    return stats;
  }

  /**
   * Map ASL field types to InstantDB types
   */
  private mapFieldType(aslType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'date': 'date',
      'json': 'json',
      'ref': 'ref'
    };

    return typeMap[aslType] || 'string';
  }

  /**
   * Step 5: Generate TypeScript types from entities
   */
  private async generateTypes(projectPath: string, entities: EntitySpec[]): Promise<void> {
    let typesContent = `// Auto-generated types from InstantDB schema\n\n`;

    entities.forEach(entity => {
      // Base entity type
      typesContent += `export interface ${entity.name} {\n`;
      typesContent += `  id: string;\n`;
      typesContent += `  createdAt: Date;\n`;

      entity.fields.forEach(field => {
        const tsType = this.mapToTSType(field.type);
        typesContent += `  ${field.name}: ${tsType};\n`;
      });

      typesContent += `}\n\n`;

      // Insert type (Omit id and createdAt)
      typesContent += `export type ${entity.name}Insert = Omit<${entity.name}, 'id' | 'createdAt'>;\n\n`;

      // WithRelations type (placeholder for now)
      typesContent += `export type ${entity.name}WithRelations = ${entity.name};\n\n`;
    });

    const typesPath = path.join(projectPath, 'types', 'schema.ts');
    await fs.ensureDir(path.dirname(typesPath));
    await fs.writeFile(typesPath, typesContent, 'utf-8');
  }

  /**
   * Map ASL types to TypeScript types
   */
  private mapToTSType(aslType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'date': 'Date',
      'json': 'any',
      'ref': 'string'
    };

    return typeMap[aslType] || 'any';
  }

  /**
   * Step 6: Generate auth system (pages, guards, middleware)
   */
  private async generateAuth(
    projectPath: string,
    auth: AuthSpec,
    permissions: PermissionSpec[]
  ): Promise<void> {
    // Generate foundational files (utils, instant client, CSS, theme)
    await this.templateEngine.generateUtils(projectPath);
    await this.templateEngine.generateInstantClient(projectPath);
    await this.templateEngine.generateGlobalCSS(projectPath);
    await this.templateEngine.generateThemeProvider(projectPath);

    // Generate UI components
    await this.templateEngine.generateButton(projectPath);
    await this.templateEngine.generateUIComponents(projectPath);

    // Generate production auth pages with Suspense and Server Components
    await this.templateEngine.generateProductionLoginPage(projectPath);
    await this.templateEngine.generateProductionLoginForm(projectPath);
    await this.templateEngine.generateLoginSkeleton(projectPath);
    await this.templateEngine.generateProductionRegisterPage(projectPath);
    await this.templateEngine.generateRegisterForm(projectPath);

    // Generate Server Actions for auth
    await this.templateEngine.generateAuthActions(projectPath);

    // Generate guards (existing implementation)
    await this.templateEngine.generateGuards(projectPath, permissions);

    // Generate middleware (existing implementation)
    await this.templateEngine.generateMiddleware(projectPath, permissions);
  }

  /**
   * Step 7: Generate pages and components for each entity
   */
  private async generatePagesAndComponents(
    projectPath: string,
    asl: ASL
  ): Promise<GenerationStats> {
    const stats: GenerationStats = { pages: 0, components: 0, actions: 0 };

    // Generate dashboard layout with navigation
    const entities = Object.values(asl.entities).map(e => ({ name: e.name }));
    await this.templateEngine.generateDashboardLayout(
      projectPath,
      asl.project.name,
      entities
    );

    // For each entity, generate CRUD pages and components
    for (const entity of Object.values(asl.entities)) {
      await this.generateEntityCRUD(projectPath, entity, asl.permissions || []);
      stats.pages += 3; // list, detail, new
      stats.components += 3; // card, form, list
      stats.actions += 1; // actions file
    }

    // Generate custom pages from ASL.pages
    for (const page of asl.pages) {
      await this.generatePage(projectPath, page, asl);
      stats.pages += 1;
    }

    return stats;
  }

  /**
   * Generate CRUD pages and components for an entity
   */
  private async generateEntityCRUD(
    projectPath: string,
    entity: EntitySpec,
    permissions: PermissionSpec[]
  ): Promise<void> {
    // Generate production-ready CRUD pages with Suspense, streaming, and Server Actions
    await this.templateEngine.generateEntityCRUDPages(
      projectPath,
      entity.name,
      entity.fields
    );

    // Generate Server Actions for this entity
    await this.templateEngine.generateEntityActions(
      projectPath,
      entity.name,
      entity.fields
    );

    // Generate entity-specific CRUD components
    await this.templateEngine.generateEntityComponents(
      projectPath,
      entity.name
    );
  }

  /**
   * Generate a custom page from ASL
   */
  private async generatePage(
    projectPath: string,
    page: PageSpec,
    asl: ASL
  ): Promise<void> {
    // Placeholder implementation
    const pagePath = path.join(projectPath, 'app', page.path, 'page.tsx');
    await fs.ensureDir(path.dirname(pagePath));

    const pageContent = `export default function ${page.name}() {
  return <div>${page.name}</div>
}`;
    await fs.writeFile(pagePath, pageContent);
  }

  /**
   * Step 8: Initialize Living Brain (.mycontext directory)
   */
  private async initializeBrain(
    projectPath: string,
    asl: ASL,
    shadcnComponents: string[]
  ): Promise<void> {
    const brainPath = path.join(projectPath, '.mycontext');
    await fs.ensureDir(brainPath);

    // Save ASL
    const aslPath = path.join(brainPath, 'asl.json');
    await fs.writeJSON(aslPath, asl, { spaces: 2 });

    // Initialize component registry
    await this.componentRegistry.initialize(projectPath, asl, shadcnComponents);

    // Create .env.local.example
    const projectId = this.generateProjectId(asl.project.name);
    const envExample = `# InstantDB Configuration
NEXT_PUBLIC_INSTANT_APP_ID=${projectId}

# Add your InstantDB admin token here
# Get it from: https://instantdb.com/dash
INSTANT_ADMIN_TOKEN=your_admin_token_here
`;
    const envPath = path.join(projectPath, '.env.local.example');
    await fs.writeFile(envPath, envExample, 'utf-8');
  }
}
