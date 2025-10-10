/**
 * Intent Validator Service
 *
 * Validates natural language UI descriptions against the intent dictionary,
 * extracting UI intents and matching them to shadcn/ui component patterns.
 *
 * @module services/IntentValidator
 */

import * as fs from "fs-extra";
import * as path from "path";
import chalk from "chalk";
import Fuse from "fuse.js";
import {
  IntentDictionary,
  IntentValidationReport,
  ExtractedIntent,
  ValidatedIntent,
  AmbiguousIntent,
  UnknownIntent,
  ClarificationRequest,
  IntentMapping,
  FuzzyMatchResult,
  ExtractionContext,
} from "../types/intent-dictionary";

/**
 * Main service for validating UI intents from natural language
 */
export class IntentValidator {
  private dictionary: IntentDictionary;
  private dictionaryPath: string;
  private fuse: Fuse<any>;

  /**
   * @param dictionaryPath - Optional path to custom dictionary (defaults to built-in)
   */
  constructor(dictionaryPath?: string) {
    this.dictionaryPath =
      dictionaryPath ||
      path.join(__dirname, "..", "config", "intent-dictionary.json");
    this.dictionary = this.loadDictionary();
    this.fuse = this.initializeFuse();
  }

  /**
   * Load intent dictionary from JSON file
   */
  private loadDictionary(): IntentDictionary {
    try {
      if (!fs.existsSync(this.dictionaryPath)) {
        console.warn(
          chalk.yellow(
            `⚠️  Intent dictionary not found at ${this.dictionaryPath}, using default`
          )
        );
        return this.getDefaultDictionary();
      }

      const raw = fs.readFileSync(this.dictionaryPath, "utf-8");
      const dictionary = JSON.parse(raw) as IntentDictionary;

      // Validate dictionary structure
      if (!dictionary.version || !dictionary.mappings) {
        throw new Error("Invalid dictionary structure");
      }

      return dictionary;
    } catch (error) {
      console.error(chalk.red("❌ Failed to load intent dictionary:"), error);
      return this.getDefaultDictionary();
    }
  }

  /**
   * Initialize Fuse.js for fuzzy matching
   */
  private initializeFuse(): Fuse<any> {
    const searchableItems: any[] = [];

    // Build searchable items from dictionary mappings
    for (const [canonicalName, mapping] of Object.entries(
      this.dictionary.mappings
    )) {
      // Add canonical name
      searchableItems.push({
        canonical_name: canonicalName,
        search_text: canonicalName,
        type: "canonical",
        mapping: mapping,
      });

      // Add intent phrases
      for (const phrase of mapping.intent_phrases) {
        searchableItems.push({
          canonical_name: canonicalName,
          search_text: phrase.phrase,
          aliases: phrase.aliases || [],
          context_keywords: phrase.context_keywords || [],
          type: "phrase",
          mapping: mapping,
        });
      }
    }

    // Add synonyms
    for (const [synonym, canonicalName] of Object.entries(
      this.dictionary.synonyms
    )) {
      searchableItems.push({
        canonical_name: canonicalName,
        search_text: synonym,
        type: "synonym",
        mapping: this.dictionary.mappings[canonicalName],
      });
    }

    return new Fuse(searchableItems, {
      keys: [
        { name: "search_text", weight: 0.7 },
        { name: "aliases", weight: 0.3 },
        { name: "context_keywords", weight: 0.2 },
      ],
      threshold: 0.4, // Lower threshold = more strict matching
      includeScore: true,
      includeMatches: true,
    });
  }

  /**
   * Get minimal default dictionary as fallback
   */
  private getDefaultDictionary(): IntentDictionary {
    return {
      version: "1.0.0",
      schema_version: "1.0.0",
      last_updated: new Date().toISOString(),
      mappings: {},
      synonyms: {},
      categories: [],
      validation_config: {
        min_confidence_threshold: 0.7,
        ambiguity_threshold: 0.3,
        require_design_tokens: false,
        strict_mode: false,
      },
      usage_analytics: {
        total_validations: 0,
        intent_usage_counts: {},
        validation_failures: [],
        average_confidence: 0,
      },
    };
  }

