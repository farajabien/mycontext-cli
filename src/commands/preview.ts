import chalk from "chalk";
import prompts from "prompts";
import { EnhancedSpinner } from "../utils/spinner";
import { FileSystemManager } from "../utils/fileSystem";
import { CommandOptions } from "../types";
import * as fs from "fs-extra";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface PreviewOptions extends CommandOptions {
  type?: "brand" | "components" | "group" | "generated";
  open?: boolean;
  port?: number;
}

export class PreviewCommand {
  private fs = new FileSystemManager();

  async execute(target: string, options: PreviewOptions): Promise<void> {
    const spinner = new EnhancedSpinner("Preparing preview...");

    try {
      console.log(chalk.blue.bold("🎨 MyContext Preview\n"));

      // Determine preview type
      const previewType = options.type || target;

      switch (previewType) {
        case "brand":
          await this.previewBrand(options, spinner);
          break;
        case "components":
          await this.previewComponents(options, spinner);
          break;
        case "generated":
          await this.previewGeneratedComponents(target, options, spinner);
          break;
        default:
          // If it's not a known type, treat it as a group name
          await this.previewGroup(target, options, spinner);
          break;
      }
    } catch (error) {
      spinner.error({ text: "Preview failed" });
      throw error;
    }
  }

  private async previewBrand(
    options: PreviewOptions,
    spinner: EnhancedSpinner
  ): Promise<void> {
    spinner.updateText("Reading branding guidelines...");

    // Check if branding file exists
    let brandingPath = ".mycontext/03-branding.md";
    if (!(await this.fs.exists(brandingPath))) {
      brandingPath = ".mycontext/branding.md";
    }
    if (!(await this.fs.exists(brandingPath))) {
      brandingPath = "context/branding.md";
    }
    if (!(await this.fs.exists(brandingPath))) {
      throw new Error(
        'No branding file found. Run "mycontext generate brand" first.'
      );
    }

    const brandingContent = await this.fs.readFile(brandingPath);

    spinner.updateText("Generating brand preview...");

    // Generate HTML preview
    const htmlContent = this.generateBrandPreviewHTML(brandingContent);

    // Create preview directory
    const previewDir = "preview";
    await this.fs.ensureDir(previewDir);

    // Write HTML file
    const htmlPath = path.join(previewDir, "brand-preview.html");
    await this.fs.writeFile(htmlPath, htmlContent);

    spinner.success({ text: "Brand preview generated successfully!" });

    console.log(chalk.green("\n✅ Brand Preview Ready:"));
    console.log(chalk.gray(`  📄 ${htmlPath}`));

    // Open in browser if requested
    if (options.open !== false) {
      await this.openInBrowser(htmlPath);
    } else {
      console.log(chalk.blue("\n🌐 To view the preview:"));
      console.log(chalk.gray(`  open ${htmlPath}`));
    }

    // Next commands
    this.printNextCommands();
  }

  private async previewComponents(
    options: PreviewOptions,
    spinner: EnhancedSpinner
  ): Promise<void> {
    spinner.updateText("Reading component list...");

    // Check if component list exists
    let componentListPath = ".mycontext/04-component-list.json";
    if (!(await this.fs.exists(componentListPath))) {
      componentListPath = ".mycontext/component-list.json";
    }
    if (!(await this.fs.exists(componentListPath))) {
      componentListPath = "context/component-list.json";
    }
    if (!(await this.fs.exists(componentListPath))) {
      throw new Error(
        'No component list found. Run "mycontext generate components-list" first.'
      );
    }

    const componentListContent = await this.fs.readFile(componentListPath);
    const componentList = JSON.parse(componentListContent);

    spinner.updateText("Generating component preview...");

    // Generate HTML preview
    const htmlContent = this.generateComponentPreviewHTML(componentList);

    // Create preview directory
    const previewDir = "preview";
    await this.fs.ensureDir(previewDir);

    // Write HTML file
    const htmlPath = path.join(previewDir, "components-preview.html");
    await this.fs.writeFile(htmlPath, htmlContent);

    spinner.success({ text: "Component preview generated successfully!" });

    console.log(chalk.green("\n✅ Component Preview Ready:"));
    console.log(chalk.gray(`  📄 ${htmlPath}`));

    // Show component summary
    if (componentList.groups) {
      console.log(chalk.blue("\n📋 Component Groups:"));
      componentList.groups.forEach((group: any) => {
        console.log(
          chalk.gray(
            `  • ${group.name} (${group.components?.length || 0} components)`
          )
        );
      });
    }

    // Open in browser if requested
    if (options.open !== false) {
      await this.openInBrowser(htmlPath);
    } else {
      console.log(chalk.blue("\n🌐 To view the preview:"));
      console.log(chalk.gray(`  open ${htmlPath}`));
    }

    // Next commands
    this.printNextCommands();
  }

