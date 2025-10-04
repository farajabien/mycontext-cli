import chalk from "chalk";
import prompts from "prompts";
import { EnhancedSpinner } from "../utils/spinner";
import { FileSystemManager } from "../utils/fileSystem";
import { CommandOptions, PRDValidationResult } from "../types";

interface ValidateOptions extends CommandOptions {
  file?: string;
  interactive?: boolean;
}

export class ValidateCommand {
  private fs = new FileSystemManager();

  async execute(target: string, options: ValidateOptions): Promise<void> {
    const spinner = new EnhancedSpinner("Validating PRD...");

    try {
      console.log(chalk.blue.bold("🔍 MyContext PRD Validation\n"));

      // Determine what to validate
      let prdContent: string;
      let source: string;

      if (target === "prd") {
        // Validate PRD file
        const prdPath = options.file || (await this.findPRDFile());
        if (!prdPath) {
          throw new Error(
            'No PRD file found. Run "mycontext generate context" first.'
          );
        }

        prdContent = await this.fs.readFile(prdPath);
        source = prdPath;
      } else {
        // Validate provided content
        prdContent = target;
        source = "input";
      }

      spinner.start();

      // Perform validation
      const validationResult = await this.validatePRD(prdContent);

      spinner.success({ text: "PRD validation completed!" });

      // Display results
      this.displayValidationResults(validationResult, source);

      // Next steps suggestion
      this.printNextStepsAfterValidate(validationResult.isValid);

      // Interactive mode
      if (options.interactive && !validationResult.isValid) {
        await this.handleValidationIssues(validationResult, prdContent);
      }
    } catch (error) {
      spinner.error({ text: "PRD validation failed" });
      throw error;
    }
  }

  private async validatePRD(content: string): Promise<PRDValidationResult> {
    // This would integrate with your existing validation logic
    // For now, implementing a basic validation

    const dimensions = {
      technicalCompleteness: this.scoreTechnicalCompleteness(content),
      noveltyRisk: this.scoreNoveltyRisk(content),
      resourceEstimate: this.scoreResourceEstimate(content),
      compliance: this.scoreCompliance(content),
      languageClarity: this.scoreLanguageClarity(content),
    };

    const overall =
      Object.values(dimensions).reduce((sum, score) => sum + score, 0) / 5;

    const recommendations = this.generateRecommendations(dimensions);
    const risks = this.identifyRisks(dimensions);

    return {
      overall: Math.round(overall),
      dimensions,
      recommendations,
      risks,
      isValid: overall >= 70,
    };
  }

  private scoreTechnicalCompleteness(content: string): number {
    let score = 0;

    // Check for technical sections
    if (content.includes("technology") || content.includes("tech stack"))
      score += 20;
    if (content.includes("architecture") || content.includes("system design"))
      score += 20;
    if (content.includes("database") || content.includes("data model"))
      score += 15;
    if (content.includes("API") || content.includes("integration")) score += 15;
    if (content.includes("deployment") || content.includes("infrastructure"))
      score += 15;
    if (content.includes("security") || content.includes("authentication"))
      score += 15;

    return Math.min(score, 100);
  }

  private scoreNoveltyRisk(content: string): number {
    let score = 50; // Start with neutral score

    // Check for innovative features
    const innovativeKeywords = [
      "AI",
      "machine learning",
      "blockchain",
      "AR",
      "VR",
      "IoT",
    ];
    const innovativeCount = innovativeKeywords.filter((keyword) =>
      content.toLowerCase().includes(keyword.toLowerCase())
    ).length;

    score += innovativeCount * 10;

    // Check for risk indicators
    const riskKeywords = ["experimental", "unproven", "cutting-edge", "beta"];
    const riskCount = riskKeywords.filter((keyword) =>
      content.toLowerCase().includes(keyword.toLowerCase())
    ).length;

    score -= riskCount * 5;

    return Math.max(0, Math.min(score, 100));
  }

  private scoreResourceEstimate(content: string): number {
    let score = 0;

    // Check for resource planning
    if (content.includes("timeline") || content.includes("deadline"))
      score += 20;
    if (content.includes("budget") || content.includes("cost")) score += 20;
    if (content.includes("team") || content.includes("resources")) score += 20;
    if (content.includes("milestone") || content.includes("phase")) score += 20;
    if (content.includes("risk") || content.includes("mitigation")) score += 20;

    return Math.min(score, 100);
  }

  private scoreCompliance(content: string): number {
    let score = 100; // Start with perfect score

    // Check for compliance considerations
    const complianceKeywords = [
      "GDPR",
      "HIPAA",
      "SOX",
      "PCI",
      "compliance",
      "regulation",
    ];
    const hasCompliance = complianceKeywords.some((keyword) =>
      content.toLowerCase().includes(keyword.toLowerCase())
    );

    if (!hasCompliance) score -= 30;

    // Check for legal considerations
    if (
      !content.toLowerCase().includes("legal") &&
      !content.toLowerCase().includes("terms")
    ) {
      score -= 20;
    }

    return Math.max(0, score);
  }

