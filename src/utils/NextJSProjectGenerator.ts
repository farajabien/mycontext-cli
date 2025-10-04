import * as fs from "fs-extra";
import * as path from "path";
import chalk from "chalk";

export interface NextJSProjectOptions {
  projectName: string;
  projectPath: string;
  withShadcn: boolean;
  withTailwind: boolean;
  withTypeScript: boolean;
  withESLint: boolean;
  withAppRouter: boolean;
  withLayouts: boolean;
  withComponents: boolean;
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: "file" | "directory";
}

export class NextJSProjectGenerator {
  private projectRoot: string;
  private options: NextJSProjectOptions;

  constructor(options: NextJSProjectOptions) {
    this.projectRoot = options.projectPath;
    this.options = options;
  }

  /**
   * Generate complete Next.js project structure
   */
  async generateProject(): Promise<GeneratedFile[]> {
    console.log(chalk.blue("🚀 Generating Next.js project structure..."));
    console.log(chalk.blue("==========================================\n"));

    const generatedFiles: GeneratedFile[] = [];

    try {
      // Step 1: Create basic project structure
      await this.createBasicStructure(generatedFiles);

      // Step 2: Generate package.json
      await this.generatePackageJson(generatedFiles);

      // Step 3: Generate Next.js configuration
      await this.generateNextJSConfig(generatedFiles);

      // Step 4: Generate TypeScript configuration
      if (this.options.withTypeScript) {
        await this.generateTypeScriptConfig(generatedFiles);
      }

      // Step 5: Generate Tailwind configuration
      if (this.options.withTailwind) {
        await this.generateTailwindConfig(generatedFiles);
      }

      // Step 6: Generate App Router structure
      if (this.options.withAppRouter) {
        await this.generateAppRouterStructure(generatedFiles);
      }

      // Step 7: Generate shadcn/ui configuration
      if (this.options.withShadcn) {
        await this.generateShadcnConfig(generatedFiles);
      }

      // Step 8: Generate component structure
      if (this.options.withComponents) {
        await this.generateComponentStructure(generatedFiles);
      }

      // Step 9: Generate layout structure
      if (this.options.withLayouts) {
        await this.generateLayoutStructure(generatedFiles);
      }

      // Step 10: Generate utility files
      await this.generateUtilityFiles(generatedFiles);

      console.log(
        chalk.green(
          `\n✅ Generated ${generatedFiles.length} files successfully!`
        )
      );
      return generatedFiles;
    } catch (error) {
      console.log(chalk.red(`❌ Project generation failed: ${error}`));
      throw error;
    }
  }

  /**
   * Create basic project structure
   */
  private async createBasicStructure(
    generatedFiles: GeneratedFile[]
  ): Promise<void> {
    console.log(chalk.blue("📁 Creating basic project structure..."));

    const directories = [
      "app",
      "components",
      "lib",
      "hooks",
      "types",
      "public",
      ".mycontext",
    ];

    for (const dir of directories) {
      const dirPath = path.join(this.projectRoot, dir);
      await fs.ensureDir(dirPath);

      generatedFiles.push({
        path: dirPath,
        content: "",
        type: "directory",
      });
    }

    // Create .gitignore
    const gitignorePath = path.join(this.projectRoot, ".gitignore");
    const gitignoreContent = this.generateGitignoreContent();
    await fs.writeFile(gitignorePath, gitignoreContent);

    generatedFiles.push({
      path: gitignorePath,
      content: gitignoreContent,
      type: "file",
    });

    console.log(chalk.green("✅ Basic structure created"));
  }

  /**
   * Generate package.json
   */
  private async generatePackageJson(
    generatedFiles: GeneratedFile[]
  ): Promise<void> {
    console.log(chalk.blue("📦 Generating package.json..."));

    const packageJson = {
      name: this.options.projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
        lint: "next lint",
        "type-check": "tsc --noEmit",
      },
      dependencies: {
        react: "^18.0.0",
        "react-dom": "^18.0.0",
        next: "^14.0.0",
      },
      devDependencies: {
        typescript: "^5.0.0",
        "@types/node": "^20.0.0",
        "@types/react": "^18.0.0",
        "@types/react-dom": "^18.0.0",
        eslint: "^8.0.0",
        "eslint-config-next": "^14.0.0",
      },
      packageManager: "pnpm@10.11.0",
    };

    // Add Tailwind CSS dependencies if enabled
    if (this.options.withTailwind) {
      (packageJson as any).devDependencies = {
        ...packageJson.devDependencies,
        tailwindcss: "^3.0.0",
        autoprefixer: "^10.0.0",
        postcss: "^8.0.0",
      };
    }

