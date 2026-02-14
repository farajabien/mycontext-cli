import Header from '@/components/Header';
import ComparisonTable from '@/components/ComparisonTable';

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-gray-900 to-gray-800 text-white text-center py-20">
          <h1 className="text-4xl font-extrabold mb-4">Stop Paying for Context Bloat.</h1>
          <p className="text-lg max-w-3xl mx-auto">
            Discover the power of shared state models and revolutionize the way you think about AI systems. Efficiency, coherence, and simplicity—redefined.
          </p>
        </section>

        {/* Content Section */}
        <section className="py-12 px-6 bg-white text-gray-800">
          <div className="max-w-5xl mx-auto space-y-8">
            <div>
              <h2 className="text-3xl font-bold mb-4">Introduction: A Paradigm Shift in AI Development</h2>
              <ul className="list-disc list-inside text-lg">
                <li>Exploring the limitations of brute force AI approaches.</li>
                <li>Introducing shared state as a transformative methodology.</li>
                <li>The importance of coherence and collaboration in AI systems.</li>
              </ul>
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-4">Antigravity (MyContext Living Brain): The Shared State Advantage</h2>
              <ul className="list-disc list-inside text-lg">
                <li>Uses a shared state model represented by brain.json for persistent memory.</li>
                <li>Requires low context window, ensuring high efficiency and coherence.</li>
                <li>Employs "Agent Teams" with clear roles, mimicking a well-organized team passing a notebook.</li>
              </ul>
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-4">Cursor/Windsurf: Brute Force with High Costs</h2>
              <ul className="list-disc list-inside text-lg">
                <li>Relies on massive context windows (2M+), re-reading entire codebases every interaction.</li>
                <li>Prone to context drift, forgetting early instructions, and hallucinations at scale.</li>
                <li>Metaphorically resembles a genius with short-term memory loss trying to memorize a library every 5 minutes.</li>
              </ul>
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-4">Claude Code: Stateless Execution with Limited Memory</h2>
              <ul className="list-disc list-inside text-lg">
                <li>Operates without persistent memory between sessions.</li>
                <li>Excels in reasoning but requires manual feeding of prior information.</li>
                <li>Lacks the coherence and efficiency offered by shared state models.</li>
              </ul>
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-4">Conclusion: Why Shared State Beats Brute Force</h2>
              <ul className="list-disc list-inside text-lg">
                <li>Shared state models offer higher coherence, efficiency, and organizational clarity.</li>
                <li>Brute force approaches are resource-intensive and prone to errors at scale.</li>
                <li>Stateless execution lacks the persistence needed for complex, long-term tasks.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Comparison Table Section */}
        <section className="py-12 px-6 bg-gray-100">
          <div className="max-w-5xl mx-auto">
            <ComparisonTable />
          </div>
        </section>

        {/* Conclusion Section */}
        <section className="bg-blue-600 text-white text-center py-16">
          <h2 className="text-4xl font-extrabold mb-4">Join the Shared State Revolution.</h2>
          <p className="text-lg max-w-3xl mx-auto">
            Say goodbye to inefficient, bloated systems. Embrace the future with shared state models that deliver unparalleled efficiency and coherence.
          </p>
        </section>
      </main>
    </div>
  );
}