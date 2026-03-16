import OpenAI from "openai";
import * as fs from "fs-extra";
import * as path from "path";
import { TTSConfig } from "../types/vision-testing";
import chalk from "chalk";

/**
 * TTS Service
 * 
 * Provides high-quality text-to-speech capabilities for demo voice-overs.
 * Supports OpenAI (default) and other providers.
 */
export class TTSService {
  private openai: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || process.env.MYCONTEXT_OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Convert text to speech and save as MP3
   */
  async generateSpeech(
    text: string,
    outputPath: string,
    config: TTSConfig = { provider: "local" } // Default to local if not specified, though local is placeholder
  ): Promise<boolean> {
    try {
      console.log(chalk.gray(`  🎙️ Generating speech for: "${text.substring(0, 50)}..."`));

      // 1. Try ElevenLabs (if configured)
      if (config.provider === "elevenlabs") {
        return this.generateElevenLabs(text, outputPath, config);
      }

      // 2. Default to OpenAI (if configured)
      if (this.openai) {
        return this.generateOpenAI(text, outputPath, config);
      }

      // 3. Fallback to local (placeholder)
      console.warn(chalk.yellow("  ⚠️ No valid TTS provider configured. Skipping audio generation."));
      return false;
    } catch (error: any) {
      console.error(chalk.red(`  ❌ TTS generation failed: ${error.message}`));
      return false;
    }
  }

  /**
   * Generate speech using OpenAI Audio API
   */
  private async generateOpenAI(
    text: string,
    outputPath: string,
    config: TTSConfig
  ): Promise<boolean> {
    if (!this.openai) return false;

    try {
      const mp3 = await this.openai.audio.speech.create({
        model: "tts-1",
        voice: (config.voice as any) || "alloy",
        input: text,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      await fs.writeFile(outputPath, buffer);
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate speech using ElevenLabs API (placeholder)
   */
  private async generateElevenLabs(
    text: string,
    outputPath: string,
    config: TTSConfig
  ): Promise<boolean> {
    // Implementing ElevenLabs would require 'axios' or their SDK
    // For now, redirect to OpenAI if available as a fallback
    if (this.openai) {
      console.warn(chalk.yellow("  ⚠️ ElevenLabs not yet fully implemented. Falling back to OpenAI."));
      return this.generateOpenAI(text, outputPath, config);
    }
    return false;
  }
}
