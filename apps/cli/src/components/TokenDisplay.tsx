"use client";

import React, { useState, useEffect } from 'react';


export function TokenDisplay() {
  const [tokens, setTokens] = useState<number>(10);

  useEffect(() => {
    const loadTokens = () => {
      const saved = localStorage.getItem('user_tokens');
      if (saved) setTokens(parseInt(saved));
      else localStorage.setItem('user_tokens', '10');
    };
    
    loadTokens();
    window.addEventListener('local-storage-update', loadTokens);
    return () => window.removeEventListener('local-storage-update', loadTokens);
  }, []);

  return (
    <div className="w-full animate-in fade-in duration-700">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><circle cx="12" cy="12" r="10"/><path d="M12 6v12"/><path d="M6 12h12"/></svg>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widening text-slate-400 mb-0.5">Wallet Balance</p>
            <p className="text-slate-900 font-bold leading-none">Token Credits</p>
          </div>
        </div>
        <div className="text-3xl font-black text-blue-600 tracking-tight">
          {tokens}
        </div>
      </div>
    </div>
  );
}
