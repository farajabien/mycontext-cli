import fs from "fs";
import path from "path";
import { createPatch } from "diff";
import chalk from "chalk";

export interface ComponentMutation {
  id: string;
  componentPath: string;
  timestamp: string;
  actor: "human" | "ai" | "system";
  before: string;
  after: string;
  diff: string;
  patch: string;
  chainOfThought?: string;
  confidence?: number;
  riskFlags: string[];
  tests: {
    unit: string[];
    lint: string[];
    typecheck: string[];
    results: {
      unit: { passed: number; failed: number; details: string[] };
      lint: { passed: boolean; details: string[] };
      typecheck: { passed: boolean; details: string[] };
    };
  };
  status: "proposed" | "applied" | "rejected";
  appliedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export class MutationLogger {
  private mutationsDir: string;

  constructor(contextDir: string) {
    this.mutationsDir = path.join(contextDir, ".mycontext", "mutations");
    this.ensureMutationsDir();
  }

  private ensureMutationsDir(): void {
    if (!fs.existsSync(this.mutationsDir)) {
      fs.mkdirSync(this.mutationsDir, { recursive: true });
    }
  }

  private getComponentMutationsDir(componentName: string): string {
    const componentDir = path.join(this.mutationsDir, componentName);
    if (!fs.existsSync(componentDir)) {
      fs.mkdirSync(componentDir, { recursive: true });
    }
    return componentDir;
  }

  private generateMutationId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `mutation-${timestamp}-${random}`;
  }

  async logMutation(
    mutation: Omit<ComponentMutation, "id" | "timestamp">
  ): Promise<string> {
    const id = this.generateMutationId();
    const timestamp = new Date().toISOString();

    const fullMutation: ComponentMutation = {
      ...mutation,
      id,
      timestamp,
    };

    const componentDir = this.getComponentMutationsDir(mutation.componentPath);
    const mutationFile = path.join(componentDir, `${id}.json`);

    fs.writeFileSync(mutationFile, JSON.stringify(fullMutation, null, 2));

    console.log(chalk.green(`✅ Mutation logged: ${id}`));
    return id;
  }

  async getMutationHistory(
    componentPath: string
  ): Promise<ComponentMutation[]> {
    const componentDir = this.getComponentMutationsDir(componentPath);

    if (!fs.existsSync(componentDir)) {
      return [];
    }

    const files = fs
      .readdirSync(componentDir)
      .filter((file) => file.endsWith(".json"))
      .sort();

    const mutations: ComponentMutation[] = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(componentDir, file), "utf8");
        const mutation = JSON.parse(content) as ComponentMutation;
        mutations.push(mutation);
      } catch (error) {
        console.warn(
          chalk.yellow(`⚠️  Failed to parse mutation file: ${file}`)
        );
      }
    }

    return mutations;
  }

  async getLastApprovedVersion(
    componentPath: string
  ): Promise<ComponentMutation | null> {
    const mutations = await this.getMutationHistory(componentPath);

    // Find the most recent applied mutation
    const appliedMutations = mutations
      .filter((m) => m.status === "applied")
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

    return appliedMutations[0] || null;
  }

  async getLastProposedVersion(
    componentPath: string
  ): Promise<ComponentMutation | null> {
    const mutations = await this.getMutationHistory(componentPath);

    // Find the most recent proposed mutation
    const proposedMutations = mutations
      .filter((m) => m.status === "proposed")
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

    return proposedMutations[0] || null;
  }

  async updateMutationStatus(
    mutationId: string,
    status: "applied" | "rejected",
    reason?: string
  ): Promise<void> {
    const mutations = await this.getAllMutations();
    const mutation = mutations.find((m) => m.id === mutationId);

    if (!mutation) {
      throw new Error(`Mutation ${mutationId} not found`);
    }

    mutation.status = status;

    if (status === "applied") {
      mutation.appliedAt = new Date().toISOString();
    } else if (status === "rejected") {
      mutation.rejectedAt = new Date().toISOString();
      mutation.rejectionReason = reason;
    }

    const componentDir = this.getComponentMutationsDir(mutation.componentPath);
    const mutationFile = path.join(componentDir, `${mutationId}.json`);

    fs.writeFileSync(mutationFile, JSON.stringify(mutation, null, 2));

    console.log(
      chalk.green(`✅ Mutation ${mutationId} status updated to: ${status}`)
    );
  }

  private async getAllMutations(): Promise<ComponentMutation[]> {
    if (!fs.existsSync(this.mutationsDir)) {
      return [];
    }

    const allMutations: ComponentMutation[] = [];
    const componentDirs = fs.readdirSync(this.mutationsDir);

    for (const componentDir of componentDirs) {
      const componentPath = path.join(this.mutationsDir, componentDir);
      if (fs.statSync(componentPath).isDirectory()) {
        const mutations = await this.getMutationHistory(componentDir);
        allMutations.push(...mutations);
      }
    }

    return allMutations;
  }

  async createMutationFromRefinement(
    componentPath: string,
    before: string,
    after: string,
    chainOfThought: string,
    confidence: number,
    riskFlags: string[] = []
  ): Promise<string> {
    const diff = createPatch(componentPath, before, after);

    const mutation: Omit<ComponentMutation, "id" | "timestamp"> = {
      componentPath,
      actor: "ai",
      before,
      after,
      diff,
      patch: diff,
      chainOfThought,
      confidence,
      riskFlags,
      tests: {
        unit: [],
        lint: [],
        typecheck: [],
        results: {
          unit: { passed: 0, failed: 0, details: [] },
          lint: { passed: false, details: [] },
          typecheck: { passed: false, details: [] },
        },
      },
      status: "proposed",
    };

    return await this.logMutation(mutation);
  }

  async getMutationById(mutationId: string): Promise<ComponentMutation | null> {
    const mutations = await this.getAllMutations();
    return mutations.find((m) => m.id === mutationId) || null;
  }

  async deleteMutation(mutationId: string): Promise<void> {
    const mutations = await this.getAllMutations();
    const mutation = mutations.find((m) => m.id === mutationId);

    if (!mutation) {
      throw new Error(`Mutation ${mutationId} not found`);
    }

    const componentDir = this.getComponentMutationsDir(mutation.componentPath);
    const mutationFile = path.join(componentDir, `${mutationId}.json`);

    if (fs.existsSync(mutationFile)) {
      fs.unlinkSync(mutationFile);
      console.log(chalk.green(`✅ Mutation ${mutationId} deleted`));
    }
  }
}
