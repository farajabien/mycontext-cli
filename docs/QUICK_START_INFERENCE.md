# Quick Start: Using the Inference Engine

## For Developers

### Running the New Flow

```bash
cd apps/cli
pnpm build

# Run with inference
mycontext init --interactive

# Answer the single question:
"What are you building?"
# → "A blog with user authentication"

# Watch the magic happen:
# 1. Task decomposition (12 tasks)
# 2. Auto-inference (10 items)
# 3. User prompts (2 items)
# 4. Final diff & approval
```

---

## How It Works

### 1. Task Decomposition
The AI breaks down your description into specific tasks:

```typescript
const tasks = await planner.decompose("A blog with auth");

// Result:
[
  { id: "task-1", description: "Infer core entities", confidence: 95 },
  { id: "task-2", description: "Infer User fields", confidence: 90 },
  { id: "task-3", description: "Infer Post fields", confidence: 94 },
  // ... 9 more tasks
]
```

### 2. Auto-Inference
For high-confidence tasks (≥90%):

```typescript
const inference = await inferenceEngine.infer(task, currentASL, completedTasks);
const critique = await inferenceEngine.selfCritique(inference, currentASL);

if (critique.confidence >= 90) {
  // Accept and continue
  asl = { ...asl, ...inference.result };
}
```

### 3. User Prompts
For low-confidence tasks (<90%):

```typescript
// Show suggestion
console.log("Suggested: OAuth GitHub");

// Ask for confirmation
const { confirmed } = await inquirer.prompt([...]);

if (!confirmed) {
  // Fall back to direct prompt
  const { answer } = await inquirer.prompt([...]);
}
```

---

## Customizing Confidence Thresholds

Edit `src/services/InferenceEngine.ts`:

```typescript
// Current thresholds
const AUTO_INFER_THRESHOLD = 90;      // Auto-accept
const CONFIRMATION_THRESHOLD = 70;    // Ask confirmation
// Below 70 → Direct prompt

// To be more aggressive (fewer prompts, more risk):
const AUTO_INFER_THRESHOLD = 85;      // Lower bar

// To be more conservative (more prompts, less risk):
const AUTO_INFER_THRESHOLD = 95;      // Higher bar
```

---

## Adding Custom Prompts

Edit `src/services/InferenceEngine.ts` → `buildInferencePrompt()`:

```typescript
private buildInferencePrompt(task: InferenceTask, ...): string {
  return `You are an expert software architect...

## Your Task
${task.description}

## Custom Guidelines (ADD YOUR RULES HERE)
- Always use snake_case for database fields
- Prefer varchar(255) over text for short strings
- Add created_at/updated_at to all entities

...`;
}
```

---

## Debugging

### Enable Verbose Logging

```typescript
// In src/commands/init-interactive.ts
const inference = await this.inferenceEngine.infer(...);

// Add logging:
console.log(chalk.dim("Inference result:"), JSON.stringify(inference, null, 2));
console.log(chalk.dim("Confidence:"), inference.confidence);
console.log(chalk.dim("Reasoning:"), inference.reasoning);
```

### Test Specific Tasks

```typescript
// Test decomposition
const tasks = await planner.decompose("Your test input");
console.log(tasks);

// Test inference
const result = await inferenceEngine.infer(tasks[0], {}, []);
console.log(result);

// Test self-critique
const critique = await inferenceEngine.selfCritique(result, {});
console.log(critique);
```

---

## Common Issues

### Issue: AI confidence too low
**Solution**: Make your input more specific
```
❌ "A blog"
✅ "A blog with user authentication, posts, and comments"
```

### Issue: Wrong inferences
**Solution**: The AI learns from corrections!
```
1. AI infers "post" entity
2. You correct to "article"
3. AI learns and uses "article" for remaining tasks
```

### Issue: Too many prompts
**Solution**: Lower confidence thresholds or improve initial prompt
```typescript
// Option 1: Lower threshold
const AUTO_INFER_THRESHOLD = 85;

// Option 2: Better initial input
"A NextJS blog with InstantDB backend, OAuth GitHub auth,
roles (admin, author, reader), and markdown support"
```

---

## Testing Checklist

- [ ] Test with minimal input ("A blog")
- [ ] Test with detailed input ("A blog with auth, roles, comments")
- [ ] Test with ambiguous input ("A social app")
- [ ] Test correction learning (reject an inference, see if AI learns)
- [ ] Test checkpoint approval
- [ ] Test final diff editing
- [ ] Verify ASL saved to `.mycontext/asl.json`

---

## Architecture Reference

```
InitInteractiveCommand
  ├── askInitialQuestion()          → Get user input
  ├── Planner.decompose()           → Break into tasks
  ├── displayTaskDecomposition()    → Show tasks
  ├── recursiveInferenceLoop()      → Main loop
  │   ├── selectNextTask()          → Pick highest confidence task
  │   ├── InferenceEngine.infer()   → Auto-infer if ≥90%
  │   ├── InferenceEngine.selfCritique() → Validate inference
  │   ├── confirmInference()        → Ask user if 70-89%
  │   └── promptUser()              → Direct prompt if <70%
  ├── showCheckpointsAndConfirm()   → Review auto-inferred items
  ├── showDiffPreview()             → Show final diff
  └── saveASL()                     → Save to .mycontext/asl.json
```

---

## Performance Tips

### 1. Parallel Inference (Future)
```typescript
// Current: Sequential
for (const task of tasks) {
  await infer(task);
}

// Future: Parallel for independent tasks
const independentTasks = tasks.filter(t => t.dependencies.length === 0);
await Promise.all(independentTasks.map(t => infer(t)));
```

### 2. Caching
```typescript
// Cache common inferences
const cache = new Map();
const cacheKey = `${task.description}:${JSON.stringify(currentASL)}`;

if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}

const result = await infer(...);
cache.set(cacheKey, result);
```

### 3. Streaming
```typescript
// Stream results as they come in
for await (const chunk of inferenceEngine.inferStream(task)) {
  console.log(chunk);
}
```

---

## FAQ

**Q: Can I skip the checkpoints?**
A: Yes, set `skipCheckpoints: true` in constructor

**Q: Can I save learning patterns across sessions?**
A: Not yet, but planned for future release

**Q: What if I want 100% confidence?**
A: Set `AUTO_INFER_THRESHOLD = 100` (not recommended, will prompt for everything)

**Q: Can I use a different AI model?**
A: Yes, AICore supports multiple providers (Gemini, Claude, OpenRouter, etc.)

**Q: How do I export the ASL?**
A: It's automatically saved to `.mycontext/asl.json`

---

## Next Steps

1. Test with real projects
2. Share feedback
3. Contribute improvements
4. Build deterministic generators that consume the ASL

Happy building! 🚀
