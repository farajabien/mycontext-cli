import * as fs from "fs-extra";
import * as path from "path";
import * as yaml from "js-yaml";
import { glob } from "glob";

export interface WorkspaceMember {
  name: string;
  path: string;
  type: 'app' | 'package' | 'experiment' | 'other';
}

export class MonorepoScanner {
  private rootDir: string;

  constructor(rootDir: string = process.cwd()) {
    this.rootDir = rootDir;
  }

  /**
   * Detect if the current directory is a monorepo root
   */
  public async isMonorepo(): Promise<boolean> {
    return await fs.pathExists(path.join(this.rootDir, "pnpm-workspace.yaml")) ||
           await fs.pathExists(path.join(this.rootDir, "turbo.json"));
  }

  /**
   * Find all workspace members (apps, packages, etc.)
   */
  public async findWorkspaceMembers(): Promise<WorkspaceMember[]> {
    const pnpmWorkspacePath = path.join(this.rootDir, "pnpm-workspace.yaml");
    let patterns: string[] = [];

    if (await fs.pathExists(pnpmWorkspacePath)) {
      try {
        const content = await fs.readFile(pnpmWorkspacePath, "utf-8");
        const doc = yaml.load(content) as any;
        patterns = doc.packages || [];
      } catch (e) {
        console.error("Failed to parse pnpm-workspace.yaml:", e);
      }
    }

    if (patterns.length === 0) {
      // Fallback to searching apps/* and packages/* if no pnpm-workspace.yaml
      patterns = ["apps/*", "packages/*"];
    }

    const members: WorkspaceMember[] = [];

    for (const pattern of patterns) {
      const matches = await glob(pattern, { cwd: this.rootDir, absolute: true });
      for (const match of matches) {
        if (await fs.stat(match).then(s => s.isDirectory())) {
          const pkgJsonPath = path.join(match, "package.json");
          if (await fs.pathExists(pkgJsonPath)) {
            const pkgJson = await fs.readJson(pkgJsonPath);
            const relativePath = path.relative(this.rootDir, match);
            
            let type: WorkspaceMember['type'] = 'other';
            if (relativePath.startsWith('apps/')) type = 'app';
            else if (relativePath.startsWith('packages/')) type = 'package';
            else if (relativePath.startsWith('experiments/')) type = 'experiment';

            members.push({
              name: pkgJson.name || path.basename(match),
              path: match,
              type
            });
          }
        }
      }
    }

    return members;
  }
}
