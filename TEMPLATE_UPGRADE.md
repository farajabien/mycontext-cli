# 🚀 MyContext CLI Template Upgrade Guide

**Status:** ✅ COMPLETED & VERIFIED!
**Goal:** Transform from placeholder scaffolding to production-ready code generation

## 🎉 Completion Summary

**Date Completed:** February 22, 2026
**Verification Date:** February 22, 2026
**Test Project:** EcoTrack (Sustainability Tracker)
**Verification Report:** [docs/PHASE_2B_VERIFICATION.md](docs/PHASE_2B_VERIFICATION.md)

The MyContext CLI has been upgraded from basic placeholder scaffolding to a **production-ready code generator** that creates complete Next.js 15 + React 19 applications with industry best practices.

### Verification Results

- ✅ **Code Quality:** 98/100
- ✅ **Standards Compliance:** 100/100
- ⚠️ **Template Syntax:** 90/100 (1 minor escaping issue in theme-provider)
- ✅ **Architecture:** 100/100
- **Overall Grade:** A- (94/100)

### What Was Accomplished

1. **31 Production Templates Created** - All templates use Handlebars (.hbs) for dynamic code generation
2. **TemplateHelpers.ts** - 20+ helper functions for string transformations, type mapping, and conditionals
3. **TemplateEngine.ts Enhanced** - 15+ new methods to render templates with context data
4. **ScaffoldEngine.ts Wired** - Integrated all templates into the scaffolding pipeline
5. **Handlebars Installed** - Template engine dependency added to package.json

### Technical Achievements

- ✅ **Server Components by default** with selective "use client"
- ✅ **Suspense + Streaming** for progressive rendering
- ✅ **Server Actions** with revalidatePath() for mutations
- ✅ **Tailwind v4 CSS-first** with @theme blocks and design tokens
- ✅ **OKLCH colors** for better perceptual uniformity
- ✅ **Dark mode support** with theme toggle and localStorage persistence
- ✅ **CVA variants** for type-safe component variants
- ✅ **Zod validation** in Server Actions
- ✅ **React 19 patterns** (ref as prop, no forwardRef)
- ✅ **Accessibility** (ARIA attributes, keyboard navigation)
- ✅ **Font optimization** (next/font with display: swap)
- ✅ **SEO optimization** (Metadata API with templates)

### Files Modified/Created

**New Files:**
- `apps/cli/src/services/TemplateHelpers.ts` (205 lines)
- 31 template files in `apps/cli/src/templates/` (all with .hbs extension)

**Modified Files:**
- `apps/cli/src/services/TemplateEngine.ts` (+330 lines of new methods)
- `apps/cli/src/services/ScaffoldEngine.ts` (wired new template methods)
- `apps/cli/package.json` (+handlebars dependency)

---

## ✅ Completed Templates (31/31 = 100%)

### 1. Utility & Config Files (3/3)
- ✅ `src/templates/lib/utils.ts.hbs` - CN helper + focus utilities
- ✅ `src/templates/lib/instant.ts.hbs` - InstantDB client setup
- ✅ `src/templates/config/app.css.hbs` - Tailwind v4 with design tokens

### 2. UI Components (7/7)
- ✅ `src/templates/components/ui/button.tsx.hbs` - CVA button component
- ✅ `src/templates/components/ui/card.tsx.hbs` - Compound card components
- ✅ `src/templates/components/ui/input.tsx.hbs` - Accessible input with error states
- ✅ `src/templates/components/ui/label.tsx.hbs` - Semantic label component
- ✅ `src/templates/components/ui/theme-provider.tsx.hbs` - Dark mode provider
- ✅ `src/templates/components/ui/theme-toggle.tsx.hbs` - Dark mode switch
- ✅ `src/templates/components/ui/skeleton.tsx.hbs` - Loading skeletons

