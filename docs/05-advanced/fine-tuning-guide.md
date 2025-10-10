# Fine-Tuning Guide

## Overview

This guide provides step-by-step instructions for fine-tuning GPT-4o Mini to create your own MyContext AI model. For the complete technical strategy and implementation details, see our [Fine-Tuning Strategy](../fine-tuning-strategy.md) document.

## Quick Start

### Prerequisites

- OpenAI API key with fine-tuning access
- Node.js 18+ installed
- MyContext CLI project set up

### Step 1: Generate Training Data

```bash
# Navigate to your project
cd mycontext-cli-standalone

# Generate training data from intent dictionary
npm run generate-training-data

# This creates: training-data/mycontext-ai-training.jsonl
# Contains: 10,000+ training examples
```

### Step 2: Upload Training Data

```bash
# Install OpenAI CLI
npm install -g openai

# Set your API key
export OPENAI_API_KEY="your-api-key"

# Upload training data
openai api files.create \
  -f training-data/mycontext-ai-training.jsonl \
  -p "fine-tune"
```

### Step 3: Start Fine-Tuning

```bash
# Start fine-tuning job
openai api fine_tuning.jobs.create \
  -t "file-abc123" \
  --model "gpt-4o-mini" \
  --hyperparameters '{"n_epochs": 3, "batch_size": 1}'

# Note the job ID: ftjob-xyz789
```

### Step 4: Monitor Training

```bash
# Check training status
openai api fine_tuning.jobs.retrieve -i "ftjob-xyz789"

# List all jobs
openai api fine_tuning.jobs.list
```

### Step 5: Deploy Model

```bash
# Get your fine-tuned model ID
# Format: ft:gpt-4o-mini-2024-07-18:mycontext:intent-dict:abc123

# Update your environment
export MYCONTEXT_MODEL_ID="ft:gpt-4o-mini-2024-07-18:mycontext:intent-dict:abc123"
```

## Detailed Instructions

### Training Data Generation

The `generateTrainingData.ts` script automatically creates training examples from your Intent Dictionary:

```typescript
// Training data structure
interface TrainingExample {
  messages: [
    {
      role: "system",
      content: "Intent Dictionary context + generation rules"
    },
    {
      role: "user", 
      content: "Natural language UI requirement"
    },
    {
      role: "assistant",
      content: "Complete component code + intent mapping explanation"
    }
  ]
}
```

**Generated Examples:**
- **Base Examples**: 30 patterns × 50 variations = 1,500 examples
- **Contextual Variations**: Domain-specific variations = 600 examples
- **Composition Patterns**: Complex multi-component UIs = 100 examples
- **Edge Cases**: Error states, loading, validation = 200 examples
- **Domain-Specific**: E-commerce, dashboard, auth, etc. = 7,600 examples

### Hyperparameters

Recommended settings for optimal performance:

```json
{
  "n_epochs": 3,
  "batch_size": 1,
  "learning_rate_multiplier": 1.0,
  "prompt_loss_weight": 0.01
}
```

**Why these settings?**
- **3 epochs**: Balances training effectiveness with overfitting prevention
- **Batch size 1**: Ensures consistent training on individual examples
- **Learning rate 1.0**: Default OpenAI setting for fine-tuning
- **Prompt loss weight 0.01**: Focuses training on assistant responses

### Training Monitoring

Monitor your training job for:

1. **Training Loss**: Should decrease steadily
2. **Validation Loss**: Should decrease without overfitting
3. **Training Time**: Typically 2-4 hours for 10K examples
4. **Model Size**: Should remain similar to base model

### Validation Testing

Create a validation set to test your model:

```typescript
// Test your fine-tuned model
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const response = await client.chat.completions.create({
  model: "ft:gpt-4o-mini-2024-07-18:mycontext:intent-dict:abc123",
  messages: [
    {
      role: "system",
      content: "You are MyContext AI, specialized in shadcn/ui component generation."
    },
    {
      role: "user",
      content: "Create a login form with email and password fields"
    }
  ],
  temperature: 0.1
})

console.log(response.choices[0].message.content)
```

## Integration

### Update Provider Chain

Replace your existing AI client with MyContext AI:

```typescript
// src/clients/MyContextAIClient.ts
export class MyContextAIClient implements IAIClient {
  private modelId = process.env.MYCONTEXT_MODEL_ID
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }

  async generateComponent(
    prompt: string, 
    context: EnrichedContext
  ): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: this.modelId,
      messages: [
        {
          role: "system",
          content: this.buildSystemPrompt(context)
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 4000
    })

    return response.choices[0].message.content || ""
  }
}
```