  private async previewGeneratedComponents(
    target: string,
    options: PreviewOptions,
    spinner: EnhancedSpinner
  ): Promise<void> {
    spinner.updateText("Reading generated components...");

    // Check if components directory exists
    const componentsDir = "components";
    if (!(await this.fs.exists(componentsDir))) {
      throw new Error(
        'No generated components found. Run "mycontext generate-components" first.'
      );
    }

    // If target is specified, preview specific group
    if (target && target !== "generated") {
      const groupDir = path.join(componentsDir, target.toLowerCase());
      if (!(await this.fs.exists(groupDir))) {
        throw new Error(`Generated component group '${target}' not found.`);
      }

      const pagePath = path.join(groupDir, "page.tsx");
      if (await this.fs.exists(pagePath)) {
        spinner.success({
          text: `Generated ${target} components preview ready!`,
        });
        console.log(chalk.green("\n✅ Generated Components Preview Ready:"));
        console.log(chalk.gray(`  📄 ${pagePath}`));
        console.log(chalk.blue("\n🌐 To view the preview:"));
        console.log(
          chalk.gray(
            `  # In a Next.js app, navigate to /components/${target.toLowerCase()}`
          )
        );
        console.log(chalk.gray(`  # Or copy the page.tsx content to your app`));
        return;
      }
    }

    // List all generated component groups
    const groups = await this.listGeneratedGroups(componentsDir);

    spinner.success({ text: "Generated components overview ready!" });
    console.log(chalk.green("\n✅ Generated Component Groups:"));
    groups.forEach((group: any) => {
      console.log(
        chalk.gray(`  • ${group.name} (${group.components.length} components)`)
      );
      console.log(chalk.gray(`    📄 ${group.pagePath}`));
    });
    console.log(chalk.blue("\n🌐 To preview a specific group:"));
    console.log(chalk.gray(`  mycontext preview generated <group-name>`));

    // Next commands
    this.printNextCommands();
  }

  private async listGeneratedGroups(componentsDir: string): Promise<any[]> {
    const groups = [];
    const items = await fs.readdir(componentsDir);

    for (const item of items) {
      const itemPath = path.join(componentsDir, item);
      const stats = await fs.stat(itemPath);

      if (stats.isDirectory()) {
        const pagePath = path.join(itemPath, "page.tsx");
        const indexPath = path.join(itemPath, "index.ts");

        if (
          (await this.fs.exists(pagePath)) &&
          (await this.fs.exists(indexPath))
        ) {
          const indexContent = await this.fs.readFile(indexPath);
          const componentMatches = indexContent.match(
            /export \{ ([^}]+) \} from/g
          );
          const components = componentMatches ? componentMatches.length : 0;

          groups.push({
            name: item,
            components: Array.from(
              { length: components },
              (_, i) => `Component${i + 1}`
            ),
            pagePath,
          });
        }
      }
    }

