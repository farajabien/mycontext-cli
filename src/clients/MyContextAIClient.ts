import OpenAI from 'openai'
import { AIClient, AIClientOptions, AgentContext } from '../interfaces/AIClient'
import { EnrichedContext } from '../types/design-pipeline'

/**
 * MyContext AI Client - Fine-tuned GPT-4o Mini for component generation
 * 
 * This client uses our proprietary fine-tuned model trained on the Intent Dictionary System
 * to achieve 95%+ accuracy in generating shadcn/ui components from natural language.
 */
export class MyContextAIClient implements AIClient {
  readonly clientType = 'direct-api' as const
  readonly supportsTools = false
  readonly supportsStreaming = false

  private openai: OpenAI
  private modelId: string
  private apiKey: string | null = null

  constructor(modelId?: string) {
    this.modelId = modelId || process.env.MYCONTEXT_MODEL_ID || 'ft:gpt-4o-mini-2024-07-18:mycontext:intent-dict:abc123'
    
    // Initialize OpenAI client
    this.apiKey = process.env.OPENAI_API_KEY || null
    if (this.apiKey) {
      this.openai = new OpenAI({
        apiKey: this.apiKey
      })
    }
  }

  /**
   * Check if API key is available
   */
  hasApiKey(): boolean {
    return !!this.apiKey
  }

  /**
   * Set API key for OpenAI client
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
    this.openai = new OpenAI({
      apiKey: this.apiKey
    })
  }

  /**
   * Check connection to OpenAI API
   */
  async checkConnection(): Promise<boolean> {
    if (!this.apiKey) {
      return false
    }

    try {
      await this.openai.models.list()
      return true
    } catch (error) {
      console.warn('MyContext AI connection check failed:', error)
      return false
    }
  }

  /**
   * Generate text using MyContext AI
   */
  async generateText(
    prompt: string,
    options: AIClientOptions = {}
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured for MyContext AI')
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: this.modelId,
        messages: [
          {
            role: 'system',
            content: this.buildSystemPrompt(options.context)
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: options.temperature || 0.1, // Low temperature for consistency
        max_tokens: options.maxTokens || 4000,
        timeout: options.timeout || 30000
      })

      return response.choices[0].message.content || ''
    } catch (error) {
      throw new Error(`MyContext AI generation failed: ${error}`)
    }
  }

  /**
   * Generate React component using MyContext AI with Intent Dictionary context
   */
  async generateComponent(
    prompt: string,
    context?: AgentContext,
    options: AIClientOptions = {}
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured for MyContext AI')
    }

    try {
      // Build enriched context with Intent Dictionary
      const enrichedContext = this.buildEnrichedContext(context)
      
      const response = await this.openai.chat.completions.create({
        model: this.modelId,
        messages: [
          {
            role: 'system',
            content: this.buildComponentSystemPrompt(enrichedContext)
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: options.temperature || 0.1,
        max_tokens: options.maxTokens || 4000,
        timeout: options.timeout || 30000
      })

      return response.choices[0].message.content || ''
    } catch (error) {
      throw new Error(`MyContext AI component generation failed: ${error}`)
    }
  }

  /**
   * Generate component refinement using MyContext AI
   */
  async generateComponentRefinement(
    componentCode: string,
    prompt: string,
    context?: AgentContext,
    options: AIClientOptions = {}
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured for MyContext AI')
    }

    try {
      const enrichedContext = this.buildEnrichedContext(context)
      
      const response = await this.openai.chat.completions.create({
        model: this.modelId,
        messages: [
          {
            role: 'system',
            content: this.buildRefinementSystemPrompt(enrichedContext)
          },
          {
            role: 'user',
            content: `Component to refine:\n\`\`\`tsx\n${componentCode}\n\`\`\n\nRefinement request: ${prompt}`
          }
        ],
        temperature: options.temperature || 0.1,
        max_tokens: options.maxTokens || 4000,
        timeout: options.timeout || 30000
      })

      return response.choices[0].message.content || ''
    } catch (error) {
      throw new Error(`MyContext AI refinement failed: ${error}`)
    }
  }

  /**
   * List available models (returns our fine-tuned model)
   */
  async listModels(): Promise<string[]> {
    return [this.modelId]
  }

  /**
   * Build system prompt for general text generation
   */
  private buildSystemPrompt(context?: AgentContext): string {
    return `You are MyContext AI, a specialized AI model fine-tuned for generating high-quality React components and UI code.

Key capabilities:
- Generate production-ready React components with TypeScript
- Use shadcn/ui components and patterns
- Include proper accessibility attributes
- Follow modern React best practices
- Provide complete, runnable code

Always provide complete, production-ready code with proper imports and TypeScript types.`
  }

  /**
   * Build system prompt for component generation with Intent Dictionary context
   */
  private buildComponentSystemPrompt(enrichedContext: EnrichedContext): string {
    const intentContext = enrichedContext.enriched_intents
      ?.map(intent => `- ${intent.canonical_intent}: ${intent.shadcn_components.join(', ')}`)
      .join('\n') || ''

    const validationReport = enrichedContext.intent_validation_report
    const confidenceScore = validationReport ? (validationReport.confidence_score * 100).toFixed(0) : 'N/A'

    return `You are MyContext AI, fine-tuned for 95%+ accurate shadcn/ui component generation using the Intent Dictionary System.

INTENT DICTIONARY CONTEXT:
${intentContext}

VALIDATION REPORT:
- Confidence Score: ${confidenceScore}%
- Validated Intents: ${validationReport?.validated_intents.length || 0}
- Ambiguous Intents: ${validationReport?.ambiguous_intents.length || 0}

GENERATION RULES:
1. Generate complete, production-ready React components
2. Use only shadcn/ui components from the intent dictionary
3. Include proper TypeScript types and interfaces
4. Add accessibility attributes (ARIA labels, roles, etc.)
5. Follow exact component patterns specified in intent mappings
6. Never hallucinate components or props not in the dictionary
7. Include proper imports and exports
8. Use modern React patterns (hooks, functional components)
9. Add proper error handling and loading states
10. Ensure responsive design with Tailwind CSS

OUTPUT FORMAT:
- Complete React component with TypeScript
- Proper imports from shadcn/ui
- Interface definitions for props
- Accessibility attributes
- Responsive design classes
- Error handling and loading states

Never generate incomplete or placeholder code. Always provide production-ready components.`
  }

  /**
   * Build system prompt for component refinement
   */
  private buildRefinementSystemPrompt(enrichedContext: EnrichedContext): string {
    return `You are MyContext AI, specialized in refining and improving React components.

REFINEMENT RULES:
1. Maintain existing functionality while implementing requested changes
2. Preserve TypeScript types and interfaces
3. Keep accessibility attributes intact
4. Follow shadcn/ui patterns and conventions
5. Ensure code remains production-ready
6. Add proper error handling if needed
7. Maintain responsive design
8. Preserve existing imports and structure

Always provide the complete refined component, not just the changes.`
  }

  /**
   * Build enriched context from agent context
   */
  private buildEnrichedContext(context?: AgentContext): EnrichedContext {
    if (!context) {
      return {
        prd: '',
        types: '',
        branding: '',
        enriched_intents: [],
        intent_validation_report: undefined,
        intent_clarifications: []
      }
    }

    return {
      prd: context.prd || '',
      types: context.types || '',
      branding: context.branding || '',
      enriched_intents: context.enriched_intents || [],
      intent_validation_report: context.intent_validation_report,
      intent_clarifications: context.intent_clarifications || []
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // No cleanup needed for OpenAI client
  }
}