  /**
   * Main validation method - analyzes context files and extracts UI intents
   */
  async validateContextFiles(
    prd: string,
    types?: string,
    brand?: string
  ): Promise<IntentValidationReport> {
    console.log(chalk.blue("🔍 Validating UI intents from context..."));

    try {
      // 1. Extract intent phrases from text
      const extractedIntents = this.extractIntentsFromText(prd, types, brand);
      console.log(
        chalk.gray(`   Extracted ${extractedIntents.length} potential intents`)
      );

      // 2. Match against dictionary
      const matches = await this.matchIntents(extractedIntents);
      console.log(chalk.gray(`   Matched ${matches.length} intents`));

      // 3. Detect ambiguities
      const ambiguities = this.detectAmbiguities(matches, extractedIntents);

      // 4. Find unknown intents
      const unknowns = this.findUnknownIntents(extractedIntents, matches);

      // 5. Calculate overall confidence
      const confidence = this.calculateConfidence(matches);

      // 6. Generate clarifications if needed
      const clarifications = this.generateClarifications(ambiguities);

      // 7. Generate warnings and suggestions
      const warnings = this.generateWarnings(matches, ambiguities, unknowns);
      const suggestions = this.generateSuggestions(unknowns);

      // 8. Update analytics
      this.updateAnalytics(matches.length, confidence);

      const report: IntentValidationReport = {
        validated_intents: matches,
        ambiguous_intents: ambiguities,
        unknown_intents: unknowns,
        confidence_score: confidence,
        clarifications_needed: clarifications,
        warnings,
        suggestions,
      };

      console.log(
        chalk.green(
          `✅ Validation complete: ${matches.length} validated, ${ambiguities.length} ambiguous, ${unknowns.length} unknown`
        )
      );

      return report;
    } catch (error) {
      console.error(chalk.red("❌ Intent validation failed:"), error);
      throw error;
    }
  }

