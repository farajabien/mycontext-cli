"use client";

import React from 'react';


export function ImagePreview(props: any) {
  return (
    <div className="w-full animate-in fade-in duration-500">
      <div className="rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
          {props.src ? <img src={props.src} alt="Preview" className="w-full h-auto" /> : <div className="p-10 text-center text-slate-400">No Image provided</div>}
        </div>
      
    </div>
  );
}
