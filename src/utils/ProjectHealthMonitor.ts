import * as fs from "fs-extra";
import * as path from "path";
import chalk from "chalk";
import { ProjectStructureValidator, ProjectStructureReport } from "./ProjectStructureValidator";

export interface HealthMetrics {
  timestamp: string;
  projectPath: string;
  structureHealth: number; // 0-100
  dependencyHealth: number; // 0-100
  configurationHealth: number; // 0-100
  overallHealth: number; // 0-100
  issues: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  trends: {
    structureHealth: number[]; // Last 10 measurements
    dependencyHealth: number[];
    configurationHealth: number[];
    overallHealth: number[];
  };
}

export interface HealthAlert {
  id: string;
  type: "critical" | "warning" | "info";
  message: string;
  timestamp: string;
  resolved: boolean;
  autoResolved: boolean;
}

export class ProjectHealthMonitor {
  private projectRoot: string;
  private validator: ProjectStructureValidator;
  private healthHistory: HealthMetrics[] = [];
  private alerts: HealthAlert[] = [];
  private monitoringEnabled: boolean = true;
  private alertThresholds = {
    critical: 0.3, // Below 30% health
    warning: 0.6, // Below 60% health
    info: 0.8     // Below 80% health
  };

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.validator = new ProjectStructureValidator(projectRoot);
    this.loadHealthHistory();
    this.loadAlerts();
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthMetrics> {
    console.log(chalk.blue("🏥 Performing comprehensive health check..."));
    
    const report = await this.validator.validate();
    const metrics = await this.calculateHealthMetrics(report);
    
    // Store metrics
    this.healthHistory.push(metrics);
    this.trimHealthHistory();
    
    // Check for alerts
    await this.checkForAlerts(metrics);
    
    // Save data
    await this.saveHealthHistory();
    await this.saveAlerts();
    
    return metrics;
  }

  /**
   * Calculate health metrics from validation report
   */
  private async calculateHealthMetrics(report: ProjectStructureReport): Promise<HealthMetrics> {
    const timestamp = new Date().toISOString();
    
    // Calculate structure health (based on critical and high issues)
    const structureIssues = report.issues.filter(issue => 
      issue.severity === "critical" || issue.severity === "high"
    );
    const structureHealth = Math.max(0, 100 - (structureIssues.length * 20));
    
    // Calculate dependency health
    const dependencyIssues = report.issues.filter(issue => 
      issue.message.includes("package.json") || 
      issue.message.includes("node_modules") ||
      issue.message.includes("lock file") ||
      issue.message.includes("dependencies")
    );
    const dependencyHealth = Math.max(0, 100 - (dependencyIssues.length * 15));
    
    // Calculate configuration health
    const configIssues = report.issues.filter(issue => 
      issue.message.includes("configuration") ||
      issue.message.includes("tsconfig") ||
      issue.message.includes("build config")
    );
    const configurationHealth = Math.max(0, 100 - (configIssues.length * 10));
    
    // Calculate overall health
    const overallHealth = Math.round((structureHealth + dependencyHealth + configurationHealth) / 3);
    
    // Count issues by severity
    const issues = {
      critical: report.issues.filter(issue => issue.severity === "critical").length,
      high: report.issues.filter(issue => issue.severity === "high").length,
      medium: report.issues.filter(issue => issue.severity === "medium").length,
      low: report.issues.filter(issue => issue.severity === "low").length
    };
    
    // Get trends from last 10 measurements
    const trends = this.calculateTrends();
    
    return {
      timestamp,
      projectPath: this.projectRoot,
      structureHealth,
      dependencyHealth,
      configurationHealth,
      overallHealth,
      issues,
      trends
    };
  }

  /**
   * Calculate health trends
   */
  private calculateTrends(): HealthMetrics["trends"] {
    const recent = this.healthHistory.slice(-10);
    
    return {
      structureHealth: recent.map(m => m.structureHealth),
      dependencyHealth: recent.map(m => m.dependencyHealth),
      configurationHealth: recent.map(m => m.configurationHealth),
      overallHealth: recent.map(m => m.overallHealth)
    };
  }

