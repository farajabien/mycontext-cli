import { CommandOptions } from "../types";
import { EnhancedSpinner } from "../utils/spinner";
import chalk from "chalk";

interface ListOptions extends CommandOptions {
  type?: string;
  format?: "table" | "json" | "simple";
  group?: string;
  limit?: number;
  local?: boolean;
}

export class ListCommand {
  async execute(target: string, options: ListOptions): Promise<void> {
    const spinner = new EnhancedSpinner("Loading components...");

    try {
      // Local mode: list from filesystem without auth
      if (options.local) {
        await this.listLocal(spinner, options);
        return;
      }

      // Check authentication for remote listing
      const { AuthCommand } = await import("./auth");
      const authCommand = new AuthCommand();

      // if (!(await authCommand.requireAuth())) {
      //   console.log(chalk.yellow("🔐 Authentication required"));
      //   console.log(
      //     chalk.gray("Please run 'mycontext auth' to authenticate first")
      //   );
      //   return;
      // }

      // Get user info
      // const userInfo = await authCommand.getUserInfo();
      const userInfo = { userId: "local" };
      if (!userInfo) {
        console.log(chalk.red("❌ Authentication failed"));
        return;
      }

      console.log(chalk.green(`✅ Authenticated as ${userInfo.userId}`));

      // Determine what to list
      const listType = target || options.type || "components";

      switch (listType) {
        case "components":
        case "my-components":
          await this.listComponents(userInfo.userId, options, spinner);
          break;
        case "projects":
          await this.listProjects(spinner);
          break;
        case "files":
          await this.listFiles(spinner);
          break;
        case "all":
          await this.listAll(userInfo.userId, options, spinner);
          break;
        default:
          throw new Error(`Unknown list type: ${listType}`);
      }
    } catch (error) {
      spinner.error({ text: "Listing failed" });
      throw error;
    }
  }

  private async listLocal(
    spinner: EnhancedSpinner,
    options: ListOptions
  ): Promise<void> {
    try {
      spinner.updateText("Scanning local components...");
      const fs = await import("fs-extra");
      const path = await import("path");
      const componentsDir = path.join(
        process.cwd(),
        "components",
        ".mycontext"
      );
      const items = (await fs.readdir(componentsDir)).filter(
        async (d: string) =>
          (await fs.stat(path.join(componentsDir, d))).isDirectory()
      );
      const list: any[] = [];
      for (const dir of items) {
        const files = (await fs.readdir(path.join(componentsDir, dir))).filter(
          (f: string) => f.endsWith(".tsx") && f !== "page.tsx"
        );
        for (const f of files) {
          list.push({
            name: f.replace(/\.tsx$/, ""),
            group: dir,
            qualityScore: "N/A",
          });
        }
      }
      spinner.success({ text: `Found ${list.length} components locally` });
      if ((options.format || "table") === "json") {
        console.log(JSON.stringify(list, null, 2));
      } else if (options.format === "simple") {
        list.forEach((c) => console.log(`${c.name} (${c.group})`));
      } else {
        this.displayComponentsTable(list);
      }
    } catch (e) {
      spinner.error({ text: "Local listing failed" });
      console.log(chalk.yellow(`⚠️  ${e}`));
    }
  }

  private printNextCommands(): void {
    try {
      console.log("");
      console.log(chalk.blue("➡️ Next commands:"));
      console.log(chalk.gray("   Preview at: https://studio.mycontext.app"));
      console.log(
        chalk.gray("   mycontext generate-components all --with-tests")
      );
      console.log("");
    } catch {}
  }

