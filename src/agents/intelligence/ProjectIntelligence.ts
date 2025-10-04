import fs from "fs-extra";
import path from "path";
import { glob } from "glob";

export interface ProjectIntelligence {
  codebaseAwareness: CodebaseMap;
  architecturalPatterns: ArchitecturalPattern[];
  domainKnowledge: DomainKnowledge;
  historicalDecisions: DecisionRecord[];
}

export interface CodebaseMap {
  files: FileMetadata[];
  dependencies: DependencyGraph;
  componentHierarchy: ComponentHierarchy;
  apiEndpoints: APIEndpoint[];
}

export interface ArchitecturalPattern {
  id: string;
  name: string;
  pattern: string;
  frequency: number;
  confidence: number;
  examples: string[];
  context: string;
}

export interface DomainKnowledge {
  businessTerms: BusinessTerm[];
  userPersonas: UserPersona[];
  workflows: BusinessWorkflow[];
  rules: BusinessRule[];
}

export interface DecisionRecord {
  id: string;
  decision: string;
  reasoning: string;
  alternatives: string[];
  timestamp: Date;
  context: Record<string, any>;
  outcome?: string;
}

export interface FileMetadata {
  path: string;
  type: "component" | "page" | "api" | "utility" | "test" | "config";
  language: string;
  complexity: number;
  dependencies: string[];
  exports: string[];
  patterns: string[];
  lastModified: Date;
}