  /**
   * Extract UI intent phrases from text using pattern matching
   */
  private extractIntentsFromText(
    prd: string,
    types?: string,
    brand?: string
  ): ExtractedIntent[] {
    const extracted: ExtractedIntent[] = [];
    const allText = `${prd}\n${types || ""}\n${brand || ""}`;

    // Define extraction patterns for common UI descriptions
    const patterns: Array<{ regex: RegExp; confidence: number }> = [
      // Buttons
      {
        regex: /\b(button|btn)\s+(to|for|that)\s+([^.!?\n]+)/gi,
        confidence: 0.8,
      },
      {
        regex: /\b(submit|save|cancel|delete|edit|create)\s+(button|btn)/gi,
        confidence: 0.85,
      },
      { regex: /\b(cta|call to action)\b/gi, confidence: 0.9 },

      // Forms
      {
        regex: /\b(login|signin|sign in|authentication|auth)\s+(form|page)/gi,
        confidence: 0.95,
      },
      {
        regex: /\b(registration|signup|sign up|register)\s+(form|page)/gi,
        confidence: 0.9,
      },
      { regex: /\b(form)\s+(to|for|with)\s+([^.!?\n]+)/gi, confidence: 0.75 },

      // Inputs
      {
        regex: /\b(input|field|text box)\s+(for|to enter)\s+([^.!?\n]+)/gi,
        confidence: 0.8,
      },
      {
        regex: /\b(email|password|text|number)\s+(input|field)/gi,
        confidence: 0.85,
      },

      // Dialogs & Modals
      {
        regex: /\b(confirmation|confirm)\s+(dialog|modal|popup)/gi,
        confidence: 0.9,
      },
      {
        regex: /\b(alert|dialog|modal|popup)\s+(for|to|that)\s+([^.!?\n]+)/gi,
        confidence: 0.75,
      },
      { regex: /\b(are you sure|confirm|confirmation)\b/gi, confidence: 0.8 },

      // Navigation
      { regex: /\b(navigation|nav)\s+(menu|bar)/gi, confidence: 0.9 },
      {
        regex: /\b(menu|navbar|sidebar)\s+(with|showing|for)\s+([^.!?\n]+)/gi,
        confidence: 0.8,
      },

      // Data Display
      {
        regex:
          /\b(table|data table|grid)\s+(of|showing|displaying|with)\s+([^.!?\n]+)/gi,
        confidence: 0.85,
      },
      {
        regex: /\b(list|grid)\s+(of|showing)\s+([^.!?\n]+)/gi,
        confidence: 0.7,
      },
      {
        regex: /\b(card|panel)\s+(for|showing|displaying)\s+([^.!?\n]+)/gi,
        confidence: 0.75,
      },

      // Feedback
      {
        regex: /\b(error|warning|success)\s+(message|alert|notification)/gi,
        confidence: 0.85,
      },
      { regex: /\b(loading|spinner|loader)\b/gi, confidence: 0.9 },
      {
        regex:
          /\b(toast|notification|alert)\s+(for|to|showing)\s+([^.!?\n]+)/gi,
        confidence: 0.8,
      },
    ];

    for (const { regex, confidence } of patterns) {
      let match;
      const regexCopy = new RegExp(regex.source, regex.flags);

      while ((match = regexCopy.exec(allText)) !== null) {
        const matchedText = match[0];
        const matchIndex = match.index;

        // Extract context around the match
        const context = this.extractContext(allText, matchIndex);

        extracted.push({
          original_text: matchedText.trim(),
          pattern_matched: regex.source,
          context,
          confidence,
        });
      }
    }

    // Remove duplicates (same text)
    const unique = extracted.filter(
      (item, index, self) =>
        index === self.findIndex((t) => t.original_text === item.original_text)
    );

    return unique;
  }

  /**
   * Extract surrounding context for an intent match
   */
  private extractContext(text: string, matchIndex: number): ExtractionContext {
    const contextRadius = 100;
    const before = text
      .slice(Math.max(0, matchIndex - contextRadius), matchIndex)
      .trim();
    const after = text
      .slice(matchIndex, Math.min(text.length, matchIndex + contextRadius))
      .trim();

    // Extract keywords from context
    const contextText = `${before} ${after}`.toLowerCase();
    const keywords: string[] = [];

    // Look for category keywords
    const categoryKeywords = {
      forms: ["form", "input", "field", "submit", "validate", "entry"],
      navigation: ["navigation", "menu", "nav", "link", "route", "page"],
      feedback: ["alert", "error", "success", "warning", "notify", "message"],
      "data-display": [
        "table",
        "list",
        "grid",
        "data",
        "row",
        "column",
        "display",
      ],
      layout: ["card", "panel", "container", "layout", "section"],
    };

    for (const [category, words] of Object.entries(categoryKeywords)) {
      for (const word of words) {
        if (contextText.includes(word)) {
          keywords.push(word);
        }
      }
    }

    // Determine section (rough estimate)
    const lines = text.slice(0, matchIndex).split("\n");
    const lineNumber = lines.length;
    const section =
      lineNumber < 50
        ? "Introduction"
        : lineNumber < 100
        ? "Features"
        : lineNumber < 200
        ? "Requirements"
        : "Implementation";

    return {
      before,
      after,
      keywords: [...new Set(keywords)],
      section,
    };
  }

