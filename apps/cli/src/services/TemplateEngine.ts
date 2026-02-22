import { AuthSpec, PermissionSpec } from "../types/asl";
import { TemplateHelpers } from "./TemplateHelpers";
import * as path from "path";
import * as fs from "fs-extra";

/**
 * TemplateEngine - Generate code from templates
 *
 * Uses Handlebars templates to generate production-ready:
 * - Auth pages and components
 * - RBAC guards and middleware
 * - Entity CRUD pages and components
 * - UI components with CVA variants
 * - Server Actions with validation
 *
 * Templates are in src/templates/ directory
 */
export class TemplateEngine {
  private helpers: TemplateHelpers;
  private templatesDir: string;

  constructor() {
    this.helpers = new TemplateHelpers();
    this.templatesDir = path.join(__dirname, "../templates");
  }
  /**
   * Generate authentication pages (login, register)
   */
  async generateAuthPages(
    projectPath: string,
    auth: AuthSpec
  ): Promise<void> {
    // Create auth directory
    const authPath = path.join(projectPath, 'app', '(auth)');
    await fs.ensureDir(authPath);

    // Generate login page
    const loginPage = this.generateLoginPage(auth);
    const loginPath = path.join(authPath, 'login');
    await fs.ensureDir(loginPath);
    await fs.writeFile(
      path.join(loginPath, 'page.tsx'),
      loginPage
    );

    // Generate register page
    const registerPage = this.generateRegisterPage(auth);
    const registerPath = path.join(authPath, 'register');
    await fs.ensureDir(registerPath);
    await fs.writeFile(
      path.join(registerPath, 'page.tsx'),
      registerPage
    );

    // Generate auth components
    await this.generateAuthComponents(projectPath, auth);
  }

  /**
   * Generate auth components (LoginForm, RegisterForm)
   */
  private async generateAuthComponents(
    projectPath: string,
    auth: AuthSpec
  ): Promise<void> {
    const componentsPath = path.join(projectPath, 'components', 'auth');
    await fs.ensureDir(componentsPath);

    // LoginForm (placeholder)
    const loginForm = this.generateLoginForm(auth);
    await fs.writeFile(
      path.join(componentsPath, 'LoginForm.tsx'),
      loginForm
    );
  }

  /**
   * Generate RBAC guards (withAuth, withRole)
   */
  async generateGuards(
    projectPath: string,
    permissions: PermissionSpec[]
  ): Promise<void> {
    const guardsPath = path.join(projectPath, 'lib', 'guards');
    await fs.ensureDir(guardsPath);

    // withAuth HOC
    const withAuth = this.generateWithAuthGuard();
    await fs.writeFile(
      path.join(guardsPath, 'withAuth.tsx'),
      withAuth
    );

    // withRole HOC
    const roles = [...new Set(permissions.map(p => p.role))];
    const withRole = this.generateWithRoleGuard(roles);
    await fs.writeFile(
      path.join(guardsPath, 'withRole.tsx'),
      withRole
    );
  }

  /**
   * Generate route protection middleware
   */
  async generateMiddleware(
    projectPath: string,
    permissions: PermissionSpec[]
  ): Promise<void> {
    const middleware = this.generateMiddlewareCode(permissions);
    await fs.writeFile(
      path.join(projectPath, 'middleware.ts'),
      middleware
    );
  }

  // ===== Template Generation Methods (Placeholders) =====

  private generateLoginPage(auth: AuthSpec): string {
    return `'use client';

import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="container flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6">Login</h1>
        <LoginForm />
      </div>
    </div>
  );
}
`;
  }

  private generateRegisterPage(auth: AuthSpec): string {
    return `'use client';

export default function RegisterPage() {
  return (
    <div className="container flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6">Register</h1>
        {/* RegisterForm component */}
      </div>
    </div>
  );
}
`;
  }

  private generateLoginForm(auth: AuthSpec): string {
    return `'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginForm() {
  return (
    <form className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="you@example.com" />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" />
      </div>
      <Button type="submit" className="w-full">
        Sign In
      </Button>
    </form>
  );
}
`;
  }