  /**
   * Check for health alerts
   */
  private async checkForAlerts(metrics: HealthMetrics): Promise<void> {
    const alerts: HealthAlert[] = [];
    
    // Check overall health
    if (metrics.overallHealth < this.alertThresholds.critical * 100) {
      alerts.push({
        id: `critical-health-${Date.now()}`,
        type: "critical",
        message: `Critical health alert: Overall health is ${metrics.overallHealth}%`,
        timestamp: metrics.timestamp,
        resolved: false,
        autoResolved: false
      });
    } else if (metrics.overallHealth < this.alertThresholds.warning * 100) {
      alerts.push({
        id: `warning-health-${Date.now()}`,
        type: "warning",
        message: `Warning: Overall health is ${metrics.overallHealth}%`,
        timestamp: metrics.timestamp,
        resolved: false,
        autoResolved: false
      });
    }
    
    // Check structure health
    if (metrics.structureHealth < this.alertThresholds.critical * 100) {
      alerts.push({
        id: `critical-structure-${Date.now()}`,
        type: "critical",
        message: `Critical structure alert: Structure health is ${metrics.structureHealth}%`,
        timestamp: metrics.timestamp,
        resolved: false,
        autoResolved: false
      });
    }
    
    // Check dependency health
    if (metrics.dependencyHealth < this.alertThresholds.warning * 100) {
      alerts.push({
        id: `warning-dependency-${Date.now()}`,
        type: "warning",
        message: `Dependency warning: Dependency health is ${metrics.dependencyHealth}%`,
        timestamp: metrics.timestamp,
        resolved: false,
        autoResolved: false
      });
    }
    
    // Check for new critical issues
    if (metrics.issues.critical > 0) {
      alerts.push({
        id: `critical-issues-${Date.now()}`,
        type: "critical",
        message: `${metrics.issues.critical} critical issues detected`,
        timestamp: metrics.timestamp,
        resolved: false,
        autoResolved: false
      });
    }
    
    // Add new alerts
    this.alerts.push(...alerts);
    
    // Auto-resolve old alerts if health improved
    await this.autoResolveAlerts(metrics);
  }

  /**
   * Auto-resolve alerts when health improves
   */
  private async autoResolveAlerts(metrics: HealthMetrics): Promise<void> {
    const unresolvedAlerts = this.alerts.filter(alert => !alert.resolved);
    
    for (const alert of unresolvedAlerts) {
      let shouldResolve = false;
      
      switch (alert.type) {
        case "critical":
          if (metrics.overallHealth >= this.alertThresholds.warning * 100) {
            shouldResolve = true;
          }
          break;
        case "warning":
          if (metrics.overallHealth >= this.alertThresholds.info * 100) {
            shouldResolve = true;
          }
          break;
      }
      
      if (shouldResolve) {
        alert.resolved = true;
        alert.autoResolved = true;
        console.log(chalk.green(`✅ Auto-resolved alert: ${alert.message}`));
      }
    }
  }

  /**
   * Get health dashboard data
   */
  async getHealthDashboard(): Promise<{
    current: HealthMetrics;
    trends: HealthMetrics["trends"];
    alerts: HealthAlert[];
    recommendations: string[];
  }> {
    const current = await this.performHealthCheck();
    const trends = this.calculateTrends();
    const activeAlerts = this.alerts.filter(alert => !alert.resolved);
    const recommendations = this.generateRecommendations(current);
    
    return {
      current,
      trends,
      alerts: activeAlerts,
      recommendations
    };
  }

  /**
   * Generate health recommendations
   */
  private generateRecommendations(metrics: HealthMetrics): string[] {
    const recommendations: string[] = [];
    
    if (metrics.structureHealth < 80) {
      recommendations.push("Run 'mycontext health-check --fix' to resolve structure issues");
    }
    
    if (metrics.dependencyHealth < 80) {
      recommendations.push("Check for dependency conflicts and run 'pnpm install'");
    }
    
    if (metrics.configurationHealth < 80) {
      recommendations.push("Review and update project configuration files");
    }
    
    if (metrics.issues.critical > 0) {
      recommendations.push("Address critical issues immediately");
    }
    
    if (metrics.issues.high > 0) {
      recommendations.push("Plan to address high-priority issues soon");
    }
    
    if (metrics.overallHealth < 60) {
      recommendations.push("Consider running 'mycontext health-check --fix' to auto-resolve issues");
    }
    
    return recommendations;
  }

  /**
   * Display health dashboard
   */
  async displayHealthDashboard(): Promise<void> {
    const dashboard = await this.getHealthDashboard();
    
    console.log(chalk.blue.bold("🏥 MyContext Project Health Dashboard"));
    console.log(chalk.blue("=====================================\n"));
    
    // Current health status
    console.log(chalk.blue("📊 Current Health Status:"));
    console.log(`   Overall Health: ${this.getHealthColor(dashboard.current.overallHealth)}${dashboard.current.overallHealth}%`);
    console.log(`   Structure Health: ${this.getHealthColor(dashboard.current.structureHealth)}${dashboard.current.structureHealth}%`);
    console.log(`   Dependency Health: ${this.getHealthColor(dashboard.current.dependencyHealth)}${dashboard.current.dependencyHealth}%`);
    console.log(`   Configuration Health: ${this.getHealthColor(dashboard.current.configurationHealth)}${dashboard.current.configurationHealth}%\n`);
    
    // Issues breakdown
    console.log(chalk.blue("🚨 Issues Breakdown:"));
    console.log(`   Critical: ${chalk.red(dashboard.current.issues.critical)}`);
    console.log(`   High: ${chalk.yellow(dashboard.current.issues.high)}`);
    console.log(`   Medium: ${chalk.blue(dashboard.current.issues.medium)}`);
    console.log(`   Low: ${chalk.gray(dashboard.current.issues.low)}\n`);
    
    // Active alerts
    if (dashboard.alerts.length > 0) {
      console.log(chalk.red("🚨 Active Alerts:"));
      dashboard.alerts.forEach(alert => {
        const color = alert.type === "critical" ? chalk.red : 
                     alert.type === "warning" ? chalk.yellow : chalk.blue;
        console.log(`   ${color(alert.type.toUpperCase())}: ${alert.message}`);
      });
      console.log();
    }
    
    // Trends
    if (dashboard.trends.overallHealth.length > 1) {
      console.log(chalk.blue("📈 Health Trends (Last 10 Checks):"));
      const trend = this.calculateTrendDirection(dashboard.trends.overallHealth);
      const trendColor = trend > 0 ? chalk.green : trend < 0 ? chalk.red : chalk.gray;
      const trendSymbol = trend > 0 ? "📈" : trend < 0 ? "📉" : "➡️";
      console.log(`   Overall Health: ${trendColor(trendSymbol)} ${trend > 0 ? "+" : ""}${trend.toFixed(1)}%`);
      console.log();
    }
    
    // Recommendations
    if (dashboard.recommendations.length > 0) {
      console.log(chalk.blue("💡 Recommendations:"));
      dashboard.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
      console.log();
    }
    
    // Health grade
    const grade = this.calculateHealthGrade(dashboard.current.overallHealth);
    console.log(chalk.blue(`🏆 Health Grade: ${this.getGradeColor(grade)}${grade}`));
  }