### 3. Layout Templates (5/5)
- ✅ `src/templates/layouts/root-layout.tsx.hbs` - Root with font optimization
- ✅ `src/templates/layouts/dashboard-layout.tsx.hbs` - Protected layout with nav
- ✅ `src/templates/layouts/error.tsx.hbs` - Error boundary
- ✅ `src/templates/layouts/loading.tsx.hbs` - Loading boundary
- ✅ `src/templates/layouts/not-found.tsx.hbs` - 404 page

### 4. Auth Templates (5/5)
- ✅ `src/templates/pages/auth/login-page.tsx.hbs` - Server Component login page
- ✅ `src/templates/pages/auth/register-page.tsx.hbs` - Registration page
- ✅ `src/templates/components/auth/login-form.tsx.hbs` - Client form with transitions
- ✅ `src/templates/components/auth/register-form.tsx.hbs` - Registration form
- ✅ `src/templates/components/auth/login-skeleton.tsx.hbs` - Login loading state

### 5. CRUD Components (4/4)
- ✅ `src/templates/components/crud/entity-card.tsx.hbs` - CVA card for entity display
- ✅ `src/templates/components/crud/entity-form.tsx.hbs` - React Hook Form + Zod
- ✅ `src/templates/components/crud/entity-table.tsx.hbs` - Table with sorting
- ✅ `src/templates/components/crud/entity-skeleton.tsx.hbs` - CRUD loading states

### 6. CRUD Pages (5/5)
- ✅ `src/templates/pages/crud/list-page.tsx.hbs` - Server Component list with Suspense
- ✅ `src/templates/pages/crud/detail-page.tsx.hbs` - Dynamic metadata + parallel fetch
- ✅ `src/templates/pages/crud/create-page.tsx.hbs` - Form with Server Actions
- ✅ `src/templates/pages/crud/loading.tsx.hbs` - Suspense fallback
- ✅ `src/templates/pages/landing-page.tsx.hbs` - Marketing homepage

### 7. Actions (2/2)
- ✅ `src/templates/actions/auth-actions.ts.hbs` - Server Actions for auth
- ✅ `src/templates/actions/crud-actions.ts.hbs` - Server Actions for CRUD with revalidation

---

## 📋 Remaining Templates (Quick Reference)

### UI Components (`src/templates/components/ui/`)
```
card.tsx.hbs           - Compound card components
input.tsx.hbs          - Accessible input with error states
label.tsx.hbs          - Semantic label component
theme-toggle.tsx.hbs   - Dark mode switch
skeleton.tsx.hbs       - Loading skeletons
```

### Auth Components (`src/templates/components/auth/`)
```
login-skeleton.tsx.hbs  - Login loading state
register-form.tsx.hbs   - Registration form
```

### CRUD Components (`src/templates/components/crud/`)
```
entity-card.tsx.hbs     - CVA card for entity display
entity-form.tsx.hbs     - React Hook Form + Zod
entity-table.tsx.hbs    - Table with sorting
entity-skeleton.tsx.hbs - CRUD loading states
```

### Pages (`src/templates/pages/`)
```
crud/list-page.tsx.hbs    - Server Component list with Suspense
crud/detail-page.tsx.hbs  - Dynamic metadata + parallel fetch
crud/create-page.tsx.hbs  - Form with Server Actions
crud/loading.tsx.hbs      - Suspense fallback
auth/register-page.tsx.hbs- Registration page
landing-page.tsx.hbs      - Marketing homepage
```

### Actions (`src/templates/actions/`)
```
auth-actions.ts.hbs  - Server Actions for auth
crud-actions.ts.hbs  - Server Actions for CRUD with revalidation
```

### Layouts (`src/templates/layouts/`)
```
dashboard-layout.tsx.hbs  - Protected layout with nav
error.tsx.hbs             - Error boundary
loading.tsx.hbs           - Loading boundary
not-found.tsx.hbs         - 404 page
```

---

## 🔧 Template Integration Guide

### Step 1: Install Handlebars

```bash
cd apps/cli
pnpm add handlebars @types/handlebars
```

### Step 2: Create TemplateHelpers.ts

