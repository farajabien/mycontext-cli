import chalk from "chalk";

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  VERBOSE = 3,
  DEBUG = 4,
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private isQuiet: boolean = false;

  private constructor() {
    // Check for CLI flags in process.argv
    const args = process.argv;

    // Check for verbose flag
    if (args.includes("--verbose") || args.includes("-v")) {
      this.logLevel = LogLevel.VERBOSE;
    }
    // Check for quiet flag (quiet takes precedence)
    else if (args.includes("--quiet") || args.includes("-q")) {
      this.isQuiet = true;
      this.logLevel = LogLevel.ERROR;
    }
    // Check for npm_config environment variables (when called via npm scripts)
    else if (process.env.npm_config_verbose === "true") {
      this.logLevel = LogLevel.VERBOSE;
    } else if (process.env.npm_config_quiet === "true") {
      this.isQuiet = true;
      this.logLevel = LogLevel.ERROR;
    }
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public setQuiet(quiet: boolean): void {
    this.isQuiet = quiet;
    if (quiet) {
      this.logLevel = LogLevel.ERROR;
    }
  }

  public getLogLevel(): LogLevel {
    return this.logLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isQuiet && level > LogLevel.ERROR) {
      return false;
    }
    return level <= this.logLevel;
  }

  public error(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(chalk.red(`❌ ${message}`), ...args);
    }
  }

  public warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(chalk.yellow(`⚠️  ${message}`), ...args);
    }
  }

  public info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(chalk.blue(`ℹ️  ${message}`), ...args);
    }
  }

  public success(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(chalk.green(`✅ ${message}`), ...args);
    }
  }

  public verbose(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.VERBOSE)) {
      console.log(chalk.gray(`🔍 ${message}`), ...args);
    }
  }

  public debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(chalk.gray(`🐛 ${message}`), ...args);
    }
  }

  // Clean progress indicators (always shown unless quiet)
  public progress(message: string): void {
    if (!this.isQuiet) {
      console.log(chalk.cyan(`⏳ ${message}`));
    }
  }

  public step(message: string): void {
    if (!this.isQuiet) {
      console.log(chalk.blue(`➡️  ${message}`));
    }
  }

  // Silent methods for internal use
  public silent(message: string, ...args: any[]): void {
    console.log(message, ...args);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Convenience functions
export const log = {
  error: (message: string, ...args: any[]) => logger.error(message, ...args),
  warn: (message: string, ...args: any[]) => logger.warn(message, ...args),
  info: (message: string, ...args: any[]) => logger.info(message, ...args),
  success: (message: string, ...args: any[]) =>
    logger.success(message, ...args),
  verbose: (message: string, ...args: any[]) =>
    logger.verbose(message, ...args),
  debug: (message: string, ...args: any[]) => logger.debug(message, ...args),
  progress: (message: string) => logger.progress(message),
  step: (message: string) => logger.step(message),
  silent: (message: string, ...args: any[]) => logger.silent(message, ...args),
};
