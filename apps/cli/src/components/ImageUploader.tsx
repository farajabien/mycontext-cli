"use client";

import React, { useState, useEffect } from 'react';


export function ImageUploader() {
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      window.dispatchEvent(new CustomEvent('image-uploaded', { detail: { url } }));
    }
  };

  return (
    <div className="w-full animate-in fade-in duration-700">
      <div className="group relative border-2 border-dashed border-slate-200 rounded-3xl p-10 bg-white hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-300 cursor-pointer">
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange} 
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
        />
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-100 group-hover:scale-110 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-blue-600"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
          </div>
          <p className="text-slate-900 font-bold mb-1">Select an Image</p>
          <p className="text-slate-500 text-sm">PNG, JPG or WEBP (Max 5MB)</p>
        </div>
      </div>

      {preview && (
        <div className="mt-4 p-2 bg-white rounded-2xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-50">
            <img src={preview} alt="Upload Preview" className="w-full h-full object-contain" />
            <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] text-white font-bold uppercase tracking-wider">
              Asset Preview
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