  private generateWithAuthGuard(): string {
    return `'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function withAuth<P extends object>(
  Component: React.ComponentType<P>
) {
  return function AuthenticatedComponent(props: P) {
    const router = useRouter();

    useEffect(() => {
      // Check auth status
      const isAuthenticated = false; // TODO: Check InstantDB auth
      if (!isAuthenticated) {
        router.push('/login');
      }
    }, [router]);

    return <Component {...props} />;
  };
}
`;
  }

  private generateWithRoleGuard(roles: string[]): string {
    return `'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function withRole<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole: string
) {
  return function RoleProtectedComponent(props: P) {
    const router = useRouter();

    useEffect(() => {
      // Check role
      const userRole = 'user'; // TODO: Get from InstantDB
      if (userRole !== requiredRole) {
        router.push('/unauthorized');
      }
    }, [router]);

    return <Component {...props} />;
  };
}
`;
  }

  private generateMiddlewareCode(permissions: PermissionSpec[]): string {
    return `import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // TODO: Implement route protection based on permissions
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*']
};
`;
  }

  // ===== NEW: Production-Ready Template Methods =====

  /**
   * Generate root layout with font optimization and theme provider
   */
  async generateRootLayout(
    projectPath: string,
    projectName: string,
    projectDescription: string
  ): Promise<void> {
    const templatePath = path.join(this.templatesDir, "layouts/root-layout.tsx.hbs");
    const content = await this.helpers.render(templatePath, {
      projectName,
      projectDescription,
    });

    const outputPath = path.join(projectPath, "app/layout.tsx");
    await fs.writeFile(outputPath, content, "utf-8");
  }

  /**
   * Generate utility files (utils.ts with cn helper)
   */
  async generateUtils(projectPath: string): Promise<void> {
    const templatePath = path.join(this.templatesDir, "lib/utils.ts.hbs");
    const content = await this.helpers.render(templatePath, {});

    const libDir = path.join(projectPath, "lib");
    await fs.ensureDir(libDir);
    await fs.writeFile(path.join(libDir, "utils.ts"), content, "utf-8");
  }

  /**
   * Generate InstantDB client setup
   */
  async generateInstantClient(projectPath: string): Promise<void> {
    const templatePath = path.join(this.templatesDir, "lib/instant.ts.hbs");
    const content = await this.helpers.render(templatePath, {});

    const libDir = path.join(projectPath, "lib");
    await fs.ensureDir(libDir);
    await fs.writeFile(path.join(libDir, "instant.ts"), content, "utf-8");
  }

  /**
   * Generate global CSS with Tailwind v4 and design tokens
   */
  async generateGlobalCSS(projectPath: string): Promise<void> {
    const templatePath = path.join(this.templatesDir, "config/app.css.hbs");
    const content = await this.helpers.render(templatePath, {});

    const appDir = path.join(projectPath, "app");
    await fs.writeFile(path.join(appDir, "app.css"), content, "utf-8");
  }

  /**
   * Generate theme provider component
   */
  async generateThemeProvider(projectPath: string): Promise<void> {
    const templatePath = path.join(this.templatesDir, "components/ui/theme-provider.tsx.hbs");
    const content = await this.helpers.render(templatePath, {});

    const uiDir = path.join(projectPath, "components/ui");
    await fs.ensureDir(uiDir);
    await fs.writeFile(path.join(uiDir, "theme-provider.tsx"), content, "utf-8");
  }

  /**
   * Generate button component with CVA variants
   */
  async generateButton(projectPath: string): Promise<void> {
    const templatePath = path.join(this.templatesDir, "components/ui/button.tsx.hbs");
    const content = await this.helpers.render(templatePath, {});

    const uiDir = path.join(projectPath, "components/ui");
    await fs.ensureDir(uiDir);
    await fs.writeFile(path.join(uiDir, "button.tsx"), content, "utf-8");
  }

  /**
   * Generate all UI components (Card, Input, Label, Skeleton, ThemeToggle)
   */
  async generateUIComponents(projectPath: string): Promise<void> {
    const components = ["card", "input", "label", "skeleton", "theme-toggle"];
    const uiDir = path.join(projectPath, "components/ui");
    await fs.ensureDir(uiDir);

    for (const component of components) {
      const templatePath = path.join(this.templatesDir, `components/ui/${component}.tsx.hbs`);
      const content = await this.helpers.render(templatePath, {});
      await fs.writeFile(path.join(uiDir, `${component}.tsx`), content, "utf-8");
    }
  }

