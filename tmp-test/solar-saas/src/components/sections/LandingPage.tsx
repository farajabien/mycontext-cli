"use client";

import React, { useState, useEffect } from 'react';
import { Sun, Battery, BarChart3, ShieldCheck, ArrowRight, Zap, Globe, PieChart } from 'lucide-react';

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0C10] text-slate-200 font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Premium Navbar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'bg-[#0A0C10]/80 backdrop-blur-xl border-b border-white/5 py-4' : 'bg-transparent py-8'}`}>
        <div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
              <Zap className="text-white w-6 h-6 fill-current" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-white">SOLAR<span className="text-amber-500">FLOW</span></span>
          </div>
          
          <div className="hidden md:flex items-center gap-10 text-sm font-bold tracking-wide text-slate-400">
            <a href="#" className="hover:text-amber-500 transition-colors">Infrastructure</a>
            <a href="#" className="hover:text-amber-500 transition-colors">Yield Optimization</a>
            <a href="#" className="hover:text-amber-500 transition-colors">Network</a>
            <button className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-full text-white hover:bg-white/10 transition-all">
              Login
            </button>
            <button className="px-6 py-2.5 bg-amber-500 text-black rounded-full hover:bg-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.2)] hover:shadow-[0_0_35px_rgba(245,158,11,0.4)] transition-all">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-amber-500/10 blur-[120px] rounded-full -z-10"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/5 blur-[100px] rounded-full -z-10"></div>
        
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="animate-in fade-in slide-in-from-left-8 duration-1000">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              AI-Powered Grid Optimization v4.2
            </div>
            
            <h1 className="text-7xl lg:text-8xl font-black text-white leading-[0.95] tracking-tighter mb-8">
              Optimize your <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600">Solar Yield.</span>
            </h1>
            
            <p className="text-xl text-slate-400 max-w-lg leading-relaxed mb-12 font-medium">
              Autonomous energy management for commercial solar farms. Harness the power of predictive ROI optimization and real-time mesh-monitoring.
            </p>
            
            <div className="flex flex-wrap gap-6">
              <button className="group px-10 py-5 bg-amber-500 text-black font-black text-lg rounded-2xl flex items-center gap-3 hover:bg-amber-400 shadow-[0_20px_40px_rgba(245,158,11,0.2)] hover:-translate-y-1 transition-all active:scale-95">
                Deploy Node
                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-10 py-5 bg-white/5 border border-white/10 text-white font-bold text-lg rounded-2xl hover:bg-white/10 transition-all">
                View Demo
              </button>
            </div>
            
            <div className="mt-16 flex items-center gap-8 grayscale opacity-50">
              <Sun className="w-8 h-8" />
              <div className="h-4 w-px bg-white/10"></div>
              <Battery className="w-8 h-8" />
              <div className="h-4 w-px bg-white/10"></div>
              <Globe className="w-8 h-8" />
            </div>
          </div>

          <div className="relative animate-in fade-in zoom-in-95 duration-1000 delay-300">
            {/* Glass Dashboard Mockup */}
            <div className="relative bg-[#151921]/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/20 blur-[80px] -z-10 group-hover:bg-amber-500/40 transition-colors duration-1000"></div>
              
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-white font-black text-xl mb-1">Asset Performance</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Real-time Solar Farm Mesh</p>
                </div>
                <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-white/5 border border-white/5 rounded-3xl p-6 transition-all hover:bg-white/10">
                  <BarChart3 className="text-amber-500 mb-4 w-6 h-6" />
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-1">Efficiency</p>
                  <p className="text-white text-3xl font-black">98.4%</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-3xl p-6 transition-all hover:bg-white/10">
                  <PieChart className="text-blue-500 mb-4 w-6 h-6" />
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-1">Stored Yield</p>
                  <p className="text-white text-3xl font-black">12.4 MW</p>
                </div>
              </div>

              <div className="bg-white/5 border border-white/5 rounded-3xl p-8 relative overflow-hidden group/chart">
                <div className="flex items-center justify-between mb-6">
                   <p className="text-white font-bold">ROI Projection</p>
                   <span className="text-emerald-500 font-black text-xs">+12.4% vs Baseline</span>
                </div>
                <div className="h-32 flex items-end gap-2 group-hover/chart:gap-3 transition-all duration-700">
                  {[40, 60, 45, 80, 55, 90, 70, 100, 85].map((h, i) => (
                    <div 
                      key={i} 
                      style={{ height: `${h}%` }} 
                      className={`flex-1 rounded-t-lg transition-all duration-1000 delay-${i * 100} ${i === 7 ? 'bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)]' : 'bg-white/10'}`}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Dynamic Floating Badge */}
            <div className="absolute -bottom-10 -left-10 bg-amber-500 p-8 rounded-3xl shadow-2xl animate-float">
               <ShieldCheck className="text-black w-8 h-8 mb-2" />
               <p className="text-black text-sm font-black uppercase tracking-tighter">Bankable <br/> Assurance</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-12">
          {[
            { label: 'Gigawatts Managed', value: '4.2 GW' },
            { label: 'Asset Uptime', value: '99.99%' },
            { label: 'ROI Improvement', value: '22%' },
            { label: 'Global Nodes', value: '1,400+' }
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-white text-4xl font-black tracking-tighter mb-2">{stat.value}</p>
              <p className="text-slate-500 text-xs font-black uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>
      
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
