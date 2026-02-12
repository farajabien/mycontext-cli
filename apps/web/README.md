# MyContext Web

**The Visual Studio and Landing Page for MyContext Ecosystem.**

This is the marketing website and visual development studio (in development) for MyContext, built with Next.js 16 and the App Router.

---

## 🎯 Purpose

- **Landing Page** - Showcase MyContext's capabilities and philosophy
- **Documentation Hub** - Comprehensive guides and API references
- **Visual Studio** (Coming Soon) - Browser-based interface for screenshot analysis and code generation
- **Project Dashboard** (Coming Soon) - Manage multiple MyContext projects

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
│   ├── page.tsx           # Landing page
│   ├── docs/              # Documentation pages
│   └── ...
├── components/            # React components
├── public/                # Static assets
└── package.json
```

---

## 🎨 Features

### Current
- ✅ Landing page with hero section
- ✅ Feature showcase
- ✅ Documentation structure
- ✅ Responsive design

### Coming Soon
- 🚧 Visual Studio for screenshot analysis
- 🚧 Project dashboard
- 🚧 Real-time code generation preview
- 🚧 Community showcase

---

## 📦 Part of MyContext Monorepo

This package is part of the [MyContext Monorepo](https://github.com/farajabien/mycontext-cli).

Related packages:
- [mycontext-cli](../cli) - The command-line interface
- [@myycontext/core](../../packages/core) - Core manifest engine

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

---

## 🚀 Deployment

The web app is deployed on [Vercel](https://vercel.com). Every push to `main` triggers an automatic deployment.

### Deploy Your Own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/farajabien/mycontext-cli/tree/main/apps/web)

---

## 📄 License

MIT © MyContext - See [LICENSE](../../LICENSE) for details.

---

## 🔗 Links

- [Monorepo Documentation](https://github.com/farajabien/mycontext-cli#readme)
- [CLI Package](https://www.npmjs.com/package/mycontext-cli)
- [Core Package](https://www.npmjs.com/package/@myycontext/core)
- [Next.js Documentation](https://nextjs.org/docs)
