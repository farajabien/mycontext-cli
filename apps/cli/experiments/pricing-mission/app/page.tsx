import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Welcome to pricing-mission
        </h1>
        <p className="text-center text-lg text-muted-foreground mb-8">
          A modern web application built with Next.js, TypeScript, and Tailwind CSS.
        </p>
        <div className="flex justify-center">
          <Button>Get Started</Button>
        </div>
      </div>
    </main>
  );
}
