import chalk from "chalk";
import prompts from "prompts";
import { CommandOptions } from "../types";
import { HostedApiClient } from "../utils/hostedApiClient";
import { getApiUrl, getAuthUrl } from "../config/api";
import * as fs from "fs-extra";
import * as path from "path";
// import { open } from "open";

interface AuthOptions extends CommandOptions {
  login?: boolean;
  logout?: boolean;
  status?: boolean;
  register?: boolean;
}

export class AuthCommand {
  private hostedApi = new HostedApiClient();
  private configPath = path.join(process.cwd(), ".mycontext", "auth.json");

  async execute(options: AuthOptions): Promise<void> {
    try {
      if (options.login) {
        await this.login();
      } else if (options.logout) {
        await this.logout();
      } else if (options.status) {
        await this.status();
      } else if (options.register) {
        await this.register();
      } else {
        // Interactive mode
        await this.interactiveAuth();
      }
    } catch (error) {
      console.error(
        chalk.red(
          `❌ Auth error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        )
      );
      process.exit(1);
    }
  }

  private async interactiveAuth(): Promise<void> {
    console.log(chalk.blue("\n🔐 MyContext Authentication"));
    console.log(chalk.gray("Choose an option:"));

    const response = await prompts({
      type: "select",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { title: "Login to MyContext AI", value: "login" },
        { title: "Register new account", value: "register" },
        { title: "Check auth status", value: "status" },
        { title: "Logout", value: "logout" },
      ],
    });

    if (!response.action) {
      console.log(chalk.yellow("Operation cancelled."));
      return;
    }

    switch (response.action) {
      case "login":
        await this.login();
        break;
      case "register":
        await this.register();
        break;
      case "status":
        await this.status();
        break;
      case "logout":
        await this.logout();
        break;
    }
  }

  private async login(): Promise<void> {
    console.log(chalk.blue("\n🔑 Login to MyContext AI"));

    // Check if already logged in
    const currentAuth = await this.getStoredAuth();
    if (currentAuth?.token) {
      const isValid = await this.validateToken(currentAuth.token);
      if (isValid) {
        console.log(
          chalk.green(`✅ Already logged in as ${currentAuth.email}`)
        );
        return;
      }
    }

    // Open browser for OAuth flow
    console.log(chalk.yellow("Opening browser for authentication..."));

    try {
      const loginUrl = getAuthUrl("/login");
      // await open(loginUrl);
      console.log(chalk.yellow("Please open this URL in your browser:"));
      console.log(chalk.blue(loginUrl));
    } catch (error) {
      console.log(chalk.yellow("Please open this URL in your browser:"));
      console.log(chalk.blue("https://mycontext.fbien.com/auth/login"));
    }

    // Get token from user
    const response = await prompts({
      type: "password",
      name: "token",
      message: "Enter your API token from the website:",
      validate: (value) => value.length > 0 || "Token is required",
    });

    if (!response.token) {
      console.log(chalk.yellow("Login cancelled."));
      return;
    }

    // Validate token
    const isValid = await this.validateToken(response.token);
    if (!isValid) {
      console.log(chalk.red("❌ Invalid token. Please check and try again."));
      return;
    }

    // Get user info
    const userInfo = await this.getUserInfo(response.token);
    if (!userInfo) {
      console.log(chalk.red("❌ Failed to get user information."));
      return;
    }

    // Store auth
    await this.storeAuth({
      token: response.token,
      email: userInfo.email,
      userId: userInfo.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    });

    console.log(chalk.green(`✅ Successfully logged in as ${userInfo.email}`));
    console.log(
      chalk.gray(`   Plan: ${userInfo.subscriptionStatus || "Free"}`)
    );
    console.log(
      chalk.gray(`   Credits: ${userInfo.creditsRemaining || "Unlimited"}`)
    );
  }

  private async register(): Promise<void> {
    console.log(chalk.blue("\n📝 Register for MyContext AI"));

    // Open browser for registration
    console.log(chalk.yellow("Opening browser for registration..."));

    try {
      const registerUrl = getAuthUrl("/register");
      // await open(registerUrl);
      console.log(chalk.yellow("Please open this URL in your browser:"));
      console.log(chalk.blue(registerUrl));
    } catch (error) {
      console.log(chalk.yellow("Please open this URL in your browser:"));
      console.log(chalk.blue("https://mycontext.fbien.com/auth/register"));
    }

    console.log(chalk.gray("\nAfter registering, come back and run:"));
    console.log(chalk.blue("mycontext auth login"));
  }

  private async status(): Promise<void> {
    console.log(chalk.blue("\n📊 Authentication Status"));

    const auth = await this.getStoredAuth();
    if (!auth?.token) {
      console.log(chalk.yellow("❌ Not logged in"));
      console.log(chalk.gray("Run 'mycontext auth login' to authenticate"));
      return;
    }

    // Validate token
    const isValid = await this.validateToken(auth.token);
    if (!isValid) {
      console.log(chalk.red("❌ Token expired or invalid"));
      console.log(chalk.gray("Run 'mycontext auth login' to re-authenticate"));
      return;
    }

    // Get fresh user info
    const userInfo = await this.getUserInfo(auth.token);
    if (!userInfo) {
      console.log(chalk.red("❌ Failed to get user information"));
      return;
    }

    console.log(chalk.green("✅ Authenticated"));
    console.log(chalk.gray(`   Email: ${userInfo.email}`));
    console.log(
      chalk.gray(`   Plan: ${userInfo.subscriptionStatus || "Free"}`)
    );
    console.log(
      chalk.gray(`   Credits: ${userInfo.creditsRemaining || "Unlimited"}`)
    );
    console.log(chalk.gray(`   Token expires: ${auth.expiresAt}`));
  }

  private async logout(): Promise<void> {
    console.log(chalk.blue("\n🚪 Logging out..."));

    const auth = await this.getStoredAuth();
    if (!auth?.token) {
      console.log(chalk.yellow("❌ Not logged in"));
      return;
    }

    // Clear stored auth
    await this.clearAuth();

    console.log(chalk.green("✅ Successfully logged out"));
  }

  private async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(getApiUrl("/auth/status"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private async getUserInfo(token: string): Promise<any> {
    try {
      const response = await fetch(getApiUrl("/auth/status"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as any;
      return data.user;
    } catch (error) {
      return null;
    }
  }

  private async getStoredAuth(): Promise<any> {
    try {
      if (await fs.pathExists(this.configPath)) {
        return await fs.readJson(this.configPath);
      }
    } catch (error) {
      // Ignore errors
    }
    return null;
  }

  private async storeAuth(auth: any): Promise<void> {
    await fs.ensureDir(path.dirname(this.configPath));
    await fs.writeJson(this.configPath, auth, { spaces: 2 });
  }

  private async clearAuth(): Promise<void> {
    try {
      if (await fs.pathExists(this.configPath)) {
        await fs.remove(this.configPath);
      }
    } catch (error) {
      // Ignore errors
    }
  }
}
