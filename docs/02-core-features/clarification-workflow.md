# Clarification Workflow

MyContext ensures accuracy by detecting gaps in your requirements and tracking all auto-generated features for your approval. This prevents vague requests from leading to incorrect assumptions.

## How It Works

### 1. Gap Detection

When you run `mycontext generate:context`, the system analyzes your input for missing critical information:

**Critical Gaps** (block generation):

- Missing game type (if you say "fun game")
- Missing authentication method (if PRD mentions users)
- Missing database choice (if data persistence mentioned)
- Missing payment method (if payments mentioned)

**Important Gaps** (warn but continue):

- Missing target audience
- Missing deployment strategy
- Missing environment configuration

**Optional Gaps** (suggestions):

- Missing accessibility requirements
- Missing performance considerations

### 2. Auto-Generated Feature Tracking

The system tracks all assumptions it makes:

```json
{
  "features": [
    {
      "feature": "Real-time multiplayer with Socket.io",
      "reasoning": "User mentioned 'play against each other'",
      "confidence": "medium",
      "approved": null
    }
  ]
}
```

### 3. Interactive Approval

Run `mycontext review:context` to review and approve features:

```bash
📋 Auto-generated Features Review

1. Real-time multiplayer with Socket.io
   Reasoning: You mentioned "play against each other"
   Confidence: Medium
   [Y] Accept  [N] Reject  [E] Edit
```

## What Triggers Clarification Questions

### Vague Descriptions

- "fun game" → What type of game?
- "simple app" → What's the main purpose?
- "useful tool" → What does it do?

### Missing Technical Details

- Users mentioned but no auth → How should users authenticate?
- Data mentioned but no database → What database to use?
- Payments mentioned but no method → What payment system?

### Incomplete Requirements

- Game mentioned but no rules → What are the game rules?
- App mentioned but no audience → Who is the target audience?

## How to Review and Approve Features

### 1. Run Review Command

```bash
mycontext review:context
```

### 2. Address Critical Gaps First

If critical gaps are detected, you must answer them before proceeding:

```bash
❌ Critical information missing:

1. What type of game is this?
   - a) Turn-based (Tic-tac-toe, Chess)
   - b) Real-time (Racing, Shooting)
   - c) Puzzle (Matching, Strategy)

2. What are the core game rules?
   [Text input required]
```

### 3. Review Auto-Generated Features

For each feature, choose:

- **Accept**: Keep this feature
- **Reject**: Remove this feature
- **Edit**: Modify the feature description
- **Skip**: Decide later

### 4. Save Approvals

Your choices are saved to `.mycontext/approvals.json`:

```json
{
  "features": {
    "realtime-multiplayer": {
      "approved": true,
      "modified": false
    },
    "user-auth": {
      "approved": false,
      "reasoning": "Will add later"
    }
  },
  "gaps_addressed": {
    "game-type": "Tic-tac-toe",
    "game-rules": "Standard 3x3 grid rules"
  }
}
```

## When to Update Context vs Refine Components

### Update Context Files

Use when you want to change the fundamental requirements:

```bash
mycontext refine:component UserCard --update-context
```

**Triggers regeneration of:**

- All components affected by the change
- Schema updates
- Type definitions
- Component hierarchy

**Use for:**

- Changing business logic
- Adding new features
- Modifying user flows
- Updating technical requirements

### Refine Component In-Place

Use when you want to improve a specific component:

```bash
mycontext refine:component UserCard --in-place
```

**Only affects:**

- The specific component file
- No regeneration of other components

**Use for:**

- Adding loading states
- Improving accessibility
- Adding error boundaries
- Performance optimizations

## Approval Integration

### Component Generation

When generating components, the system checks approvals:

```bash
mycontext generate:components --core-only

⚠️  UserCard not reviewed yet - generating anyway
⏭️  Skipping PaymentForm (rejected in review)
✅ Generated LoginForm (approved)
```

### Trigger Logging

All changes are logged for transparency:

```bash
mycontext review:context

📋 Trigger Log Summary
Recent events affecting your components:

1. Context files changed: 01a-features.md
   2h ago - Features updated
   Affects: UserCard, LoginForm, PaymentForm

2. Feature realtime-multiplayer approval changed from null to true
   1h ago - Feature approved
   Affects: GameBoard, PlayerList
```

## Best Practices

### 1. Be Specific in Initial Requests

Instead of: "I want a fun game"
Say: "I want a turn-based tic-tac-toe game for 2 players"

### 2. Review Before Generating Components

Always run `mycontext review:context` before generating components to ensure accuracy.

### 3. Use Context Updates for Major Changes

If you realize you need a different approach, update context files rather than refining individual components.

### 4. Check Trigger Log Regularly

Run `mycontext review:context` to see what's changed and what might need regeneration.

## Troubleshooting

### Critical Gaps Blocking Generation

```bash
❌ Critical information missing
💡 Run 'mycontext review:context' to address critical gaps
```

**Solution**: Answer the critical questions or provide more specific requirements.

### Components Not Generating

```bash
⏭️  Skipping UserCard (rejected in review)
```

**Solution**: Either approve the feature in `mycontext review:context` or refine it with `mycontext refine:component UserCard`.

### Unexpected Regeneration

Check the trigger log to see what caused regeneration:

```bash
mycontext review:context
```

Look for recent events that might have triggered regeneration.

## Examples

### Example 1: Vague Game Request

**Input**: "I want a fun game where people can play against each other"

**Gaps Detected**:

- What type of game? (Critical)
- What are the game rules? (Critical)
- How many players? (Important)

**Auto-Generated Features**:

- Real-time multiplayer with Socket.io (Medium confidence)
- User authentication system (High confidence)

**Resolution**: Answer critical questions, review and approve features.

### Example 2: Missing Technical Details

**Input**: "I want a social app where users can share posts"

**Gaps Detected**:

- How should users authenticate? (Critical)
- What database to use? (Critical)
- Where to host the app? (Important)

**Auto-Generated Features**:

- Email/password authentication (High confidence)
- PostgreSQL database (Medium confidence)
- Vercel deployment (High confidence)

**Resolution**: Choose authentication method, select database, approve deployment strategy.

### Example 3: Complete Requirements

**Input**: "I want a Next.js e-commerce app with Stripe payments, user authentication, and PostgreSQL database"

**Gaps Detected**: None (all critical information provided)

**Auto-Generated Features**: None (no assumptions needed)

**Resolution**: Proceed directly to component generation.
