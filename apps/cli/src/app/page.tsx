import Link from 'next/link';
import React from 'react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-slate-50 via-white to-blue-50 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <header className="w-full bg-white/70 backdrop-blur-md border-b border-slate-200/50 px-8 py-5 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg flex items-center justify-center">
            <span className="text-white font-black text-xl">M</span>
          </div>
          <div className="font-black text-2xl text-slate-800 tracking-tight">
            MyContext <span className="text-blue-600">Scaffold</span>
          </div>
        </div>
        <nav>
          <ul className="flex space-x-8 list-none m-0 p-0 text-sm font-semibold">
            <li>
              <Link href="/" className="text-blue-600">
                Overview
              </Link>
            </li>
            <li className="text-slate-300">/</li>
            <li>
              <Link href="https://github.com/farajabien/mycontext-cli" target="_blank" className="text-slate-500 hover:text-slate-800 transition-colors">
                GitHub
              </Link>
            </li>
          </ul>
        </nav>
      </header>
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-8 py-20">
        <div className="flex flex-col items-center text-center mb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase tracking-widest mb-8 border border-blue-100">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            DS-NLC Compiler Phase 0.5
          </div>
          
          <h1 className="text-7xl font-black text-slate-900 mb-8 leading-[1.1] tracking-tight max-w-4xl">
            Build with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Pure Intent.</span> <br/>
            Zero Hallucination.
          </h1>
          
          <p className="text-xl text-slate-500 mb-12 leading-relaxed max-w-2xl font-medium">
            Generated deterministically. This application is a direct reflection of your FSR manifest. 
            High-fidelity logic, premium UI, 100% TypeScript safety.
          </p>
          
          <div className="flex flex-wrap gap-6 justify-center">
            
          <Link href="/removebg" className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all transform active:scale-95">
            Get Started: RemoveBGPage
          </Link>
            <a href="https://github.com/farajabien/mycontext-cli" target="_blank" rel="noreferrer" className="px-8 py-4 bg-white text-slate-700 border border-slate-200 font-bold rounded-2xl shadow-sm hover:bg-slate-50 hover:shadow-md transition-all active:scale-95">
              Source Code
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          
          <Link href="/removebg" className="group p-6 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-3xl shadow-sm hover:shadow-xl hover:border-blue-200 transition-all transform hover:-translate-y-1">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="text-blue-600 text-xl font-bold">R</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">RemoveBGPage</h3>
            <p className="text-sm text-slate-500">Explore the RemoveBGPage feature scaffolded by MyContext.</p>
          </Link>
        </div>

        <div className="bg-slate-900 rounded-[3rem] p-12 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          <h3 className="text-3xl font-bold text-white mb-4 relative z-10">Production-Ready Scaffolding</h3>
          <p className="text-slate-400 max-w-xl mx-auto mb-8 relative z-10 font-medium text-lg">
            Every component is atomically generated and strictly typed. 
            Ready for scale from the first second.
          </p>
          <div className="flex justify-center gap-12 relative z-10">
            <div className="flex flex-col items-center">
              <span className="text-white font-bold text-2xl">100%</span>
              <span className="text-slate-500 text-xs">Type Safety</span>
            </div>
            <div className="w-px h-10 bg-slate-800"></div>
            <div className="flex flex-col items-center">
              <span className="text-white font-bold text-2xl">0ms</span>
              <span className="text-slate-500 text-xs">Hallucination</span>
            </div>
            <div className="w-px h-10 bg-slate-800"></div>
            <div className="flex flex-col items-center">
              <span className="text-white font-bold text-2xl">FAST</span>
              <span className="text-slate-500 text-xs">Deterministic</span>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="w-full bg-white/50 border-t border-slate-200 p-10 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-slate-400 text-sm font-medium">
            Generated by MyContext DS-NLC Compiler © 2026
          </div>
          <div className="flex gap-8 text-sm font-semibold text-slate-500">
            <Link href="https://mycontext.framer.website" className="hover:text-blue-600 transition-colors">Documentation</Link>
            <Link href="https://github.com/farajabien" className="hover:text-blue-600 transition-colors">Creator</Link>
            <Link href="https://x.com/farajabien" className="hover:text-blue-600 transition-colors">Updates</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
