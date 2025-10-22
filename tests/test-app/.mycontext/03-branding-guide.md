# 🚀 Brand System & Design Tokens

## Overview

This comprehensive brand system provides a complete design foundation with CSS custom properties, ensuring consistency across your entire application.

## 📁 Generated Structure

```
.mycontext/brand/
├── globals.css           # Complete CSS custom properties
├── colors.md            # Color palette documentation
├── typography.md        # Typography specifications
└── components.md        # Component styling patterns
```

## 🎨 Color System

### Primary Palette
- **Primary**: `hsl(221.2 83.2% 53.3%)` - Main brand color
- **Secondary**: `hsl(210 40% 96%)` - Supporting color
- **Accent**: `hsl(210 40% 96%)` - Highlight color

### Neutral Colors
- **Background**: `hsl(0 0% 100%)` - Page background
- **Foreground**: `hsl(222.2 84% 4.9%)` - Text color
- **Muted**: `hsl(210 40% 96%)` - Subtle backgrounds
- **Border**: `hsl(214.3 31.8% 91.4%)` - Element borders

## 📝 Typography Scale

### Font Families
- **Body**: Inter, system fonts
- **Headings**: Inter, system fonts
- **Mono**: JetBrains Mono, Fira Code

### Font Sizes (Mobile-First)
- **xs**: 0.75rem (12px)
- **sm**: 0.875rem (14px)
- **base**: 1rem (16px)
- **lg**: 1.125rem (18px)
- **xl**: 1.25rem (20px)
- **2xl**: 1.5rem (24px)
- **3xl**: 1.875rem (30px)
- **4xl**: 2.25rem (36px)

## 📐 Spacing System (4px Grid)

Based on a consistent 4px grid for harmonious spacing:
- **1**: 4px
- **2**: 8px
- **3**: 12px
- **4**: 16px
- **6**: 24px
- **8**: 32px
- **12**: 48px

## 🔄 Border Radius System

- **sm**: 2px - Small elements
- **md**: 6px - Buttons, inputs
- **lg**: 8px - Cards, modals
- **xl**: 12px - Large containers
- **full**: 9999px - Pills, avatars

## 🎯 Usage Examples

### CSS Classes
```css
/* Using custom properties */
.my-component {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border-radius: var(--radius-md);
  padding: var(--spacing-4);
  font-family: var(--font-family);
}

/* Using utility classes */
<button class="btn-primary">
  Click me
</button>
```

### React Components
```tsx
import { Button } from "@/components/ui/button";

export function MyComponent() {
  return (
    <div className="bg-background text-foreground p-4 rounded-lg">
      <Button variant="default" size="md">
        Primary Action
      </Button>
    </div>
  );
}
```

## 🎨 Dark Mode Support

The system includes complete dark mode support:

```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... all other color overrides */
}
```

## 📦 Ready to Use

To integrate this brand system into your project:

```bash
# Copy the globals.css to your project
cp .mycontext/brand/globals.css ./src/app/globals.css

# Or append to existing globals.css
cat .mycontext/brand/globals.css >> ./src/app/globals.css
```

## 🔧 Customization

### Modifying Colors
```css
:root {
  /* Override any color */
  --primary: 220 89% 56%; /* Custom blue */
  --secondary: 142 76% 36%; /* Custom green */
}
```

### Adding New Properties
```css
:root {
  /* Add custom properties */
  --brand-success: 142 76% 36%;
  --brand-warning: 32 95% 44%;
  --brand-error: 0 84% 60%;
}
```

## 🎯 Best Practices

1. **Always use CSS custom properties** instead of hardcoded values
2. **Leverage the spacing scale** for consistent layouts
3. **Use semantic color names** (primary, secondary, etc.)
4. **Test in both light and dark modes**
5. **Maintain WCAG AA contrast ratios**

## 🚀 Production Ready

This brand system is:
- ✅ **Accessible** - WCAG AA compliant contrast ratios
- ✅ **Performant** - Minimal CSS, optimized for modern browsers
- ✅ **Scalable** - Easy to extend and customize
- ✅ **Consistent** - Unified design language across components
- ✅ **Maintainable** - Well-documented and organized

The generated CSS custom properties provide a solid foundation for any modern web application! 🎉