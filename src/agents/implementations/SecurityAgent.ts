import { SubAgent } from "../interfaces/SubAgent";
import { getSubAgentPersonality } from "@/constants/subAgentPersonalities";

export class SecurityAgent implements SubAgent {
  name = "SecurityAgent";
  description =
    "Security analysis, vulnerability scanning, and secure coding practices";
  personality: string;
  llmProvider: string;
  expertise: string[];

  constructor() {
    const personality = getSubAgentPersonality("SecuritySubAgent");
    if (!personality) {
      // Fallback if no personality defined
      this.personality = "vigilant";
      this.llmProvider = "github";
      this.expertise = ["security", "compliance", "vulnerability-assessment"];
    } else {
      this.personality = personality.systemPrompt;
      this.llmProvider = personality.llmProvider;
      this.expertise = personality.expertise;
    }
  }

  async run(input: any): Promise<any> {
    return this.execute(input);
  }

  validate?(input: any): boolean | Promise<boolean> {
    return !!(input && input.code);
  }

  async cleanup?(): Promise<void> {
    // No cleanup needed for this agent
  }

  async getStatus?(): Promise<any> {
    return {
      name: this.name,
      status: "idle",
      errorCount: 0,
      successCount: 0,
    };
  }

  async execute(input: any): Promise<any> {
    const { code, component, context } = input;

    try {
      // Perform security analysis
      const vulnerabilities = await this.scanVulnerabilities(code, component);
      const securityChecks = await this.performSecurityChecks(code, component);
      const recommendations = await this.generateSecurityRecommendations(
        vulnerabilities,
        component
      );

      return {
        vulnerabilities,
        securityChecks,
        recommendations,
        score: this.calculateSecurityScore(vulnerabilities, securityChecks),
        complianceStatus: this.checkCompliance(component, securityChecks),
      };
    } catch (error: any) {
      throw new Error(`Security analysis failed: ${error.message}`);
    }
  }

  private async scanVulnerabilities(
    code: string,
    component: any
  ): Promise<any[]> {
    const vulnerabilities = [];

    // XSS Detection
    const xssVulns = this.detectXSS(code);
    vulnerabilities.push(...xssVulns);

    // CSRF Detection
    const csrfVulns = this.detectCSRF(code, component);
    vulnerabilities.push(...csrfVulns);

    // Injection Vulnerabilities
    const injectionVulns = this.detectInjection(code);
    vulnerabilities.push(...injectionVulns);

    // Authentication Issues
    const authVulns = this.detectAuthenticationIssues(code, component);
    vulnerabilities.push(...authVulns);

    // Data Exposure
    const dataVulns = this.detectDataExposure(code);
    vulnerabilities.push(...dataVulns);

    return vulnerabilities;
  }

  private detectXSS(code: string): any[] {
    const vulnerabilities = [];

    // Dangerous innerHTML usage
    if (
      code.includes("dangerouslySetInnerHTML") &&
      !code.includes("DOMPurify")
    ) {
      vulnerabilities.push({
        type: "XSS",
        severity: "high",
        description:
          "Potential XSS vulnerability: dangerouslySetInnerHTML without sanitization",
        location: "dangerouslySetInnerHTML usage",
        fix: "Use DOMPurify or avoid dangerouslySetInnerHTML",
      });
    }

    // Direct HTML injection
    const htmlInjectionPattern = /innerHTML\s*=\s*[^;]+(?:props|state|input)/;
    if (htmlInjectionPattern.test(code)) {
      vulnerabilities.push({
        type: "XSS",
        severity: "high",
        description: "Direct HTML injection detected",
        location: "innerHTML assignment",
        fix: "Sanitize input or use textContent instead",
      });
    }

    // Unsafe eval usage
    if (code.includes("eval(") || code.includes("Function(")) {
      vulnerabilities.push({
        type: "XSS",
        severity: "critical",
        description: "Unsafe eval() or Function() usage detected",
        location: "eval/Function call",
        fix: "Replace with safer alternatives",
      });
    }

    return vulnerabilities;
  }