    return groups;
  }

  private printNextCommands(): void {
    try {
      console.log("");
      console.log(chalk.blue("➡️ Next commands:"));
      console.log(chalk.gray("   mycontext normalize preview"));
      console.log(
        chalk.gray("   mycontext generate-components all --with-tests")
      );
      console.log(chalk.gray("   mycontext enhance <group>"));
      console.log("");
    } catch {}
  }

  private async previewGroup(
    groupName: string,
    options: PreviewOptions,
    spinner: EnhancedSpinner
  ): Promise<void> {
    spinner.updateText(`Reading ${groupName} components...`);

    // Check if component list exists
    let componentListPath = ".mycontext/04-component-list.json";
    if (!(await this.fs.exists(componentListPath))) {
      componentListPath = ".mycontext/component-list.json";
    }
    if (!(await this.fs.exists(componentListPath))) {
      componentListPath = "context/component-list.json";
    }
    if (!(await this.fs.exists(componentListPath))) {
      throw new Error(
        'No component list found. Run "mycontext generate components-list" first.'
      );
    }

    const componentListContent = await this.fs.readFile(componentListPath);
    const componentList = JSON.parse(componentListContent);

    // Find the specific group
    const group = componentList.groups?.find(
      (g: any) => g.name.toLowerCase() === groupName.toLowerCase()
    );

    if (!group) {
      throw new Error(`Group "${groupName}" not found in component list.`);
    }

    spinner.updateText(`Generating ${groupName} preview...`);

    // Generate HTML preview for specific group
    const htmlContent = this.generateGroupPreviewHTML(group);

    // Create preview directory
    const previewDir = "preview";
    await this.fs.ensureDir(previewDir);

    // Write HTML file
    const htmlPath = path.join(
      previewDir,
      `${groupName.toLowerCase()}-preview.html`
    );
    await this.fs.writeFile(htmlPath, htmlContent);

    spinner.success({ text: `${groupName} preview generated successfully!` });

    console.log(chalk.green(`\n✅ ${groupName} Preview Ready:`));
    console.log(chalk.gray(`  📄 ${htmlPath}`));

    // Show component summary
    console.log(chalk.blue(`\n📋 ${groupName} Components:`));
    group.components?.forEach((component: any) => {
      console.log(chalk.gray(`  • ${component.name} (${component.type})`));
    });

    // Open in browser if requested
    if (options.open !== false) {
      await this.openInBrowser(htmlPath);
    } else {
      console.log(chalk.blue("\n🌐 To view the preview:"));
      console.log(chalk.gray(`  open ${htmlPath}`));
    }
  }

  private generateBrandPreviewHTML(brandingContent: string): string {
    // Extract color information from branding content
    const colors = this.extractColorsFromBranding(brandingContent);
    const typography = this.extractTypographyFromBranding(brandingContent);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MyContext Brand Preview</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', system-ui, sans-serif;
            line-height: 1.6;
            color: #111827;
            background: #f9fafb;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }

        .header {
            text-align: center;
            margin-bottom: 3rem;
        }

        .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            color: #3B82F6;
            margin-bottom: 0.5rem;
        }

        .header p {
            font-size: 1.125rem;
            color: #6B7280;
        }

        .section {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
        }

        .section h2 {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 1.5rem;
            color: #111827;
        }

        .color-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .color-card {
            border-radius: 8px;
            padding: 1rem;
            text-align: center;
            color: white;
            font-weight: 500;
        }

        .color-card.light {
            color: #111827;
            border: 1px solid #e5e7eb;
        }

        .color-name {
            font-size: 0.875rem;
            margin-bottom: 0.25rem;
            opacity: 0.9;
        }

        .color-value {
            font-size: 1rem;
            font-weight: 600;
        }

        .typography-demo {
            margin-bottom: 2rem;
        }

        .typography-demo h1 {
            font-size: 3rem;
            font-weight: 700;
            margin-bottom: 1rem;
        }

        .typography-demo h2 {
            font-size: 2.25rem;
            font-weight: 600;
            margin-bottom: 1rem;
        }

        .typography-demo h3 {
            font-size: 1.875rem;
            font-weight: 600;
            margin-bottom: 1rem;
        }

        .typography-demo p {
            font-size: 1.125rem;
            margin-bottom: 1rem;
        }

        .typography-demo .small {
            font-size: 0.875rem;
            color: #6B7280;
        }

        .component-patterns {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
        }

        .pattern-card {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 1.5rem;
            background: white;
        }

        .pattern-card h3 {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 1rem;
        }

        .button-demo {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
            margin-bottom: 1rem;
        }

        .btn {
            padding: 0.5rem 1rem;
            border-radius: 6px;
            border: none;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease-in-out;
        }

        .btn-primary {
            background: #3B82F6;
            color: white;
        }

        .btn-primary:hover {
            background: #1D4ED8;
        }

        .btn-secondary {
            background: #6B7280;
            color: white;
        }

        .btn-secondary:hover {
            background: #374151;
        }

        .btn-success {
            background: #10B981;
            color: white;
        }

        .btn-success:hover {
            background: #059669;
        }

        .input-demo {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 1rem;
            margin-bottom: 1rem;
        }

        .input-demo:focus {
            outline: none;
            border-color: #3B82F6;
            box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
        }

        .spacing-demo {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1rem;
        }

        .spacing-box {
            background: #3B82F6;
            border-radius: 4px;
        }

        .spacing-1 { width: 4px; height: 4px; }
        .spacing-2 { width: 8px; height: 8px; }
        .spacing-4 { width: 16px; height: 16px; }
        .spacing-6 { width: 24px; height: 24px; }
        .spacing-8 { width: 32px; height: 32px; }

        .footer {
            text-align: center;
            margin-top: 3rem;
            padding: 2rem;
            color: #6B7280;
            border-top: 1px solid #e5e7eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Brand Preview</h1>
            <p>Visual representation of your project's design system</p>
        </div>

        <div class="section">
            <h2>Color Palette</h2>
            <div class="color-grid">
                <div class="color-card" style="background: #3B82F6;">
                    <div class="color-name">Primary Blue</div>
                    <div class="color-value">#3B82F6</div>
                </div>
                <div class="color-card" style="background: #1D4ED8;">
                    <div class="color-name">Primary Dark</div>
                    <div class="color-value">#1D4ED8</div>
                </div>
                <div class="color-card" style="background: #93C5FD;">
                    <div class="color-name">Primary Light</div>
                    <div class="color-value">#93C5FD</div>
                </div>
                <div class="color-card" style="background: #6B7280;">
                    <div class="color-name">Secondary Gray</div>
                    <div class="color-value">#6B7280</div>
                </div>
                <div class="color-card" style="background: #10B981;">
                    <div class="color-name">Success Green</div>
                    <div class="color-value">#10B981</div>
                </div>
                <div class="color-card" style="background: #F59E0B;">
                    <div class="color-name">Warning Yellow</div>
                    <div class="color-value">#F59E0B</div>
                </div>
                <div class="color-card" style="background: #EF4444;">
                    <div class="color-name">Error Red</div>
                    <div class="color-value">#EF4444</div>
                </div>
                <div class="color-card light" style="background: #FFFFFF;">
                    <div class="color-name">Background</div>
                    <div class="color-value">#FFFFFF</div>
                </div>
                <div class="color-card light" style="background: #F9FAFB;">
                    <div class="color-name">Surface</div>
                    <div class="color-value">#F9FAFB</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Typography</h2>
            <div class="typography-demo">
                <h1>Heading 1 - 3rem (48px)</h1>
                <h2>Heading 2 - 2.25rem (36px)</h2>
                <h3>Heading 3 - 1.875rem (30px)</h3>
                <p>Body text - 1.125rem (18px) - This is how regular body text appears in your design system. It should be readable and comfortable to read.</p>
                <p class="small">Small text - 0.875rem (14px) - This is used for secondary information, captions, and less important text.</p>
            </div>
        </div>

        <div class="section">
            <h2>Component Patterns</h2>
            <div class="component-patterns">
                <div class="pattern-card">
                    <h3>Buttons</h3>
                    <div class="button-demo">
                        <button class="btn btn-primary">Primary Button</button>
                        <button class="btn btn-secondary">Secondary Button</button>
                        <button class="btn btn-success">Success Button</button>
                    </div>
                </div>

                <div class="pattern-card">
                    <h3>Form Elements</h3>
                    <input type="text" class="input-demo" placeholder="Enter your text here...">
                    <input type="email" class="input-demo" placeholder="Enter your email...">
                </div>

                <div class="pattern-card">
                    <h3>Spacing Scale</h3>
                    <div class="spacing-demo">
                        <span>1:</span>
                        <div class="spacing-box spacing-1"></div>
                        <span>2:</span>
                        <div class="spacing-box spacing-2"></div>
                        <span>4:</span>
                        <div class="spacing-box spacing-4"></div>
                        <span>6:</span>
                        <div class="spacing-box spacing-6"></div>
                        <span>8:</span>
                        <div class="spacing-box spacing-8"></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Design Principles</h2>
            <ul style="list-style: none; padding: 0;">
                <li style="padding: 0.5rem 0; border-bottom: 1px solid #e5e7eb;">
                    <strong>Accessibility First:</strong> WCAG 2.1 AA compliance with high contrast ratios
                </li>
                <li style="padding: 0.5rem 0; border-bottom: 1px solid #e5e7eb;">
                    <strong>Mobile-First Responsive:</strong> Touch-friendly targets and responsive typography
                </li>
                <li style="padding: 0.5rem 0; border-bottom: 1px solid #e5e7eb;">
                    <strong>Consistency & Predictability:</strong> Unified visual language and interaction patterns
                </li>
                <li style="padding: 0.5rem 0;">
                    <strong>Performance & Efficiency:</strong> Optimized for fast loading and minimal bundle size
                </li>
            </ul>
        </div>
    </div>

    <div class="footer">
        <p>Generated by mycontext CLI • ${new Date().toLocaleDateString()}</p>
    </div>
</body>
</html>`;
  }

  private generateComponentPreviewHTML(componentList: any): string {
    const { project, groups, metadata } = componentList;

    let componentsHTML = "";
    if (groups && Array.isArray(groups)) {
      groups.forEach((group: any) => {
        componentsHTML += `
          <div class="group">
            <h3>${group.name}</h3>
            <p class="group-description">${group.description}</p>
            <div class="components-grid">
        `;

        if (group.components && Array.isArray(group.components)) {
          group.components.forEach((component: any) => {
            componentsHTML += `
              <div class="component-card">
                <h4>${component.name}</h4>
                <p>${component.description}</p>
                <div class="component-meta">
                  <span class="type">${component.type}</span>
                  <span class="priority">${component.priority}</span>
                </div>
                <div class="user-stories">
                  <strong>User Stories:</strong>
                  <ul>
                    ${
                      component.userStories
                        ?.map((story: string) => `<li>${story}</li>`)
                        .join("") || "<li>No user stories defined</li>"
                    }
                  </ul>
                </div>
                <div class="action-functions">
                  <strong>Action Functions:</strong>
                  <div class="function-tags">
                    ${
                      component.actionFunctions
                        ?.map(
                          (func: string) =>
                            `<span class="function-tag">${func}</span>`
                        )
                        .join("") ||
                      '<span class="no-functions">No action functions defined</span>'
                    }
                  </div>
                </div>
              </div>
            `;
          });
        }

        componentsHTML += `
            </div>
          </div>
        `;
      });
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Component Preview - ${project?.name || "MyContext Project"}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', system-ui, sans-serif;
            line-height: 1.6;
            color: #111827;
            background: #f9fafb;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }

        .header {
            text-align: center;
            margin-bottom: 3rem;
        }

        .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            color: #3B82F6;
            margin-bottom: 0.5rem;
        }

        .header p {
            font-size: 1.125rem;
            color: #6B7280;
            margin-bottom: 1rem;
        }

        .summary {
            display: flex;
            justify-content: center;
            gap: 2rem;
            margin-bottom: 2rem;
        }

        .summary-item {
            text-align: center;
            padding: 1rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
        }

        .summary-number {
            font-size: 2rem;
            font-weight: 700;
            color: #3B82F6;
        }

        .summary-label {
            font-size: 0.875rem;
            color: #6B7280;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .group {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
        }

        .group h3 {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #111827;
        }

        .group-description {
            color: #6B7280;
            margin-bottom: 1.5rem;
        }

        .components-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 1.5rem;
        }

        .component-card {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 1.5rem;
            background: #f9fafb;
        }

        .component-card h4 {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #111827;
        }

        .component-card p {
            color: #6B7280;
            margin-bottom: 1rem;
        }

        .component-meta {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }

        .type, .priority {
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: uppercase;
        }

        .type {
            background: #dbeafe;
            color: #1e40af;
        }

        .priority {
            background: #fef3c7;
            color: #92400e;
        }

        .user-stories {
            margin-bottom: 1rem;
        }

        .user-stories strong {
            display: block;
            margin-bottom: 0.5rem;
            color: #111827;
        }

        .user-stories ul {
            list-style: none;
            padding-left: 0;
        }

        .user-stories li {
            padding: 0.25rem 0;
            font-size: 0.875rem;
            color: #6B7280;
            border-left: 3px solid #3B82F6;
            padding-left: 0.75rem;
            margin-bottom: 0.25rem;
        }

        .action-functions {
            margin-bottom: 1rem;
        }

        .action-functions strong {
            display: block;
            margin-bottom: 0.5rem;
            color: #111827;
        }

        .function-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }

        .function-tag {
            background: #3B82F6;
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 500;
            font-family: 'JetBrains Mono', monospace;
        }

        .no-functions {
            color: #9ca3af;
            font-style: italic;
        }

        .footer {
            text-align: center;
            margin-top: 3rem;
            padding: 2rem;
            color: #6B7280;
            border-top: 1px solid #e5e7eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Component Preview</h1>
            <p>${
              project?.description || "AI-powered component generation platform"
            }</p>
            <div class="summary">
                <div class="summary-item">
                    <div class="summary-number">${
                      metadata?.totalComponents || 0
                    }</div>
                    <div class="summary-label">Components</div>
                </div>
                <div class="summary-item">
                    <div class="summary-number">${
                      metadata?.totalGroups || 0
                    }</div>
                    <div class="summary-label">Groups</div>
                </div>
                <div class="summary-item">
                    <div class="summary-number">${
                      metadata?.version || "1.0.0"
                    }</div>
                    <div class="summary-label">Version</div>
                </div>
            </div>
        </div>

        ${componentsHTML}
    </div>

    <div class="footer">
        <p>Generated by mycontext CLI • ${new Date().toLocaleDateString()}</p>
    </div>
</body>
</html>`;
  }

  private generateGroupPreviewHTML(group: any): string {
    let componentsHTML = "";
    if (group.components && Array.isArray(group.components)) {
      group.components.forEach((component: any) => {
        componentsHTML += `
          <div class="component-card">
            <h4>${component.name}</h4>
            <p>${component.description}</p>
            <div class="component-meta">
              <span class="type">${component.type}</span>
              <span class="priority">${component.priority}</span>
            </div>
            <div class="user-stories">
              <strong>User Stories:</strong>
              <ul>
                ${
                  component.userStories
                    ?.map((story: string) => `<li>${story}</li>`)
                    .join("") || "<li>No user stories defined</li>"
                }
              </ul>
            </div>
            <div class="action-functions">
              <strong>Action Functions:</strong>
              <div class="function-tags">
                ${
                  component.actionFunctions
                    ?.map(
                      (func: string) =>
                        `<span class="function-tag">${func}</span>`
                    )
                    .join("") ||
                  '<span class="no-functions">No action functions defined</span>'
                }
              </div>
            </div>
          </div>
        `;
      });
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${group.name} Preview - MyContext Project</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', system-ui, sans-serif;
            line-height: 1.6;
            color: #111827;
            background: #f9fafb;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }

        .header {
            text-align: center;
            margin-bottom: 3rem;
        }

        .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            color: #3B82F6;
            margin-bottom: 0.5rem;
        }

        .header p {
            font-size: 1.125rem;
            color: #6B7280;
            margin-bottom: 1rem;
        }

        .group-info {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
            text-align: center;
        }

        .group-info h2 {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #111827;
        }

        .group-info p {
            color: #6B7280;
            margin-bottom: 1rem;
        }

        .group-stats {
            display: flex;
            justify-content: center;
            gap: 2rem;
        }

        .stat-item {
            text-align: center;
        }

        .stat-number {
            font-size: 1.5rem;
            font-weight: 700;
            color: #3B82F6;
        }

        .stat-label {
            font-size: 0.875rem;
            color: #6B7280;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .components-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 1.5rem;
        }

        .component-card {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 1.5rem;
            background: white;
            box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
        }

        .component-card h4 {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #111827;
        }

        .component-card p {
            color: #6B7280;
            margin-bottom: 1rem;
        }

        .component-meta {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }

        .type, .priority {
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: uppercase;
        }

        .type {
            background: #dbeafe;
            color: #1e40af;
        }

        .priority {
            background: #fef3c7;
            color: #92400e;
        }

        .user-stories {
            margin-bottom: 1rem;
        }

        .user-stories strong {
            display: block;
            margin-bottom: 0.5rem;
            color: #111827;
        }

        .user-stories ul {
            list-style: none;
            padding-left: 0;
        }

        .user-stories li {
            padding: 0.25rem 0;
            font-size: 0.875rem;
            color: #6B7280;
            border-left: 3px solid #3B82F6;
            padding-left: 0.75rem;
            margin-bottom: 0.25rem;
        }

        .action-functions {
            margin-bottom: 1rem;
        }

        .action-functions strong {
            display: block;
            margin-bottom: 0.5rem;
            color: #111827;
        }

        .function-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }

        .function-tag {
            background: #3B82F6;
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 500;
            font-family: 'JetBrains Mono', monospace;
        }

        .no-functions {
            color: #9ca3af;
            font-style: italic;
        }

        .footer {
            text-align: center;
            margin-top: 3rem;
            padding: 2rem;
            color: #6B7280;
            border-top: 1px solid #e5e7eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${group.name} Preview</h1>
            <p>Component group overview and details</p>
        </div>

        <div class="group-info">
            <h2>${group.name}</h2>
            <p>${group.description}</p>
            <div class="group-stats">
                <div class="stat-item">
                    <div class="stat-number">${
                      group.components?.length || 0
                    }</div>
                    <div class="stat-label">Components</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${group.priority}</div>
                    <div class="stat-label">Priority</div>
                </div>
            </div>
        </div>

        <div class="components-grid">
            ${componentsHTML}
        </div>
    </div>

    <div class="footer">
        <p>Generated by mycontext CLI • ${new Date().toLocaleDateString()}</p>
    </div>
</body>
</html>`;
  }

  private extractColorsFromBranding(content: string): any {
    // Simple color extraction - in a real implementation, this would be more sophisticated
    const colors: any = {};

    // Extract primary colors
    const primaryMatch = content.match(/Primary.*?#([A-Fa-f0-9]{6})/);
    if (primaryMatch) {
      colors.primary = `#${primaryMatch[1]}`;
    }

    return colors;
  }

  private extractTypographyFromBranding(content: string): any {
    // Simple typography extraction
    const typography: any = {};

    const fontMatch = content.match(/Font Family.*?:\s*(.+)/);
    if (fontMatch) {
      typography.fontFamily = fontMatch[1]?.trim() || "Inter";
    }

    return typography;
  }

  private async openInBrowser(filePath: string): Promise<void> {
    try {
      const platform = process.platform;
      let command: string;

      switch (platform) {
        case "darwin":
          command = `open "${filePath}"`;
          break;
        case "win32":
          command = `start "${filePath}"`;
          break;
        default:
          command = `xdg-open "${filePath}"`;
          break;
      }

      await execAsync(command);
      console.log(chalk.blue("\n🌐 Opening preview in browser..."));
    } catch (error) {
      console.log(chalk.yellow("\n⚠️  Could not open browser automatically."));
      console.log(chalk.gray(`   Please open: ${filePath}`));
    }
  }
}
