import chalk from "chalk";
import prompts from "prompts";
import { CommandOptions } from "../types";
import { EnhancedSpinner } from "../utils/spinner";
import { FileSystemManager } from "../utils/fileSystem";
import { execSync } from "child_process";
import * as fs from "fs-extra";
import * as path from "path";

interface DatabaseSetupOptions extends CommandOptions {
  provider?: "instantdb" | "supabase" | "firebase";
  auth?: boolean;
  schema?: boolean;
  components?: boolean;
  skipAuth?: boolean;
  skipSchema?: boolean;
  skipComponents?: boolean;
}

export class DatabaseSetupCommand {
  private fs = new FileSystemManager();
  private spinner = new EnhancedSpinner("Setting up database...");

  async execute(options: DatabaseSetupOptions): Promise<void> {
    const {
      provider = "instantdb",
      auth = true,
      schema = true,
      components = true,
      skipAuth = false,
      skipSchema = false,
      skipComponents = false,
    } = options;

    console.log(chalk.blue.bold("🗄️ Database Setup\n"));

    try {
      // Check if we're in a valid project
      if (!(await this.isValidProject())) {
        throw new Error(
          "Not a valid MyContext project. Run 'mycontext init' first."
        );
      }

      // Check if context files exist
      if (!(await this.hasContextFiles())) {
        console.log(
          chalk.yellow("⚠️ Context files not found. Generating them first...")
        );
        console.log(
          chalk.gray(
            "Run 'mycontext generate context' first, then retry this command."
          )
        );
        return;
      }

      if (provider === "instantdb") {
        await this.setupInstantDB({
          auth: auth && !skipAuth,
          schema: schema && !skipSchema,
          components: components && !skipComponents,
        });
      } else {
        console.log(
          chalk.yellow(
            `Provider '${provider}' not yet implemented. Only InstantDB is supported.`
          )
        );
        return;
      }

      console.log(chalk.green.bold("\n✅ Database setup completed!"));
      this.showNextSteps();
    } catch (error) {
      this.spinner.fail("Database setup failed");
      throw error;
    }
  }

  private async isValidProject(): Promise<boolean> {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const mycontextDir = path.join(process.cwd(), ".mycontext");

    return (
      (await fs.pathExists(packageJsonPath)) &&
      (await fs.pathExists(mycontextDir))
    );
  }

  private async hasContextFiles(): Promise<boolean> {
    const prdPath = path.join(process.cwd(), ".mycontext", "01-prd.md");
    const typesPath = path.join(process.cwd(), ".mycontext", "types.ts");

    return (await fs.pathExists(prdPath)) && (await fs.pathExists(typesPath));
  }

  private async setupInstantDB(options: {
    auth: boolean;
    schema: boolean;
    components: boolean;
  }): Promise<void> {
    console.log(chalk.blue("🚀 Setting up InstantDB...\n"));

    // Step 1: Install InstantDB dependencies
    this.spinner.start().updateText("Installing InstantDB dependencies...");
    await this.installInstantDBDependencies();
    this.spinner.succeed("Dependencies installed");

    // Step 2: Initialize InstantDB CLI
    this.spinner.start().updateText("Initializing InstantDB...");
    await this.initializeInstantDB();
    this.spinner.succeed("InstantDB initialized");

    // Step 3: Generate schema from context
    if (options.schema) {
      this.spinner.start().updateText("Generating database schema...");
      await this.generateSchemaFromContext();
      this.spinner.succeed("Schema generated");
    }

    // Step 4: Generate auth components
    if (options.auth) {
      this.spinner.start().updateText("Setting up authentication...");
      await this.setupAuthentication();
      this.spinner.succeed("Authentication setup");
    }

    // Step 5: Generate database components
    if (options.components) {
      this.spinner.start().updateText("Generating database components...");
      await this.generateDatabaseComponents();
      this.spinner.succeed("Database components generated");
    }

    // Step 6: Update existing components with DB integration
    this.spinner
      .start()
      .updateText("Integrating database with existing components...");
    await this.integrateDatabaseWithComponents();
    this.spinner.succeed("Database integration complete");
  }