  /**
   * Get health color based on percentage
   */
  private getHealthColor(percentage: number): string {
    if (percentage >= 80) return chalk.green(`${percentage}%`);
    if (percentage >= 60) return chalk.yellow(`${percentage}%`);
    if (percentage >= 40) return chalk.red(`${percentage}%`);
    return chalk.red.bold(`${percentage}%`);
  }

  /**
   * Get grade color
   */
  private getGradeColor(grade: string): string {
    switch (grade) {
      case "A": return chalk.green("A");
      case "B": return chalk.yellow("B");
      case "C": return chalk.yellow("C");
      case "D": return chalk.red("D");
      case "F": return chalk.red.bold("F");
      default: return chalk.gray("?");
    }
  }

  /**
   * Calculate health grade
   */
  private calculateHealthGrade(percentage: number): string {
    if (percentage >= 90) return "A";
    if (percentage >= 80) return "B";
    if (percentage >= 70) return "C";
    if (percentage >= 60) return "D";
    return "F";
  }

  /**
   * Calculate trend direction
   */
  private calculateTrendDirection(values: number[]): number {
    if (values.length < 2) return 0;
    
    const first = values[0];
    const last = values[values.length - 1];
    return last - first;
  }

  /**
   * Enable/disable monitoring
   */
  setMonitoringEnabled(enabled: boolean): void {
    this.monitoringEnabled = enabled;
  }

  /**
   * Set alert thresholds
   */
  setAlertThresholds(thresholds: Partial<typeof this.alertThresholds>): void {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
  }

  /**
   * Get health history
   */
  getHealthHistory(): HealthMetrics[] {
    return [...this.healthHistory];
  }

  /**
   * Get alerts
   */
  getAlerts(): HealthAlert[] {
    return [...this.alerts];
  }

  /**
   * Clear resolved alerts
   */
  clearResolvedAlerts(): void {
    this.alerts = this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Load health history from file
   */
  private async loadHealthHistory(): Promise<void> {
    try {
      const historyPath = path.join(this.projectRoot, ".mycontext", "health-history.json");
      if (await fs.pathExists(historyPath)) {
        const data = await fs.readJson(historyPath);
        this.healthHistory = data.history || [];
      }
    } catch (error) {
      console.log(chalk.yellow("⚠️  Could not load health history"));
    }
  }

  /**
   * Save health history to file
   */
  private async saveHealthHistory(): Promise<void> {
    try {
      const historyPath = path.join(this.projectRoot, ".mycontext", "health-history.json");
      await fs.ensureDir(path.dirname(historyPath));
      await fs.writeJson(historyPath, { history: this.healthHistory }, { spaces: 2 });
    } catch (error) {
      console.log(chalk.yellow("⚠️  Could not save health history"));
    }
  }

  /**
   * Load alerts from file
   */
  private async loadAlerts(): Promise<void> {
    try {
      const alertsPath = path.join(this.projectRoot, ".mycontext", "health-alerts.json");
      if (await fs.pathExists(alertsPath)) {
        const data = await fs.readJson(alertsPath);
        this.alerts = data.alerts || [];
      }
    } catch (error) {
      console.log(chalk.yellow("⚠️  Could not load health alerts"));
    }
  }

  /**
   * Save alerts to file
   */
  private async saveAlerts(): Promise<void> {
    try {
      const alertsPath = path.join(this.projectRoot, ".mycontext", "health-alerts.json");
      await fs.ensureDir(path.dirname(alertsPath));
      await fs.writeJson(alertsPath, { alerts: this.alerts }, { spaces: 2 });
    } catch (error) {
      console.log(chalk.yellow("⚠️  Could not save health alerts"));
    }
  }

  /**
   * Trim health history to keep only last 100 entries
   */
  private trimHealthHistory(): void {
    if (this.healthHistory.length > 100) {
      this.healthHistory = this.healthHistory.slice(-100);
    }
  }
}
