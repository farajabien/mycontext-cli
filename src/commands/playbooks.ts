import chalk from "chalk";
import prompts from "prompts";
import { CommandOptions } from "../types";
import * as fs from "fs-extra";
import * as path from "path";
import * as glob from "glob";

interface PlaybookOptions extends CommandOptions {
  add?: string;
  list?: boolean;
  search?: string;
  use?: string;
  remove?: string;
  template?: string;
  category?: string;
}

interface Playbook {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  author: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  content: string;
  metadata: {
    difficulty: "beginner" | "intermediate" | "advanced";
    estimatedTime: string;
    prerequisites: string[];
    relatedPlaybooks: string[];
  };
}

export class PlaybooksCommand {
  private playbooksDir = path.join(process.cwd(), ".mycontext", "playbooks");
  private templatesDir = path.join(__dirname, "..", "templates", "playbooks");

  async execute(options: PlaybookOptions): Promise<void> {
    try {
      // Ensure playbooks directory exists
      await fs.ensureDir(this.playbooksDir);

      if (options.add) {
        await this.addPlaybook(options.add, options.category);
      } else if (options.list) {
        await this.listPlaybooks();
      } else if (options.search) {
        await this.searchPlaybooks(options.search);
      } else if (options.use) {
        await this.usePlaybook(options.use);
      } else if (options.remove) {
        await this.removePlaybook(options.remove);
      } else if (options.template) {
        await this.createFromTemplate(options.template);
      } else {
        // Interactive mode
        await this.interactiveMode();
      }
    } catch (error) {
      console.error(
        chalk.red(
          `❌ Playbooks error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        )
      );
      process.exit(1);
    }
  }

  private async interactiveMode(): Promise<void> {
    console.log(chalk.blue("\n📚 MyContext Playbooks"));
    console.log(chalk.gray("Manage proven processes and technical flows"));

    const response = await prompts({
      type: "select",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { title: "Add new playbook", value: "add" },
        { title: "List all playbooks", value: "list" },
        { title: "Search playbooks", value: "search" },
        { title: "Use playbook in generation", value: "use" },
        { title: "Create from template", value: "template" },
        { title: "Remove playbook", value: "remove" },
      ],
    });

    if (!response.action) {
      console.log(chalk.yellow("Operation cancelled."));
      return;
    }

    switch (response.action) {
      case "add":
        const title = await prompts({
          type: "text",
          name: "title",
          message: "Playbook title:",
          validate: (value) => value.length > 0 || "Title is required",
        });
        if (title.title) {
          await this.addPlaybook(title.title);
        }
        break;
      case "list":
        await this.listPlaybooks();
        break;
      case "search":
        const searchTerm = await prompts({
          type: "text",
          name: "term",
          message: "Search term:",
        });
        if (searchTerm.term) {
          await this.searchPlaybooks(searchTerm.term);
        }
        break;
      case "use":
        const playbookId = await prompts({
          type: "text",
          name: "id",
          message: "Playbook ID to use:",
        });
        if (playbookId.id) {
          await this.usePlaybook(playbookId.id);
        }
        break;
      case "template":
        await this.showTemplates();
        break;
      case "remove":
        const removeId = await prompts({
          type: "text",
          name: "id",
          message: "Playbook ID to remove:",
        });
        if (removeId.id) {
          await this.removePlaybook(removeId.id);
        }
        break;
    }
  }

  private async addPlaybook(title: string, category?: string): Promise<void> {
    console.log(chalk.blue(`\n📝 Adding playbook: ${title}`));

    const id = this.generateId(title);
    const playbookPath = path.join(this.playbooksDir, `${id}.md`);

    // Check if playbook already exists
    if (await fs.pathExists(playbookPath)) {
      console.log(chalk.yellow(`⚠️  Playbook with ID '${id}' already exists`));
      const overwrite = await prompts({
        type: "confirm",
        name: "value",
        message: "Overwrite existing playbook?",
        initial: false,
      });

      if (!overwrite.value) {
        console.log(chalk.yellow("Operation cancelled."));
        return;
      }
    }

    // Get playbook details
    const details = await prompts([
      {
        type: "text",
        name: "description",
        message: "Description:",
        validate: (value) => value.length > 0 || "Description is required",
      },
      {
        type: "select",
        name: "category",
        message: "Category:",
        choices: [
          { title: "Payment Integration", value: "payment" },
          { title: "Authentication", value: "auth" },
          { title: "Database", value: "database" },
          { title: "API Integration", value: "api" },
          { title: "UI/UX", value: "ui" },
          { title: "DevOps", value: "devops" },
          { title: "Security", value: "security" },
          { title: "Testing", value: "testing" },
          { title: "Other", value: "other" },
        ],
        initial: category ? this.getCategoryIndex(category) : 0,
      },
      {
        type: "text",
        name: "tags",
        message: "Tags (comma-separated):",
        initial: "",
      },
      {
        type: "select",
        name: "difficulty",
        message: "Difficulty level:",
        choices: [
          { title: "Beginner", value: "beginner" },
          { title: "Intermediate", value: "intermediate" },
          { title: "Advanced", value: "advanced" },
        ],
      },
      {
        type: "text",
        name: "estimatedTime",
        message: "Estimated time to implement:",
        initial: "1-2 hours",
      },
    ]);

    // Get content
    console.log(chalk.yellow("\n📝 Enter playbook content (markdown):"));
    console.log(chalk.gray("Press Ctrl+D when finished"));

    const content = await this.getMultilineInput();

    // Create playbook object
    const playbook: Playbook = {
      id,
      title,
      description: details.description,
      category: details.category,
      tags: details.tags
        ? details.tags.split(",").map((t: string) => t.trim())
        : [],
      author: "User",
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      content,
      metadata: {
        difficulty: details.difficulty,
        estimatedTime: details.estimatedTime,
        prerequisites: [],
        relatedPlaybooks: [],
      },
    };

    // Save playbook
    await this.savePlaybook(playbook);

    console.log(chalk.green(`✅ Playbook '${title}' created successfully!`));
    console.log(chalk.gray(`   ID: ${id}`));
    console.log(chalk.gray(`   Category: ${details.category}`));
    console.log(chalk.gray(`   File: ${playbookPath}`));
  }

  private async listPlaybooks(): Promise<void> {
    console.log(chalk.blue("\n📚 Available Playbooks"));

    const playbooks = await this.getAllPlaybooks();
    const templates = this.getAvailableTemplates();

    if (playbooks.length === 0 && templates.length === 0) {
      console.log(
        chalk.yellow(
          "No playbooks found. Create one with 'mycontext playbooks add' or use a template with 'mycontext playbooks --template'"
        )
      );
      return;
    }

    // Show existing playbooks
    if (playbooks.length > 0) {
      console.log(chalk.cyan("\n📁 YOUR PLAYBOOKS"));
      const grouped = playbooks.reduce((acc, playbook) => {
        if (!acc[playbook.category]) {
          acc[playbook.category] = [];
        }
        acc[playbook.category].push(playbook);
        return acc;
      }, {} as Record<string, Playbook[]>);

      Object.entries(grouped).forEach(([category, categoryPlaybooks]) => {
        console.log(chalk.cyan(`\n  ${category.toUpperCase()}`));
        categoryPlaybooks.forEach((playbook) => {
          console.log(chalk.gray(`    ${playbook.id}`));
          console.log(chalk.white(`      ${playbook.title}`));
          console.log(chalk.gray(`      ${playbook.description}`));
          console.log(
            chalk.gray(
              `      Difficulty: ${playbook.metadata.difficulty} | Time: ${playbook.metadata.estimatedTime}`
            )
          );
          if (playbook.tags.length > 0) {
            console.log(chalk.gray(`      Tags: ${playbook.tags.join(", ")}`));
          }
          console.log();
        });
      });
    }

    // Show available templates
    if (templates.length > 0) {
      console.log(chalk.cyan("\n📋 AVAILABLE TEMPLATES"));
      const groupedTemplates = templates.reduce((acc, template) => {
        if (!acc[template.category]) {
          acc[template.category] = [];
        }
        acc[template.category].push(template);
        return acc;
      }, {} as Record<string, typeof templates>);

      Object.entries(groupedTemplates).forEach(
        ([category, categoryTemplates]) => {
          console.log(chalk.cyan(`\n  ${category.toUpperCase()}`));
          categoryTemplates.forEach((template) => {
            console.log(chalk.gray(`    ${template.id}`));
            console.log(chalk.white(`      ${template.title}`));
            console.log(chalk.gray(`      ${template.description}`));
            console.log(
              chalk.gray(
                `      Use: mycontext playbooks --template ${template.id}`
              )
            );
            console.log();
          });
        }
      );
    }
  }

  private async searchPlaybooks(term: string): Promise<void> {
    console.log(chalk.blue(`\n🔍 Searching for: "${term}"`));

    const playbooks = await this.getAllPlaybooks();
    const results = playbooks.filter(
      (playbook) =>
        playbook.title.toLowerCase().includes(term.toLowerCase()) ||
        playbook.description.toLowerCase().includes(term.toLowerCase()) ||
        playbook.content.toLowerCase().includes(term.toLowerCase()) ||
        playbook.tags.some((tag) =>
          tag.toLowerCase().includes(term.toLowerCase())
        )
    );

    if (results.length === 0) {
      console.log(chalk.yellow("No playbooks found matching your search."));
      return;
    }

    console.log(chalk.green(`Found ${results.length} playbook(s):`));
    results.forEach((playbook) => {
      console.log(chalk.gray(`\n${playbook.id}`));
      console.log(chalk.white(`  ${playbook.title}`));
      console.log(chalk.gray(`  ${playbook.description}`));
      console.log(
        chalk.gray(
          `  Category: ${playbook.category} | Difficulty: ${playbook.metadata.difficulty}`
        )
      );
    });
  }

  private async usePlaybook(playbookId: string): Promise<void> {
    console.log(chalk.blue(`\n🎯 Using playbook: ${playbookId}`));

    const playbook = await this.getPlaybook(playbookId);
    if (!playbook) {
      console.log(chalk.red(`❌ Playbook '${playbookId}' not found`));
      return;
    }

    console.log(chalk.green(`✅ Loaded playbook: ${playbook.title}`));
    console.log(chalk.gray(`   Category: ${playbook.category}`));
    console.log(chalk.gray(`   Difficulty: ${playbook.metadata.difficulty}`));
    console.log(
      chalk.gray(`   Estimated time: ${playbook.metadata.estimatedTime}`)
    );

    // Save to context for AI generation
    const contextPath = path.join(
      process.cwd(),
      ".mycontext",
      "active-playbook.json"
    );
    await fs.writeJson(
      contextPath,
      {
        id: playbook.id,
        title: playbook.title,
        content: playbook.content,
        metadata: playbook.metadata,
        usedAt: new Date().toISOString(),
      },
      { spaces: 2 }
    );

    console.log(
      chalk.green(
        `\n🎯 Playbook context saved to .mycontext/active-playbook.json`
      )
    );
    console.log(
      chalk.gray("This playbook will be used in your next AI generation.")
    );
  }

  private async removePlaybook(playbookId: string): Promise<void> {
    console.log(chalk.blue(`\n🗑️  Removing playbook: ${playbookId}`));

    const playbookPath = path.join(this.playbooksDir, `${playbookId}.md`);

    if (!(await fs.pathExists(playbookPath))) {
      console.log(chalk.red(`❌ Playbook '${playbookId}' not found`));
      return;
    }

    const confirm = await prompts({
      type: "confirm",
      name: "value",
      message: `Are you sure you want to remove playbook '${playbookId}'?`,
      initial: false,
    });

    if (confirm.value) {
      await fs.remove(playbookPath);
      console.log(
        chalk.green(`✅ Playbook '${playbookId}' removed successfully`)
      );
    } else {
      console.log(chalk.yellow("Operation cancelled."));
    }
  }

  private getAvailableTemplates() {
    return [
      {
        id: "mpesa-integration",
        title: "M-Pesa Integration",
        description: "Complete M-Pesa STK Push and C2B integration for Next.js",
        category: "payment",
      },
      {
        id: "instantdb-integration",
        title: "InstantDB Integration",
        description:
          "Complete InstantDB setup with real-time database, authentication, and React integration",
        category: "database",
      },
      {
        id: "stripe-integration",
        title: "Stripe Payment Integration",
        description:
          "Stripe payment processing with webhooks and subscriptions",
        category: "payment",
      },
      {
        id: "auth-nextjs",
        title: "Next.js Authentication",
        description: "Complete authentication system with NextAuth.js",
        category: "auth",
      },
      {
        id: "database-supabase",
        title: "Supabase Database Setup",
        description: "Database schema design and API integration with Supabase",
        category: "database",
      },
      {
        id: "api-rest",
        title: "REST API Design",
        description: "RESTful API design patterns and best practices",
        category: "api",
      },
    ];
  }

  private async showTemplates(): Promise<void> {
    console.log(chalk.blue("\n📋 Available Templates"));

    const templates = this.getAvailableTemplates();

    templates.forEach((template) => {
      console.log(chalk.gray(`\n${template.id}`));
      console.log(chalk.white(`  ${template.title}`));
      console.log(chalk.gray(`  ${template.description}`));
      console.log(chalk.gray(`  Category: ${template.category}`));
    });

    const response = await prompts({
      type: "text",
      name: "templateId",
      message: "Enter template ID to create playbook:",
    });

    if (response.templateId) {
      await this.createFromTemplate(response.templateId);
    }
  }

  private async createFromTemplate(templateId: string): Promise<void> {
    console.log(
      chalk.blue(`\n📋 Creating playbook from template: ${templateId}`)
    );

    // This would load from a templates directory
    // For now, we'll create a basic template
    const templateContent = this.getTemplateContent(templateId);

    if (!templateContent) {
      console.log(chalk.red(`❌ Template '${templateId}' not found`));
      return;
    }

    const title = await prompts({
      type: "text",
      name: "value",
      message: "Playbook title:",
      initial: templateContent.title,
    });

    if (title.value) {
      await this.addPlaybook(title.value, templateContent.category);
    }
  }

  private async getAllPlaybooks(): Promise<Playbook[]> {
    const files = glob.sync("*.md", { cwd: this.playbooksDir });
    const playbooks: Playbook[] = [];

    for (const file of files) {
      const playbook = await this.getPlaybook(path.basename(file, ".md"));
      if (playbook) {
        playbooks.push(playbook);
      }
    }

    return playbooks.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  private async getPlaybook(id: string): Promise<Playbook | null> {
    try {
      const playbookPath = path.join(this.playbooksDir, `${id}.md`);
      const content = await fs.readFile(playbookPath, "utf-8");

      // Parse frontmatter and content
      const { frontmatter, content: body } = this.parseMarkdown(content);

      return {
        id,
        title: frontmatter.title || id,
        description: frontmatter.description || "",
        category: frontmatter.category || "other",
        tags: frontmatter.tags || [],
        author: frontmatter.author || "User",
        version: frontmatter.version || "1.0.0",
        createdAt: frontmatter.createdAt || new Date().toISOString(),
        updatedAt: frontmatter.updatedAt || new Date().toISOString(),
        content: body,
        metadata: {
          difficulty: frontmatter.difficulty || "beginner",
          estimatedTime: frontmatter.estimatedTime || "1-2 hours",
          prerequisites: frontmatter.prerequisites || [],
          relatedPlaybooks: frontmatter.relatedPlaybooks || [],
        },
      };
    } catch (error) {
      return null;
    }
  }

  private async savePlaybook(playbook: Playbook): Promise<void> {
    const frontmatter = `---
id: ${playbook.id}
title: ${playbook.title}
description: ${playbook.description}
category: ${playbook.category}
tags: [${playbook.tags.map((t) => `"${t}"`).join(", ")}]
author: ${playbook.author}
version: ${playbook.version}
createdAt: ${playbook.createdAt}
updatedAt: ${playbook.updatedAt}
difficulty: ${playbook.metadata.difficulty}
estimatedTime: ${playbook.metadata.estimatedTime}
prerequisites: [${playbook.metadata.prerequisites
      .map((p) => `"${p}"`)
      .join(", ")}]
relatedPlaybooks: [${playbook.metadata.relatedPlaybooks
      .map((r) => `"${r}"`)
      .join(", ")}]
---

${playbook.content}`;

    const playbookPath = path.join(this.playbooksDir, `${playbook.id}.md`);
    await fs.writeFile(playbookPath, frontmatter);
  }

  private parseMarkdown(content: string): {
    frontmatter: any;
    content: string;
  } {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return { frontmatter: {}, content };
    }

    const frontmatterText = match[1];
    const body = match[2];

    const frontmatter: any = {};
    frontmatterText.split("\n").forEach((line) => {
      const [key, ...valueParts] = line.split(":");
      if (key && valueParts.length > 0) {
        const value = valueParts.join(":").trim();
        if (value.startsWith("[") && value.endsWith("]")) {
          frontmatter[key.trim()] = JSON.parse(value);
        } else if (value.startsWith('"') && value.endsWith('"')) {
          frontmatter[key.trim()] = value.slice(1, -1);
        } else {
          frontmatter[key.trim()] = value;
        }
      }
    });

    return { frontmatter, content: body };
  }

  private generateId(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private getCategoryIndex(category: string): number {
    const categories = [
      "payment",
      "auth",
      "database",
      "api",
      "ui",
      "devops",
      "security",
      "testing",
      "other",
    ];
    return categories.indexOf(category);
  }

  private async getMultilineInput(): Promise<string> {
    // This is a simplified version - in a real implementation,
    // you'd want to use a proper multiline input method
    const response = await prompts({
      type: "text",
      name: "content",
      message: "Enter playbook content:",
    });

    return response.content || "";
  }

  private getTemplateContent(templateId: string): any {
    const templates: Record<string, any> = {
      "mpesa-integration": {
        title: "M-Pesa Integration",
        category: "payment",
        content: `# M-Pesa Integration Guide

## Overview
Complete M-Pesa STK Push and C2B integration for Next.js applications.

## Prerequisites
- Safaricom Daraja API credentials
- Next.js application
- Database (Supabase/PostgreSQL)

## Implementation Steps

### 1. Environment Setup
\`\`\`bash
# Required environment variables
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_BUSINESS_SHORT_CODE=your_shortcode
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://your-domain.com/api/payment-callback
\`\`\`

### 2. Database Schema
\`\`\`sql
CREATE TABLE mpesa_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_request_id VARCHAR(255),
  order_id UUID REFERENCES orders(id),
  phone_number VARCHAR(20),
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  mpesa_receipt_number VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

### 3. STK Push Implementation
\`\`\`typescript
// app/api/payment/stk/route.ts
export async function POST(request: NextRequest) {
  const { orderId, phoneNumber, amount } = await request.json();
  
  // Generate password
  const password = Buffer.from(
    \`\${businessShortCode}\${passkey}\${timestamp}\`
  ).toString('base64');
  
  // STK Push payload
  const stkPushPayload = {
    BusinessShortCode: businessShortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.round(amount),
    PartyA: phoneNumber.replace("+", ""),
    PartyB: businessShortCode,
    PhoneNumber: phoneNumber.replace("+", ""),
    CallBackURL: callbackUrl,
    AccountReference: \`ORDER-\${orderId}\`,
    TransactionDesc: "Payment",
  };
  
  // Make API call to M-Pesa
  const response = await fetch(
    \`https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest\`,
    {
      method: "POST",
      headers: {
        "Authorization": \`Bearer \${accessToken}\`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stkPushPayload),
    }
  );
  
  return NextResponse.json(await response.json());
}
\`\`\`

### 4. Callback Processing
\`\`\`typescript
// app/api/payment-callback/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();
  const stkCallback = body.Body?.stkCallback || body.stkCallback;
  
  if (stkCallback.ResultCode === 0) {
    // Payment successful
    const amount = getMetadataValue("Amount");
    const mpesaReceiptNumber = getMetadataValue("MpesaReceiptNumber");
    
    // Update database
    await supabase
      .from("mpesa_transactions")
      .update({
        mpesa_receipt_number: mpesaReceiptNumber,
        status: "completed",
        actual_amount: amount,
      })
      .eq("checkout_request_id", stkCallback.CheckoutRequestID);
  }
  
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Success" });
}
\`\`\`

## Best Practices
- Always validate phone numbers
- Implement proper error handling
- Use HTTPS for all endpoints
- Log all transactions
- Implement idempotency checks

## Common Issues
- STK Push timeout: Check network connectivity
- Invalid credentials: Verify API keys
- Callback not received: Check URL accessibility
`,
      },
    };

    return templates[templateId];
  }
}
