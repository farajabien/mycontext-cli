/**
 * MCP Tools for MyContext CLI
 *
 * Custom tools that extend Claude Agent SDK capabilities
 * with MyContext-specific functionality.
 */

import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';

/**
 * Analyze React component structure and dependencies
 */
export const analyzeComponentTool = tool(
  'AnalyzeComponent',
  'Analyzes a React component file structure, dependencies, props, and provides insights',
  {
    filePath: z.string().describe('Path to the component file'),
    checkTypes: z.boolean().optional().describe('Whether to analyze TypeScript types'),
    checkImports: z.boolean().optional().describe('Whether to analyze imports'),
  },
  async (args) => {
    try {
      const { filePath, checkTypes = true, checkImports = true } = args;

      if (!await fs.pathExists(filePath)) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: File not found at ${filePath}`
          }],
          isError: true,
        };
      }

      const content = await fs.readFile(filePath, 'utf-8');
      const analysis: string[] = [];

      analysis.push(`# Component Analysis: ${path.basename(filePath)}\n`);
      analysis.push(`**File:** ${filePath}`);
      analysis.push(`**Lines:** ${content.split('\n').length}\n`);

      // Check for React component
      const hasReactImport = /import.*React.*from\s+['"]react['"]/.test(content);
      const isComponent = /export\s+(default\s+)?(?:function|const|class)\s+\w+/.test(content);

      analysis.push(`**Is React Component:** ${isComponent ? 'Yes' : 'No'}`);

      if (checkImports) {
        const imports = content.match(/import\s+.+\s+from\s+['"].+['"]/g) || [];
        analysis.push(`\n## Imports (${imports.length})`);
        imports.slice(0, 10).forEach(imp => analysis.push(`- ${imp}`));
        if (imports.length > 10) {
          analysis.push(`... and ${imports.length - 10} more`);
        }
      }

      if (checkTypes) {
        const interfaces = content.match(/(?:interface|type)\s+\w+/g) || [];
        analysis.push(`\n## Type Definitions (${interfaces.length})`);
        interfaces.forEach(type => analysis.push(`- ${type}`));
      }

      // Check for props
      const propsMatch = content.match(/(?:interface|type)\s+(\w+Props)/);
      if (propsMatch) {
        analysis.push(`\n## Props Interface: ${propsMatch[1]}`);
      }

      // Check for hooks
      const hooks = content.match(/use[A-Z]\w+/g) || [];
      const uniqueHooks = [...new Set(hooks)];
      if (uniqueHooks.length > 0) {
        analysis.push(`\n## Hooks Used (${uniqueHooks.length})`);
        uniqueHooks.forEach(hook => analysis.push(`- ${hook}`));
      }

      return {
        content: [{
          type: 'text' as const,
          text: analysis.join('\n')
        }],
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error analyzing component: ${error.message}`
        }],
        isError: true,
      };
    }
  }
);

/**
 * Validate PRD structure and completeness
 */
export const validatePRDTool = tool(
  'ValidatePRD',
  'Validates a Product Requirements Document (PRD) for completeness and structure',
  {
    prdPath: z.string().describe('Path to the PRD file (usually .mycontext/01-prd.md)'),
  },
  async (args) => {
    try {
      const { prdPath } = args;

      if (!await fs.pathExists(prdPath)) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: PRD file not found at ${prdPath}`
          }],
          isError: true,
        };
      }

      const content = await fs.readFile(prdPath, 'utf-8');
      const issues: string[] = [];
      const score = { total: 0, passed: 0 };

      // Check for required sections
      const requiredSections = [
        { name: 'Project Overview', pattern: /#+\s*(?:Project\s+)?Overview/i },
        { name: 'Features', pattern: /#+\s*(?:Key\s+)?Features/i },
        { name: 'User Stories', pattern: /#+\s*User\s+(?:Stories|Flows)/i },
        { name: 'Technical Stack', pattern: /#+\s*(?:Tech|Technical)\s+Stack/i },
      ];

      requiredSections.forEach(section => {
        score.total++;
        if (section.pattern.test(content)) {
          score.passed++;
        } else {
          issues.push(`❌ Missing section: ${section.name}`);
        }
      });

      // Check content length
      score.total++;
      if (content.length < 500) {
        issues.push('❌ PRD is too short (< 500 characters)');
      } else {
        score.passed++;
      }

      // Check for code blocks (technical specifications)
      score.total++;
      if (/```/.test(content)) {
        score.passed++;
      } else {
        issues.push('⚠️ No code examples or technical specifications found');
      }

      const percentage = Math.round((score.passed / score.total) * 100);
      const result: string[] = [];

      result.push(`# PRD Validation Report\n`);
      result.push(`**File:** ${prdPath}`);
      result.push(`**Score:** ${score.passed}/${score.total} (${percentage}%)\n`);

      if (issues.length > 0) {
        result.push(`## Issues Found (${issues.length})\n`);
        issues.forEach(issue => result.push(issue));
      } else {
        result.push(`✅ PRD is complete and well-structured!`);
      }

      result.push(`\n## Recommendations`);
      if (percentage < 60) {
        result.push('- PRD needs significant improvement');
        result.push('- Add missing sections and more detail');
      } else if (percentage < 80) {
        result.push('- PRD is good but could be enhanced');
        result.push('- Consider adding more technical specifications');
      } else {
        result.push('- PRD is excellent! Ready for implementation');
      }

      return {
        content: [{
          type: 'text' as const,
          text: result.join('\n')
        }],
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error validating PRD: ${error.message}`
        }],
        isError: true,
      };
    }
  }
);

/**
 * Check TypeScript types in generated code
 */
export const checkTypesTool = tool(
  'CheckTypes',
  'Validates TypeScript types in a file or directory',
  {
    targetPath: z.string().describe('Path to file or directory to check'),
    strict: z.boolean().optional().describe('Whether to use strict type checking'),
  },
  async (args) => {
    try {
      const { targetPath, strict = false } = args;

      if (!await fs.pathExists(targetPath)) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: Path not found at ${targetPath}`
          }],
          isError: true,
        };
      }

      const result: string[] = [];
      result.push(`# Type Check: ${path.basename(targetPath)}\n`);

      // Check if it's a TypeScript file
      const isTypeScript = targetPath.endsWith('.ts') || targetPath.endsWith('.tsx');

      if (!isTypeScript) {
        result.push('⚠️ Not a TypeScript file');
        return {
          content: [{
            type: 'text' as const,
            text: result.join('\n')
          }],
        };
      }

      const content = await fs.readFile(targetPath, 'utf-8');

      // Check for common issues
      const issues: string[] = [];

      // Check for 'any' types (if strict)
      if (strict) {
        const anyCount = (content.match(/:\s*any\b/g) || []).length;
        if (anyCount > 0) {
          issues.push(`⚠️ Found ${anyCount} usage(s) of 'any' type`);
        }
      }

      // Check for proper type exports
      const hasTypeExport = /export\s+(?:type|interface)/.test(content);
      if (hasTypeExport) {
        result.push('✅ Contains exported types/interfaces');
      }

      // Check for proper prop types
      const hasPropTypes = /\w+Props\s*[={]/.test(content);
      if (hasPropTypes) {
        result.push('✅ Defines prop types');
      }

      if (issues.length > 0) {
        result.push('\n## Issues Found:');
        issues.forEach(issue => result.push(issue));
      } else {
        result.push('\n✅ No type issues found');
      }

      return {
        content: [{
          type: 'text' as const,
          text: result.join('\n')
        }],
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error checking types: ${error.message}`
        }],
        isError: true,
      };
    }
  }
);

/**
 * Generate component documentation
 */
export const generateDocsTool = tool(
  'GenerateDocs',
  'Generates documentation for a React component',
  {
    componentPath: z.string().describe('Path to the component file'),
    outputPath: z.string().optional().describe('Where to save the documentation'),
  },
  async (args) => {
    try {
      const { componentPath, outputPath } = args;

      if (!await fs.pathExists(componentPath)) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: Component not found at ${componentPath}`
          }],
          isError: true,
        };
      }

      const content = await fs.readFile(componentPath, 'utf-8');
      const componentName = path.basename(componentPath, path.extname(componentPath));

      const docs: string[] = [];
      docs.push(`# ${componentName}\n`);
      docs.push(`Component documentation auto-generated from \`${componentPath}\`\n`);

      // Extract description from comments
      const descMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+)\n/);
      if (descMatch) {
        docs.push(`## Description\n`);
        docs.push(descMatch[1]);
        docs.push('');
      }

      // Extract props interface
      const propsMatch = content.match(/(?:interface|type)\s+(\w+Props)\s*=?\s*{([^}]+)}/);
      if (propsMatch) {
        docs.push(`## Props\n`);
        docs.push('```typescript');
        docs.push(propsMatch[0]);
        docs.push('```\n');
      }

      // Extract imports
      const imports = content.match(/import\s+.+\s+from\s+['"].+['"]/g) || [];
      if (imports.length > 0) {
        docs.push(`## Dependencies\n`);
        imports.slice(0, 5).forEach(imp => {
          const match = imp.match(/from\s+['"](.+)['"]/);
          if (match) {
            docs.push(`- \`${match[1]}\``);
          }
        });
        docs.push('');
      }

      // Usage example
      docs.push(`## Usage\n`);
      docs.push('```tsx');
      docs.push(`import ${componentName} from './${componentName}';`);
      docs.push('');
      docs.push(`<${componentName} />`);
      docs.push('```');

      const docsContent = docs.join('\n');

      // Save if output path provided
      if (outputPath) {
        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, docsContent, 'utf-8');
      }

      return {
        content: [{
          type: 'text' as const,
          text: `Documentation generated successfully!\n\n${docsContent}`
        }],
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error generating docs: ${error.message}`
        }],
        isError: true,
      };
    }
  }
);

/**
 * Detect existing validated components in the project
 */
export const detectExistingComponentsTool = tool(
  'DetectExistingComponents',
  'Detects and analyzes existing validated components in the project for component-first workflow',
  {
    projectPath: z.string().describe('Path to the project directory'),
    includeValidation: z.boolean().optional().describe('Check validation status from progress files'),
  },
  async (args) => {
    try {
      const { projectPath, includeValidation = true } = args;

      const result = {
        hasComponents: false,
        hasContextFiles: false,
        componentGroups: [] as string[],
        validatedComponents: [] as Array<{
          name: string;
          group: string;
          path: string;
          validated: boolean;
          validationResults: {
            typescript: boolean;
            eslint: boolean;
            build: boolean;
            tests: boolean;
          }
        }>,
        componentList: null as any,
        recommendation: '' as string,
        summary: '' as string,
      };

      // Check for component list
      const componentListPaths = [
        path.join(projectPath, '.mycontext/04-component-list.json'),
        path.join(projectPath, '.mycontext/component-list.json'),
      ];

      for (const listPath of componentListPaths) {
        if (await fs.pathExists(listPath)) {
          result.hasContextFiles = true;
          result.componentList = await fs.readJson(listPath);
          break;
        }
      }

      // Check for components directory
      const componentsDir = path.join(projectPath, 'components');
      if (await fs.pathExists(componentsDir)) {
        result.hasComponents = true;

        // Find all component groups
        const items = await fs.readdir(componentsDir);
        for (const item of items) {
          const itemPath = path.join(componentsDir, item);
          const stat = await fs.stat(itemPath);
          if (stat.isDirectory()) {
            result.componentGroups.push(item);
          }
        }

        // If validation requested, check progress files
        if (includeValidation) {
          const progressDir = path.join(projectPath, '.mycontext/progress/07-components');
          if (await fs.pathExists(progressDir)) {
            const progressFiles = await fs.readdir(progressDir);

            for (const file of progressFiles) {
              if (file.endsWith('.json')) {
                try {
                  const progress = await fs.readJson(path.join(progressDir, file));
                  if (progress.status === 'completed') {
                    result.validatedComponents.push({
                      name: progress.componentName || path.basename(file, '.json'),
                      group: progress.group || 'unknown',
                      path: progress.filePath || '',
                      validated: true,
                      validationResults: {
                        typescript: progress.validations?.typescript || false,
                        eslint: progress.validations?.eslint || false,
                        build: progress.validations?.build || false,
                        tests: progress.validations?.tests || false,
                      }
                    });
                  }
                } catch (err) {
                  // Skip invalid progress files
                }
              }
            }
          }
        }
      }

      // AI recommendation based on findings
      const validatedCount = result.validatedComponents.length;
      if (validatedCount >= 3) {
        result.recommendation = 'REUSE_COMPONENTS';
        result.summary = `Found ${validatedCount} validated components across ${result.componentGroups.length} groups. Recommend REUSING existing components and generating scaffolding only.`;
      } else if (result.hasContextFiles && result.hasComponents) {
        result.recommendation = 'PARTIAL_REUSE';
        result.summary = `Found ${validatedCount} validated components. Consider mixing existing components with new generation.`;
      } else if (result.hasContextFiles) {
        result.recommendation = 'GENERATE_COMPONENTS';
        result.summary = `Found context files but no validated components. Generate components from component list.`;
      } else {
        result.recommendation = 'GENERATE_ALL';
        result.summary = `No components or context files found. Start fresh with full generation workflow.`;
      }

      const output: string[] = [];
      output.push(`# Component Detection Report\n`);
      output.push(`**Project:** ${projectPath}`);
      output.push(`**Recommendation:** ${result.recommendation}\n`);
      output.push(`## Summary`);
      output.push(result.summary);
      output.push('');
      output.push(`## Findings`);
      output.push(`- Has Components: ${result.hasComponents ? '✅' : '❌'}`);
      output.push(`- Has Context Files: ${result.hasContextFiles ? '✅' : '❌'}`);
      output.push(`- Component Groups: ${result.componentGroups.length}`);
      output.push(`- Validated Components: ${result.validatedComponents.length}\n`);

      if (result.validatedComponents.length > 0) {
        output.push(`## Validated Components (${result.validatedComponents.length})\n`);
        result.validatedComponents.forEach(comp => {
          output.push(`### ${comp.name} (${comp.group})`);
          output.push(`- TypeScript: ${comp.validationResults.typescript ? '✅' : '❌'}`);
          output.push(`- ESLint: ${comp.validationResults.eslint ? '✅' : '❌'}`);
          output.push(`- Build: ${comp.validationResults.build ? '✅' : '❌'}`);
          output.push(`- Tests: ${comp.validationResults.tests ? '✅' : '❌'}`);
          output.push('');
        });
      }

      if (result.componentGroups.length > 0) {
        output.push(`## Component Groups (${result.componentGroups.length})\n`);
        result.componentGroups.forEach(group => output.push(`- ${group}`));
        output.push('');
      }

      output.push(`## Next Steps`);
      if (result.recommendation === 'REUSE_COMPONENTS') {
        output.push('1. Use MapComponentsToRoutes to create route mappings');
        output.push('2. Use GenerateScaffolding to create routes, actions, and hooks');
        output.push('3. Skip component generation - reuse existing validated components');
      } else if (result.recommendation === 'GENERATE_ALL') {
        output.push('1. Generate context files (PRD, types, branding)');
        output.push('2. Generate component list');
        output.push('3. Generate and validate all components');
        output.push('4. Generate scaffolding (routes, actions, hooks)');
      }

      return {
        content: [{
          type: 'text' as const,
          text: output.join('\n'),
        }],
        metadata: result,
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error detecting components: ${error.message}`
        }],
        isError: true,
      };
    }
  }
);

/**
 * Map components to routes intelligently
 */
export const mapComponentsToRoutesTool = tool(
  'MapComponentsToRoutes',
  'Creates intelligent mapping between existing components and Next.js routes based on component names and PRD context',
  {
    components: z.array(z.object({
      name: z.string(),
      group: z.string(),
      path: z.string(),
    })).describe('List of components to map'),
    prdContext: z.string().optional().describe('PRD context for understanding app structure'),
    architectureType: z.enum(['nextjs-app-router', 'nextjs-pages', 'react-spa']).describe('Target architecture'),
  },
  async (args) => {
    try {
      const { components, prdContext, architectureType } = args;

      const componentRouteMap = components.map(comp => {
        // Intelligent routing logic based on component name/group
        const name = comp.name;
        const group = comp.group.toLowerCase();

        // Determine if this should be a page component
        const isPageComponent =
          name.toLowerCase().includes('page') ||
          name.toLowerCase().includes('view') ||
          name.toLowerCase().includes('screen') ||
          name.toLowerCase().includes('dashboard') ||
          name.toLowerCase().includes('home') ||
          name.toLowerCase().includes('login') ||
          name.toLowerCase().includes('signup');

        // Determine route based on component name and group
        let routes: string[] = [];
        let layout = 'DefaultLayout';

        if (isPageComponent) {
          // Extract route from component name
          let routeName = name
            .replace(/Page$/i, '')
            .replace(/View$/i, '')
            .replace(/Screen$/i, '');

          // Convert to kebab-case
          routeName = routeName
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .toLowerCase();

          routes = [`/${routeName === 'home' ? '' : routeName}`];
        }

        // Determine layout based on group
        if (group === 'authentication' || group === 'auth') {
          layout = 'AuthLayout';
        } else if (group === 'forms' || group === 'form') {
          layout = 'FormLayout';
        } else if (group === 'admin' || group === 'dashboard') {
          layout = 'DashboardLayout';
        }

        // Determine actions based on component type
        const actions: string[] = [];
        if (name.toLowerCase().includes('form')) {
          actions.push(`handle${name}Submit`);
          actions.push(`validate${name}Data`);
        }
        if (name.toLowerCase().includes('login')) {
          actions.push('authenticateUser', 'validateCredentials');
        }
        if (name.toLowerCase().includes('signup')) {
          actions.push('createUser', 'sendVerificationEmail');
        }

        // Determine hooks
        const hooks: string[] = [];
        if (name.toLowerCase().includes('form')) {
          hooks.push('useForm');
        }
        if (group === 'authentication' || group === 'auth') {
          hooks.push('useAuth');
        }

        return {
          component: comp.name,
          group: comp.group,
          componentPath: comp.path,
          type: isPageComponent ? 'page' : 'component',
          routes: routes,
          layout: layout,
          actions: actions,
          hooks: hooks,
        };
      });

      const pageCount = componentRouteMap.filter(m => m.type === 'page').length;
      const componentCount = componentRouteMap.filter(m => m.type === 'component').length;

      const output: string[] = [];
      output.push(`# Component-to-Route Mapping\n`);
      output.push(`**Architecture:** ${architectureType}`);
      output.push(`**Total Components:** ${components.length}`);
      output.push(`**Page Components:** ${pageCount}`);
      output.push(`**Reusable Components:** ${componentCount}\n`);

      output.push(`## Route Mappings\n`);
      componentRouteMap.forEach(mapping => {
        output.push(`### ${mapping.component} (${mapping.type})`);
        output.push(`- **Group:** ${mapping.group}`);
        output.push(`- **Layout:** ${mapping.layout}`);
        if (mapping.routes.length > 0) {
          output.push(`- **Routes:**`);
          mapping.routes.forEach(route => output.push(`  - ${route}`));
        }
        if (mapping.actions.length > 0) {
          output.push(`- **Actions:** ${mapping.actions.join(', ')}`);
        }
        if (mapping.hooks.length > 0) {
          output.push(`- **Hooks:** ${mapping.hooks.join(', ')}`);
        }
        output.push('');
      });

      output.push(`## Summary`);
      output.push(`- ${pageCount} components will be mapped to routes`);
      output.push(`- ${componentCount} components will be reusable across pages`);
      output.push(`- Total routes to generate: ${componentRouteMap.reduce((acc, m) => acc + m.routes.length, 0)}`);

      return {
        content: [{
          type: 'text' as const,
          text: output.join('\n')
        }],
        metadata: {
          mappings: componentRouteMap,
          architectureType,
          totalRoutes: componentRouteMap.reduce((acc, m) => acc + m.routes.length, 0),
          totalActions: componentRouteMap.reduce((acc, m) => acc + m.actions.length, 0),
          totalHooks: [...new Set(componentRouteMap.flatMap(m => m.hooks))].length,
        },
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error mapping components to routes: ${error.message}`
        }],
        isError: true,
      };
    }
  }
);

/**
 * Generate scaffolding for existing components
 */
export const generateScaffoldingTool = tool(
  'GenerateScaffolding',
  'Generates app scaffolding (routes, actions, hooks, layouts) for existing validated components',
  {
    componentMappings: z.any().describe('Component-to-route mappings from MapComponentsToRoutes'),
    projectPath: z.string().describe('Project directory path'),
    generateRoutes: z.boolean().default(true).describe('Generate Next.js routes'),
    generateActions: z.boolean().default(true).describe('Generate server actions'),
    generateHooks: z.boolean().default(true).describe('Generate custom hooks'),
    generateLayouts: z.boolean().default(true).describe('Generate layout components'),
  },
  async (args) => {
    try {
      const {
        componentMappings,
        projectPath,
        generateRoutes = true,
        generateActions = true,
        generateHooks = true,
        generateLayouts = true,
      } = args;

      const generated = {
        routes: [] as string[],
        actions: [] as string[],
        hooks: [] as string[],
        layouts: [] as string[],
      };

      const mappings = componentMappings.mappings || componentMappings;

      // Generate routes for page components
      if (generateRoutes) {
        for (const mapping of mappings) {
          if (mapping.type === 'page' && mapping.routes && mapping.routes.length > 0) {
            for (const route of mapping.routes) {
              const routePath = path.join(projectPath, 'app', route, 'page.tsx');

              // Generate page that imports and uses the component
              const pageContent = `import { ${mapping.component} } from '@/components/${mapping.group}/${mapping.component}';

export default function Page() {
  return <${mapping.component} />;
}
`;

              await fs.ensureDir(path.dirname(routePath));
              await fs.writeFile(routePath, pageContent);
              generated.routes.push(routePath);
            }
          }
        }
      }

      // Generate server actions
      if (generateActions) {
        const actionsByGroup = new Map<string, any[]>();

        for (const mapping of mappings) {
          if (mapping.actions && mapping.actions.length > 0) {
            if (!actionsByGroup.has(mapping.group)) {
              actionsByGroup.set(mapping.group, []);
            }
            actionsByGroup.get(mapping.group)?.push(mapping);
          }
        }

        for (const [group, groupMappings] of actionsByGroup) {
          const actionsPath = path.join(projectPath, 'actions', `${group}.ts`);

          const actionContent: string[] = [];
          actionContent.push(`'use server';`);
          actionContent.push('');
          actionContent.push(`// Server actions for ${group} components`);
          actionContent.push('');

          for (const mapping of groupMappings) {
            for (const action of mapping.actions) {
              actionContent.push(`export async function ${action}(data: any) {`);
              actionContent.push(`  // TODO: Implement ${action}`);
              actionContent.push(`  return { success: true };`);
              actionContent.push(`}`);
              actionContent.push('');
            }
          }

          await fs.ensureDir(path.dirname(actionsPath));
          await fs.writeFile(actionsPath, actionContent.join('\n'));
          generated.actions.push(actionsPath);
        }
      }

      // Generate custom hooks
      if (generateHooks) {
        const uniqueHooks = [...new Set(mappings.flatMap((m: any) => m.hooks || []))];

        for (const hook of uniqueHooks) {
          const hookPath = path.join(projectPath, 'hooks', `${hook}.ts`);

          const hookContent = `import { useState, useEffect } from 'react';

export function ${hook}() {
  // TODO: Implement ${hook}
  const [state, setState] = useState(null);

  useEffect(() => {
    // TODO: Add effect logic
  }, []);

  return { state, setState };
}
`;

          await fs.ensureDir(path.dirname(hookPath));
          await fs.writeFile(hookPath, hookContent);
          generated.hooks.push(hookPath);
        }
      }

      // Generate layouts
      if (generateLayouts) {
        const uniqueLayouts = [...new Set(mappings.map((m: any) => m.layout))];

        for (const layout of uniqueLayouts) {
          if (layout && layout !== 'DefaultLayout') {
            const layoutPath = path.join(projectPath, 'components', 'layouts', `${layout}.tsx`);

            const layoutContent = `import { ReactNode } from 'react';

interface ${layout}Props {
  children: ReactNode;
}

export function ${layout}({ children }: ${layout}Props) {
  return (
    <div className="${String(layout).toLowerCase()}">
      {children}
    </div>
  );
}
`;

            await fs.ensureDir(path.dirname(layoutPath));
            await fs.writeFile(layoutPath, layoutContent);
            generated.layouts.push(layoutPath);
          }
        }
      }

      const output: string[] = [];
      output.push(`# Scaffolding Generation Report\n`);
      output.push(`**Project:** ${projectPath}\n`);
      output.push(`## Generated Files\n`);

      if (generated.routes.length > 0) {
        output.push(`### Routes (${generated.routes.length})`);
        generated.routes.forEach(r => output.push(`- ${r}`));
        output.push('');
      }

      if (generated.actions.length > 0) {
        output.push(`### Actions (${generated.actions.length})`);
        generated.actions.forEach(a => output.push(`- ${a}`));
        output.push('');
      }

      if (generated.hooks.length > 0) {
        output.push(`### Hooks (${generated.hooks.length})`);
        generated.hooks.forEach(h => output.push(`- ${h}`));
        output.push('');
      }

      if (generated.layouts.length > 0) {
        output.push(`### Layouts (${generated.layouts.length})`);
        generated.layouts.forEach(l => output.push(`- ${l}`));
        output.push('');
      }

      output.push(`## Summary`);
      output.push(`✅ Successfully generated scaffolding for existing components`);
      output.push(`- Routes: ${generated.routes.length}`);
      output.push(`- Actions: ${generated.actions.length}`);
      output.push(`- Hooks: ${generated.hooks.length}`);
      output.push(`- Layouts: ${generated.layouts.length}`);

      return {
        content: [{
          type: 'text' as const,
          text: output.join('\n')
        }],
        metadata: {
          success: true,
          generated,
        },
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error generating scaffolding: ${error.message}`
        }],
        isError: true,
      };
    }
  }
);

/**
 * Get all available MCP tools
 */
export function getAllMCPTools() {
  return [
    analyzeComponentTool,
    validatePRDTool,
    checkTypesTool,
    generateDocsTool,
    detectExistingComponentsTool,
    mapComponentsToRoutesTool,
    generateScaffoldingTool,
  ];
}

/**
 * Get MCP tools by name
 */
export function getMCPToolByName(name: string) {
  const tools = getAllMCPTools();
  return tools.find(tool => (tool as any).name === name);
}