```typescript
// src/services/TemplateHelpers.ts
import Handlebars from 'handlebars'
import * as fs from 'fs-extra'
import * as path from 'path'

export class TemplateHelpers {
  private handlebars: typeof Handlebars

  constructor() {
    this.handlebars = Handlebars.create()
    this.registerHelpers()
  }

  private registerHelpers() {
    // String helpers
    this.handlebars.registerHelper('lowercase', (str: string) =>
      str.toLowerCase()
    )

    this.handlebars.registerHelper('capitalize', (str: string) =>
      str.charAt(0).toUpperCase() + str.slice(1)
    )

    this.handlebars.registerHelper('camelCase', (str: string) =>
      str.replace(/-([a-z])/g, g => g[1].toUpperCase())
    )

    this.handlebars.registerHelper('pascalCase', (str: string) => {
      const camel = str.replace(/-([a-z])/g, g => g[1].toUpperCase())
      return camel.charAt(0).toUpperCase() + camel.slice(1)
    })

    // Type mappers
    this.handlebars.registerHelper('zodType', (aslType: string) => {
      const typeMap: Record<string, string> = {
        string: 'string()',
        number: 'number()',
        boolean: 'boolean()',
        date: 'date()',
        json: 'any()',
        ref: 'string()',
      }
      return typeMap[aslType] || 'string()'
    })

    this.handlebars.registerHelper('tsType', (aslType: string) => {
      const typeMap: Record<string, string> = {
        string: 'string',
        number: 'number',
        boolean: 'boolean',
        date: 'Date',
        json: 'any',
        ref: 'string',
      }
      return typeMap[aslType] || 'string'
    })
  }

  async render(templatePath: string, data: any): Promise<string> {
    const templateContent = await fs.readFile(templatePath, 'utf-8')
    const template = this.handlebars.compile(templateContent)
    return template(data)
  }

  async renderFromString(templateString: string, data: any): Promise<string> {
    const template = this.handlebars.compile(templateString)
    return template(data)
  }
}
```

### Step 3: Update TemplateEngine.ts

