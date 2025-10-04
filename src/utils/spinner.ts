import chalk from "chalk";

export class EnhancedSpinner {
  private text: string;
  private isSpinning: boolean;
  private spinnerChars: string[];
  private currentFrame: number;
  private interval: NodeJS.Timeout | null;
  private startTime: number | null;
  private lastLineLength: number;
  // Keep output single-line and minimal

  constructor(text: string) {
    this.text = text;
    this.isSpinning = false;
    this.spinnerChars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    this.currentFrame = 0;
    this.interval = null;
    this.startTime = null;
    this.lastLineLength = 0;
  }

  private clearLine(): void {
    // Clear the current line completely
    process.stdout.write("\r" + " ".repeat(this.lastLineLength) + "\r");
  }

  // Removed encouragement messages to avoid noisy logs

  private updateSpinner(): void {
    const elapsed = this.startTime ? Date.now() - this.startTime : 0;
    const elapsedSeconds = Math.floor(elapsed / 1000);
    const timeDisplay =
      elapsedSeconds > 0 ? chalk.gray(` (${elapsedSeconds}s)`) : "";
    // Clear the current line completely
    this.clearLine();

    // Show main spinner line with encouragement inline
    const mainLine = `${chalk.blue(this.spinnerChars[this.currentFrame])} ${
      this.text
    }${timeDisplay}`;
    process.stdout.write(mainLine);
    this.lastLineLength = mainLine.replace(/\x1b\[[0-9;]*m/g, "").length;

    this.currentFrame = (this.currentFrame + 1) % this.spinnerChars.length;
  }

  start(): this {
    this.isSpinning = true;
    this.startTime = Date.now();
    this.interval = setInterval(() => {
      this.updateSpinner();
    }, 100);
    return this;
  }

  success(options: { text?: string } = {}): this {
    if (this.isSpinning) {
      if (this.interval) clearInterval(this.interval);
      this.clearLine();
      process.stdout.write(
        `${chalk.green("✅")} ${options.text || this.text}\n`
      );
      this.isSpinning = false;
    }
    return this;
  }

  error(options: { text?: string } = {}): this {
    if (this.isSpinning) {
      if (this.interval) clearInterval(this.interval);
      this.clearLine();
      process.stdout.write(`${chalk.red("❌")} ${options.text || this.text}\n`);
      this.isSpinning = false;
    }
    return this;
  }

  warn(options: { text?: string } = {}): this {
    if (this.isSpinning) {
      if (this.interval) clearInterval(this.interval);
      this.clearLine();
      process.stdout.write(
        `${chalk.yellow("⚠️")} ${options.text || this.text}\n`
      );
      this.isSpinning = false;
    }
    return this;
  }

  updateText(newText: string): this {
    this.text = newText;
    return this;
  }

  reset(): this {
    this.startTime = Date.now();
    return this;
  }

  // Add missing methods for compatibility
  succeed(text?: string): this {
    return this.success({ text });
  }

  fail(text?: string): this {
    return this.error({ text });
  }

  stop(): this {
    if (this.isSpinning && this.interval) {
      clearInterval(this.interval);
      this.clearLine();
      this.isSpinning = false;
    }
    return this;
  }
}