    const packageJsonPath = path.join(this.projectRoot, "package.json");
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });

    generatedFiles.push({
      path: packageJsonPath,
      content: JSON.stringify(packageJson, null, 2),
      type: "file",
    });

    console.log(chalk.green("✅ package.json generated"));
  }

  /**
   * Generate Next.js configuration
   */
  private async generateNextJSConfig(
    generatedFiles: GeneratedFile[]
  ): Promise<void> {
    console.log(chalk.blue("⚙️ Generating Next.js configuration..."));

    const nextConfigContent = `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbo: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
`;

    const nextConfigPath = path.join(this.projectRoot, "next.config.ts");
    await fs.writeFile(nextConfigPath, nextConfigContent);

    generatedFiles.push({
      path: nextConfigPath,
      content: nextConfigContent,
      type: "file",
    });

    console.log(chalk.green("✅ Next.js configuration generated"));
  }

  /**
   * Generate TypeScript configuration
   */
  private async generateTypeScriptConfig(
    generatedFiles: GeneratedFile[]
  ): Promise<void> {
    console.log(chalk.blue("📝 Generating TypeScript configuration..."));

    const tsConfig = {
      compilerOptions: {
        target: "es5",
        lib: ["dom", "dom.iterable", "es6"],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "preserve",
        incremental: true,
        plugins: [
          {
            name: "next",
          },
        ],
        paths: {
          "@/*": ["./*"],
        },
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"],
    };

    const tsConfigPath = path.join(this.projectRoot, "tsconfig.json");
    await fs.writeJson(tsConfigPath, tsConfig, { spaces: 2 });

    generatedFiles.push({
      path: tsConfigPath,
      content: JSON.stringify(tsConfig, null, 2),
      type: "file",
    });

    console.log(chalk.green("✅ TypeScript configuration generated"));
  }

  /**
   * Generate Tailwind CSS configuration
   */
  private async generateTailwindConfig(
    generatedFiles: GeneratedFile[]
  ): Promise<void> {
    console.log(chalk.blue("🎨 Generating Tailwind CSS configuration..."));

    const tailwindConfig = `import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
`;

    const tailwindConfigPath = path.join(
      this.projectRoot,
      "tailwind.config.ts"
    );
    await fs.writeFile(tailwindConfigPath, tailwindConfig);

    generatedFiles.push({
      path: tailwindConfigPath,
      content: tailwindConfig,
      type: "file",
    });

    // Generate PostCSS configuration
    const postcssConfig = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;

    const postcssConfigPath = path.join(this.projectRoot, "postcss.config.js");
    await fs.writeFile(postcssConfigPath, postcssConfig);

    generatedFiles.push({
      path: postcssConfigPath,
      content: postcssConfig,
      type: "file",
    });

    console.log(chalk.green("✅ Tailwind CSS configuration generated"));
  }

  /**
   * Generate App Router structure
   */
  private async generateAppRouterStructure(
    generatedFiles: GeneratedFile[]
  ): Promise<void> {
    console.log(chalk.blue("📁 Generating App Router structure..."));

    // Generate root layout
    const rootLayoutContent = `import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "${this.options.projectName}",
  description: "A modern web application built with Next.js",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
`;

    const rootLayoutPath = path.join(this.projectRoot, "app", "layout.tsx");
    await fs.writeFile(rootLayoutPath, rootLayoutContent);

    generatedFiles.push({
      path: rootLayoutPath,
      content: rootLayoutContent,
      type: "file",
    });

    // Generate root page
    const rootPageContent = `import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Welcome to ${this.options.projectName}
        </h1>
        <p className="text-center text-lg text-muted-foreground mb-8">
          A modern web application built with Next.js, TypeScript, and Tailwind CSS.
        </p>
        <div className="flex justify-center">
          <Button>Get Started</Button>
        </div>
      </div>
    </main>
  );
}
`;

    const rootPagePath = path.join(this.projectRoot, "app", "page.tsx");
    await fs.writeFile(rootPagePath, rootPageContent);

    generatedFiles.push({
      path: rootPagePath,
      content: rootPageContent,
      type: "file",
    });

    // Generate global CSS
    const globalCssContent = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
`;

    const globalCssPath = path.join(this.projectRoot, "app", "globals.css");
    await fs.writeFile(globalCssPath, globalCssContent);

    generatedFiles.push({
      path: globalCssPath,
      content: globalCssContent,
      type: "file",
    });

    console.log(chalk.green("✅ App Router structure generated"));
  }

  /**
   * Generate shadcn/ui configuration
   */
  private async generateShadcnConfig(
    generatedFiles: GeneratedFile[]
  ): Promise<void> {
    console.log(chalk.blue("🎨 Generating shadcn/ui configuration..."));

    const componentsJson = {
      $schema: "https://ui.shadcn.com/schema.json",
      style: "default",
      rsc: true,
      tsx: true,
      tailwind: {
        config: "tailwind.config.ts",
        css: "app/globals.css",
        baseColor: "slate",
        cssVariables: true,
        prefix: "",
      },
      aliases: {
        components: "@/components",
        utils: "@/lib/utils",
      },
    };

    const componentsJsonPath = path.join(this.projectRoot, "components.json");
    await fs.writeJson(componentsJsonPath, componentsJson, { spaces: 2 });

    generatedFiles.push({
      path: componentsJsonPath,
      content: JSON.stringify(componentsJson, null, 2),
      type: "file",
    });

    console.log(chalk.green("✅ shadcn/ui configuration generated"));
  }

  /**
   * Generate component structure
   */
  private async generateComponentStructure(
    generatedFiles: GeneratedFile[]
  ): Promise<void> {
    console.log(chalk.blue("🧩 Generating component structure..."));

    // Create UI components directory
    const uiDir = path.join(this.projectRoot, "components", "ui");
    await fs.ensureDir(uiDir);

    generatedFiles.push({
      path: uiDir,
      content: "",
      type: "directory",
    });

    // Generate basic Button component (shadcn/ui style)
    const buttonComponent = `import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
`;

    const buttonPath = path.join(uiDir, "button.tsx");
    await fs.writeFile(buttonPath, buttonComponent);

    generatedFiles.push({
      path: buttonPath,
      content: buttonComponent,
      type: "file",
    });

    console.log(chalk.green("✅ Component structure generated"));
  }

  /**
   * Generate layout structure
   */
  private async generateLayoutStructure(
    generatedFiles: GeneratedFile[]
  ): Promise<void> {
    console.log(chalk.blue("🎨 Generating layout structure..."));

    // Create dashboard layout example
    const dashboardDir = path.join(this.projectRoot, "app", "dashboard");
    await fs.ensureDir(dashboardDir);

    generatedFiles.push({
      path: dashboardDir,
      content: "",
      type: "directory",
    });

    // Generate dashboard layout
    const dashboardLayoutContent = `export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col md:flex-row md:overflow-hidden">
      <div className="w-full flex-none md:w-64">
        <nav className="flex h-full flex-col px-3 py-4">
          <div className="flex grow flex-row justify-between space-x-2 md:flex-col md:space-x-0 md:space-y-2">
            <div className="flex h-[48px] grow items-center rounded-md bg-gray-50 p-3 text-sm font-medium md:h-auto md:justify-start md:p-2 md:px-3">
              Dashboard
            </div>
          </div>
        </nav>
      </div>
      <div className="flex-grow p-6 md:overflow-y-auto md:p-12">
        {children}
      </div>
    </div>
  );
}
`;

    const dashboardLayoutPath = path.join(dashboardDir, "layout.tsx");
    await fs.writeFile(dashboardLayoutPath, dashboardLayoutContent);

    generatedFiles.push({
      path: dashboardLayoutPath,
      content: dashboardLayoutContent,
      type: "file",
    });

    // Generate dashboard page
    const dashboardPageContent = `export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome to your dashboard. This is an example of nested routing with layouts.
      </p>
    </div>
  );
}
`;

    const dashboardPagePath = path.join(dashboardDir, "page.tsx");
    await fs.writeFile(dashboardPagePath, dashboardPageContent);

    generatedFiles.push({
      path: dashboardPagePath,
      content: dashboardPageContent,
      type: "file",
    });

    console.log(chalk.green("✅ Layout structure generated"));
  }

  /**
   * Generate utility files
   */
  private async generateUtilityFiles(
    generatedFiles: GeneratedFile[]
  ): Promise<void> {
    console.log(chalk.blue("🛠️ Generating utility files..."));

    // Generate lib/utils.ts
    const utilsContent = `import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;

    const utilsPath = path.join(this.projectRoot, "lib", "utils.ts");
    await fs.writeFile(utilsPath, utilsContent);

    generatedFiles.push({
      path: utilsPath,
      content: utilsContent,
      type: "file",
    });

    // Generate next-env.d.ts
    const nextEnvContent = `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.
`;

    const nextEnvPath = path.join(this.projectRoot, "next-env.d.ts");
    await fs.writeFile(nextEnvPath, nextEnvContent);

    generatedFiles.push({
      path: nextEnvPath,
      content: nextEnvContent,
      type: "file",
    });

    console.log(chalk.green("✅ Utility files generated"));
  }

  /**
   * Generate .gitignore content
   */
  private generateGitignoreContent(): string {
    return `# Dependencies
node_modules/
.pnp
.pnp.js

# Production builds
.next/
out/
build/
dist/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/
jspm_packages/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Editor directories and files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# MyContext specific
.mycontext/.env
.mycontext/logs/
.mycontext/cache/
`;
  }
}