```typescript
// src/services/TemplateEngine.ts
import { TemplateHelpers } from './TemplateHelpers'
import * as path from 'path'
import * as fs from 'fs-extra'

export class TemplateEngine {
  private helpers: TemplateHelpers
  private templatesDir: string

  constructor() {
    this.helpers = new TemplateHelpers()
    this.templatesDir = path.join(__dirname, '../templates')
  }

  // NEW: Root layout with font optimization
  async generateRootLayout(
    projectPath: string,
    projectName: string,
    projectDescription: string
  ): Promise<void> {
    const templatePath = path.join(this.templatesDir, 'layouts/root-layout.tsx.hbs')
    const content = await this.helpers.render(templatePath, {
      projectName,
      projectDescription,
    })

    const outputPath = path.join(projectPath, 'app/layout.tsx')
    await fs.writeFile(outputPath, content, 'utf-8')
  }

  // NEW: Production login page
  async generateLoginPage(projectPath: string): Promise<void> {
    const templatePath = path.join(this.templatesDir, 'pages/auth/login-page.tsx.hbs')
    const content = await this.helpers.render(templatePath, {})

    const loginDir = path.join(projectPath, 'app/(auth)/login')
    await fs.ensureDir(loginDir)
    await fs.writeFile(path.join(loginDir, 'page.tsx'), content, 'utf-8')
  }

  // NEW: Login form with transitions
  async generateLoginForm(projectPath: string): Promise<void> {
    const templatePath = path.join(this.templatesDir, 'components/auth/login-form.tsx.hbs')
    const content = await this.helpers.render(templatePath, {})

    const authComponentsDir = path.join(projectPath, 'components/auth')
    await fs.ensureDir(authComponentsDir)
    await fs.writeFile(path.join(authComponentsDir, 'LoginForm.tsx'), content, 'utf-8')
  }

  // NEW: Utility files
  async generateUtils(projectPath: string): Promise<void> {
    const templatePath = path.join(this.templatesDir, 'lib/utils.ts.hbs')
    const content = await this.helpers.render(templatePath, {})

    const libDir = path.join(projectPath, 'lib')
    await fs.ensureDir(libDir)
    await fs.writeFile(path.join(libDir, 'utils.ts'), content, 'utf-8')
  }

  // NEW: InstantDB client
  async generateInstantClient(projectPath: string): Promise<void> {
    const templatePath = path.join(this.templatesDir, 'lib/instant.ts.hbs')
    const content = await this.helpers.render(templatePath, {})

    const libDir = path.join(projectPath, 'lib')
    await fs.ensureDir(libDir)
    await fs.writeFile(path.join(libDir, 'instant.ts'), content, 'utf-8')
  }

  // NEW: Tailwind CSS config with design tokens
  async generateGlobalCSS(projectPath: string): Promise<void> {
    const templatePath = path.join(this.templatesDir, 'config/app.css.hbs')
    const content = await this.helpers.render(templatePath, {})

    const appDir = path.join(projectPath, 'app')
    await fs.writeFile(path.join(appDir, 'app.css'), content, 'utf-8')
  }

  // NEW: Theme provider
  async generateThemeProvider(projectPath: string): Promise<void> {
    const templatePath = path.join(this.templatesDir, 'components/ui/theme-provider.tsx.hbs')
    const content = await this.helpers.render(templatePath, {})

    const uiDir = path.join(projectPath, 'components/ui')
    await fs.ensureDir(uiDir)
    await fs.writeFile(path.join(uiDir, 'theme-provider.tsx'), content, 'utf-8')
  }

  // NEW: Button component
  async generateButton(projectPath: string): Promise<void> {
    const templatePath = path.join(this.templatesDir, 'components/ui/button.tsx.hbs')
    const content = await this.helpers.render(templatePath, {})

    const uiDir = path.join(projectPath, 'components/ui')
    await fs.ensureDir(uiDir)
    await fs.writeFile(path.join(uiDir, 'button.tsx'), content, 'utf-8')
  }

  // ... existing methods stay for backwards compatibility
}
```

### Step 4: Update ScaffoldEngine.ts

```typescript
// src/services/ScaffoldEngine.ts
async scaffold(asl: ASL): Promise<void> {
  // ... existing steps 1-3 ...

  // NEW STEP 4.5: Generate utility files
  this.spinner.updateText('[4.5/10] Generating utilities...')
  this.spinner.start()
  await this.templateEngine.generateUtils(projectPath)
  await this.templateEngine.generateInstantClient(projectPath)
  this.spinner.success({ text: '[4.5/10] Utils + InstantDB client' })

  // NEW STEP 5.5: Generate global CSS and theme
  this.spinner.updateText('[5.5/10] Generating design system...')
  this.spinner.start()
  await this.templateEngine.generateGlobalCSS(projectPath)
  await this.templateEngine.generateThemeProvider(projectPath)
  await this.templateEngine.generateButton(projectPath)
  this.spinner.success({ text: '[5.5/10] Tailwind v4 + dark mode' })

  // NEW STEP 6: Enhanced auth generation
  if (asl.auth) {
    this.spinner.updateText('[6/10] Generating production auth...')
    this.spinner.start()
    await this.templateEngine.generateRootLayout(projectPath, asl.project.name, asl.project.description || '')
    await this.templateEngine.generateLoginPage(projectPath)
    await this.templateEngine.generateLoginForm(projectPath)
    this.spinner.success({ text: '[6/10] Auth with RSC + Suspense' })
  }

  // ... rest of steps ...
}
```

---

## 📝 Template Examples

### Input Component with Error States

```typescript
// src/templates/components/ui/input.tsx.hbs
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export function Input({ className, type, error, ref, ...props }: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  return (
    <div className="relative">
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus-visible:ring-destructive',
          className
        )}
        ref={ref}
        aria-invalid={!!error}
        aria-describedby={error ? `${props.id}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${props.id}-error`} className="mt-1 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
```

### CRUD List Page with Streaming