  private detectCSRF(code: string, component: any): any[] {
    const vulnerabilities = [];

    // Check for forms without CSRF protection
    if (code.includes("<form") || code.includes("form onSubmit")) {
      if (
        !code.includes("csrf") &&
        !code.includes("token") &&
        !code.includes("_token")
      ) {
        vulnerabilities.push({
          type: "CSRF",
          severity: "medium",
          description: "Form submission without CSRF protection",
          location: "form element",
          fix: "Add CSRF token to form submissions",
        });
      }
    }

    // Check for state-changing operations
    const stateChangingMethods = ["POST", "PUT", "DELETE", "PATCH"];
    for (const method of stateChangingMethods) {
      if (
        code.includes(`method: '${method}'`) ||
        code.includes(`method: "${method}"`)
      ) {
        if (!code.includes("csrf") && !code.includes("token")) {
          vulnerabilities.push({
            type: "CSRF",
            severity: "medium",
            description: `${method} request without CSRF protection`,
            location: `${method} request`,
            fix: "Include CSRF token in request headers",
          });
        }
      }
    }

    return vulnerabilities;
  }

  private detectInjection(code: string): any[] {
    const vulnerabilities = [];

    // SQL Injection (for server-side code)
    const sqlInjectionPattern =
      /(?:SELECT|INSERT|UPDATE|DELETE).*(?:\$\{|`\$\{|\+.*\$)/i;
    if (sqlInjectionPattern.test(code)) {
      vulnerabilities.push({
        type: "SQL_INJECTION",
        severity: "critical",
        description: "Potential SQL injection vulnerability",
        location: "SQL query construction",
        fix: "Use parameterized queries or ORM",
      });
    }

    // Command Injection
    const commandInjectionPattern =
      /(?:exec|spawn|system).*(?:\$\{|`\$\{|\+.*\$)/;
    if (commandInjectionPattern.test(code)) {
      vulnerabilities.push({
        type: "COMMAND_INJECTION",
        severity: "critical",
        description: "Potential command injection vulnerability",
        location: "system command execution",
        fix: "Validate and sanitize all inputs to system commands",
      });
    }

    // Path Traversal
    if (
      code.includes("..") &&
      (code.includes("readFile") || code.includes("writeFile"))
    ) {
      vulnerabilities.push({
        type: "PATH_TRAVERSAL",
        severity: "high",
        description: "Potential path traversal vulnerability",
        location: "file system access",
        fix: "Validate file paths and use path.resolve()",
      });
    }

    return vulnerabilities;
  }

  private detectAuthenticationIssues(code: string, component: any): any[] {
    const vulnerabilities = [];

    // Hardcoded credentials
    const credentialPatterns = [
      /password\s*[:=]\s*['"][^'"]+['"]/i,
      /secret\s*[:=]\s*['"][^'"]+['"]/i,
      /api_?key\s*[:=]\s*['"][^'"]+['"]/i,
      /token\s*[:=]\s*['"][^'"]+['"]/i,
    ];

    for (const pattern of credentialPatterns) {
      if (pattern.test(code)) {
        vulnerabilities.push({
          type: "HARDCODED_CREDENTIALS",
          severity: "critical",
          description: "Hardcoded credentials detected",
          location: "credential assignment",
          fix: "Move credentials to environment variables",
        });
      }
    }

    // Weak password requirements
    if (
      code.includes("password") &&
      !code.includes("strength") &&
      !code.includes("validation")
    ) {
      vulnerabilities.push({
        type: "WEAK_PASSWORD_POLICY",
        severity: "medium",
        description: "Password input without strength validation",
        location: "password field",
        fix: "Implement password strength requirements",
      });
    }

    // Session management issues
    if (
      code.includes("localStorage") &&
      (code.includes("token") || code.includes("session"))
    ) {
      vulnerabilities.push({
        type: "INSECURE_STORAGE",
        severity: "medium",
        description: "Sensitive data stored in localStorage",
        location: "localStorage usage",
        fix: "Use secure, httpOnly cookies or sessionStorage for sensitive data",
      });
    }

    return vulnerabilities;
  }

  private detectDataExposure(code: string): any[] {
    const vulnerabilities = [];

    // Console.log with sensitive data
    if (
      code.includes("console.log") &&
      (code.includes("password") ||
        code.includes("token") ||
        code.includes("secret"))
    ) {
      vulnerabilities.push({
        type: "DATA_EXPOSURE",
        severity: "medium",
        description: "Sensitive data logged to console",
        location: "console.log statement",
        fix: "Remove or mask sensitive data in logs",
      });
    }

    // Error messages exposing internal info
    if (
      code.includes("throw new Error") &&
      (code.includes("database") || code.includes("internal"))
    ) {
      vulnerabilities.push({
        type: "INFORMATION_DISCLOSURE",
        severity: "low",
        description: "Error messages may expose internal information",
        location: "error handling",
        fix: "Use generic error messages for users",
      });
    }

    // Unmasked sensitive inputs
    if (
      code.includes('type="text"') &&
      (code.includes("password") ||
        code.includes("ssn") ||
        code.includes("credit"))
    ) {
      vulnerabilities.push({
        type: "DATA_EXPOSURE",
        severity: "medium",
        description: "Sensitive input field not properly masked",
        location: "input field",
        fix: "Use appropriate input types (password, etc.)",
      });
    }

    return vulnerabilities;
  }

  private async performSecurityChecks(
    code: string,
    component: any
  ): Promise<any> {
    return {
      inputValidation: this.checkInputValidation(code),
      outputEncoding: this.checkOutputEncoding(code),
      accessControl: this.checkAccessControl(code, component),
      dataProtection: this.checkDataProtection(code),
      communicationSecurity: this.checkCommunicationSecurity(code),
      errorHandling: this.checkErrorHandling(code),
    };
  }

  private checkInputValidation(code: string): any {
    const checks = {
      hasValidation: false,
      validationLibrary: null as string | null,
      sanitization: false,
      typeChecking: false,
    };

    // Check for validation libraries
    if (code.includes("zod") || code.includes("yup") || code.includes("joi")) {
      checks.hasValidation = true;
      if (code.includes("zod")) checks.validationLibrary = "zod";
      else if (code.includes("yup")) checks.validationLibrary = "yup";
      else if (code.includes("joi")) checks.validationLibrary = "joi";
    }

    // Check for sanitization
    if (code.includes("DOMPurify") || code.includes("sanitize")) {
      checks.sanitization = true;
    }

    // Check for TypeScript
    if (code.includes("interface ") || code.includes("type ")) {
      checks.typeChecking = true;
    }

    return checks;
  }

  private checkOutputEncoding(code: string): any {
    return {
      hasEncoding:
        code.includes("encodeURIComponent") || code.includes("escape"),
      htmlEscaping: code.includes("escape") || code.includes("htmlEntities"),
      jsonSerialization: code.includes("JSON.stringify"),
      contentTypeHeaders: code.includes("Content-Type"),
    };
  }

  private checkAccessControl(code: string, component: any): any {
    return {
      hasAuthentication: code.includes("auth") || code.includes("login"),
      hasAuthorization: code.includes("permission") || code.includes("role"),
      routeProtection: code.includes("protected") || code.includes("guard"),
      roleBasedAccess: code.includes("role") && code.includes("check"),
    };
  }

  private checkDataProtection(code: string): any {
    return {
      encryption: code.includes("encrypt") || code.includes("crypto"),
      hashing: code.includes("hash") || code.includes("bcrypt"),
      secureTransmission: code.includes("https") || code.includes("ssl"),
      dataMinimization: !code.includes(".*"), // Simplified check
    };
  }

  private checkCommunicationSecurity(code: string): any {
    return {
      httpsOnly: !code.includes("http://"),
      secureHeaders:
        code.includes("helmet") || code.includes("security-headers"),
      corsConfiguration: code.includes("cors"),
      certificateValidation: code.includes("cert") || code.includes("ssl"),
    };
  }

  private checkErrorHandling(code: string): any {
    return {
      hasErrorBoundaries:
        code.includes("ErrorBoundary") || code.includes("componentDidCatch"),
      sanitizedErrors:
        !code.includes("console.error") || code.includes("sanitize"),
      logSecurity: code.includes("winston") || code.includes("pino"),
      gracefulDegradation: code.includes("fallback") || code.includes("catch"),
    };
  }

  private async generateSecurityRecommendations(
    vulnerabilities: any[],
    component: any
  ): Promise<string[]> {
    const recommendations = [];

    // High-severity recommendations
    const criticalVulns = vulnerabilities.filter(
      (v) => v.severity === "critical"
    );
    if (criticalVulns.length > 0) {
      recommendations.push(
        "🚨 CRITICAL: Address critical security vulnerabilities immediately"
      );
      criticalVulns.forEach((vuln) => {
        recommendations.push(`  - ${vuln.description}: ${vuln.fix}`);
      });
    }

    // Authentication recommendations
    if (component.name.includes("Login") || component.name.includes("Auth")) {
      recommendations.push("Implement multi-factor authentication");
      recommendations.push("Use secure session management");
      recommendations.push("Implement account lockout mechanisms");
    }

    // Form security recommendations
    if (component.type === "form" || component.name.includes("Form")) {
      recommendations.push("Add CSRF protection to all forms");
      recommendations.push("Implement input validation and sanitization");
      recommendations.push("Use HTTPS for all form submissions");
    }

    // API security recommendations
    if (
      component.context?.includes("api") ||
      component.dependencies?.includes("fetch")
    ) {
      recommendations.push("Implement API rate limiting");
      recommendations.push("Use proper authentication headers");
      recommendations.push("Validate all API responses");
    }

    // General security recommendations
    recommendations.push("Regular security audits and dependency updates");
    recommendations.push("Implement Content Security Policy (CSP)");
    recommendations.push("Use security headers (HSTS, X-Frame-Options, etc.)");

    return recommendations;
  }

  private calculateSecurityScore(
    vulnerabilities: any[],
    securityChecks: any
  ): number {
    let score = 100;

    // Deduct points for vulnerabilities
    vulnerabilities.forEach((vuln) => {
      switch (vuln.severity) {
        case "critical":
          score -= 25;
          break;
        case "high":
          score -= 15;
          break;
        case "medium":
          score -= 10;
          break;
        case "low":
          score -= 5;
          break;
      }
    });

    // Add points for security measures
    if (securityChecks.inputValidation.hasValidation) score += 5;
    if (securityChecks.outputEncoding.hasEncoding) score += 3;
    if (securityChecks.accessControl.hasAuthentication) score += 5;
    if (securityChecks.dataProtection.encryption) score += 5;
    if (securityChecks.communicationSecurity.httpsOnly) score += 3;
    if (securityChecks.errorHandling.hasErrorBoundaries) score += 2;

    return Math.max(0, Math.min(100, score));
  }

  private checkCompliance(component: any, securityChecks: any): any {
    return {
      owasp: this.checkOWASPCompliance(securityChecks),
      gdpr: this.checkGDPRCompliance(component, securityChecks),
      pci: this.checkPCICompliance(component, securityChecks),
      hipaa: this.checkHIPAACompliance(component, securityChecks),
    };
  }

  private checkOWASPCompliance(securityChecks: any): any {
    const checks = [];
    if (securityChecks.inputValidation.hasValidation)
      checks.push("Input Validation");
    if (securityChecks.outputEncoding.hasEncoding)
      checks.push("Output Encoding");
    if (securityChecks.accessControl.hasAuthentication)
      checks.push("Authentication");
    if (securityChecks.dataProtection.encryption)
      checks.push("Data Protection");
    if (securityChecks.communicationSecurity.httpsOnly)
      checks.push("Secure Communication");

    return {
      compliant: checks.length >= 4,
      checks,
      missing: 5 - checks.length,
    };
  }

  private checkGDPRCompliance(component: any, securityChecks: any): any {
    const hasDataProcessing =
      component.context?.includes("user") ||
      component.context?.includes("personal");

    return {
      applicable: hasDataProcessing,
      dataMinimization: securityChecks.dataProtection.dataMinimization,
      encryptionAtRest: securityChecks.dataProtection.encryption,
      encryptionInTransit: securityChecks.communicationSecurity.httpsOnly,
      needsConsentMechanism: hasDataProcessing,
    };
  }

  private checkPCICompliance(component: any, securityChecks: any): any {
    const hasPaymentData =
      component.context?.includes("payment") ||
      component.context?.includes("card");

    return {
      applicable: hasPaymentData,
      dataEncryption: securityChecks.dataProtection.encryption,
      secureTransmission: securityChecks.communicationSecurity.httpsOnly,
      accessControl: securityChecks.accessControl.hasAuthorization,
      needsTokenization: hasPaymentData,
    };
  }

  private checkHIPAACompliance(component: any, securityChecks: any): any {
    const hasHealthData =
      component.context?.includes("health") ||
      component.context?.includes("medical");

    return {
      applicable: hasHealthData,
      dataEncryption: securityChecks.dataProtection.encryption,
      accessControl: securityChecks.accessControl.roleBasedAccess,
      auditLogging: securityChecks.errorHandling.logSecurity,
      needsBAA: hasHealthData,
    };
  }
}
