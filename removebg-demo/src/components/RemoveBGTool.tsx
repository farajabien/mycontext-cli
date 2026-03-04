"use client";

import React, { useState, useEffect } from 'react';
import { ImageUploader } from "@/components/ImageUploader";
import { ImagePreview } from "@/components/ImagePreview";
import { TokenDisplay } from "@/components/TokenDisplay";

export function RemoveBGTool() {
  const [status, setStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    const handleUpload = (e: any) => {
      setStatus('processing');
      // Deterministic processing simulation
      setTimeout(() => {
        setStatus('done');
        setResult(e.detail.url); // For demo, we just use the original as "result"
        // Deduct token
        const tokens = parseInt(localStorage.getItem('user_tokens') || '10');
        localStorage.setItem('user_tokens', (tokens - 1).toString());
        window.dispatchEvent(new Event('local-storage-update'));
      }, 3000);
    };

    window.addEventListener('image-uploaded', handleUpload);
    return () => window.removeEventListener('image-uploaded', handleUpload);
  }, []);

  return (
    <div className="w-full animate-in fade-in duration-700">
      <div className="w-full">
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-blue-900/5 overflow-hidden p-10 mb-12">
          {status === 'processing' && (
            <div className="flex flex-col items-center py-24 bg-blue-50/20 rounded-[2rem] border border-blue-100/30">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                </div>
              </div>
              <h3 className="mt-8 text-2xl font-black text-slate-900 tracking-tight">Processing Image...</h3>
              <p className="text-slate-500 font-medium mt-2">Deterministic background removal in progress</p>
            </div>
          )}
          
          {status === 'done' && result && (
            <div className="space-y-8 animate-in zoom-in-95 duration-700">
              <div className="bg-slate-50 rounded-[2rem] border border-slate-200 relative group overflow-hidden shadow-inner aspect-[4/3] flex items-center justify-center p-8">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] opacity-30"></div>
                <img src={result} alt="Result" className="max-w-full max-h-full object-contain rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] relative z-10 hover:scale-[1.05] transition-transform duration-700" />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href={result} 
                  download="removed-bg.png"
                  className="flex-1 flex items-center justify-center gap-3 py-5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black rounded-3xl hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-0.5 transition-all active:scale-[0.98]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  Download Result
                </a>
                <button 
                  onClick={() => setStatus('idle')}
                  className="px-10 py-5 bg-slate-100 text-slate-600 font-bold rounded-3xl hover:bg-slate-200 transition-all border border-slate-200/50"
                >
                  Clear Asset
                </button>
              </div>
            </div>
          )}
          
          {status === 'idle' && (
            <div className="flex flex-col items-center py-32 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-white border-2 border-dashed border-slate-200 rounded-[2rem]">
              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-8 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-2">Ready to Scaffold</h2>
              <p className="text-slate-500 max-w-[320px] text-center font-medium leading-relaxed">
                Upload your image below to see the deterministic removal logic in action.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 flex flex-col gap-8">
            <ImageUploader />
                  <ImagePreview />
          </div>
          <div className="lg:col-span-4 flex flex-col gap-8">
                  <TokenDisplay />
          </div>
        </div>
      </div>
    </div>
  );
}
