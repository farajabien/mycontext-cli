/**
 * Next.js Rules — Best practice checks for Next.js App Router projects
 */
import * as path from "path";
import type { DoctorRule, RuleContext, Diagnostic } from "../types";

// ─── Helper ───────────────────────────────────────────────────────

function diag(
  rule: DoctorRule,
  filePath: string,
  message: string,
  opts: { line?: number; autoFixable?: boolean; help?: string } = {}
): Diagnostic {
  return {
    ruleId: rule.id,
    filePath,
    line: opts.line,
    severity: rule.severity,
    message,
    help: opts.help || rule.help,
    autoFixable: opts.autoFixable ?? false,
  };
}

// ─── Rules ────────────────────────────────────────────────────────

const missingRootLayout: DoctorRule = {
  id: "nextjs/missing-root-layout",
  name: "Root Layout Required",
  category: "nextjs",
  severity: "error",
  description: "Next.js App Router requires a root layout.tsx",
  help: "Create app/layout.tsx with html and body tags wrapping {children}",
  appliesTo: ["nextjs"],
  async check(ctx) {
    const results: Diagnostic[] = [];
    const hasLayout =
      await ctx.fileExists("app/layout.tsx") ||
      await ctx.fileExists("app/layout.jsx") ||
      await ctx.fileExists("src/app/layout.tsx") ||
      await ctx.fileExists("src/app/layout.jsx");
    if (!hasLayout) {
      results.push(diag(this, "app/layout.tsx", "No root layout found — App Router requires app/layout.tsx"));
    }
    return results;
  },
};

const layoutHasHtmlBody: DoctorRule = {
  id: "nextjs/layout-html-body",
  name: "Layout Has HTML/Body",
  category: "nextjs",
  severity: "error",
  description: "Root layout must wrap children in <html> and <body> tags",
  help: "Add <html lang='en'><body>{children}</body></html> to root layout",
  appliesTo: ["nextjs"],
  async check(ctx) {
    const results: Diagnostic[] = [];
    const layoutPaths = ["app/layout.tsx", "app/layout.jsx", "src/app/layout.tsx", "src/app/layout.jsx"];
    for (const lp of layoutPaths) {
      const content = await ctx.readFile(lp);
      if (!content) continue;
      if (!content.includes("<html")) {
        results.push(diag(this, lp, "Root layout missing <html> tag"));
      }
      if (!content.includes("<body")) {
        results.push(diag(this, lp, "Root layout missing <body> tag"));
      }
      break; // only check the first layout found
    }
    return results;
  },
};

const pageDefaultExport: DoctorRule = {
  id: "nextjs/page-default-export",
  name: "Page Default Export",
  category: "nextjs",
  severity: "error",
  description: "Page files must have a default export",
  help: "Add 'export default function PageName()' to your page file",
  appliesTo: ["nextjs"],
  async check(ctx) {
    const results: Diagnostic[] = [];
    const pages = await ctx.findFiles(/page\.(tsx|jsx|ts|js)$/);
    for (const p of pages) {
      const content = await ctx.readFile(p);
      if (!content) continue;
      if (!content.includes("export default")) {
        results.push(diag(this, p, `Page file missing default export`));
      }
    }
    return results;
  },
};

const clientDirective: DoctorRule = {
  id: "nextjs/client-directive",
  name: "Client Directive Usage",
  category: "nextjs",
  severity: "warning",
  description: "Files using hooks/browser APIs should have 'use client' directive",
  help: "Add 'use client' at the top of files using useState, useEffect, onClick, etc.",
  appliesTo: ["nextjs"],
  async check(ctx) {
    const results: Diagnostic[] = [];
    const clientSignals = [
      /\buseState\b/, /\buseEffect\b/, /\buseRef\b/, /\buseReducer\b/,
      /\buseCallback\b/, /\buseMemo\b/, /\buseContext\b/,
      /\bonClick\b/, /\bonChange\b/, /\bonSubmit\b/,
      /\bwindow\b/, /\bdocument\b/,
    ];

    const files = await ctx.findFiles(/\.(tsx|jsx)$/);
    for (const f of files) {
      // Skip layout/page files that could be server components
      if (/layout\.(tsx|jsx)$/.test(f) && !f.includes("components")) continue;
      const content = await ctx.readFile(f);
      if (!content) continue;
      if (content.includes('"use client"') || content.includes("'use client'")) continue;

      const needsClient = clientSignals.some(sig => sig.test(content));
      if (needsClient) {
        // Find which hook/API triggered it
        const trigger = clientSignals.find(sig => sig.test(content));
        const triggerName = trigger ? trigger.source.replace(/\\b/g, "") : "client API";
        results.push(diag(this, f, `Uses ${triggerName} but missing "use client" directive`, {
          autoFixable: true,
        }));
      }
    }
    return results;
  },
  async fix(ctx, d) {
    const content = await ctx.readFile(d.filePath);
    if (!content) return false;
    const newContent = `"use client";\n\n${content}`;
    const abs = path.join(ctx.root, d.filePath);
    const { writeFile } = await import("fs-extra");
    await writeFile(abs, newContent);
    return true;
  },
};

