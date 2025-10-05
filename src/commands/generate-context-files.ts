import { Command } from "commander";
import chalk from "chalk";
import * as fs from "fs-extra";
import path from "path";
import { HybridAIClient } from "../utils/hybridAIClient";
import { EnhancedSpinner } from "../utils/spinner";
import { logger } from "../utils/logger";
import { progress } from "../utils/progress";

interface ContextFilesOptions {
  description?: string;
  projectPath?: string;
  verbose?: boolean;
  force?: boolean;
}

export class GenerateContextFilesCommand {
  private aiClient: HybridAIClient;
  private spinner: EnhancedSpinner;

  constructor() {
    this.aiClient = new HybridAIClient();
    this.spinner = new EnhancedSpinner("Generating context files...");
  }

  async execute(options: ContextFilesOptions): Promise<void> {
    const projectPath = options.projectPath || process.cwd();
    const contextDir = path.join(projectPath, ".mycontext");

    logger.info("Generating Context Files (A/B/C/D)");
    logger.verbose(
      "Creating comprehensive project context from PRD or description"
    );

    // Ensure .mycontext directory exists
    await fs.ensureDir(contextDir);

    // Check if context files already exist
    const existingFiles = await this.checkExistingFiles(contextDir);
    if (existingFiles.length > 0 && !options.force) {
      logger.warn("Context files already exist:");
      existingFiles.forEach((file) => logger.verbose(`  • ${file}`));
      logger.info("Use --force to overwrite existing files");
      return;
    }

    // Get context from PRD if it exists, otherwise use description
    const contextContent = await this.getContextForGeneration(
      contextDir,
      options.description
    );

    this.spinner.start();

    try {
      // Generate each context file using the PRD content as context
      await this.generateFeaturesFile(contextDir, contextContent);
      await this.generateUserFlowsFile(contextDir, contextContent);
      await this.generateEdgeCasesFile(contextDir, contextContent);
      await this.generateTechnicalSpecsFile(contextDir, contextContent);

      logger.success(
        "User-Centric Context Documentation Generated Successfully!"
      );
      logger.verbose("Generated user interaction documentation files:");
      logger.verbose(
        "  • 01a-features.md - Every user action and system response"
      );
      logger.verbose(
        "  • 01b-user-flows.md - Complete user journey interactions"
      );
      logger.verbose(
        "  • 01c-edge-cases.md - User error scenarios and recovery paths"
      );
      logger.verbose(
        "  • 01d-technical-specs.md - Technical details supporting user experience"
      );

      logger.step("🚨 CRITICAL NEXT STEP - Human-in-the-Loop Validation:");
      logger.info(
        "1. 📖 Read each context file carefully - AI might miss requirements"
      );
      logger.info(
        "2. ✏️ Edit files to correct mistakes and add missing business logic"
      );
      logger.info(
        "3. 🎯 Add specific requirements AI doesn't know about your domain"
      );
      logger.info(
        "4. 🔍 Clarify ambiguous areas and remove irrelevant content"
      );
      logger.step(
        "💡 This is why MyContext works - you ensure accuracy at the source!"
      );
      logger.info(
        "5. Run 'mycontext compile-prd' when satisfied with context files"
      );
      logger.verbose(
        "6. Run 'mycontext generate types' to generate TypeScript types"
      );
      logger.verbose(
        "7. Run 'mycontext generate brand-kit' to create brand guidelines"
      );
      logger.verbose(
        "8. Run 'mycontext generate components-list' to plan components"
      );
      logger.verbose(
        "9. Run 'mycontext generate-components all --with-tests' to generate components from your corrected context"
      );

      this.spinner.succeed(
        "User-centric context documentation generated successfully!"
      );
    } catch (error) {
      this.spinner.fail("Context file generation failed");

      // Handle template PRD error more gracefully
      if (error instanceof Error && error.message.includes("template")) {
        // Error message already displayed above, just exit cleanly
        return;
      }

      logger.error(
        `Context file generation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  private async checkExistingFiles(contextDir: string): Promise<string[]> {
    const files = [
      "01a-features.md",
      "01b-user-flows.md",
      "01c-edge-cases.md",
      "01d-technical-specs.md",
    ];

    const existingFiles: string[] = [];
    for (const file of files) {
      if (await fs.pathExists(path.join(contextDir, file))) {
        existingFiles.push(file);
      }
    }

    return existingFiles;
  }

  private async generateFeaturesFile(
    contextDir: string,
    contextContent?: string
  ): Promise<void> {
    this.spinner.updateText("🤖 Generating features...");

    try {
      const prompt = this.buildFeaturesPrompt(contextContent);
      const response = await this.aiClient.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 2000,
        spinnerCallback: (text: string, resetTimer: boolean = false) => {
          this.spinner.updateText(text);
          if (resetTimer) {
            this.spinner.reset();
          }
        },
      });

      const content = this.formatFeaturesContent(response.text);
      await fs.writeFile(path.join(contextDir, "01a-features.md"), content);

      console.log(chalk.green("  ✅ User interactions documented"));
    } catch (error) {
      console.log(chalk.red("  ❌ User interactions documentation failed"));
      throw error;
    }
  }

  private async generateUserFlowsFile(
    contextDir: string,
    contextContent?: string
  ): Promise<void> {
    this.spinner.updateText("🤖 Generating user flows...");

    try {
      const prompt = this.buildUserFlowsPrompt(contextContent);
      const response = await this.aiClient.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 2000,
        spinnerCallback: (text: string, resetTimer: boolean = false) => {
          this.spinner.updateText(text);
          if (resetTimer) {
            this.spinner.reset();
          }
        },
      });

      const content = this.formatUserFlowsContent(response.text);
      await fs.writeFile(path.join(contextDir, "01b-user-flows.md"), content);

      console.log(chalk.green("  ✅ User interaction flows documented"));
    } catch (error) {
      console.log(
        chalk.red("  ❌ User interaction flows documentation failed")
      );
      throw error;
    }
  }

  private async generateEdgeCasesFile(
    contextDir: string,
    contextContent?: string
  ): Promise<void> {
    this.spinner.updateText("🤖 Generating edge cases...");

    try {
      const prompt = this.buildEdgeCasesPrompt(contextContent);
      const response = await this.aiClient.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 2000,
        spinnerCallback: (text: string, resetTimer: boolean = false) => {
          this.spinner.updateText(text);
          if (resetTimer) {
            this.spinner.reset();
          }
        },
      });

      const content = this.formatEdgeCasesContent(response.text);
      await fs.writeFile(path.join(contextDir, "01c-edge-cases.md"), content);

      console.log(chalk.green("  ✅ User error scenarios documented"));
    } catch (error) {
      console.log(chalk.red("  ❌ User error scenarios documentation failed"));
      throw error;
    }
  }

  private async generateTechnicalSpecsFile(
    contextDir: string,
    contextContent?: string
  ): Promise<void> {
    this.spinner.updateText("🤖 Generating technical specs...");

    try {
      const prompt = this.buildTechnicalSpecsPrompt(contextContent);
      const response = await this.aiClient.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 2000,
        spinnerCallback: (text: string, resetTimer: boolean = false) => {
          this.spinner.updateText(text);
          if (resetTimer) {
            this.spinner.reset();
          }
        },
      });

      const content = this.formatTechnicalSpecsContent(response.text);
      await fs.writeFile(
        path.join(contextDir, "01d-technical-specs.md"),
        content
      );

      console.log(chalk.green("  ✅ Technical implementation documented"));
    } catch (error) {
      console.log(
        chalk.red("  ❌ Technical implementation documentation failed")
      );
      throw error;
    }
  }

  private buildFeaturesPrompt(contextContent?: string): string {
    return `You are a user experience researcher documenting every user interaction for a web application.

${
  contextContent
    ? `Project Context: ${contextContent}`
    : "Generate user interaction documentation for a modern web application."
}

Create a comprehensive user-centric features document that documents every user interaction:

## 🎯 **User-Centric Features Documentation**

### **What Users Can Do (User Actions)**
Document every action users can take in the application:

**❌ Don't write technical specs:**
- User authentication system
- Shopping cart functionality
- Payment processing

**✅ Write user interactions:**
- User can click "Sign Up" to create an account
- User can browse products by category and search
- User can add items to cart with quantity selection
- User can complete checkout with multiple payment options
- User can view order history and track deliveries

### **What Users See (System Responses)**
Document what users see after each action:

**❌ Don't write:**
- Dashboard displays user profile
- Products show in grid layout

**✅ Write:**
- After login, user sees personalized dashboard with recent orders
- Product catalog shows items with images, prices, and "Add to Cart" buttons
- Shopping cart displays items with quantity controls and remove options
- Checkout form shows shipping address, payment method, and order summary
- Order confirmation page displays order number, estimated delivery, and tracking info

### **User Journey Documentation**
Document complete user journeys from start to finish:

1. **New User Onboarding**
   - User visits homepage → sees hero section with "Get Started" button
   - User clicks "Get Started" → registration form appears
   - User fills out form → email verification sent
   - User verifies email → redirected to dashboard

2. **Product Purchase Flow**
   - User browses catalog → sees product grid with filters
   - User selects product → product detail page with reviews
   - User adds to cart → cart shows item count in header
   - User checks out → payment form with saved addresses

### **User Feedback and States**
Document what users see in different states:

**Success States:**
- Registration successful → welcome message with next steps
- Order placed → confirmation with order number and tracking
- Payment processed → receipt with download option

**Error States:**
- Login failed → error message with "Forgot password?" link
- Out of stock → "Notify when available" option
- Payment declined → retry form with error explanation

**Loading States:**
- Page loading → skeleton screens matching final layout
- Form submitting → disabled inputs with progress indicator
- Image loading → placeholder with smooth transition

### **User Interactions by Role**
Document interactions for different user types:

**Guest Users:**
- Can browse products and read reviews
- Can add items to cart (requires registration to checkout)
- Can view help documentation and contact support

**Registered Users:**
- Can save payment methods and addresses
- Can view order history and reorder items
- Can update profile and preferences
- Can leave reviews and ratings

**Admin Users:**
- Can manage products and inventory
- Can view user analytics and reports
- Can process refunds and handle support
- Can update site content and settings
6. **Security Features** - Authentication, authorization, and data protection
7. **Performance Features** - Optimization and scalability features
8. **Accessibility Features** - WCAG compliance and inclusive design

For each feature, include:
- Feature name and description
- User value proposition
- Acceptance criteria
- Priority level (High/Medium/Low)
- Dependencies on other features

Format the output as a well-structured markdown document with clear sections and bullet points.`;
  }

  private buildUserFlowsPrompt(contextContent?: string): string {
    return `You are a user experience researcher documenting every user interaction and system response for a web application.

${
  contextContent
    ? `Project Context: ${contextContent}`
    : "Generate user interaction flows for a modern web application."
}

Create comprehensive user-centric flow documentation that captures every user interaction:

## 🎯 **User Interaction Flow Documentation**

### **Document Every User Action → System Response**

**❌ Don't write technical flows:**
- User navigates to login page
- System validates credentials
- User is redirected

**✅ Write complete user interactions:**
- User clicks "Login" button in navigation → login form appears with email and password fields
- User enters email and clicks "Continue" → password field appears with "Show/Hide" toggle
- User enters password and clicks "Sign In" → loading spinner shows for 2 seconds
- User sees error message "Invalid credentials" with "Forgot password?" link → can click link to reset password
- User clicks "Forgot password?" → reset form appears with email field and "Send reset link" button
- User enters email and clicks "Send reset link" → success message "Check your email for reset instructions"

### **Complete User Journey Documentation**
Document every step users take and what they see:

1. **Homepage Interaction Flow**
   - User visits homepage → sees hero section with "Get Started" button
   - User clicks "Get Started" → registration form slides in from right
   - User sees form with name, email, password fields → each field has validation
   - User fills out form with valid data → "Create Account" button becomes enabled
   - User clicks "Create Account" → loading state with "Creating your account..."
   - User sees success message "Account created! Please check your email to verify"

2. **Product Browsing Flow**
   - User visits products page → sees filter sidebar and product grid
   - User clicks category filter → products update instantly with smooth animation
   - User searches for "wireless headphones" → search results appear with suggestions
   - User clicks on product image → product detail page loads with image gallery
   - User clicks "Add to Cart" → cart icon in header shows "1" and success toast appears
   - User clicks cart icon → cart dropdown opens showing added item with quantity controls

3. **Checkout Process Flow**
   - User clicks "Checkout" → shipping address form appears with saved addresses
   - User selects address or fills new one → payment method selection appears
   - User chooses payment method → payment form loads with security indicators
   - User enters payment details → order summary updates with totals and fees
   - User clicks "Complete Order" → processing animation with progress steps
   - User sees order confirmation → with order number, tracking info, and "Download receipt" button

### **User Feedback Documentation**
Document what users see in every state:

**Success Feedback:**
- Form submitted successfully → green checkmark with "Success!" message
- Item added to cart → toast notification "Added to cart" with item name
- Order completed → confetti animation with "Order confirmed!" message
- Email sent → blue info banner "Check your email for next steps"

**Error Feedback:**
- Invalid email format → red error under field "Please enter a valid email"
- Network error → retry banner "Connection lost. Please check your internet"
- Payment failed → error card "Payment declined. Please try another card"
- Session expired → redirect to login with "Please log in again" message

**Loading Feedback:**
- Page loading → skeleton screens matching the final layout
- Form submitting → disabled inputs with pulsing "Processing..." button
- Image loading → blur placeholder that sharpens when loaded
- Search loading → "Searching..." with animated dots

### **User Decision Points**
Document where users make choices and what happens:

**Navigation Choices:**
- User clicks "Products" → product catalog loads with filters visible
- User clicks "Categories" → category page with subcategories and breadcrumbs
- User clicks "Profile" → account settings with tabs for different sections
- User clicks "Help" → help center with search and popular topics

**Feature Choices:**
- User can choose "Express checkout" → skips shipping form and uses defaults
- User can select "Guest checkout" → creates account automatically after purchase
- User can choose "Save for later" → item moves to wishlist instead of cart
- User can select "Notify me" → gets alerts when out-of-stock items return

**Preference Choices:**
- User can toggle "Dark mode" → entire interface switches theme instantly
- User can select "Language" → content translates with loading indicator
- User can choose "Notifications" → settings panel with granular options
- User can set "Privacy" → different levels affect what data is collected

### **User Error Recovery**
Document how users recover from mistakes:

**Input Errors:**
- User enters invalid email → field highlights red with helpful message
- User leaves required field empty → "This field is required" appears on blur
- User enters weak password → strength meter shows with improvement tips
- User selects invalid date → calendar widget shows available dates

**System Errors:**
- Server error during save → retry button with "Try again" and exponential backoff
- Network timeout → offline banner with "Reconnecting..." and auto-retry
- File upload fails → drag-and-drop area shows "Upload failed. Try again?"
- Payment processing error → clear error message with support contact info

**User Actions:**
- User can click "Cancel" at any time → confirmation dialog "Discard changes?"
- User can use "Back" button → returns to previous state without data loss
- User can click "Help" icons → contextual help appears without leaving flow
- User can contact support → chat widget opens with conversation context

Format the output as a well-structured markdown document with clear sections and numbered steps.`;
  }

  private buildEdgeCasesPrompt(contextContent?: string): string {
    return `You are a user experience researcher documenting error scenarios and edge cases from the user's perspective.

${
  contextContent
    ? `Project Context: ${contextContent}`
    : "Generate user error scenarios for a modern web application."
}

Create comprehensive user-centric error documentation that captures what users experience when things go wrong:

## 🎯 **User-Centric Error Scenarios Documentation**

### **Document What Users See When Errors Happen**

**❌ Don't write technical edge cases:**
- Network timeout after 30 seconds
- Invalid input validation failure
- Database connection error

**✅ Write user experiences:**
- User clicks "Save" → sees "Saving..." for 5 seconds → gets "Connection lost. Please check your internet" message
- User enters email without @ → field turns red → "Please enter a valid email address" appears below field
- User tries to login with wrong password → "Invalid credentials" message appears → "Forgot password?" link becomes clickable

### **User Error Recovery Documentation**
Document how users recover from different error scenarios:

1. **Network Issues**
   - User clicks "Submit form" → sees loading spinner → connection drops
   - User sees "Connection lost" banner with "Reconnecting..." message
   - After 10 seconds, user sees "Connection restored" with auto-retry
   - User can click "Retry now" to manually retry or "Try again later" to save draft

2. **Input Validation Errors**
   - User enters phone number "123" → field highlights red → "Phone number must be at least 10 digits"
   - User leaves required field empty → clicks "Next" → form scrolls to empty field with red border
   - User enters password "123" → strength meter shows red → "Password must be at least 8 characters"
   - User enters mismatched passwords → confirmation field shows "Passwords don't match"

3. **Authentication Errors**
   - User clicks "Sign In" → loading spinner appears → "Invalid email or password" message shows
   - User sees "Forgot password?" link → clicks it → reset form loads with email field
   - User enters unregistered email for password reset → "No account found with that email" appears
   - User enters registered email → "Reset instructions sent" with "Check your email" message

4. **Payment Errors**
   - User clicks "Complete payment" → processing animation starts → "Payment declined" message appears
   - User sees "Please try another payment method" with card form → can select saved cards or add new
   - User enters expired card → "Card expired. Please use a different card" with date validation
   - User enters insufficient funds → "Insufficient funds" with suggestion to use different payment method

5. **Data Loading Errors**
   - User opens product page → sees skeleton loading → "Failed to load product information" message
   - User clicks "Load more" → loading spinner appears → "Connection timeout. Try again?" message
   - User searches for products → search bar shows "Searching..." → "No results found" with suggestions
   - User opens cart → sees "Loading cart..." → "Your cart is empty" or "Failed to load cart items"

6. **File Upload Errors**
   - User drags file to upload area → sees "Uploading..." → "File too large (max 10MB)" message
   - User selects unsupported file type → "Unsupported file type. Please use JPG, PNG, or PDF"
   - User tries to upload during network issue → "Upload failed due to connection issues" with retry
   - User uploads corrupted file → "File appears to be corrupted. Please try again"

7. **Session Management Errors**
   - User tries to access protected page → sees "Session expired. Please log in again" modal
   - User clicks "Stay logged in" → redirected to login form with "Re-login required" message
   - User logs in from new device → sees "Login from unrecognized device" with security options
   - User has multiple tabs open → one tab shows "Account accessed from another location"

8. **Browser/Device Compatibility**
   - User on old browser → sees "Your browser is not supported. Please update to latest version"
   - User on mobile device → sees "This feature works best on desktop" with mobile-optimized version
   - User with JavaScript disabled → sees "JavaScript required for this feature to work"
   - User with slow connection → sees "Loading slowly? Try our mobile app for better performance"

9. **Business Logic Errors**
   - User tries to buy out-of-stock item → sees "Out of stock" with "Notify when available" option
   - User applies expired coupon → sees "Coupon expired" with suggestion to use current offers
   - User tries to access admin area without permission → sees "Access denied" with contact info
   - User reaches usage limits → sees "You've reached your monthly limit" with upgrade options

10. **Third-Party Integration Errors**
    - User tries to login with Google → sees "Google login temporarily unavailable" with email option
    - User pays with PayPal → sees "PayPal service unavailable" with alternative payment methods
    - User shares on social media → sees "Unable to connect to [platform]" with manual share option
    - User gets email notifications → sees "Notification service issue" with settings to check preferences

### **User Feedback and Recovery Patterns**
Document consistent patterns for error handling:

**Error Message Guidelines:**
- Always explain what went wrong in user-friendly language
- Suggest next steps or alternatives when possible
- Provide contact information for complex issues
- Use consistent visual styling (red borders, warning icons)

**Recovery Action Guidelines:**
- Offer retry options with clear labels ("Try again", "Retry", "Refresh")
- Provide alternative paths when primary action fails
- Save user progress when possible (drafts, partial forms)
- Allow users to go back without losing data

**Loading State Guidelines:**
- Show progress indicators for long operations
- Disable inputs during processing to prevent double-submission
- Provide cancel options for non-critical operations
- Use skeleton screens that match final layout

**Help and Support Guidelines:**
- Contextual help available without leaving current flow
- Clear escalation paths for complex issues
- Self-service options before contacting support
- Preserve context when transferring to support

Format the output as a well-structured markdown document with clear sections and detailed scenarios.`;
  }

  private buildTechnicalSpecsPrompt(contextContent?: string): string {
    return `You are a user experience researcher documenting technical implementation details from the user's perspective.

${
  contextContent
    ? `Project Context: ${contextContent}`
    : "Generate technical implementation details for a modern web application."
}

Create user-centric technical documentation that explains how the system works behind the scenes to support user interactions:

## 🎯 **User-Centric Technical Implementation Documentation**

### **Document Technical Details That Support User Experiences**

**❌ Don't write abstract technical specs:**
- React 18 with Next.js 14
- PostgreSQL database with Prisma ORM
- JWT authentication with refresh tokens

**✅ Write user-focused technical details:**
- Pages load instantly with React Server Components → users see content immediately without loading delays
- Database queries optimized for product catalog → users can browse thousands of products with instant search
- Authentication tokens automatically refreshed → users stay logged in even after browser restart
- Images served via CDN → users see product photos instantly even on slow connections

### **User Performance Documentation**
Document how technical choices affect user experience:

1. **Loading Performance**
   - Homepage loads in <2 seconds → users see hero content immediately
   - Product images load progressively → users see low-res preview first, then full quality
   - Search results appear in <100ms → users get instant feedback as they type
   - Page transitions use client-side routing → users navigate without full page reloads

2. **Responsive Design Implementation**
   - CSS Grid and Flexbox for flexible layouts → users see properly aligned content on any screen size
   - Mobile-first responsive breakpoints → users get optimized experience on phones and tablets
   - Touch-friendly interaction targets → users can easily tap buttons and links on mobile
   - Keyboard navigation support → users can navigate entirely with keyboard if needed

3. **Accessibility Implementation**
   - ARIA labels and semantic HTML → screen readers announce content correctly to users
   - High contrast color schemes → users with visual impairments can read all text
   - Keyboard shortcuts for common actions → power users can navigate efficiently
   - Focus management for complex interactions → users never lose their place in forms

4. **Error Handling Implementation**
   - Graceful degradation for failed requests → users see helpful messages instead of blank pages
   - Retry mechanisms with exponential backoff → users get automatic recovery from temporary issues
   - Offline detection and messaging → users understand when connection issues occur
   - Fallback content for missing data → users see alternative content when primary data fails to load

5. **Security Implementation**
   - HTTPS encryption for all data → users' personal information is protected in transit
   - CSRF protection on forms → users' actions are protected from cross-site attacks
   - XSS prevention measures → users' data is safe from script injection attacks
   - Secure password hashing → users' credentials are protected even if database is compromised

6. **Data Management Implementation**
   - Real-time data synchronization → users see live updates without refreshing
   - Optimistic UI updates → users see immediate feedback while server processes requests
   - Conflict resolution for concurrent edits → users' changes are preserved when multiple people edit
   - Data validation on client and server → users get immediate feedback on invalid input

7. **Integration Implementation**
   - Payment processor integration → users can complete purchases securely
   - Email service integration → users receive order confirmations and notifications
   - Analytics tracking → user behavior is measured to improve experience
   - Social media integration → users can share products with their networks

8. **Performance Optimization**
   - Code splitting for faster loading → users only download code they need for current page
   - Image optimization and lazy loading → users see optimized images without waiting
   - Caching strategies for repeat visits → returning users get even faster experience
   - Bundle optimization → users download minimal JavaScript for fast execution

9. **Monitoring and Analytics**
   - User interaction tracking → understand how users navigate and where they get stuck
   - Performance monitoring → identify slow pages and optimize user experience
   - Error tracking → quickly identify and fix issues affecting users
   - A/B testing framework → test different approaches to improve user experience

10. **Scalability Considerations**
    - Horizontal scaling capabilities → handle traffic spikes without user impact
    - Database optimization → maintain performance as user base grows
    - CDN integration → serve content quickly to users worldwide
    - Rate limiting protection → prevent abuse while maintaining service for legitimate users

### **Technical Implementation Guidelines**
Document how technical choices support user needs:

**User Experience Priority:**
- Always prioritize user experience over technical complexity
- Choose technologies that enable smooth, fast user interactions
- Implement graceful fallbacks for when things go wrong
- Monitor real user impact of technical changes

**Performance First:**
- Optimize for perceived performance (what users actually experience)
- Use loading states and progress indicators
- Implement skeleton screens that match final layouts
- Cache intelligently to improve repeat visit performance

**Accessibility by Design:**
- Build accessibility into components from the start
- Test with screen readers and keyboard navigation
- Follow WCAG guidelines for color contrast and interaction
- Consider users with different abilities and devices

**Error Resilience:**
- Implement comprehensive error handling
- Provide clear recovery paths for users
- Use retry mechanisms with user-friendly messaging
- Log errors for developers while showing helpful messages to users

**Security User-Focused:**
- Protect user data without compromising usability
- Use security measures that are invisible to users
- Provide clear security status indicators
- Balance security with user convenience

Format the output as a well-structured markdown document with clear sections and detailed scenarios.`;
  }

  private formatFeaturesContent(response: string): string {
    return `# User-Centric Features Documentation

${response}

---
*Generated by MyContext CLI - AI-powered component generation platform*
*Last updated: ${new Date().toISOString()}*
`;
  }

  private formatUserFlowsContent(response: string): string {
    return `# User Interaction Flows Documentation

${response}

---
*Generated by MyContext CLI - AI-powered component generation platform*
*Last updated: ${new Date().toISOString()}*
`;
  }

  private formatEdgeCasesContent(response: string): string {
    return `# User Error Scenarios and Recovery Documentation

${response}

---
*Generated by MyContext CLI - AI-powered component generation platform*
*Last updated: ${new Date().toISOString()}*
`;
  }

  private formatTechnicalSpecsContent(response: string): string {
    return `# User-Centric Technical Implementation Documentation

${response}

---
*Generated by MyContext CLI - AI-powered component generation platform*
*Last updated: ${new Date().toISOString()}*
`;
  }

  /**
   * Get context content for generation - prefer PRD over description
   */
  private async getContextForGeneration(
    contextDir: string,
    fallbackDescription?: string
  ): Promise<string> {
    // First, try to read from 01-prd.md
    const prdPath = path.join(contextDir, "01-prd.md");
    if (await fs.pathExists(prdPath)) {
      try {
        const prdContent = await fs.readFile(prdPath, "utf8");

        // Check if PRD is just a template/starter sample
        if (this.isTemplatePRD(prdContent)) {
          console.log(
            chalk.yellow(
              "⚠️  PRD is a template - please update with your project details first"
            )
          );
          console.log(
            chalk.gray(`   Edit: ${prdPath.replace(process.cwd(), ".")}`)
          );
          console.log(
            chalk.gray("   Then run: mycontext generate-context-files")
          );

          throw new Error(
            "PRD template needs to be updated with actual project details"
          );
        } else {
          console.log(
            chalk.blue(
              "📖 Using existing PRD as context for context files generation"
            )
          );
          return prdContent;
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes("template")) {
          throw error; // Re-throw template error
        }
        console.log(
          chalk.yellow(
            "⚠️  Could not read PRD file, falling back to description"
          )
        );
      }
    }

    // Fallback to description if no PRD exists
    if (fallbackDescription) {
      console.log(chalk.blue("📝 Using project description as context"));
      return fallbackDescription;
    }

    // No context available - tell user to create PRD first
    console.log(chalk.red("❌ No PRD found!"));
    console.log(chalk.yellow("Please create a PRD first:"));
    console.log(
      chalk.gray("  1. Edit .mycontext/01-prd.md with your project details")
    );
    console.log(
      chalk.gray(
        "  2. Or run 'mycontext generate context --full' to create PRD + context files"
      )
    );
    console.log(
      chalk.gray(
        "  3. Or use --description flag: mycontext generate-context-files --description 'Your project'"
      )
    );

    throw new Error(
      "No PRD found. Please create a PRD file first or use --description flag."
    );
  }

  /**
   * Check if PRD content is just a template/starter sample
   */
  private isTemplatePRD(content: string): boolean {
    const templateIndicators = [
      "MyContext project",
      "Replace this with your actual project description",
      "TODO: Add your project details",
      "This is a template",
      "Sample project",
      "Example project",
      "Your project description here",
      "Project Name: [Your Project Name]",
      "Description: [Your project description]",
      "## Project Overview\n\n[Add your project overview here]",
      "## Requirements\n\n[Add your requirements here]",
      "## Features\n\n[Add your features here]",
      "## Technical Specifications\n\n[Add your technical specs here]",
    ];

    // Check if content contains multiple template indicators
    const templateMatches = templateIndicators.filter((indicator) =>
      content.toLowerCase().includes(indicator.toLowerCase())
    );

    // If more than 2 template indicators are found, it's likely a template
    if (templateMatches.length >= 2) {
      return true;
    }

    // Check if content is very short (likely a template)
    if (content.trim().length < 200) {
      return true;
    }

    // Check if content is mostly placeholder text
    const placeholderRatio =
      (content.match(/\[.*?\]/g) || []).length /
      (content.split(" ").length || 1);
    if (placeholderRatio > 0.1) {
      // More than 10% placeholders
      return true;
    }

    return false;
  }
}