### Update All Agents

```typescript
// Update CodeGenSubAgent to use MyContext AI
export class CodeGenSubAgent {
  private myContextAI: MyContextAIClient

  constructor() {
    this.myContextAI = new MyContextAIClient()
  }

  async generateComponent(
    requirements: string[],
    context: EnrichedContext
  ): Promise<string> {
    const prompt = this.buildPrompt(requirements, context)
    return await this.myContextAI.generateComponent(prompt, context)
  }
}
```

## Performance Optimization

### Caching

Implement caching for frequently used patterns:

```typescript
class MyContextAIClient {
  private cache = new Map<string, string>()

  async generateComponent(prompt: string, context: EnrichedContext): Promise<string> {
    const cacheKey = this.generateCacheKey(prompt, context)
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    const result = await this.callAPI(prompt, context)
    this.cache.set(cacheKey, result)
    
    return result
  }
}
```

### Parallel Processing

Generate multiple components simultaneously:

```typescript
async generateMultipleComponents(
  prompts: string[],
  context: EnrichedContext
): Promise<string[]> {
  const promises = prompts.map(prompt => 
    this.generateComponent(prompt, context)
  )
  
  return Promise.all(promises)
}
```

## Troubleshooting

### Common Issues

**Issue**: Training job fails
**Solutions**:
- Check training data format (must be valid JSONL)
- Verify API key has fine-tuning access
- Ensure training data is properly formatted

**Issue**: Low model performance
**Solutions**:
- Increase training examples
- Adjust hyperparameters
- Check training data quality

**Issue**: High training costs
**Solutions**:
- Reduce training examples for initial testing
- Use smaller validation sets
- Monitor token usage

### Support

- **Documentation**: [Fine-Tuning Strategy](../fine-tuning-strategy.md)
- **GitHub Issues**: [Report problems](https://github.com/mycontext/cli/issues)
- **Discord**: [Community support](https://discord.gg/mycontext)

## Advanced Topics

### Custom Training Data

Add your own training examples:

```typescript
// Add custom examples to training data
const customExamples = [
  {
    messages: [
      {
        role: "system",
        content: "Generate React components using shadcn/ui"
      },
      {
        role: "user",
        content: "Create a custom data visualization component"
      },
      {
        role: "assistant",
        content: "// Your custom component code"
      }
    ]
  }
]
```

### Model Comparison

Compare your fine-tuned model against base models:

```typescript
async function compareModels(prompt: string) {
  const baseModel = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }]
  })

  const fineTunedModel = await openai.chat.completions.create({
    model: "ft:gpt-4o-mini-2024-07-18:mycontext:intent-dict:abc123",
    messages: [{ role: "user", content: prompt }]
  })

  return {
    base: baseModel.choices[0].message.content,
    fineTuned: fineTunedModel.choices[0].message.content
  }
}
```

### Continuous Improvement

Set up automated retraining:

```typescript
// Monthly retraining pipeline
class RetrainingPipeline {
  async monthlyRetraining() {
    // 1. Collect user feedback
    const feedback = await this.collectFeedback()
    
    // 2. Identify weak patterns
    const weakPatterns = await this.identifyWeakPatterns(feedback)
    
    // 3. Generate additional training data
    const additionalData = await this.generateAdditionalData(weakPatterns)
    
    // 4. Retrain model
    const newModel = await this.retrainModel(additionalData)
    
    // 5. Deploy new model
    await this.deployModel(newModel)
  }
}
```

## Cost Estimation

### Training Costs

**10,000 Training Examples:**
- Upload: ~$0.10
- Training: ~$500-1000
- **Total**: ~$500-1000

**20,000 Training Examples:**
- Upload: ~$0.20
- Training: ~$1000-2000
- **Total**: ~$1000-2000

### Inference Costs

**Per Generation:**
- MyContext AI: ~$0.01
- GPT-4: ~$0.02
- **Savings**: 50% per generation

**Monthly Usage (1000 generations):**
- MyContext AI: ~$10
- GPT-4: ~$20
- **Savings**: $10/month

## Next Steps

1. **Generate Training Data**: Run the training data script
2. **Start Fine-Tuning**: Upload data and begin training
3. **Test Model**: Validate performance with test cases
4. **Deploy**: Update your application to use the fine-tuned model
5. **Monitor**: Track performance and user feedback
6. **Iterate**: Retrain monthly with improved data

---

**Ready to create your own MyContext AI?** [Start with training data generation →](#step-1-generate-training-data)