const serverComponentHooks: DoctorRule = {
  id: "nextjs/server-component-hooks",
  name: "No Hooks in Server Components",
  category: "nextjs",
  severity: "error",
  description: "Server components cannot use React hooks",
  help: "Add 'use client' directive or move hooks to a client component",
  appliesTo: ["nextjs"],
  async check(ctx) {
    const results: Diagnostic[] = [];
    const hookPattern = /\b(useState|useEffect|useRef|useReducer|useCallback|useMemo|useContext)\s*\(/;
    const serverFiles = await ctx.findFiles(/(page|layout)\.(tsx|jsx)$/);

    for (const f of serverFiles) {
      const content = await ctx.readFile(f);
      if (!content) continue;
      if (content.includes('"use client"') || content.includes("'use client'")) continue;
      const hookPatternLocal = /\b(useState|useEffect|useRef|useReducer|useCallback|useMemo|useContext)\s*\(/;

      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        const match = hookPatternLocal.exec(line);
        if (match && match[1]) {
          results.push(diag(this, f, `Server component uses hook ${match[1]}()`, {
            line: i + 1,
          }));
        }
      }
    }
    return results;
  },
};

const metadataExport: DoctorRule = {
  id: "nextjs/metadata-export",
  name: "Metadata Export",
  category: "nextjs",
  severity: "warning",
  description: "Pages/layouts should export metadata or generateMetadata for SEO",
  help: "Add 'export const metadata = { title: ... }' or 'export async function generateMetadata()'",
  appliesTo: ["nextjs"],
  async check(ctx: RuleContext) {
    const results: Diagnostic[] = [];
    const pages = await ctx.findFiles(/page\.(tsx|jsx|ts|js)$/);

    for (const p of pages) {
      const content = await ctx.readFile(p);
      if (!content) continue;
      // Check if there's metadata or generateMetadata
      const hasMetadata = content.includes("export const metadata") ||
        content.includes("export async function generateMetadata") ||
        content.includes("export function generateMetadata");
      if (!hasMetadata) {
        results.push(diag(this, p, "Page missing metadata export for SEO"));
      }
    }
    return results;
  },
};

const imageComponent: DoctorRule = {
  id: "nextjs/image-component",
  name: "Use next/image",
  category: "nextjs",
  severity: "warning",
  description: "Use next/image instead of <img> for optimized images",
  help: "Import Image from 'next/image' and replace <img> tags",
  appliesTo: ["nextjs"],
  async check(ctx) {
    const results: Diagnostic[] = [];
    const files = await ctx.findFiles(/\.(tsx|jsx)$/);

    for (const f of files) {
      const content = await ctx.readFile(f);
      if (!content) continue;
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        if (/<img\s/i.test(line) && !line.includes("eslint-disable")) {
          results.push(diag(this, f, "Uses <img> instead of next/image", { line: i + 1 }));
        }
      }
    }
    return results;
  },
};

const linkComponent: DoctorRule = {
  id: "nextjs/link-component",
  name: "Use next/link",
  category: "nextjs",
  severity: "warning",
  description: "Use next/link for internal navigation instead of <a> tags",
  help: "Import Link from 'next/link' and replace <a href='/...'> with <Link href='/...'>",
  appliesTo: ["nextjs"],
  async check(ctx) {
    const results: Diagnostic[] = [];
    const files = await ctx.findFiles(/\.(tsx|jsx)$/);

    for (const f of files) {
      const content = await ctx.readFile(f);
      if (!content) continue;
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        // Match <a href="/something"> (internal links)
        const match = /<a\s[^>]*href=["'](\/[^"']*)/i.exec(line);
        if (match && !line.includes("eslint-disable")) {
          results.push(diag(this, f, `Uses <a> for internal link "${match[1] ?? ""}" instead of next/link`, { line: i + 1 }));
        }
      }
    }
    return results;
  },
};

const routeHandlerMethods: DoctorRule = {
  id: "nextjs/route-handler-methods",
  name: "Route Handler Exports",
  category: "nextjs",
  severity: "error",
  description: "API route handlers must export named HTTP methods (GET, POST, etc.)",
  help: "Export named functions: export async function GET(request) { ... }",
  appliesTo: ["nextjs"],
  async check(ctx) {
    const results: Diagnostic[] = [];
    const routes = await ctx.findFiles(/route\.(ts|js|tsx|jsx)$/);

    for (const r of routes) {
      const content = await ctx.readFile(r);
      if (!content) continue;
      const httpMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
      const hasMethod = httpMethods.some(m =>
        content.includes(`export async function ${m}`) ||
        content.includes(`export function ${m}`) ||
        content.includes(`export const ${m}`)
      );
      if (!hasMethod) {
        results.push(diag(this, r, "Route handler doesn't export any HTTP methods (GET/POST/etc.)"));
      }
    }
    return results;
  },
};

const loadingFiles: DoctorRule = {
  id: "nextjs/loading-states",
  name: "Loading States",
  category: "nextjs",
  severity: "warning",
  description: "Route groups with data fetching should have loading.tsx for better UX",
  help: "Create loading.tsx alongside page.tsx for Suspense-based loading states",
  appliesTo: ["nextjs"],
  async check(ctx) {
    const results: Diagnostic[] = [];
    const pages = await ctx.findFiles(/page\.(tsx|jsx)$/);

    for (const p of pages) {
      const content = await ctx.readFile(p);
      if (!content) continue;
      // Check if page has async data fetching
      const hasAsyncData = content.includes("async function") && (
        content.includes("fetch(") || content.includes("await ")
      );
      if (!hasAsyncData) continue;

      const dir = path.dirname(p);
      const hasLoading = await ctx.fileExists(path.join(dir, "loading.tsx")) ||
        await ctx.fileExists(path.join(dir, "loading.jsx"));
      if (!hasLoading) {
        results.push(diag(this, p, "Page with async data has no loading.tsx for Suspense"));
      }
    }
    return results;
  },
};

export const nextjsRules: DoctorRule[] = [
  missingRootLayout,
  layoutHasHtmlBody,
  pageDefaultExport,
  clientDirective,
  serverComponentHooks,
  metadataExport,
  imageComponent,
  linkComponent,
  routeHandlerMethods,
  loadingFiles,
];