  private scoreLanguageClarity(content: string): number {
    let score = 0;

    // Check for clear structure
    if (content.includes("##") || content.includes("###")) score += 20;
    if (
      content.includes("1.") ||
      content.includes("2.") ||
      content.includes("•")
    )
      score += 20;
    if (content.includes("objective") || content.includes("goal")) score += 20;
    if (content.includes("requirement") || content.includes("feature"))
      score += 20;
    if (
      content.includes("user story") ||
      content.includes("acceptance criteria")
    )
      score += 20;

    return Math.min(score, 100);
  }

  private generateRecommendations(dimensions: any): string[] {
    const recommendations: string[] = [];

    if (dimensions.technicalCompleteness < 70) {
      recommendations.push(
        "Add more technical specifications and architecture details"
      );
    }

    if (dimensions.noveltyRisk < 50) {
      recommendations.push(
        "Consider the risks and feasibility of innovative features"
      );
    }

    if (dimensions.resourceEstimate < 60) {
      recommendations.push("Include timeline, budget, and resource planning");
    }

    if (dimensions.compliance < 80) {
      recommendations.push("Address compliance and legal requirements");
    }

    if (dimensions.languageClarity < 70) {
      recommendations.push("Improve structure and clarity of requirements");
    }

    return recommendations;
  }

  private identifyRisks(dimensions: any): string[] {
    const risks: string[] = [];

    if (dimensions.noveltyRisk > 80) {
      risks.push(
        "High innovation risk - consider feasibility and market validation"
      );
    }

    if (dimensions.technicalCompleteness < 50) {
      risks.push(
        "Insufficient technical detail may lead to implementation issues"
      );
    }

    if (dimensions.resourceEstimate < 40) {
      risks.push("Lack of resource planning may cause project delays");
    }

    return risks;
  }

  private async findPRDFile(): Promise<string | null> {
    const possiblePaths = [
      ".mycontext/01-prd.md",
      ".mycontext/prd.md",
      "context/01-prd.md",
      "context/prd.md",
      "context/PRD.md",
      "prd.md",
      "PRD.md",
    ];

    for (const path of possiblePaths) {
      try {
        await this.fs.readFile(path);
        return path;
      } catch {
        continue;
      }
    }

    return null;
  }

  private printNextStepsAfterValidate(valid: boolean): void {
    try {
      if (valid) {
        console.log(chalk.blue("➡️ Next: Generate types"));
        console.log(chalk.gray("   mycontext generate types"));
      } else {
        console.log(chalk.yellow("➡️ Consider improving the PRD, then re-run validation."));
        console.log(chalk.gray("   mycontext validate prd --interactive"));
      }
      console.log();
    } catch {}
  }

  private displayValidationResults(
    result: PRDValidationResult,
    source: string
  ): void {
    console.log(chalk.cyan(`\n📊 Validation Results for: ${source}\n`));

    // Overall score
    const scoreColor = result.isValid ? chalk.green : chalk.red;
    console.log(
      `Overall Score: ${scoreColor(`${result.overall}/100`)} ${
        result.isValid ? "✅" : "❌"
      }\n`
    );

    // Dimension scores
    console.log(chalk.yellow("Dimension Scores:"));
    Object.entries(result.dimensions).forEach(([dimension, score]) => {
      const color =
        score >= 70 ? chalk.green : score >= 50 ? chalk.yellow : chalk.red;
      const icon = score >= 70 ? "✅" : score >= 50 ? "⚠️" : "❌";
      console.log(
        `  ${dimension.replace(/([A-Z])/g, " $1").trim()}: ${color(
          `${score}/100`
        )} ${icon}`
      );
    });

    // Recommendations
    if (result.recommendations.length > 0) {
      console.log(chalk.blue("\n💡 Recommendations:"));
      result.recommendations.forEach((rec) => {
        console.log(`  • ${rec}`);
      });
    }

    // Risks
    if (result.risks.length > 0) {
      console.log(chalk.red("\n⚠️ Risks:"));
      result.risks.forEach((risk) => {
        console.log(`  • ${risk}`);
      });
    }

    console.log("\n");
  }

  private async handleValidationIssues(
    result: PRDValidationResult,
    content: string
  ): Promise<void> {
    console.log(chalk.yellow("Would you like to improve your PRD?"));

    const response = await prompts({
      type: "confirm",
      name: "improve",
      message: "Open interactive PRD improvement mode?",
      initial: true,
    });

    if (response.improve) {
      console.log(chalk.blue("\n🔧 Interactive PRD Improvement Mode\n"));
      console.log(
        chalk.gray("This feature will be implemented in a future version.")
      );
      console.log(
        chalk.gray(
          "For now, please manually address the recommendations above.\n"
        )
      );
    }
  }
}
