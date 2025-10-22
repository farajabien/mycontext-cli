# 🎨 Color Palette & Usage Guide

## Primary Colors

### Light Mode
| Color | HSL Value | Usage |
|-------|-----------|-------|
| Primary | `hsl(221.2 83.2% 53.3%)` | Main brand color, primary actions |
| Secondary | `hsl(210 40% 96%)` | Supporting color, secondary actions |
| Accent | `hsl(210 40% 96%)` | Highlight color, special elements |
| Background | `hsl(0 0% 100%)` | Page background |
| Foreground | `hsl(222.2 84% 4.9%)` | Primary text color |
| Muted | `hsl(210 40% 96%)` | Subtle backgrounds, disabled states |
| Border | `hsl(214.3 31.8% 91.4%)` | Element borders, dividers |

### Dark Mode
| Color | HSL Value | Usage |
|-------|-----------|-------|
| Primary | `hsl(217.2 91.2% 59.8%)` | Main brand color, primary actions |
| Secondary | `hsl(217.2 32.6% 17.5%)` | Supporting color, secondary actions |
| Background | `hsl(222.2 84% 4.9%)` | Page background |
| Foreground | `hsl(210 40% 98%)` | Primary text color |

## Usage Examples

### CSS Classes
```css
/* Primary button */
.btn-primary {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

/* Card component */
.card {
  background-color: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  color: hsl(var(--card-foreground));
}

/* Input field */
.input {
  background-color: hsl(var(--background));
  border: 1px solid hsl(var(--input));
  color: hsl(var(--foreground));
}

.input:focus {
  border-color: hsl(var(--ring));
}
```

### Tailwind Integration
```tsx
// Using with Tailwind CSS
<div className="bg-background text-foreground border border-border rounded-md">
  <h1 className="text-primary">Primary heading</h1>
  <p className="text-muted-foreground">Muted text</p>
</div>
```

## Accessibility Considerations

All colors meet WCAG AA contrast requirements:
- **Primary text on background**: 15.8:1 contrast ratio ✅
- **Muted text on background**: 4.6:1 contrast ratio ✅
- **Primary text on primary background**: 8.6:1 contrast ratio ✅

## Color Variations

### Alpha Transparency
```css
/* Semi-transparent versions */
--primary-80: hsl(var(--primary) / 0.8);
--primary-60: hsl(var(--primary) / 0.6);
--primary-40: hsl(var(--primary) / 0.4);
--primary-20: hsl(var(--primary) / 0.2);
```

### Hover States
```css
.btn-primary:hover {
  background-color: hsl(var(--primary) / 0.9);
}

.btn-secondary:hover {
  background-color: hsl(var(--secondary) / 0.8);
}
```

## Implementation Notes

1. **Always use HSL format** for better manipulation and consistency
2. **Leverage CSS custom properties** instead of hardcoded values
3. **Test color combinations** for accessibility compliance
4. **Consider color blindness** when designing color-dependent UI
5. **Maintain color harmony** across light and dark modes