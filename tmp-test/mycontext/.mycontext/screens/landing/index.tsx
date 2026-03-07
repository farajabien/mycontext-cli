import React, { useState, FC, ReactNode } from 'react';
import { 
  Code, 
  Database, 
  Feather, 
  GitBranch, 
  LayoutDashboard, 
  Menu, 
  Moon, 
  Sun, 
  Twitter, 
  Github, 
  Linkedin, 
  X 
} from 'lucide-react';

// --- TYPE DEFINITIONS ---
interface NavLink {
  href: string;
  label: string;
}

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
}

interface LayoutProps {
  children: ReactNode;
}

// --- GLOBAL DESIGN & BRANDING CONSTANTS ---
const APP_NAME = "The App";
const NAV_LINKS: NavLink[] = [
  { href: "#features", label: "Features" },
  { href: "#demo", label: "Demo" },
  { href: "#workflow", label: "Workflow" },
  { href: "#testimonials", label: "Testimonials" },
];

// --- SUB-COMPONENTS (HEADER, FOOTER, ETC.) ---

/**
 * ThemeToggle Component
 * A functional-looking UI element for switching between light and dark modes.
 */
const ThemeToggle: FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);

  // In a real app, this would be connected to a theme context.
  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full text-slate-400 bg-slate-800/50 hover:bg-slate-700/70 hover:text-teal-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900"
      aria-label="Toggle theme"
    >
      {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
};

/**
 * Header Component
 * A responsive, glassmorphic header with navigation and theme toggle.
 */
const Header: FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav className="container mx-auto px-6 py-4">
        <div className="relative z-20 flex items-center justify-between p-3 border rounded-2xl border-white/20 bg-slate-900/40 backdrop-blur-xl shadow-2xl shadow-black/20">
          {/* Logo */}
          <a href="#" className="flex items-center space-x-2">
            <div className="p-1.5 bg-gradient-to-br from-teal-400 to-blue-600 rounded-lg">
              <Code className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-100 tracking-wider">{APP_NAME}</span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-slate-300 hover:text-teal-400 transition-colors duration-300 font-medium"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <a
              href="#"
              className="hidden md:inline-block px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-blue-600 rounded-lg shadow-lg hover:shadow-teal-500/40 transition-all duration-300 transform hover:-translate-y-0.5"
            >
              Get Started
            </a>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
              aria-label="Open menu"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-2">
            <div className="flex flex-col space-y-2 p-4 rounded-xl border border-white/10 bg-slate-800/80 backdrop-blur-lg">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-2 rounded-md text-slate-200 hover:bg-teal-500/20 hover:text-teal-300 transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="#"
                className="w-full mt-2 px-5 py-3 text-center font-semibold text-white bg-gradient-to-r from-teal-500 to-blue-600 rounded-lg shadow-lg hover:shadow-teal-500/40 transition-all duration-300"
              >
                Get Started
              </a>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

/**
 * Footer Component
 * A comprehensive footer with links, social icons, and copyright notice.
 */