  /**
   * Generate production login page with Suspense
   */
  async generateProductionLoginPage(projectPath: string): Promise<void> {
    const templatePath = path.join(this.templatesDir, "pages/auth/login-page.tsx.hbs");
    const content = await this.helpers.render(templatePath, {});

    const loginDir = path.join(projectPath, "app/(auth)/login");
    await fs.ensureDir(loginDir);
    await fs.writeFile(path.join(loginDir, "page.tsx"), content, "utf-8");
  }

  /**
   * Generate production login form with useTransition
   */
  async generateProductionLoginForm(projectPath: string): Promise<void> {
    const templatePath = path.join(this.templatesDir, "components/auth/login-form.tsx.hbs");
    const content = await this.helpers.render(templatePath, {});

    const authComponentsDir = path.join(projectPath, "components/auth");
    await fs.ensureDir(authComponentsDir);
    await fs.writeFile(path.join(authComponentsDir, "LoginForm.tsx"), content, "utf-8");
  }

  /**
   * Generate login skeleton component
   */
  async generateLoginSkeleton(projectPath: string): Promise<void> {
    const templatePath = path.join(this.templatesDir, "components/auth/login-skeleton.tsx.hbs");
    const content = await this.helpers.render(templatePath, {});

    const authComponentsDir = path.join(projectPath, "components/auth");
    await fs.ensureDir(authComponentsDir);
    await fs.writeFile(path.join(authComponentsDir, "LoginSkeleton.tsx"), content, "utf-8");
  }

  /**
   * Generate register page
   */
  async generateProductionRegisterPage(projectPath: string): Promise<void> {
    const templatePath = path.join(this.templatesDir, "pages/auth/register-page.tsx.hbs");
    const content = await this.helpers.render(templatePath, {});

    const registerDir = path.join(projectPath, "app/(auth)/register");
    await fs.ensureDir(registerDir);
    await fs.writeFile(path.join(registerDir, "page.tsx"), content, "utf-8");
  }

  /**
   * Generate register form component
   */
  async generateRegisterForm(projectPath: string): Promise<void> {
    const templatePath = path.join(this.templatesDir, "components/auth/register-form.tsx.hbs");
    const content = await this.helpers.render(templatePath, {});

    const authComponentsDir = path.join(projectPath, "components/auth");
    await fs.ensureDir(authComponentsDir);
    await fs.writeFile(path.join(authComponentsDir, "RegisterForm.tsx"), content, "utf-8");
  }

  /**
   * Generate auth Server Actions
   */
  async generateAuthActions(projectPath: string): Promise<void> {
    const templatePath = path.join(this.templatesDir, "actions/auth-actions.ts.hbs");
    const content = await this.helpers.render(templatePath, {});

    const actionsDir = path.join(projectPath, "app/actions");
    await fs.ensureDir(actionsDir);
    await fs.writeFile(path.join(actionsDir, "auth.ts"), content, "utf-8");
  }

  /**
   * Generate dashboard layout with navigation
   */
  async generateDashboardLayout(
    projectPath: string,
    projectName: string,
    entities: Array<{ name: string }>
  ): Promise<void> {
    const templatePath = path.join(this.templatesDir, "layouts/dashboard-layout.tsx.hbs");
    const content = await this.helpers.render(templatePath, {
      projectName,
      entities,
    });

    const dashboardDir = path.join(projectPath, "app/dashboard");
    await fs.ensureDir(dashboardDir);
    await fs.writeFile(path.join(dashboardDir, "layout.tsx"), content, "utf-8");
  }

  /**
   * Generate error boundary
   */
  async generateErrorBoundary(projectPath: string): Promise<void> {
    const templatePath = path.join(this.templatesDir, "layouts/error.tsx.hbs");
    const content = await this.helpers.render(templatePath, {});

    await fs.writeFile(path.join(projectPath, "app/error.tsx"), content, "utf-8");
  }

  /**
   * Generate loading boundary
   */
  async generateLoadingBoundary(projectPath: string): Promise<void> {
    const templatePath = path.join(this.templatesDir, "layouts/loading.tsx.hbs");
    const content = await this.helpers.render(templatePath, {});

    await fs.writeFile(path.join(projectPath, "app/loading.tsx"), content, "utf-8");
  }

