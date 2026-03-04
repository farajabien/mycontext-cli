# MyContext Web

**The Visual Studio and Landing Page for MyContext DS-NLC Ecosystem.**

This is the marketing website and visual compiler studio (in development) for MyContext, built with Next.js 16 and the App Router.

---

## 🎯 Purpose

- **Landing Page** - Showcase MyContext's Domain-Specific Natural Language Compiler (DS-NLC) philosophy.
- **Documentation Hub** - Comprehensive guides on using `mycontext plan` and `mycontext build` to eliminate hallucinated LLM generation.
- **Visual Studio** (Coming Soon) - Browser-based interface for Feature Structured Representation (FSR) graph visualization and visual dragging.
- **Project Dashboard** (Coming Soon) - Manage remote MyContext feature schemas.

---

## 🚀 Getting Started

### Development

```bash
# From monorepo root
pnpm run dev

# Or run just the web app
pnpm --filter @myycontext/web dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

### Build

```bash
# From monorepo root
pnpm run build

# Or build just the web app
pnpm --filter @myycontext/web build
```

---

## 🏗️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Font**: [Geist](https://vercel.com/font) by Vercel
- **Deployment**: Vercel

---

## 📁 Project Structure

```
apps/web/
├── app/                    # Next.js App Router
├── components/             # Local web components
├── public/                 # Static assets
└── package.json            # Deployment deps
```

---

## 📦 Part of MyContext Monorepo

This package is part of the [MyContext Monorepo](https://github.com/farajabien/mycontext-cli).

Related packages:
- [mycontext-cli](../cli) - The command-line compiler
- [@myycontext/core](../../packages/core) - Core FSR definition engine

---

## 🤝 Contributing

Contributions are welcome! Please see the main [Contributing Guide](../../CONTRIBUTING.md).

For local development:
```bash
git clone https://github.com/farajabien/mycontext-cli.git
cd mycontext-cli
pnpm install
pnpm run dev
```

## 📄 License & Links

MIT © MyContext - See [LICENSE](../../LICENSE) for details.

- [CLI Package](https://www.npmjs.com/package/mycontext-cli)
- [Core Package](https://www.npmjs.com/package/@myycontext/core)