  /**
   * Match extracted intents against dictionary
   */
  private async matchIntents(
    extracted: ExtractedIntent[]
  ): Promise<ValidatedIntent[]> {
    const matches: ValidatedIntent[] = [];

    for (const intent of extracted) {
      // 1. Try exact phrase matching first
      const exactMatch = this.findExactMatch(intent.original_text);
      if (exactMatch) {
        matches.push({
          original_text: intent.original_text,
          canonical_name: exactMatch.canonical_name,
          intent_mapping: exactMatch,
          confidence: 1.0,
          extracted_context: intent.context,
          resolved_placeholders: this.resolvePlaceholders(exactMatch, intent),
        });
        continue;
      }

      // 2. Try synonym matching
      const synonymMatch = this.findSynonymMatch(intent.original_text);
      if (synonymMatch) {
        matches.push({
          original_text: intent.original_text,
          canonical_name: synonymMatch.canonical_name,
          intent_mapping: synonymMatch,
          confidence: 0.95,
          extracted_context: intent.context,
          resolved_placeholders: this.resolvePlaceholders(synonymMatch, intent),
        });
        continue;
      }

      // 3. Try fuzzy matching
      const fuzzyMatches = this.fuzzyMatch(intent.original_text, intent);
      if (fuzzyMatches.length > 0) {
        const bestMatch = fuzzyMatches[0];
        if (
          bestMatch &&
          bestMatch.confidence >=
            this.dictionary.validation_config.min_confidence_threshold
        ) {
          matches.push({
            original_text: intent.original_text,
            canonical_name: bestMatch.canonical_name,
            intent_mapping: bestMatch.mapping,
            confidence: bestMatch.confidence,
            extracted_context: intent.context,
            resolved_placeholders: this.resolvePlaceholders(
              bestMatch.mapping,
              intent
            ),
          });
        }
      }
    }

    return matches;
  }

  /**
   * Find exact phrase match in dictionary
   */
  private findExactMatch(text: string): IntentMapping | null {
    const lowerText = text.toLowerCase().trim();

    for (const [canonicalName, mapping] of Object.entries(
      this.dictionary.mappings
    )) {
      for (const intentPhrase of mapping.intent_phrases) {
        if (lowerText.includes(intentPhrase.phrase.toLowerCase())) {
          return mapping;
        }

        for (const alias of intentPhrase.aliases) {
          if (lowerText.includes(alias.toLowerCase())) {
            return mapping;
          }
        }
      }
    }

    return null;
  }

  /**
   * Find match via synonym lookup
   */
  private findSynonymMatch(text: string): IntentMapping | null {
    const lowerText = text.toLowerCase().trim();

    for (const [synonym, canonicalName] of Object.entries(
      this.dictionary.synonyms
    )) {
      if (lowerText.includes(synonym.toLowerCase())) {
        return this.dictionary.mappings[canonicalName] || null;
      }
    }

    return null;
  }