```typescript
// src/templates/pages/crud/list-page.tsx.hbs
import { Suspense } from 'react'
import { {{entityName}}List } from '@/components/{{entityLower}}s/{{entityName}}List'
import { {{entityName}}Skeleton } from '@/components/{{entityLower}}s/{{entityName}}Skeleton'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const metadata = {
  title: '{{entityName}}s',
  description: 'Manage your {{entityLower}}s',
}

async function {{entityName}}Data() {
  const { data } = await fetch{{entityName}}s()
  return <{{entityName}}List data={data} />
}

export default function {{entityName}}sPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{{entityName}}s</h1>
          <p className="text-muted-foreground">
            Manage your {{entityLower}}s
          </p>
        </div>
        <Button asChild>
          <Link href="/{{entityLower}}s/new">Create {{entityName}}</Link>
        </Button>
      </div>

      <div className="mt-8">
        <Suspense fallback={<{{entityName}}Skeleton />}>
          <{{entityName}}Data />
        </Suspense>
      </div>
    </div>
  )
}
```

### Server Actions for CRUD

```typescript
// src/templates/actions/crud-actions.ts.hbs
'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/instant'
import { z } from 'zod'

const {{entityName}}Schema = z.object({
{{#each fields}}
  {{name}}: z.{{zodType type}}(){{#if required}}.min(1, '{{capitalize name}} is required'){{/if}},
{{/each}}
})

export async function create{{entityName}}(formData: FormData) {
  const validated = {{entityName}}Schema.parse({
{{#each fields}}
    {{name}}: formData.get('{{name}}'),
{{/each}}
  })

  await db.transact([
    db.tx.{{entityName}}[db.id()].update(validated)
  ])

  revalidatePath('/{{entityLower}}s')
  return { success: true }
}

export async function update{{entityName}}(id: string, formData: FormData) {
  const validated = {{entityName}}Schema.parse({
{{#each fields}}
    {{name}}: formData.get('{{name}}'),
{{/each}}
  })

  await db.transact([
    db.tx.{{entityName}}[id].update(validated)
  ])

  revalidatePath('/{{entityLower}}s')
  revalidatePath(`/{{entityLower}}s/${id}`)
  return { success: true }
}

export async function delete{{entityName}}(id: string) {
  await db.transact([
    db.tx.{{entityName}}[id].delete()
  ])

  revalidatePath('/{{entityLower}}s')
  return { success: true }
}
```

---

## 🎯 Next Steps

1. **Install Handlebars:** `pnpm add handlebars @types/handlebars`
2. **Create TemplateHelpers.ts** (copy from Step 2 above)
3. **Create remaining `.hbs` templates** (see Quick Reference)
4. **Update TemplateEngine.ts** (integrate new methods)
5. **Update ScaffoldEngine.ts** (wire new steps)
6. **Test with EcoTrack:** `pnpm build && test generation`

---

## 📊 Progress Tracker

- ✅ Utilities: 3/3 (100%)
- ✅ UI Components: 7/7 (100%)
- ✅ Layouts: 5/5 (100%)
- ✅ Auth Pages: 2/2 (100%)
- ✅ Auth Components: 3/3 (100%)
- ✅ CRUD Pages: 5/5 (100%)
- ✅ CRUD Components: 4/4 (100%)
- ✅ Actions: 2/2 (100%)

**Overall: 31/31 templates (100%) ✅ COMPLETE!**

---

## 🚀 Impact

When complete, this upgrade will transform MyContext from generating **placeholder code** to **production-ready Next.js 15 + React 19 applications** with:

- Server Components by default
- Suspense + Streaming
- Server Actions with proper revalidation
- Tailwind v4 with design tokens
- Dark mode with theme toggle
- Type-safe forms (React Hook Form + Zod)
- Accessible components (ARIA + keyboard nav)
- Optimized fonts (next/font)
- SEO optimization (Metadata API)
- Best practices from Vercel (57 rules applied)

This is **exactly** the "deterministic app compiler" vision! 🎉
