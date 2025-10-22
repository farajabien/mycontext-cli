# 📝 Typography System & Specifications

## Font Families

### Primary Fonts
- **Body Text**: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif`
- **Headings**: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif`
- **Monospace**: `'JetBrains Mono', 'Fira Code', 'SF Mono', monospace`

## Font Size Scale

| Scale | Size | Line Height | Usage |
|-------|------|-------------|-------|
| xs | 0.75rem (12px) | 1.5 | Small labels, captions |
| sm | 0.875rem (14px) | 1.43 | Secondary text, small buttons |
| base | 1rem (16px) | 1.5 | Body text, inputs |
| lg | 1.125rem (18px) | 1.56 | Large body text, buttons |
| xl | 1.25rem (20px) | 1.5 | Section headings |
| 2xl | 1.5rem (24px) | 1.33 | Page headings |
| 3xl | 1.875rem (30px) | 1.2 | Hero headings |
| 4xl | 2.25rem (36px) | 1.11 | Major headings |
| 5xl | 3rem (48px) | 1 | Display headings |

## Font Weights

| Weight | Value | Usage |
|--------|-------|-------|
| Normal | 400 | Body text |
| Medium | 500 | Emphasized text |
| Semibold | 600 | Headings, buttons |
| Bold | 700 | Strong emphasis |

## Implementation

### CSS Classes
```css
/* Heading hierarchy */
.h1 { font-size: var(--font-size-4xl); font-weight: var(--font-weight-bold); }
.h2 { font-size: var(--font-size-3xl); font-weight: var(--font-weight-semibold); }
.h3 { font-size: var(--font-size-2xl); font-weight: var(--font-weight-semibold); }
.h4 { font-size: var(--font-size-xl); font-weight: var(--font-weight-medium); }
.h5 { font-size: var(--font-size-lg); font-weight: var(--font-weight-medium); }
.h6 { font-size: var(--font-size-base); font-weight: var(--font-weight-medium); }

/* Text utilities */
.text-body { font-size: var(--font-size-base); line-height: var(--line-height-normal); }
.text-small { font-size: var(--font-size-sm); line-height: var(--line-height-normal); }
.text-large { font-size: var(--font-size-lg); line-height: var(--line-height-relaxed); }
```

### React Components
```tsx
// Typography component
interface TypographyProps {
  variant: 'h1' | 'h2' | 'h3' | 'body' | 'caption';
  children: React.ReactNode;
  className?: string;
}

export function Typography({ variant, children, className }: TypographyProps) {
  const baseClasses = "font-family";
  const variantClasses = {
    h1: "text-4xl font-bold",
    h2: "text-3xl font-semibold",
    h3: "text-2xl font-semibold",
    body: "text-base",
    caption: "text-sm text-muted-foreground"
  };

  return (
    <div className={cn(baseClasses, variantClasses[variant], className)}>
      {children}
    </div>
  );
}
```

## Line Heights

| Name | Value | Usage |
|------|-------|-------|
| tight | 1.25 | Headings, compact text |
| snug | 1.375 | Subheadings, labels |
| normal | 1.5 | Body text, paragraphs |
| relaxed | 1.625 | Long-form content |
| loose | 2 | Quotes, testimonials |

## Responsive Typography

### Mobile-First Approach
```css
/* Base size */
.text-responsive {
  font-size: var(--font-size-sm);
}

/* Tablet and up */
@media (min-width: 768px) {
  .text-responsive {
    font-size: var(--font-size-base);
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .text-responsive {
    font-size: var(--font-size-lg);
  }
}
```

## Accessibility Considerations

1. **Font Size**: Minimum 14px for body text (16px preferred)
2. **Line Height**: Minimum 1.5 for body text
3. **Contrast**: 4.5:1 minimum for normal text, 3:1 for large text
4. **Readability**: Avoid pure black text on white backgrounds
5. **Hierarchy**: Clear size relationships between heading levels

## Performance Notes

- **System Fonts**: Use system font stacks for better performance
- **Font Loading**: Implement font-display: swap to prevent layout shift
- **Subset**: Consider font subsetting for smaller file sizes
- **Caching**: Cache fonts appropriately for repeat visits

## Implementation Checklist

- [x] Font families defined
- [x] Font size scale established
- [x] Font weight scale defined
- [x] Line height values set
- [x] Responsive typography implemented
- [x] Accessibility requirements met
- [x] CSS custom properties created
- [x] Component integration ready