  /**
   * Fuzzy match using Fuse.js for better accuracy
   */
  private fuzzyMatch(
    text: string,
    extracted: ExtractedIntent
  ): FuzzyMatchResult[] {
    const results: FuzzyMatchResult[] = [];

    // Use Fuse.js to search
    const fuseResults = this.fuse.search(text);

    for (const result of fuseResults) {
      const item = result.item;
      const score = result.score || 0;

      // Convert Fuse.js score (0-1, lower is better) to confidence (0-1, higher is better)
      const confidence = 1 - score;

      // Apply context keyword bonus
      let contextBonus = 0;
      if (item.context_keywords && extracted.context.keywords) {
        const contextMatches = item.context_keywords.filter((kw: string) =>
          extracted.context.keywords.includes(kw.toLowerCase())
        );
        contextBonus =
          (contextMatches.length / item.context_keywords.length) * 0.2;
      }

      const finalConfidence = Math.min(confidence + contextBonus, 1.0);

      // Only include if above threshold
      if (
        finalConfidence >= this.dictionary.validation_config.ambiguity_threshold
      ) {
        results.push({
          canonical_name: item.canonical_name,
          confidence: finalConfidence,
          mapping: item.mapping,
          matched_phrase: item.search_text,
        });
      }
    }

    // Sort by confidence (highest first) and remove duplicates
    const uniqueResults = results.reduce((acc, current) => {
      const existing = acc.find(
        (item) => item.canonical_name === current.canonical_name
      );
      if (!existing || current.confidence > existing.confidence) {
        return acc
          .filter((item) => item.canonical_name !== current.canonical_name)
          .concat(current);
      }
      return acc;
    }, [] as FuzzyMatchResult[]);

    return uniqueResults.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Resolve placeholder values from context
   */
  private resolvePlaceholders(
    mapping: IntentMapping,
    intent: ExtractedIntent
  ): Record<string, string> {
    const placeholders: Record<string, string> = {};

    // Extract common placeholders from text
    const text = intent.original_text;

    // label: try to extract from "button to X" or "button for X"
    const labelMatch = text.match(/(?:to|for|that)\s+(.+)$/i);
    if (labelMatch && labelMatch[1]) {
      placeholders.label = this.capitalize(labelMatch[1].trim());
    } else {
      placeholders.label = "Submit";
    }

    // size: default to medium
    placeholders.size = "default";

    // handler: generate name
    placeholders.handler =
      "handle" + this.capitalize(mapping.canonical_name.replace(/-/g, ""));

    // aria_label: use label or description
    placeholders.aria_label = placeholders.label;

    // disabled: default to false
    placeholders.disabled = "false";

    // loading: default to loading state variable
    placeholders.loading = "loading";

    return placeholders;
  }

  /**
   * Detect ambiguous intents (multiple high-confidence matches)
   */
  private detectAmbiguities(
    matches: ValidatedIntent[],
    extracted: ExtractedIntent[]
  ): AmbiguousIntent[] {
    const ambiguities: AmbiguousIntent[] = [];
    const threshold = this.dictionary.validation_config.ambiguity_threshold;

    // Check each extracted intent
    for (const intent of extracted) {
      // Find all fuzzy matches for this intent
      const fuzzyMatches = this.fuzzyMatch(intent.original_text, intent);

      // If multiple matches with similar confidence
      const highConfidenceMatches = fuzzyMatches.filter(
        (m) => m.confidence >= threshold
      );

      if (highConfidenceMatches.length > 1) {
        // Check if top 2 are close in confidence (within 0.15)
        const top = highConfidenceMatches[0];
        const second = highConfidenceMatches[1];

        if (
          top &&
          second &&
          Math.abs(top.confidence - second.confidence) < 0.15
        ) {
          ambiguities.push({
            original_text: intent.original_text,
            possible_intents: highConfidenceMatches
              .slice(0, 3)
              .map((match) => ({
                canonical_name: match.canonical_name,
                confidence: match.confidence,
                reasoning: this.generateReasoning(match.mapping, intent),
              })),
            context_needed: [
              "Component type",
              "User interaction",
              "Visual style",
            ],
          });
        }
      }
    }

    return ambiguities;
  }

  /**
   * Generate reasoning for why an intent matched
   */
  private generateReasoning(
    mapping: IntentMapping,
    intent: ExtractedIntent
  ): string {
    const keywords = mapping.intent_phrases[0]?.context_keywords || [];
    const matchedKeywords = keywords.filter((kw) =>
      intent.original_text.toLowerCase().includes(kw.toLowerCase())
    );

    if (matchedKeywords.length > 0) {
      return `Matched keywords: ${matchedKeywords.join(", ")}`;
    }

    return `Pattern match in ${intent.context.section}`;
  }

  /**
   * Find unknown intents that couldn't be matched
   */
  private findUnknownIntents(
    extracted: ExtractedIntent[],
    matches: ValidatedIntent[]
  ): UnknownIntent[] {
    const unknowns: UnknownIntent[] = [];
    const matchedTexts = new Set(matches.map((m) => m.original_text));

    for (const intent of extracted) {
      if (!matchedTexts.has(intent.original_text)) {
        // Find similar intents
        const fuzzyMatches = this.fuzzyMatch(intent.original_text, intent);
        const similar = fuzzyMatches.slice(0, 3).map((m) => ({
          canonical_name: m.canonical_name,
          similarity_score: m.confidence,
        }));

        unknowns.push({
          original_text: intent.original_text,
          similar_intents: similar,
          suggested_fallback:
            similar.length > 0 ? similar[0]?.canonical_name || "" : "",
        });
      }
    }

    return unknowns;
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(matches: ValidatedIntent[]): number {
    if (matches.length === 0) return 0;

    const sum = matches.reduce((acc, m) => acc + m.confidence, 0);
    return sum / matches.length;
  }

  /**
   * Generate clarification requests for ambiguous intents
   */
  private generateClarifications(
    ambiguities: AmbiguousIntent[]
  ): ClarificationRequest[] {
    return ambiguities.map((ambig) => ({
      question: `What type of component did you mean?`,
      original_text: ambig.original_text,
      suggested_intents: ambig.possible_intents.map((pi) => {
        const mapping = this.dictionary.mappings[pi.canonical_name];
        return {
          canonical_name: pi.canonical_name,
          description:
            mapping?.component_pattern.shadcn_components
              ?.map((c) => c.name)
              .join(", ") || "",
          components:
            mapping?.component_pattern.shadcn_components?.map((c) => c.name) ||
            [],
        };
      }),
    }));
  }

  /**
   * Generate warnings about validation results
   */
  private generateWarnings(
    matches: ValidatedIntent[],
    ambiguities: AmbiguousIntent[],
    unknowns: UnknownIntent[]
  ): string[] {
    const warnings: string[] = [];

    if (matches.length === 0) {
      warnings.push("No UI intents detected in context files");
    }

    if (ambiguities.length > 0) {
      warnings.push(
        `${ambiguities.length} ambiguous intent(s) require clarification`
      );
    }

    if (unknowns.length > 0) {
      warnings.push(
        `${unknowns.length} unknown intent(s) could not be matched`
      );
    }

    const lowConfidence = matches.filter((m) => m.confidence < 0.7);
    if (lowConfidence.length > 0) {
      warnings.push(`${lowConfidence.length} intent(s) have low confidence`);
    }

    return warnings;
  }

  /**
   * Generate suggestions for improving intent detection
   */
  private generateSuggestions(unknowns: UnknownIntent[]): string[] {
    const suggestions: string[] = [];

    if (unknowns.length > 0) {
      suggestions.push(
        "Consider adding more specific UI component descriptions to your PRD"
      );

      const uniqueUnknowns = unknowns.slice(0, 3);
      for (const unknown of uniqueUnknowns) {
        if (unknown.similar_intents.length > 0 && unknown.similar_intents[0]) {
          suggestions.push(
            `"${unknown.original_text}" might be: ${unknown.similar_intents[0].canonical_name}`
          );
        }
      }
    }

    return suggestions;
  }

  /**
   * Update usage analytics
   */
  private updateAnalytics(validatedCount: number, confidence: number): void {
    this.dictionary.usage_analytics.total_validations++;
    const current = this.dictionary.usage_analytics.average_confidence;
    const total = this.dictionary.usage_analytics.total_validations;

    // Running average
    this.dictionary.usage_analytics.average_confidence =
      (current * (total - 1) + confidence) / total;
  }

  /**
   * Utility: capitalize first letter
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Get current dictionary for inspection
   */
  public getDictionary(): IntentDictionary {
    return this.dictionary;
  }

  /**
   * Get list of available intents
   */
  public getAvailableIntents(): string[] {
    return Object.keys(this.dictionary.mappings);
  }

  /**
   * Get intent mapping by canonical name
   */
  public getIntentMapping(canonicalName: string): IntentMapping | null {
    return this.dictionary.mappings[canonicalName] || null;
  }
}