export class ProjectIntelligenceEngine {
  private projectPath: string;
  private intelligence: ProjectIntelligence;

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = projectPath;
    this.intelligence = {
      codebaseAwareness: {
        files: [],
        dependencies: {},
        componentHierarchy: {},
        apiEndpoints: [],
      },
      architecturalPatterns: [],
      domainKnowledge: {
        businessTerms: [],
        userPersonas: [],
        workflows: [],
        rules: [],
      },
      historicalDecisions: [],
    };
  }

  async analyzeProject(): Promise<ProjectIntelligence> {
    console.log("🧠 Analyzing project intelligence...");

    // Analyze codebase structure
    await this.analyzeCodebase();

    // Extract architectural patterns
    await this.extractPatterns();

    // Build domain knowledge from context files
    await this.extractDomainKnowledge();

    // Load historical decisions
    await this.loadHistoricalDecisions();

    // Save intelligence cache
    await this.saveIntelligenceCache();

    return this.intelligence;
  }

  private async analyzeCodebase(): Promise<void> {
    const pattern = "**/*.{ts,tsx,js,jsx}";

    const files = await glob(pattern, {
      cwd: this.projectPath,
      ignore: ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**"],
    });

    for (const file of files) {
      const metadata = await this.analyzeFile(file);
      this.intelligence.codebaseAwareness.files.push(metadata);
    }

    // Analyze API routes
    await this.analyzeAPIRoutes();
  }

  private async analyzeFile(filePath: string): Promise<FileMetadata> {
    const fullPath = path.join(this.projectPath, filePath);
    const content = await fs.readFile(fullPath, "utf-8");
    const stats = await fs.stat(fullPath);

    return {
      path: filePath,
      type: this.detectFileType(filePath, content),
      language: this.detectLanguage(filePath),
      complexity: this.calculateComplexity(content),
      dependencies: this.extractDependencies(content),
      exports: this.extractExports(content),
      patterns: this.detectPatterns(content),
      lastModified: stats.mtime,
    };
  }

  private detectFileType(
    filePath: string,
    content: string
  ): FileMetadata["type"] {
    if (filePath.includes("/api/") || filePath.includes("/pages/api/"))
      return "api";
    if (filePath.includes(".test.") || filePath.includes(".spec."))
      return "test";
    if (filePath.includes("config") || filePath.endsWith(".config.js"))
      return "config";
    if (
      filePath.includes("/pages/") ||
      (filePath.includes("/app/") && filePath.includes("page."))
    )
      return "page";
    if (
      content.includes("export default function") ||
      content.includes("export const")
    )
      return "component";
    return "utility";
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath);
    const langMap: Record<string, string> = {
      ".ts": "typescript",
      ".tsx": "typescript-react",
      ".js": "javascript",
      ".jsx": "javascript-react",
      ".py": "python",
      ".rb": "ruby",
      ".go": "go",
      ".rs": "rust",
      ".vue": "vue",
      ".svelte": "svelte",
    };
    return langMap[ext] || "unknown";
  }

  private calculateComplexity(content: string): number {
    // Simple complexity calculation based on cyclomatic complexity indicators
    const complexityIndicators = [
      /if\s*\(/g,
      /else\s+if/g,
      /switch\s*\(/g,
      /case\s+/g,
      /for\s*\(/g,
      /while\s*\(/g,
      /catch\s*\(/g,
      /\?\s*.*\s*:/g, // ternary
      /&&|\|\|/g, // logical operators
    ];

    let complexity = 1; // Base complexity
    for (const pattern of complexityIndicators) {
      const matches = content.match(pattern);
      if (matches) complexity += matches.length;
    }

    return complexity;
  }

  private extractDependencies(content: string): string[] {
    const imports: string[] = [];

    // ES6 imports
    const importMatches = content.match(/import.*from\s+['"]([^'"]+)['"]/g);
    if (importMatches) {
      imports.push(
        ...importMatches
          .map((match) => {
            const moduleMatch = match.match(/from\s+['"]([^'"]+)['"]/);
            return moduleMatch ? moduleMatch[1] : "";
          })
          .filter(Boolean)
      );
    }

    // CommonJS requires
    const requireMatches = content.match(/require\(['"]([^'"]+)['"]\)/g);
    if (requireMatches) {
      imports.push(
        ...requireMatches
          .map((match) => {
            const moduleMatch = match.match(/require\(['"]([^'"]+)['"]\)/);
            return moduleMatch ? moduleMatch[1] : "";
          })
          .filter(Boolean)
      );
    }

    return [...new Set(imports)];
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];

    // Named exports
    const namedExports = content.match(
      /export\s+(?:const|function|class|interface|type)\s+(\w+)/g
    );
    if (namedExports) {
      exports.push(...namedExports.map((exp) => exp.split(/\s+/).pop() || ""));
    }

    // Default exports
    if (content.includes("export default")) {
      const defaultMatch = content.match(
        /export\s+default\s+(?:function\s+)?(\w+)/
      );
      if (defaultMatch) exports.push(defaultMatch[1]);
    }

    return exports.filter(Boolean);
  }

  private detectPatterns(content: string): string[] {
    const patterns: string[] = [];

    // React patterns
    if (content.includes("useState")) patterns.push("react-hooks");
    if (content.includes("useEffect")) patterns.push("react-effects");
    if (content.includes("createContext")) patterns.push("react-context");
    if (content.includes("forwardRef")) patterns.push("react-ref-forwarding");

    // TypeScript patterns
    if (content.includes("interface ")) patterns.push("typescript-interfaces");
    if (content.includes("type ")) patterns.push("typescript-types");
    if (content.includes("generic")) patterns.push("typescript-generics");

    // Next.js patterns
    if (content.includes("getServerSideProps")) patterns.push("nextjs-ssr");
    if (content.includes("getStaticProps")) patterns.push("nextjs-ssg");
    if (content.includes("use client"))
      patterns.push("nextjs-client-components");

    // Architecture patterns
    if (content.includes("Provider")) patterns.push("provider-pattern");
    if (content.includes("Context")) patterns.push("context-pattern");
    if (content.includes("HOC") || content.includes("withAuth"))
      patterns.push("hoc-pattern");

    return patterns;
  }

  private async analyzeAPIRoutes(): Promise<void> {
    const apiFiles = this.intelligence.codebaseAwareness.files.filter(
      (f) => f.type === "api"
    );

    for (const file of apiFiles) {
      const fullPath = path.join(this.projectPath, file.path);
      const content = await fs.readFile(fullPath, "utf-8");

      // Extract HTTP methods
      const methods = this.extractHTTPMethods(content);
      const route = this.convertFilePathToRoute(file.path);

      this.intelligence.codebaseAwareness.apiEndpoints.push({
        path: route,
        methods,
        file: file.path,
        middleware: this.extractMiddleware(content),
        parameters: this.extractParameters(content),
      });
    }
  }

  private extractHTTPMethods(content: string): string[] {
    const methods: string[] = [];
    const httpMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"];

    for (const method of httpMethods) {
      if (
        content.includes(`export async function ${method}`) ||
        content.includes(`async function ${method}`) ||
        content.includes(`'${method}'`) ||
        content.includes(`"${method}"`)
      ) {
        methods.push(method);
      }
    }

    return methods;
  }

  private convertFilePathToRoute(filePath: string): string {
    // Convert Next.js file-based routing to actual routes
    return filePath
      .replace(/^.*\/api\//, "/api/")
      .replace(/\/route\.(ts|js)$/, "")
      .replace(/\[([^\]]+)\]/g, ":$1")
      .replace(/\/index$/, "");
  }

  private extractMiddleware(content: string): string[] {
    const middleware: string[] = [];

    // Common middleware patterns
    const middlewarePatterns = [
      /auth/i,
      /cors/i,
      /validate/i,
      /middleware/i,
      /guard/i,
    ];

    for (const pattern of middlewarePatterns) {
      if (pattern.test(content)) {
        middleware.push(pattern.source);
      }
    }

    return middleware;
  }

  private extractParameters(content: string): string[] {
    const params: string[] = [];

    // Extract query parameters
    const queryParams = content.match(/query\.(\w+)/g);
    if (queryParams) {
      params.push(...queryParams.map((p) => p.replace("query.", "")));
    }

    // Extract path parameters
    const pathParams = content.match(/params\.(\w+)/g);
    if (pathParams) {
      params.push(...pathParams.map((p) => p.replace("params.", "")));
    }

    return [...new Set(params)];
  }

  private async extractPatterns(): Promise<void> {
    // Analyze all detected patterns and calculate frequency
    const patternCounts: Record<string, number> = {};

    for (const file of this.intelligence.codebaseAwareness.files) {
      for (const pattern of file.patterns) {
        patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
      }
    }

    const totalFiles = this.intelligence.codebaseAwareness.files.length;

    for (const [pattern, count] of Object.entries(patternCounts)) {
      this.intelligence.architecturalPatterns.push({
        id: `pattern_${pattern}`,
        name: pattern,
        pattern: pattern,
        frequency: count,
        confidence: count / totalFiles,
        examples: this.findPatternExamples(pattern),
        context: this.determinePatternContext(pattern),
      });
    }
  }

  private findPatternExamples(pattern: string): string[] {
    return this.intelligence.codebaseAwareness.files
      .filter((f) => f.patterns.includes(pattern))
      .slice(0, 3)
      .map((f) => f.path);
  }

  private determinePatternContext(pattern: string): string {
    const contextMap: Record<string, string> = {
      "react-hooks": "State management and side effects in React components",
      "typescript-interfaces": "Type definitions and contracts",
      "nextjs-ssr": "Server-side rendering for dynamic content",
      "provider-pattern": "Dependency injection and state sharing",
      "hoc-pattern": "Component composition and behavior enhancement",
    };

    return contextMap[pattern] || "General application pattern";
  }

  private async extractDomainKnowledge(): Promise<void> {
    const contextDir = path.join(this.projectPath, ".mycontext");

    if (await fs.pathExists(contextDir)) {
      // Extract from PRD
      await this.extractFromPRD(contextDir);

      // Extract from types
      await this.extractFromTypes(contextDir);

      // Extract from brand guidelines
      await this.extractFromBrand(contextDir);
    }
  }

  private async extractFromPRD(contextDir: string): Promise<void> {
    const prdPath = path.join(contextDir, "01-prd.md");
    if (await fs.pathExists(prdPath)) {
      const content = await fs.readFile(prdPath, "utf-8");

      // Extract user personas
      const personaMatches = content.match(/\*\*([^*]+)\*\*:\s*([^*\n]+)/g);
      if (personaMatches) {
        for (const match of personaMatches) {
          const [, name, description] =
            match.match(/\*\*([^*]+)\*\*:\s*([^*\n]+)/) || [];
          if (name && description) {
            this.intelligence.domainKnowledge.userPersonas.push({
              name: name.trim(),
              description: description.trim(),
              needs: [],
              behaviors: [],
            });
          }
        }
      }

      // Extract business terms
      const termMatches = content.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g);
      if (termMatches) {
        const uniqueTerms = [...new Set(termMatches)].filter(
          (term) =>
            term.length > 3 && !["User", "Component", "System"].includes(term)
        );

        for (const term of uniqueTerms.slice(0, 10)) {
          this.intelligence.domainKnowledge.businessTerms.push({
            term,
            definition: `Domain term extracted from PRD: ${term}`,
            context: "PRD document",
            aliases: [],
          });
        }
      }
    }
  }

  private async extractFromTypes(contextDir: string): Promise<void> {
    const typesPath = path.join(contextDir, "02-types.ts");
    if (await fs.pathExists(typesPath)) {
      const content = await fs.readFile(typesPath, "utf-8");

      // Extract interface names as business entities
      const interfaceMatches = content.match(/interface\s+(\w+)/g);
      if (interfaceMatches) {
        for (const match of interfaceMatches) {
          const interfaceName = match.replace("interface ", "");
          this.intelligence.domainKnowledge.businessTerms.push({
            term: interfaceName,
            definition: `Type definition for ${interfaceName}`,
            context: "Type system",
            aliases: [],
          });
        }
      }
    }
  }

  private async extractFromBrand(contextDir: string): Promise<void> {
    const brandPath = path.join(contextDir, "03-branding.md");
    if (await fs.pathExists(brandPath)) {
      const content = await fs.readFile(brandPath, "utf-8");

      // Extract brand values and principles
      const principleMatches = content.match(/\*\*([^*]+)\*\*:\s*([^*\n]+)/g);
      if (principleMatches) {
        for (const match of principleMatches) {
          const [, principle, description] =
            match.match(/\*\*([^*]+)\*\*:\s*([^*\n]+)/) || [];
          if (principle && description) {
            this.intelligence.domainKnowledge.rules.push({
              id: `brand_${principle.toLowerCase().replace(/\s+/g, "_")}`,
              rule: principle,
              description: description.trim(),
              scope: "Brand guidelines",
              priority: "medium",
            });
          }
        }
      }
    }
  }

  private async loadHistoricalDecisions(): Promise<void> {
    const decisionsPath = path.join(
      this.projectPath,
      ".mycontext",
      "decisions.json"
    );

    if (await fs.pathExists(decisionsPath)) {
      try {
        const decisions = await fs.readJson(decisionsPath);
        this.intelligence.historicalDecisions = decisions;
      } catch (error) {
        console.warn("Could not load historical decisions:", error);
      }
    }
  }

  async recordDecision(
    decision: Omit<DecisionRecord, "id" | "timestamp">
  ): Promise<void> {
    const record: DecisionRecord = {
      id: `decision_${Date.now()}`,
      timestamp: new Date(),
      ...decision,
    };

    this.intelligence.historicalDecisions.push(record);
    await this.saveHistoricalDecisions();
  }

  private async saveHistoricalDecisions(): Promise<void> {
    const decisionsPath = path.join(
      this.projectPath,
      ".mycontext",
      "decisions.json"
    );
    await fs.ensureDir(path.dirname(decisionsPath));
    await fs.writeJson(decisionsPath, this.intelligence.historicalDecisions, {
      spaces: 2,
    });
  }

  private async saveIntelligenceCache(): Promise<void> {
    const cachePath = path.join(
      this.projectPath,
      ".mycontext",
      "intelligence-cache.json"
    );
    await fs.ensureDir(path.dirname(cachePath));
    await fs.writeJson(cachePath, this.intelligence, { spaces: 2 });
  }

  async getRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];

    // Analyze patterns for recommendations
    const patterns = this.intelligence.architecturalPatterns;

    // Check for missing common patterns
    const hasReactHooks = patterns.some((p) => p.name === "react-hooks");
    const hasTypeScript = patterns.some((p) => p.name.includes("typescript"));

    if (!hasReactHooks && patterns.some((p) => p.name.includes("react"))) {
      recommendations.push("Consider using React hooks for state management");
    }

    if (!hasTypeScript) {
      recommendations.push("Consider adding TypeScript for better type safety");
    }

    // Check complexity recommendations
    const highComplexityFiles =
      this.intelligence.codebaseAwareness.files.filter(
        (f) => f.complexity > 10
      );

    if (highComplexityFiles.length > 0) {
      recommendations.push(
        `Consider refactoring ${highComplexityFiles.length} high-complexity files`
      );
    }

    return recommendations;
  }
}

// Additional interfaces
interface APIEndpoint {
  path: string;
  methods: string[];
  file: string;
  middleware: string[];
  parameters: string[];
}

interface ComponentHierarchy {
  [componentName: string]: {
    children: string[];
    parent?: string;
    props: string[];
  };
}

interface DependencyGraph {
  [fileName: string]: string[];
}

interface BusinessTerm {
  term: string;
  definition: string;
  context: string;
  aliases: string[];
}

interface UserPersona {
  name: string;
  description: string;
  needs: string[];
  behaviors: string[];
}

interface BusinessWorkflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  actors: string[];
}

interface WorkflowStep {
  id: string;
  action: string;
  actor: string;
  condition?: string;
}

interface BusinessRule {
  id: string;
  rule: string;
  description: string;
  scope: string;
  priority: "low" | "medium" | "high";
}
