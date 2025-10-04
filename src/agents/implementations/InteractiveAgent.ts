/**
 * InteractiveAgent Implementation
 *
 * Handles human-computer interaction in the terminal, providing prompts,
 * confirmations, and user input handling for the MyContext CLI workflow.
 * Supports looping capabilities and iterative refinement.
 */

import * as readline from "readline";
import chalk from "chalk";
import {
  SubAgent,
  InteractiveInput,
  InteractiveOutput,
} from "../interfaces/SubAgent";

export class InteractiveAgent
  implements SubAgent<InteractiveInput, InteractiveOutput>
{
  name = "InteractiveAgent";
  description =
    "Handles human-computer interaction in the terminal for prompts, confirmations, and user input";
  personality =
    "Friendly and patient terminal assistant that guides users through interactive workflows";
  llmProvider = "terminal"; // Uses terminal interface, not AI
  expertise = [
    "user-interaction",
    "terminal-ui",
    "input-validation",
    "workflow-guidance",
  ];

  private rl: readline.Interface | null = null;
  private timeoutHandle: NodeJS.Timeout | null = null;

  async run(input: InteractiveInput): Promise<InteractiveOutput> {
    const startTime = Date.now();
    let retries = 0;

    try {
      this.initializeReadline();

      let response: string = "";
      let isValid = false;

      do {
        try {
          response = await this.handleInteraction(input);
          isValid = this.validateInput(response, input);

          if (!isValid && input.retryOnError !== false) {
            retries++;
            console.log(chalk.yellow("❌ Invalid input. Please try again."));
          }
        } catch (error) {
          if (error instanceof Error && error.message === "TIMEOUT") {
            if (input.retryOnError !== false) {
              retries++;
              console.log(chalk.yellow("⏰ Timeout reached. Please respond:"));
            } else {
              throw error;
            }
          } else {
            throw error;
          }
        }
      } while (!isValid && retries < 3);

      if (!isValid) {
        throw new Error("Maximum retries exceeded for user input");
      }

      return {
        success: true,
        response,
        metadata: {
          inputType: input.type,
          responseTime: Date.now() - startTime,
          retries,
          context: input.context,
        },
      };
    } finally {
      this.performCleanup();
    }
  }

  private initializeReadline(): void {
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
    }
  }

  private performCleanup(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }

  private async handleInteraction(input: InteractiveInput): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = input.timeout || 60000; // 1 minute default timeout for faster UX

      // Set up timeout
      if (timeout > 0) {
        this.timeoutHandle = setTimeout(() => {
          reject(new Error("TIMEOUT"));
        }, timeout);
      }

      switch (input.type) {
        case "prompt":
          this.handlePrompt(input, resolve);
          break;
        case "confirm":
          this.handleConfirm(input, resolve);
          break;
        case "select":
          this.handleSelect(input, resolve);
          break;
        case "multiline":
          this.handleMultiline(input, resolve);
          break;
        default:
          reject(new Error(`Unknown input type: ${input.type}`));
      }
    });
  }

  private handlePrompt(
    input: InteractiveInput,
    resolve: (value: string) => void
  ): void {
    if (!this.rl) return;

    const prompt = this.formatPrompt(input.message, input.defaultValue);
    this.rl.question(prompt, (answer) => {
      const response = answer.trim() || input.defaultValue || "";
      resolve(response);
    });
  }

  private handleConfirm(
    input: InteractiveInput,
    resolve: (value: string) => void
  ): void {
    if (!this.rl) return;

    const prompt = `${input.message} ${chalk.gray("(y/n)")}: `;
    this.rl.question(prompt, (answer) => {
      const response = answer.toLowerCase().trim();
      if (response === "y" || response === "yes") {
        resolve("yes");
      } else if (response === "n" || response === "no") {
        resolve("no");
      } else {
        // Default to no for invalid responses
        resolve("no");
      }
    });
  }

  private handleSelect(
    input: InteractiveInput,
    resolve: (value: string) => void
  ): void {
    if (!this.rl) return;

    const options = input.options || [];
    if (options.length === 0) {
      resolve("");
      return;
    }

    console.log(chalk.cyan(input.message));
    options.forEach((option: string, index: number) => {
      console.log(chalk.gray(`  ${index + 1}. ${option}`));
    });

    const prompt = `Select an option (1-${options.length}): `;
    this.rl.question(prompt, (answer) => {
      const index = parseInt(answer.trim()) - 1;
      if (index >= 0 && index < options.length) {
        resolve(options[index]);
      } else {
        console.log(chalk.red("Invalid selection. Please try again."));
        this.handleSelect(input, resolve);
      }
    });
  }

  private async handleMultiline(
    input: InteractiveInput,
    resolve: (value: string) => void
  ): Promise<void> {
    if (!this.rl) return;

    console.log(chalk.cyan(input.message));
    console.log(
      chalk.gray("Enter your response (press Ctrl+D or type 'EOF' to finish):")
    );

    let lines: string[] = [];
    let isReading = true;

    const onLine = (line: string) => {
      if (line.trim().toLowerCase() === "eof") {
        isReading = false;
        this.rl?.removeListener("line", onLine);
        this.rl?.removeListener("close", onClose);
        resolve(lines.join("\n"));
        return;
      }
      lines.push(line);
    };

    const onClose = () => {
      isReading = false;
      this.rl?.removeListener("line", onLine);
      this.rl?.removeListener("close", onClose);
      resolve(lines.join("\n"));
    };

    this.rl?.on("line", onLine);
    this.rl?.on("close", onClose);
  }

  private formatPrompt(message: string, defaultValue?: string): string {
    if (defaultValue) {
      return `${message} ${chalk.gray(`(${defaultValue})`)}: `;
    }
    return `${message}: `;
  }

  private validateInput(input: string, config: InteractiveInput): boolean {
    if (!config.validate) return true;

    const result = config.validate(input);
    if (typeof result === "boolean") {
      return result;
    } else {
      console.log(chalk.red(`❌ ${result}`));
      return false;
    }
  }

  validate?(input: InteractiveInput): boolean | Promise<boolean> {
    // Validate that the input has required fields
    if (!input.message || !input.type) {
      return false;
    }

    if (
      input.type === "select" &&
      (!input.options || input.options.length === 0)
    ) {
      return false;
    }

    return true;
  }

  async cleanup?(): Promise<void> {
    this.performCleanup();
  }

  async getStatus?(): Promise<any> {
    return {
      name: this.name,
      status: "idle",
      activeInteractions: this.rl ? 1 : 0,
      lastCleanup: new Date(),
      errorCount: 0,
      successCount: 0,
    };
  }

  // Helper methods for common interactions
  async promptUser(message: string, defaultValue?: string): Promise<string> {
    return this.run({
      type: "prompt",
      message,
      defaultValue,
    }).then((result) => result.response);
  }

  async confirmAction(message: string): Promise<boolean> {
    const result = await this.run({
      type: "confirm",
      message,
    });
    return result.response === "yes";
  }

  async selectOption(message: string, options: string[]): Promise<string> {
    const result = await this.run({
      type: "select",
      message,
      options,
    });
    return result.response;
  }

  async getMultilineInput(message: string): Promise<string> {
    const result = await this.run({
      type: "multiline",
      message,
    });
    return result.response;
  }
}