const Footer: FC = () => {
    const socialLinks = [
      { icon: Twitter, href: "#", label: "Twitter" },
      { icon: Github, href: "#", label: "GitHub" },
      { icon: Linkedin, href: "#", label: "LinkedIn" },
    ];
  
    const footerSections = [
      {
        title: "Product",
        links: ["Features", "Pricing", "Integrations", "API"],
      },
      {
        title: "Company",
        links: ["About Us", "Careers", "Blog", "Contact"],
      },
      {
        title: "Resources",
        links: ["Documentation", "Support", "Community", "Status"],
      },
    ];
  
    return (
      <footer className="bg-slate-900/50 border-t border-white/10 mt-24">
        <div className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-8">
            {/* Brand and Socials */}
            <div className="lg:col-span-2">
              <a href="#" className="flex items-center space-x-2">
                <div className="p-1.5 bg-gradient-to-br from-teal-400 to-blue-600 rounded-lg">
                  <Code className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-slate-100">{APP_NAME}</span>
              </a>
              <p className="mt-4 text-slate-400 max-w-xs">
                AI-driven development capabilities to automate workflows and enhance context awareness.
              </p>
              <div className="flex space-x-4 mt-6">
                {socialLinks.map((social) => (
                  <a key={social.label} href={social.href} aria-label={social.label} className="text-slate-500 hover:text-teal-400 transition-colors">
                    <social.icon className="h-6 w-6" />
                  </a>
                ))}
              </div>
            </div>
  
            {/* Link Sections */}
            {footerSections.map((section) => (
              <div key={section.title}>
                <h3 className="font-semibold text-slate-200 tracking-wider uppercase">{section.title}</h3>
                <ul className="mt-4 space-y-3">
                  {section.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-slate-400 hover:text-teal-400 transition-colors">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
  
          {/* Copyright */}
          <div className="mt-12 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
            <p>&copy; {new Date().getFullYear()} {APP_NAME}, Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    );
};
  
/**
 * Layout Component
 * Wraps all pages with a consistent structure, including the background.
 */
const Layout: FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans antialiased relative">
      {/* High-impact background implementation */}
      <div className="fixed inset-0 -z-10 h-full w-full">
        <img 
          src="/assets/images/hero-background.png" 
          alt="Futuristic digital landscape" 
          className="h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950 to-slate-950"></div>
      </div>
      
      <Header />
      <main className="pt-28 md:pt-32">
        {children}
      </main>
      <Footer />
    </div>
  );
};

// --- PAGE SECTIONS ---

const HeroSection: FC = () => (
  <section className="container mx-auto px-6 text-center">
    <div className="flex flex-col items-center">
      <div className="inline-block px-4 py-1.5 mb-6 text-sm font-medium text-teal-300 border border-teal-300/30 bg-teal-500/10 rounded-full">
        Automate Development & Enhance Context
      </div>
      <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-400">
        Supercharge Your Workflow with AI
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-slate-400">
        Leverage our suite of AI-driven tools to accelerate development velocity, improve code quality, and maintain perfect context across your entire project.
      </p>
      <div className="mt-10">
        <a href="#" className="inline-block group">
          <img 
            src="/assets/images/cta-button.png" 
            alt="Get Started Now" 
            className="h-14 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-teal-500/40"
          />
        </a>
      </div>
    </div>
  </section>
);

const FeaturesSection: FC = () => {
  const features: Feature[] = [
    {
      icon: LayoutDashboard,
      title: "Intelligent Dashboards",
      description: "Visualize project health and AI insights in one place.",
    },
    {
      icon: GitBranch,
      title: "Automated Workflows",
      description: "Connect your repositories for automated code reviews and suggestions.",
    },
    {
      icon: Database,
      title: "Context-Aware Engine",
      description: "Our AI understands your entire codebase for smarter, relevant assistance.",
    },
  ];

  return (
    <section id="features" className="container mx-auto px-6 mt-24 md:mt-32">
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-100">Built for Modern Development Teams</h2>
        <p className="mt-4 max-w-2xl mx-auto text-slate-400">
          Everything you need to integrate AI seamlessly into your existing processes.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
        {/* Main Feature Card */}
        <div className="md:col-span-2 lg:col-span-1 p-8 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-lg flex flex-col items-center text-center shadow-lg">
          <img src="/assets/images/feature-analytics-icon.png" alt="Analytics Icon" className="w-20 h-20 mb-6" />
          <h3 className="text-xl font-semibold text-white">Advanced Analytics</h3>
          <p className="mt-2 text-slate-400 flex-grow">
            Gain deep insights into development velocity and code quality metrics. Our AI pinpoints bottlenecks and suggests optimizations.
          </p>
          <a href="#" className="mt-6 inline-flex items-center text-teal-400 hover:text-teal-300 transition-colors">
            Learn More <span className="ml-1">&rarr;</span>
          </a>
        </div>
        
        {/* Other Feature Cards */}
        {features.map((feature) => (
          <div key={feature.title} className="p-8 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-lg shadow-lg">
            <div className="p-3 inline-block bg-slate-800/70 rounded-lg border border-white/10">
              <feature.icon className="h-6 w-6 text-teal-400" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">{feature.title}</h3>
            <p className="mt-2 text-slate-400">{feature.description}</p>
          </div>
        ))}
      </div>
      
      {/* Feature Highlights Section Image */}
      <div className="mt-16">
        <img 
          src="/assets/images/feature-highlights-section.png" 
          alt="Feature Highlights Grid" 
          className="rounded-2xl w-full border border-white/10 shadow-2xl shadow-black/30"
        />
      </div>
    </section>
  );
};

const DemoSection: FC = () => (
  <section id="demo" className="container mx-auto px-6 mt-24 md:mt-32">
    <div className="text-center">
      <h2 className="text-3xl md:text-4xl font-bold text-slate-100">See The App in Action</h2>
      <p className="mt-4 max-w-2xl mx-auto text-slate-400">
        Explore the intuitive interface that brings powerful AI tools right to your fingertips.
      </p>
    </div>
    <div className="mt-12 p-2 rounded-2xl bg-gradient-to-br from-teal-500/50 to-blue-600/50 shadow-2xl shadow-blue-500/20">
      <div className="p-4 bg-slate-900 rounded-xl">
        <div className="flex items-center space-x-2 p-2 border-b border-slate-700">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <img 
          src="/assets/images/tool-demo-screenshot.png" 
          alt="Dashboard Screenshot" 
          className="rounded-b-lg w-full"
        />
      </div>
    </div>
  </section>
);

const WorkflowSection: FC = () => (
  <section id="workflow" className="container mx-auto px-6 mt-24 md:mt-32">
    <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
      <div className="text-center lg:text-left">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-100">An Interconnected AI Ecosystem</h2>
        <p className="mt-4 text-lg text-slate-400">
          Our tools aren't isolated. They form a cohesive system that shares context and learns from your entire development lifecycle, from commit to deployment.
        </p>
        <div className="mt-8 flex justify-center lg:justify-start">
            <img src="/assets/images/team-avatar.png" alt="Team Avatars" className="h-12 w-auto" />
            <div className="ml-4">
                <p className="text-slate-200 font-semibold">Trusted by Elite Teams</p>
                <p className="text-slate-400 text-sm">Developers and PMs rely on The App.</p>
            </div>
        </div>
      </div>
      <div className="mt-12 lg:mt-0">
        <img 
          src="/assets/images/interactive-flowchart.png" 
          alt="Interactive AI workflow flowchart" 
          className="rounded-2xl w-full border border-white/10 shadow-2xl shadow-black/30"
        />
      </div>
    </div>
  </section>
);

const TestimonialsSection: FC = () => (
    <section id="testimonials" className="container mx-auto px-6 mt-24 md:mt-32">
        <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-100">Loved by Developers Worldwide</h2>
            <p className="mt-4 max-w-2xl mx-auto text-slate-400">
                Don't just take our word for it. Here's what our users are saying about the impact on their productivity.
            </p>
        </div>
        <div className="mt-12">
            <img 
              src="/assets/images/user-testimonial-slider.png" 
              alt="User testimonial slider" 
              className="rounded-2xl w-full max-w-4xl mx-auto"
            />
        </div>
    </section>
);

const CtaSection: FC = () => (
    <section id="cta" className="container mx-auto px-6 mt-24 md:mt-32">
        <div className="relative p-12 text-center overflow-hidden rounded-3xl bg-slate-900 border border-white/10">
            <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] -z-10 bg-[radial-gradient(circle_at_center,_rgba(0,194,203,0.15),_transparent_40%)]"></div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-100">Ready to Transform Your Development Process?</h2>
            <p className="mt-4 max-w-xl mx-auto text-slate-400">
                Join thousands of developers who are building faster and smarter with The App. Get started today.
            </p>
            <div className="mt-8">
                <a href="#" className="inline-block group">
                    <img 
                        src="/assets/images/cta-button.png" 
                        alt="Get Started Now" 
                        className="h-14 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-teal-500/40"
                    />
                </a>
            </div>
        </div>
    </section>
);


/**
 * LandingScreen Component
 * The main component that assembles the entire landing page.
 */
const LandingScreen: FC = () => {
  return (
    <Layout>
      <HeroSection />
      <FeaturesSection />
      <DemoSection />
      <WorkflowSection />
      <TestimonialsSection />
      <CtaSection />
    </Layout>
  );
};

export default LandingScreen;