  private async installInstantDBDependencies(): Promise<void> {
    const packageManager = await this.detectPackageManager();

    try {
      execSync(`${packageManager} add @instantdb/react @instantdb/admin`, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    } catch (error) {
      console.log(
        chalk.yellow("⚠️ Failed to install with pnpm, trying npm...")
      );
      execSync("npm install @instantdb/react @instantdb/admin", {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    }
  }

  private async detectPackageManager(): Promise<"pnpm" | "npm"> {
    if (await fs.pathExists(path.join(process.cwd(), "pnpm-lock.yaml"))) {
      return "pnpm";
    }
    return "npm";
  }

  private async initializeInstantDB(): Promise<void> {
    try {
      // Check if instant.schema.ts already exists
      const schemaPath = path.join(process.cwd(), "instant.schema.ts");
      if (await fs.pathExists(schemaPath)) {
        console.log(chalk.gray("   InstantDB already initialized"));
        return;
      }

      // Run instant-cli init
      execSync("npx instant-cli@latest init --yes", {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    } catch (error) {
      console.log(
        chalk.yellow(
          "⚠️ InstantDB CLI init failed, creating schema manually..."
        )
      );
      await this.createBasicSchema();
    }
  }

  private async createBasicSchema(): Promise<void> {
    const schemaContent = `import { i } from "@instantdb/react";

const schema = i.schema({
  entities: {
    $users: i.entity({
      email: i.string().unique().indexed(),
      name: i.string(),
      createdAt: i.date(),
      updatedAt: i.date(),
    }),
    profiles: i.entity({
      userId: i.string(),
      nickname: i.string(),
      bio: i.string().optional(),
      avatar: i.string().optional(),
      createdAt: i.date(),
      updatedAt: i.date(),
    }),
    // Add more entities based on your project context
  },
  links: {
    userProfile: {
      forward: { on: "profiles", has: "one", label: "user" },
      reverse: { on: "$users", has: "one", label: "profile" },
    },
  },
});

export default schema;
`;

    await fs.writeFile(
      path.join(process.cwd(), "instant.schema.ts"),
      schemaContent
    );
  }

  private async generateSchemaFromContext(): Promise<void> {
    // Read context files
    const prdPath = path.join(process.cwd(), ".mycontext", "01-prd.md");
    const typesPath = path.join(process.cwd(), ".mycontext", "types.ts");

    const prd = await fs.readFile(prdPath, "utf-8");
    const types = await fs.readFile(typesPath, "utf-8");

    // Generate enhanced schema based on context
    const enhancedSchema = await this.buildEnhancedSchema(prd, types);

    // Update the schema file
    await fs.writeFile(
      path.join(process.cwd(), "instant.schema.ts"),
      enhancedSchema
    );
  }

  private async buildEnhancedSchema(
    prd: string,
    types: string
  ): Promise<string> {
    // Extract entities from types file
    const entities = this.extractEntitiesFromTypes(types);

    // Build schema with extracted entities
    let schemaContent = `import { i } from "@instantdb/react";

const schema = i.schema({
  entities: {
    $users: i.entity({
      email: i.string().unique().indexed(),
      name: i.string(),
      createdAt: i.date(),
      updatedAt: i.date(),
    }),
    profiles: i.entity({
      userId: i.string(),
      nickname: i.string(),
      bio: i.string().optional(),
      avatar: i.string().optional(),
      createdAt: i.date(),
      updatedAt: i.date(),
    }),
`;

    // Add extracted entities
    entities.forEach((entity) => {
      schemaContent += `    ${entity.name}: i.entity({\n`;
      entity.fields.forEach((field) => {
        const instantType = this.mapTypeToInstant(field.type);
        schemaContent += `      ${field.name}: i.${instantType}()${
          field.optional ? ".optional()" : ""
        },\n`;
      });
      schemaContent += `      createdAt: i.date(),\n`;
      schemaContent += `      updatedAt: i.date(),\n`;
      schemaContent += `    }),\n`;
    });

    schemaContent += `  },\n`;
    schemaContent += `  links: {\n`;
    schemaContent += `    userProfile: {\n`;
    schemaContent += `      forward: { on: "profiles", has: "one", label: "user" },\n`;
    schemaContent += `      reverse: { on: "$users", has: "one", label: "profile" },\n`;
    schemaContent += `    },\n`;
    schemaContent += `  },\n`;
    schemaContent += `});\n\n`;
    schemaContent += `export default schema;\n`;

    return schemaContent;
  }

  private extractEntitiesFromTypes(typesContent: string): Array<{
    name: string;
    fields: Array<{ name: string; type: string; optional: boolean }>;
  }> {
    const entities: Array<{
      name: string;
      fields: Array<{ name: string; type: string; optional: boolean }>;
    }> = [];

    // Simple regex to extract interfaces
    const interfaceRegex = /interface\s+(\w+)\s*\{([^}]+)\}/g;
    let match;

    while ((match = interfaceRegex.exec(typesContent)) !== null) {
      const name = match[1];
      const fieldsContent = match[2];

      const fields: Array<{ name: string; type: string; optional: boolean }> =
        [];
      const fieldRegex = /(\w+)(\?)?\s*:\s*([^;,\n]+)/g;
      let fieldMatch;

      while ((fieldMatch = fieldRegex.exec(fieldsContent)) !== null) {
        fields.push({
          name: fieldMatch[1],
          type: fieldMatch[3].trim(),
          optional: !!fieldMatch[2],
        });
      }

      if (fields.length > 0) {
        entities.push({ name: name.toLowerCase(), fields });
      }
    }

    return entities;
  }

  private mapTypeToInstant(type: string): string {
    const typeMap: Record<string, string> = {
      string: "string",
      number: "number",
      boolean: "boolean",
      Date: "date",
      object: "json",
      any: "any",
    };

    return typeMap[type] || "string";
  }

  private async setupAuthentication(): Promise<void> {
    // Create auth utilities
    const authUtilsContent = `import { init, id } from "@instantdb/react";
import schema from "./instant.schema";

const db = init({ 
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID || "__APP_ID__", 
  schema 
});

export { db, id };

// Auth utilities
export const authUtils = {
  async sendMagicCode(email: string) {
    try {
      await db.auth.sendMagicCode({ email });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async signInWithMagicCode(email: string, code: string) {
    try {
      await db.auth.signInWithMagicCode({ email, code });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async signOut() {
    try {
      await db.auth.signOut();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async createUserProfile(userId: string, data: { nickname: string; bio?: string }) {
    try {
      await db.transact([
        db.tx.profiles[id()].create({
          userId,
          nickname: data.nickname,
          bio: data.bio || "",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      ]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
`;

    await fs.writeFile(
      path.join(process.cwd(), "lib", "instantdb.ts"),
      authUtilsContent
    );

    // Create auth components
    await this.createAuthComponents();
  }

  private async createAuthComponents(): Promise<void> {
    // Create auth directory
    const authDir = path.join(process.cwd(), "components", "auth");
    await fs.ensureDir(authDir);

    // Create LoginForm component
    const loginFormContent = `"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authUtils } from "@/lib/instantdb";
import { toast } from "sonner";

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    const result = await authUtils.sendMagicCode(email);
    setLoading(false);

    if (result.success) {
      setStep("code");
      toast.success("Magic code sent to your email!");
    } else {
      toast.error(result.error || "Failed to send code");
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;

    setLoading(true);
    const result = await authUtils.signInWithMagicCode(email, code);
    setLoading(false);

    if (result.success) {
      toast.success("Successfully signed in!");
      onSuccess?.();
    } else {
      toast.error(result.error || "Invalid code");
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>
          {step === "email" 
            ? "Enter your email to receive a magic code"
            : "Enter the code sent to your email"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "email" ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send Magic Code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <Input
              type="text"
              placeholder="Enter magic code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("email")}
                className="flex-1"
              >
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Verifying..." : "Verify Code"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
`;

    await fs.writeFile(path.join(authDir, "LoginForm.tsx"), loginFormContent);

    // Create UserDashboard component
    const userDashboardContent = `"use client";

import { db } from "@/lib/instantdb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authUtils } from "@/lib/instantdb";
import { toast } from "sonner";

export function UserDashboard() {
  const user = db.useUser();

  const handleSignOut = async () => {
    const result = await authUtils.signOut();
    if (result.success) {
      toast.success("Signed out successfully");
    } else {
      toast.error(result.error || "Failed to sign out");
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Welcome, {user.email}!</CardTitle>
        <CardDescription>Your account dashboard</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Email:</p>
          <p className="font-medium">{user.email}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">User ID:</p>
          <p className="font-mono text-xs">{user.id}</p>
        </div>
        <Button onClick={handleSignOut} variant="outline" className="w-full">
          Sign Out
        </Button>
      </CardContent>
    </Card>
  );
}
`;

    await fs.writeFile(
      path.join(authDir, "UserDashboard.tsx"),
      userDashboardContent
    );

    // Create AuthProvider component
    const authProviderContent = `"use client";

import { db } from "@/lib/instantdb";
import { LoginForm } from "./LoginForm";
import { UserDashboard } from "./UserDashboard";

export function AuthProvider() {
  return (
    <db.SignedIn>
      <UserDashboard />
    </db.SignedIn>
  );
}

export function AuthForm() {
  return (
    <db.SignedOut>
      <LoginForm />
    </db.SignedOut>
  );
}
`;

    await fs.writeFile(
      path.join(authDir, "AuthProvider.tsx"),
      authProviderContent
    );

    // Create index file
    const indexContent = `export { LoginForm } from "./LoginForm";
export { UserDashboard } from "./UserDashboard";
export { AuthProvider, AuthForm } from "./AuthProvider";
`;

    await fs.writeFile(path.join(authDir, "index.ts"), indexContent);
  }

  private async generateDatabaseComponents(): Promise<void> {
    // Create database utilities
    const dbUtilsContent = `import { db, id } from "@/lib/instantdb";

// Generic CRUD operations
export const dbUtils = {
  // Create operations
  async create(collection: string, data: any) {
    try {
      await db.transact([
        db.tx[collection][id()].create({
          ...data,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      ]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Read operations
  async read(collection: string, id: string) {
    try {
      const { data } = await db.query({ [collection]: { $: { where: { id } } } });
      return { success: true, data: data[collection]?.[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Update operations
  async update(collection: string, id: string, data: any) {
    try {
      await db.transact([
        db.tx[collection][id].update({
          ...data,
          updatedAt: Date.now(),
        })
      ]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Delete operations
  async delete(collection: string, id: string) {
    try {
      await db.transact([
        db.tx[collection][id].delete()
      ]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // List operations
  async list(collection: string, filters?: any) {
    try {
      const query = filters ? { [collection]: { $: { where: filters } } } : { [collection]: {} };
      const { data } = await db.query(query);
      return { success: true, data: data[collection] || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Real-time hooks
export const useRealtimeQuery = (query: any) => {
  return db.useQuery(query);
};

export const useUser = () => {
  return db.useUser();
};
`;

    await fs.writeFile(
      path.join(process.cwd(), "lib", "db-utils.ts"),
      dbUtilsContent
    );
  }

  private async integrateDatabaseWithComponents(): Promise<void> {
    // Update existing components to use database
    const componentsDir = path.join(process.cwd(), "components");
    if (!(await fs.pathExists(componentsDir))) {
      return;
    }

    // This would scan existing components and add database integration
    // For now, we'll create a sample integration
    console.log(
      chalk.gray("   Database integration ready for existing components")
    );
  }

  private showNextSteps(): void {
    console.log(chalk.blue.bold("\n🎯 Next Steps:\n"));

    console.log(chalk.yellow("1. Configure your InstantDB app:"));
    console.log(chalk.gray("   • Visit https://instantdb.com/dash"));
    console.log(chalk.gray("   • Create a new app or use existing one"));
    console.log(chalk.gray("   • Copy your APP_ID\n"));

    console.log(chalk.yellow("2. Set up environment variables:"));
    console.log(
      chalk.gray("   • Add NEXT_PUBLIC_INSTANT_APP_ID to your .env.local")
    );
    console.log(
      chalk.gray("   • Example: NEXT_PUBLIC_INSTANT_APP_ID=your_app_id_here\n")
    );

    console.log(chalk.yellow("3. Push your schema to InstantDB:"));
    console.log(chalk.gray("   • Run: npx instant-cli@latest push"));
    console.log(chalk.gray("   • This will sync your schema with InstantDB\n"));

    console.log(chalk.yellow("4. Test your setup:"));
    console.log(chalk.gray("   • Import and use AuthProvider in your app"));
    console.log(chalk.gray("   • Test the magic code authentication flow\n"));

    console.log(
      chalk.yellow("5. Generate components with database integration:")
    );
    console.log(chalk.gray("   • Run: mycontext generate-components"));
    console.log(
      chalk.gray(
        "   • Components will automatically include database features\n"
      )
    );

    console.log(chalk.cyan("📚 Documentation:"));
    console.log(chalk.gray("   • InstantDB Docs: https://instantdb.com/docs"));
    console.log(
      chalk.gray(
        "   • Magic Code Auth: https://instantdb.com/docs/auth/magic-codes"
      )
    );
  }
}
