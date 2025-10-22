# Page Builder — Local-First Visual Page Builder

> **Build production-quality pages instantly in the browser using JSON configs that compose prebuilt shadcn UI components — no server, no rebuild, private by default.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC)](https://tailwindcss.com/)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-Latest-000000)](https://ui.shadcn.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Quick Start

Get Page Builder running locally in 3 commands:

```bash
# Clone and install
git clone https://github.com/your-org/page-builder.git
cd page-builder
pnpm install

# Start development server
pnpm dev

# Open http://localhost:3000
```

**Live Demo**: [page-builder-demo.vercel.app](https://page-builder-demo.vercel.app)

## ✨ Features

### 🎯 **Instant Visual Building**

- **Drag & Drop Interface** — Compose pages visually with prebuilt components
- **Live Preview** — See changes instantly without build steps or deploys
- **Responsive Testing** — Preview on mobile, tablet, and desktop views
- **Component Library** — Curated shadcn/ui components with predictable props

### 🔒 **Local-First & Private**

- **Browser Storage** — All configs stored locally in IndexedDB (via localForage)
- **No Backend Required** — Fully functional without cloud services
- **Offline Capable** — Works offline once loaded
- **Export/Import** — Share configs as JSON files

### 🎨 **Production Quality**

- **shadcn/ui Components** — Professional, accessible UI components
- **TypeScript Support** — Full type safety for configs and components
- **Tailwind Styling** — Consistent design system
- **SEO Ready** — Server-side rendering for published pages

### 🔧 **Developer Friendly**

- **JSON Configs** — Human-readable page definitions
- **Code Export** — Generate React components from configs
- **Version Control** — Track changes with built-in versioning
- **API Integration** — Extensible for custom data sources

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Builder UI    │    │   Local Storage  │    │   Live Preview  │
│   /builder      │◄──►│   (IndexedDB)    │◄──►│   /[slug]       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Component       │    │ Page Configs     │    │ Component       │
│ Library         │    │ (JSON Schema)    │    │ Renderer        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Core Components

- **`/builder`** — Visual page builder interface
- **`/[slug]`** — Dynamic page preview (server component)
- **`ClientPreview`** — Client-side config loader and renderer
- **`Renderer`** — Runtime component mapper
- **`useLocalPages`** — LocalForage API for config persistence

## 📖 Usage Guide

### 1. Create a Page

```bash
# Open builder
http://localhost:3000/builder

# Click "New Page"
# Enter slug: "landing-page"
# Select template: "Marketing Landing"
```

### 2. Add Components

```typescript
// Drag components from left panel to canvas
// Or click "Add Component" → Select "Hero"

// Components available:
- Hero (eyebrow, title, subtitle, CTA buttons)
- Features (icon grid with descriptions)
- CTA (call-to-action section)
- Card (content cards with images)
- StatCards (metric displays)
- Footer (links, social, copyright)
- Form (contact/lead capture)
- Testimonials (customer quotes)
```

### 3. Edit Properties

```typescript
// Select component → Edit in right panel
{
  "type": "Hero",
  "props": {
    "eyebrow": "New Product",
    "title": "Ship Faster with Page Builder",
    "subtitle": "Build production pages in minutes, not hours",
    "ctaPrimary": {
      "label": "Get Started",
      "href": "/signup"
    },
    "ctaSecondary": {
      "label": "View Demo",
      "href": "/demo"
    }
  }
}
```

### 4. Preview & Save

```bash
# Auto-saves to local storage
# Preview at: http://localhost:3000/landing-page
# Or use preview pane in builder
```

### 5. Export/Import

```bash
# Export page config
Click "Export" → Download "landing-page.page.json"

# Import page config
Click "Import" → Upload .page.json file
```

## 📋 Config Schema

Pages are defined by JSON configs with this structure:

```typescript
type PageConfig = {
  id?: string; // UUID
  slug: string; // URL path
  title?: string; // Page title
  description?: string; // Meta description
  layout?: "centered" | "full" | "dashboard";
  theme?: "light" | "dark";
  version?: number; // Config version
  createdAt?: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
  components: ComponentConfig[];
};

type ComponentConfig = {
  id: string; // Unique instance ID
  type: string; // Component type (Hero, CTA, etc.)
  visible?: boolean; // Show/hide component
  order?: number; // Render order
  props: Record<string, any>; // Component-specific props
  settings?: Record<string, any>; // Additional settings
};
```

### Example Config

```json
{
  "slug": "launch-landing",
  "title": "Launch Landing Page",
  "description": "Product launch landing page",
  "layout": "centered",
  "theme": "light",
  "components": [
    {
      "id": "hero-1",
      "type": "Hero",
      "order": 1,
      "props": {
        "eyebrow": "New",
        "title": "Ship faster with Page Builder",
        "subtitle": "Build production-quality pages in minutes",
        "ctaPrimary": {
          "label": "Get Started",
          "href": "/signup"
        },
        "ctaSecondary": {
          "label": "View Demo",
          "href": "/demo"
        }
      }
    },
    {
      "id": "features-1",
      "type": "Features",
      "order": 2,
      "props": {
        "title": "Why Page Builder?",
        "items": [
          {
            "title": "Instant Preview",
            "description": "See changes immediately",
            "icon": "Zap"
          },
          {
            "title": "Local-First",
            "description": "Your data stays private",
            "icon": "Shield"
          },
          {
            "title": "Production Ready",
            "description": "Export clean React code",
            "icon": "Code"
          }
        ],
        "columns": 3
      }
    }
  ]
}
```

## 🧩 Component Library

### Available Components

| Component        | Description                             | Key Props                                                    |
| ---------------- | --------------------------------------- | ------------------------------------------------------------ |
| **Hero**         | Hero section with title, subtitle, CTAs | `eyebrow`, `title`, `subtitle`, `ctaPrimary`, `ctaSecondary` |
| **Features**     | Feature grid with icons                 | `title`, `items[]`, `columns`                                |
| **CTA**          | Call-to-action section                  | `title`, `description`, `button`, `variant`                  |
| **Card**         | Content card with image                 | `title`, `description`, `image`, `action`                    |
| **StatCards**    | Metric display cards                    | `stats[]`, `columns`                                         |
| **Footer**       | Site footer with links                  | `links[]`, `social[]`, `copyright`                           |
| **Form**         | Contact/lead capture form               | `title`, `fields[]`, `submitText`                            |
| **Testimonials** | Customer testimonials                   | `title`, `testimonials[]`, `columns`                         |

### Adding Custom Components

```typescript
// 1. Create component in components/lib/
export function CustomComponent({ title, content }: Props) {
  return (
    <div className="custom-component">
      <h2>{title}</h2>
      <p>{content}</p>
    </div>
  );
}

// 2. Add to componentMap
export const componentMap = {
  // ... existing components
  CustomComponent,
};

// 3. Update schema
const customComponentSchema = z.object({
  title: z.string(),
  content: z.string(),
});
```

## 🛠️ Development

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Git

### Setup

```bash
# Clone repository
git clone https://github.com/your-org/page-builder.git
cd page-builder

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Open http://localhost:3000
```

### Project Structure

```
page-builder/
├── README.md                    # This file
├── docs/                        # Documentation
│   ├── ARCHITECTURE.md          # Technical architecture
│   ├── COMPONENT_LIBRARY.md     # Component reference
│   └── CONFIG_SCHEMA.md         # Schema documentation
├── app/                         # Next.js app directory
│   ├── page.tsx                 # Landing page
│   ├── builder/
│   │   └── page.tsx             # Builder UI (client)
│   └── [slug]/
│       └── page.tsx             # Page preview (server)
├── components/
│   ├── lib/                     # Component library
│   │   ├── index.ts             # Component exports
│   │   ├── Hero.tsx             # Hero component
│   │   ├── CTA.tsx              # CTA component
│   │   ├── Features.tsx         # Features component
│   │   ├── Card.tsx             # Card component
│   │   ├── StatCards.tsx       # Stat cards component
│   │   ├── Footer.tsx           # Footer component
│   │   ├── Form.tsx             # Form component
│   │   └── Testimonials.tsx     # Testimonials component
│   ├── builder/                 # Builder UI components
│   │   ├── Canvas.tsx           # Main canvas
│   │   ├── ComponentPicker.tsx   # Component selection
│   │   ├── PropertyEditor.tsx    # Property editing
│   │   ├── PagesList.tsx        # Pages management
│   │   └── Toolbar.tsx          # Builder toolbar
│   ├── Renderer.tsx             # Runtime renderer
│   ├── ClientPreview.tsx        # Client preview wrapper
│   └── ui/                      # shadcn/ui components
├── lib/
│   ├── useLocalPages.ts         # LocalForage API
│   ├── configSchema.ts          # Zod schemas
│   ├── componentMap.ts          # Component mapping
│   └── utils.ts                 # Utilities
├── public/                      # Static assets
├── package.json                 # Dependencies
├── tailwind.config.js           # Tailwind config
├── tsconfig.json                # TypeScript config
└── next.config.js                # Next.js config
```

### Scripts

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint
pnpm type-check       # Run TypeScript checks

# Testing
pnpm test             # Run tests
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Run tests with coverage

# Utilities
pnpm format           # Format code with Prettier
pnpm clean            # Clean build artifacts
```

### Environment Variables

Create `.env.local`:

```env
# Optional: Custom port
PORT=3000

# Optional: Analytics
NEXT_PUBLIC_GA_ID=your-ga-id

# Optional: Sentry
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Docker

```dockerfile
# Dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN pnpm build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
```

### Manual Deployment

```bash
# Build application
pnpm build

# Start production server
pnpm start

# Or serve static files
pnpm export
# Serve ./out directory
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

```bash
# 1. Fork and clone
git clone https://github.com/your-username/page-builder.git
cd page-builder

# 2. Install dependencies
pnpm install

# 3. Create feature branch
git checkout -b feature/amazing-feature

# 4. Make changes and test
pnpm dev
pnpm test

# 5. Commit changes
git commit -m "Add amazing feature"

# 6. Push and create PR
git push origin feature/amazing-feature
```

### Code Standards

- **TypeScript** — Full type safety required
- **ESLint** — Follow project linting rules
- **Prettier** — Consistent code formatting
- **Tests** — Write tests for new features
- **Documentation** — Update docs for API changes

## 📈 Roadmap

### MVP (Current) ✅

- [x] Local-first storage (localForage)
- [x] Basic component library (8 components)
- [x] Visual builder interface
- [x] Live preview system
- [x] Export/import functionality
- [x] Responsive preview modes

### v1.0 (Next 4-8 weeks) 🚧

- [ ] Drag & drop reordering
- [ ] Component presets/templates
- [ ] Image uploader (IndexedDB blobs)
- [ ] Undo/redo functionality
- [ ] Page versioning
- [ ] Improved property editor
- [ ] Component search/filtering

### v1.1 (Future) 🔮

- [ ] Optional cloud sync (InstantDB/Supabase)
- [ ] Multi-user collaboration
- [ ] Real-time editing
- [ ] Custom component uploads
- [ ] API integrations
- [ ] Advanced theming

### v2.0 (Future) 🌟

- [ ] Code generation (React components)
- [ ] GitHub integration
- [ ] CI/CD workflows
- [ ] AI-powered suggestions
- [ ] Plugin system
- [ ] Enterprise features

## 🐛 Troubleshooting

### Common Issues

**Builder not loading**

```bash
# Check if dependencies are installed
pnpm install

# Clear Next.js cache
rm -rf .next
pnpm dev
```

**Components not rendering**

```bash
# Check browser console for errors
# Verify component is in componentMap
# Check config schema validation
```

**Local storage issues**

```bash
# Clear browser storage
# Check IndexedDB support
# Verify localForage configuration
```

**Build errors**

```bash
# Check TypeScript errors
pnpm type-check

# Check ESLint errors
pnpm lint

# Clear build cache
rm -rf .next out
pnpm build
```

### Getting Help

- **GitHub Issues** — [Report bugs](https://github.com/your-org/page-builder/issues)
- **Discussions** — [Ask questions](https://github.com/your-org/page-builder/discussions)
- **Discord** — [Join community](https://discord.gg/page-builder)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) — React framework
- [shadcn/ui](https://ui.shadcn.com/) — Component library
- [Tailwind CSS](https://tailwindcss.com/) — Styling
- [localForage](https://localforage.github.io/localForage/) — Local storage
- [Zod](https://zod.dev/) — Schema validation

---

**Built with ❤️ by [Your Team](https://github.com/your-org)**

[![Star on GitHub](https://img.shields.io/github/stars/your-org/page-builder?style=social)](https://github.com/your-org/page-builder)
[![Follow on Twitter](https://img.shields.io/twitter/follow/your-twitter?style=social)](https://twitter.com/your-twitter)