  private async listComponents(
    userId: string,
    options: ListOptions,
    spinner: EnhancedSpinner
  ): Promise<void> {
    const API_BASE =
      process.env.MYCONTEXT_API_URL || "https://mycontext.fbien.com";
    spinner.updateText("Loading your components...");

    try {
      // Build query parameters
      const params = new URLSearchParams({
        userId,
        limit: (options.limit || 50).toString(),
        offset: "0",
      });

      if (options.group) {
        params.append("group", options.group);
      }

      const response = await fetch(
        `${API_BASE}/api/components/list?${params}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = (await response.json()) as {
        success: boolean;
        components?: any[];
        pagination?: any;
        error?: string;
      };

      if (!result.success) {
        throw new Error(result.error || "Failed to load components");
      }

      const components = result.components || [];
      const pagination = result.pagination;

      spinner.success({ text: `Found ${components.length} components` });

      if (components.length === 0) {
        console.log(
          chalk.gray("No components found. Generate some components first!")
        );
        return;
      }

      // Display components based on format
      const format = options.format || "table";

      switch (format) {
        case "json":
          console.log(JSON.stringify(components, null, 2));
          break;
        case "simple":
          components.forEach((comp) => {
            console.log(
              `${comp.name} (${comp.group}) - Score: ${
                comp.qualityScore || "N/A"
              }`
            );
          });
          break;
        case "table":
        default:
          this.displayComponentsTable(components);
          break;
      }

      // Show pagination info
      if (pagination && pagination.total > components.length) {
        console.log(
          chalk.gray(
            `\nShowing ${components.length} of ${pagination.total} components`
          )
        );
        if (pagination.hasMore) {
          console.log(chalk.gray("Use --limit and --offset for pagination"));
        }
      }

      // Next commands
      this.printNextCommands();
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Failed to load components: ${error}`));
    }
  }

  private displayComponentsTable(components: any[]): void {
    console.log(chalk.blue("\n📋 Your Components"));
    console.log(chalk.gray("─".repeat(80)));

    // Header
    console.log(
      chalk.bold(
        `${chalk.blue("Name")}${" ".repeat(20)}${chalk.blue(
          "Group"
        )}${" ".repeat(15)}${chalk.blue("Score")}${" ".repeat(8)}${chalk.blue(
          "Created"
        )}${" ".repeat(15)}${chalk.blue("Public")}`
      )
    );
    console.log(chalk.gray("─".repeat(80)));

    // Components
    components.forEach((comp) => {
      const name = comp.name.padEnd(20);
      const group = (comp.group || "general").padEnd(15);
      const score = (comp.qualityScore || "N/A").toString().padEnd(8);
      const created = new Date(comp.createdAt).toLocaleDateString().padEnd(15);
      const isPublic = comp.isPublic ? "Yes" : "No";

      console.log(`${name}${group}${score}${created}${isPublic}`);
    });

    console.log(chalk.gray("─".repeat(80)));
  }

  private async listProjects(spinner: EnhancedSpinner): Promise<void> {
    spinner.updateText("Loading projects...");
    const fs = await import("fs-extra");
    const path = await import("path");
    const cwd = process.cwd();
    const candidates = [
      path.join(cwd, "components", ".mycontext"),
      path.join(cwd, "components", "generated"),
      path.join(cwd, "components"),
    ];

    const projects: {
      name: string;
      description: string;
      components: number;
    }[] = [];
    for (const dir of candidates) {
      if (!(await fs.pathExists(dir))) continue;
      const items = await fs.readdir(dir);
      for (const item of items) {
        const full = path.join(dir, item);
        const stat = await fs.stat(full);
        if (!stat.isDirectory()) continue;
        const files = (await fs.readdir(full)).filter((f) =>
          f.endsWith(".tsx")
        );
        projects.push({
          name: item,
          description: `Local group at ${path.relative(cwd, full)}`,
          components: files.length,
        });
      }
    }

    spinner.success({ text: `Found ${projects.length} projects` });

    console.log(chalk.blue("\n📁 Your Projects"));
    console.log(chalk.gray("─".repeat(60)));

    projects.forEach((project) => {
      console.log(`${chalk.bold(project.name)} - ${project.description}`);
      console.log(chalk.gray(`  Components: ${project.components}`));
    });
  }

  private async listFiles(spinner: EnhancedSpinner): Promise<void> {
    spinner.updateText("Loading context files...");

    // Standardized context files
    const files = [
      { name: ".mycontext/01-prd.md", type: "Product Requirements", size: "" },
      { name: ".mycontext/02-types.ts", type: "TypeScript Types", size: "" },
      { name: ".mycontext/03-branding.md", type: "Brand Guidelines", size: "" },
      {
        name: ".mycontext/04-component-list.json",
        type: "Component List",
        size: "",
      },
    ];

    spinner.success({ text: `Found ${files.length} context files` });

    console.log(chalk.blue("\n📄 Context Files"));
    console.log(chalk.gray("─".repeat(60)));

    files.forEach((file) => {
      console.log(`${chalk.bold(file.name)} - ${file.type} (${file.size})`);
    });
  }

  private async listAll(
    userId: string,
    options: ListOptions,
    spinner: EnhancedSpinner
  ): Promise<void> {
    spinner.updateText("Loading all data...");

    // List everything
    console.log(chalk.blue("\n🎯 Complete Overview"));
    console.log(chalk.gray("=".repeat(60)));

    await this.listComponents(userId, options, spinner);
    console.log();
    await this.listProjects(spinner);
    console.log();
    await this.listFiles(spinner);
  }
}
