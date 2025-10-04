# UI Specification System Examples

The MyContext CLI now includes a powerful UI specification system that converts component descriptions into detailed, plain-English specifications that developers can implement without further clarification.

## Quick Start

### 1. Standalone UI Spec Generation

Generate a UI specification from a simple description:

```bash
# Generate spec from description
mycontext refine spec RevenueCard --desc "A card showing total revenue prominently with a small subtitle showing percentage change"

# Generate spec from JSON file
mycontext refine spec UserProfile --json-file ./user-profile.json

# Generate spec from inline JSON
mycontext refine spec ContactForm --json-input '{"name":"ContactForm","type":"form","elements":[{"type":"input","label":"Name","required":true}]}'
```

### 2. Integrated with Component Generation

When generating components with verbose mode, UI specs are automatically generated:

```bash
# Generate components with UI specs
mycontext generate-components all --verbose

# Generate specific group with UI specs
mycontext generate-components dashboard --verbose
```

## Example Outputs

### Compact Specification Example

**RevenueCard Component - Compact Spec**

**Visual Hierarchy:**

- Primary: Total Revenue, $125,430
- Secondary: +12.5% from last month

**Layout:** vertical arrangement
**Spacing:** medium spacing between elements
**Colors:** primary, success theme
**Interactions:** None

### Detailed Specification Example

**RevenueCard Component - Detailed Implementation Spec**

**Component Overview:**

- Name: RevenueCard
- Type: card
- Description: A card component displaying revenue metrics with primary value prominently and secondary info subtly

**Visual Hierarchy:**

1. **title**: Total Revenue
   - Prominence: medium (medium (~16px))
2. **value**: $125,430
   - Prominence: high (large (~32px))
3. **subtitle**: +12.5% from last month
   - Prominence: low (small (~12px))
4. **icon**: trending-up
   - Prominence: low (small (~12px))

**Layout Specifications:**

- Arrangement: vertical
- Spacing: medium (16px between elements)
- Alignment: left

**Styling Details:**

- Theme: modern
- Color Palette: primary, success
- Border Radius: lg
- Shadow: sm

**State Behavior:**

- Default: clean, minimal appearance
- Hover: subtle elevation or color change

**Accessibility Requirements:**

- All interactive elements must have aria-label or aria-labelledby
- Focus management: tab order follows visual hierarchy
- Color contrast: minimum 4.5:1 ratio for text
- Screen reader: semantic HTML structure

**Responsive Adjustments:**

- Mobile (< 768px):
  - Reduce spacing to 12px
  - Stack elements vertically
  - Increase touch targets to 44px minimum
- Desktop (> 768px):
  - Standard spacing (16px)
  - Maintain original layout
  - Hover states enabled

## JSON Template Examples

### Card Component Template

```json
{
  "name": "RevenueCard",
  "type": "card",
  "description": "A card component displaying revenue metrics with primary value prominently and secondary info subtly",
  "elements": [
    {
      "type": "title",
      "content": "Total Revenue",
      "prominence": "medium"
    },
    {
      "type": "value",
      "content": "$125,430",
      "prominence": "high"
    },
    {
      "type": "subtitle",
      "content": "+12.5% from last month",
      "prominence": "low"
    },
    {
      "type": "icon",
      "content": "trending-up",
      "prominence": "low"
    }
  ],
  "layout": "vertical",
  "styling": {
    "theme": "modern",
    "colors": ["primary", "success"],
    "spacing": "medium",
    "borderRadius": "lg",
    "shadow": "sm",
    "alignment": "left"
  }
}
```

### Form Component Template

```json
{
  "name": "ContactForm",
  "type": "form",
  "description": "A contact form with input fields and submit button",
  "elements": [
    {
      "type": "input",
      "label": "Name",
      "required": true,
      "prominence": "medium"
    },
    {
      "type": "input",
      "label": "Email",
      "required": true,
      "prominence": "medium"
    },
    {
      "type": "textarea",
      "label": "Message",
      "required": true,
      "prominence": "medium"
    },
    {
      "type": "button",
      "label": "Send Message",
      "variant": "primary",
      "prominence": "high"
    }
  ],
  "layout": "vertical",
  "styling": {
    "theme": "modern",
    "colors": ["primary", "secondary"],
    "spacing": "medium",
    "borderRadius": "md",
    "shadow": "none",
    "alignment": "left"
  }
}
```

### Button Component Template

```json
{
  "name": "PrimaryButton",
  "type": "button",
  "description": "A primary action button with hover and focus states",
  "elements": [
    {
      "type": "button",
      "label": "Get Started",
      "variant": "primary",
      "prominence": "high"
    }
  ],
  "layout": "horizontal",
  "styling": {
    "theme": "modern",
    "colors": ["primary"],
    "spacing": "none",
    "borderRadius": "md",
    "shadow": "sm",
    "alignment": "center"
  }
}
```

## Command Options

### UI Spec Command Options

- `--desc <description>`: Component description
- `--json-input <json>`: Inline JSON component description
- `--json-file <path>`: Path to JSON file with component description
- `--output-format <format>`: Output format (compact, detailed, both)
- `--template <type>`: Component template (card, form, button, modal, list, custom)
- `--verbose`: Show detailed output

### Output Formats

- **compact**: Short usable summary
- **detailed**: Full implementation guidance
- **both**: Both compact and detailed (default)

## Integration Workflow

### 1. Generate UI Spec First

```bash
# Generate spec for a revenue card
mycontext refine spec RevenueCard --desc "A card showing total revenue prominently with percentage change"

# Review the generated specification
cat components/dashboard/RevenueCard.spec.md
```

### 2. Generate Component with Spec

```bash
# Generate component with verbose mode to include UI spec
mycontext generate-components dashboard --verbose

# This will create:
# - components/dashboard/RevenueCard.tsx
# - components/dashboard/RevenueCard.spec.md
```

### 3. Refine Component Using Spec

```bash
# Use the spec to refine the component
mycontext refine components/dashboard/RevenueCard.tsx --prompt "Implement the UI specification exactly as described"
```

## Best Practices

1. **Start with UI Specs**: Always generate UI specs before component generation for complex components
2. **Use Templates**: Leverage the built-in templates (card, form, button, modal, list) for common patterns
3. **Iterative Refinement**: Use the spec as a reference for iterative improvements
4. **Team Communication**: Share UI specs with designers and developers for alignment
5. **Documentation**: Keep UI specs alongside components for future reference

## Advanced Usage

### Custom Templates

Create custom JSON templates for your specific component patterns:

```json
{
  "name": "CustomComponent",
  "type": "custom",
  "description": "Your custom component description",
  "elements": [
    {
      "type": "custom-element",
      "content": "Custom content",
      "prominence": "high"
    }
  ],
  "layout": "custom",
  "styling": {
    "theme": "custom",
    "colors": ["custom-color"],
    "spacing": "custom",
    "borderRadius": "custom",
    "shadow": "custom",
    "alignment": "custom"
  }
}
```

### Batch Processing

Generate specs for multiple components:

```bash
# Generate specs for all components in a group
for component in $(mycontext list components --format simple); do
  mycontext refine spec $component --desc "Component description"
done
```

This UI specification system bridges the gap between high-level requirements and implementation details, making component development more efficient and consistent.