  /**
   * Generate not-found page
   */
  async generateNotFoundPage(projectPath: string): Promise<void> {
    const templatePath = path.join(this.templatesDir, "layouts/not-found.tsx.hbs");
    const content = await this.helpers.render(templatePath, {});

    await fs.writeFile(path.join(projectPath, "app/not-found.tsx"), content, "utf-8");
  }

  /**
   * Generate landing page
   */
  async generateLandingPage(
    projectPath: string,
    projectName: string,
    projectDescription: string
  ): Promise<void> {
    const templatePath = path.join(this.templatesDir, "pages/landing-page.tsx.hbs");
    const content = await this.helpers.render(templatePath, {
      projectName,
      projectDescription,
    });

    await fs.writeFile(path.join(projectPath, "app/page.tsx"), content, "utf-8");
  }

  /**
   * Generate CRUD pages for an entity
   */
  async generateEntityCRUDPages(
    projectPath: string,
    entityName: string,
    fields: Array<{ name: string; type: string; required?: boolean; label?: string }>
  ): Promise<void> {
    const entityLower = entityName.toLowerCase();
    const data = {
      entityName,
      entityLower,
      fields: fields.map((f) => ({
        ...f,
        label: f.label || f.name.charAt(0).toUpperCase() + f.name.slice(1),
      })),
    };

    // List page
    const listTemplate = path.join(this.templatesDir, "pages/crud/list-page.tsx.hbs");
    const listContent = await this.helpers.render(listTemplate, data);
    const listDir = path.join(projectPath, `app/${entityLower}s`);
    await fs.ensureDir(listDir);
    await fs.writeFile(path.join(listDir, "page.tsx"), listContent, "utf-8");

    // Detail page
    const detailTemplate = path.join(this.templatesDir, "pages/crud/detail-page.tsx.hbs");
    const detailContent = await this.helpers.render(detailTemplate, data);
    const detailDir = path.join(projectPath, `app/${entityLower}s/[id]`);
    await fs.ensureDir(detailDir);
    await fs.writeFile(path.join(detailDir, "page.tsx"), detailContent, "utf-8");

    // Create page
    const createTemplate = path.join(this.templatesDir, "pages/crud/create-page.tsx.hbs");
    const createContent = await this.helpers.render(createTemplate, data);
    const createDir = path.join(projectPath, `app/${entityLower}s/new`);
    await fs.ensureDir(createDir);
    await fs.writeFile(path.join(createDir, "page.tsx"), createContent, "utf-8");

    // Loading page
    const loadingTemplate = path.join(this.templatesDir, "pages/crud/loading.tsx.hbs");
    const loadingContent = await this.helpers.render(loadingTemplate, data);
    await fs.writeFile(path.join(listDir, "loading.tsx"), loadingContent, "utf-8");
  }

  /**
   * Generate CRUD Server Actions for an entity
   */
  async generateEntityActions(
    projectPath: string,
    entityName: string,
    fields: Array<{ name: string; type: string; required?: boolean }>
  ): Promise<void> {
    const templatePath = path.join(this.templatesDir, "actions/crud-actions.ts.hbs");
    const content = await this.helpers.render(templatePath, {
      entityName,
      entityLower: entityName.toLowerCase(),
      fields,
    });

    const actionsDir = path.join(projectPath, "app/actions");
    await fs.ensureDir(actionsDir);
    await fs.writeFile(path.join(actionsDir, "crud.ts"), content, "utf-8");
  }

  /**
   * Generate CRUD components for an entity
   */
  async generateEntityComponents(
    projectPath: string,
    entityName: string
  ): Promise<void> {
    const entityLower = entityName.toLowerCase();
    const componentsDir = path.join(projectPath, `components/${entityLower}s`);
    await fs.ensureDir(componentsDir);

    // Generate entity-specific components using generic CRUD templates
    const components = ["entity-card", "entity-form", "entity-table", "entity-skeleton"];

    for (const component of components) {
      const templatePath = path.join(this.templatesDir, `components/crud/${component}.tsx.hbs`);
      const content = await this.helpers.render(templatePath, {});
      const outputName = component.replace("entity", entityLower);
      await fs.writeFile(path.join(componentsDir, `${outputName}.tsx`), content, "utf-8");
    }
  }
}
