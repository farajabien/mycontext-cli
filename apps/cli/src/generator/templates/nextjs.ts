import { FSRComponent, FSRServerAction, FSRModel } from "@myycontext/core";

export const generateNextPageTemplate = (componentName: string, children: string[] = []): string => {
  const childImports = children.map((c: string) => `import { ${c} } from "@/components/${c}";`).join('\n');
  const childRender = children.map((c: string) => `<${c} />`).join('\n        ');

  return `import React from 'react';
${childImports}

export default async function ${componentName}() {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50/50">
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex flex-col gap-12">
          ${childRender}
        </div>
      </main>
    </div>
  );
}
`;
};

export const generateServerComponentTemplate = (component: FSRComponent): string => {
  const children = component.children || [];
  const childImports = children.map((c: string) => `import { ${c} } from "@/components/${c}";`).join('\n');
  const childRender = children.map((c: string) => `<${c} />`).join('\n      ');

  return `import React from 'react';
${childImports}

export function ${component.name}() {
  return (
    <div className="w-full">
      ${childRender}
    </div>
  );
}
`;
};

export const generateClientComponentTemplate = (component: FSRComponent): string => {
  const children = component.children || component.contains || [];
  const childImports = children.map((c: string) => `import { ${c} } from "@/components/${c}";`).join('\n');
  const childRender = children.map((c: string) => `<${c} />`).join('\n      ');
  const triggerText = component.triggers?.[0] || 'State';

  let stateRender = '';
  let uiRender = '';

  if (component.state?.type === 'local_storage') {
    const isToken = component.state.target === 'user_tokens';
    const modelArray = component.state.model ? `${component.state.model}[]` : 'any[]';
    
    stateRender = isToken 
      ? `  const [tokens, setTokens] = useState<number>(10);

  useEffect(() => {
    const loadTokens = () => {
      const saved = localStorage.getItem('user_tokens');
      if (saved) setTokens(parseInt(saved));
      else localStorage.setItem('user_tokens', '10');
    };
    
    loadTokens();
    window.addEventListener('local-storage-update', loadTokens);
    return () => window.removeEventListener('local-storage-update', loadTokens);
  }, []);`
      : `  const [items, setItems] = useState<${modelArray}>([]);

  useEffect(() => {
    const loadData = () => {
      const saved = localStorage.getItem('${component.name.toLowerCase()}_data');
      if (saved) setItems(JSON.parse(saved));
    };
    
    loadData();
    window.addEventListener('local-storage-update', loadData);
    return () => window.removeEventListener('local-storage-update', loadData);
  }, []);

  const saveItems = (newItems: ${modelArray}) => {
    setItems(newItems);
    localStorage.setItem('${component.name.toLowerCase()}_data', JSON.stringify(newItems));
    window.dispatchEvent(new Event('local-storage-update'));
  };`;

    uiRender = isToken 
      ? `      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-colors">
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
      </div>`
      : `      <div className="mb-4">
        {items.length === 0 ? <p className="text-muted-foreground text-sm">No items found.</p> : (
          <ul className="space-y-2">
            {items.map((item: any) => (
              <li key={item.id} className="p-3 bg-muted rounded flex justify-between">
                <span>{item.title || item.name || 'Item'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-4 pt-4 border-t">
        ${childRender || '<p>Add new items here</p>'}
      </div>`;
  } else if (component.state?.type === 'image_uploader') {
    stateRender = `  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      window.dispatchEvent(new CustomEvent('image-uploaded', { detail: { url } }));
    }
  };`;
    
    uiRender = `      <div className="group relative border-2 border-dashed border-slate-200 rounded-3xl p-10 bg-white hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-300 cursor-pointer">
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
      )}`;
  } else if (component.state?.type === 'asset_processing') {
    stateRender = `  const [status, setStatus] = useState<'idle' | 'processing' | 'done'>('idle');
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
  }, []);`;
    
    uiRender = `      <div className="w-full">
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
            ${childRender.split('\n').filter(line => line.includes('Uploader') || line.includes('Preview')).join('\n            ')}
          </div>
          <div className="lg:col-span-4 flex flex-col gap-8">
            ${childRender.split('\n').filter(line => !line.includes('Uploader') && !line.includes('Preview')).join('\n            ')}
          </div>
        </div>
      </div>`;
  } else if (component.state?.type === 'local_storage_form') {
    const targetKey = component.state.target || 'data';
    
    stateRender = `  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const saved = localStorage.getItem('${targetKey}');
    const items = saved ? JSON.parse(saved) : [];
    
    const newItem = {
      id: Math.random().toString(36).substring(7),
      title: title.trim(),
      completed: false,
      createdAt: new Date().toISOString()
    };
    
    localStorage.setItem('${targetKey}', JSON.stringify([...items, newItem]));
    window.dispatchEvent(new Event('local-storage-update'));
    setTitle('');
  };`;
    
    uiRender = `      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">New Item</label>
          <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            className="w-full p-2 border rounded-md"
            placeholder="What needs to be done?"
            required
          />
        </div>
        <button 
          type="submit"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md shadow hover:bg-primary/90 transition-colors w-full"
        >
          Add Item
        </button>
      </form>`;
  } else if (component.props && Object.keys(component.props).length > 0) {
    // Props-only component (stateless/visual)
    const propsList = Object.keys(component.props).join(', ');
    stateRender = '';
    const isImage = component.name.toLowerCase().includes('image') || component.props.src;
    uiRender = isImage 
      ? `      <div className="rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
          {props.src ? <img src={props.src} alt="Preview" className="w-full h-auto" /> : <div className="p-10 text-center text-slate-400">No Image provided</div>}
        </div>`
      : `      <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
          ${component.name} displaying: {JSON.stringify(props)}
        </div>`;
    
    return `"use client";\n\nimport React from 'react';\n${childImports}\n
export function ${component.name}(props: any) {
  return (
    <div className="w-full animate-in fade-in duration-500">
${uiRender}
      ${childRender}
    </div>
  );
}
`;
  } else {
    // Default dummy template
    stateRender = `  const [isOpen, setIsOpen] = useState(false);`;
    uiRender = `      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl shadow-sm hover:bg-slate-50 transition-all active:scale-95"
      >
        Toggle ${triggerText}
      </button>
      
      {isOpen && (
        <div className="mt-4 p-6 border rounded-3xl bg-slate-50/50 animate-in slide-in-from-top-2 duration-300">
          ${childRender || '<p className="text-sm text-slate-500">Content triggered for demo purposes.</p>'}
        </div>
      )}`;
  }

  return `"use client";\n\nimport React, { useState, useEffect } from 'react';\n${childImports}\n
export function ${component.name}() {
${stateRender}

  return (
    <div className="w-full animate-in fade-in duration-700">
${uiRender}
    </div>
  );
}
`;
};

export const generateServerActionTemplate = (action: FSRServerAction, models: FSRModel[] = []): string => {
  // Very simplistic strict-typed template
  return `"use server";

import { revalidatePath } from "next/cache";

export async function ${action.name}(formData: FormData) {
  // Auto-generated server action
  console.log("Action called: ${action.name}");
  
  // TODO: Implement InstantDB or other ORM logic here based on inputs
  
  revalidatePath("/");
  return { success: true };
}
`;
};

export const generateTypesTemplate = (models: FSRModel[]): string => {
  const typeDefs = models.map(m => {
    const fields = Object.entries(m.fields).map(([fname, fdef]: [string, any]) => {
      const tsType = typeof fdef === 'string' ? fdef : fdef.type;
      return `  ${fname}: ${tsType};`;
    }).join('\n');
    return `export interface ${m.name} {\n${fields}\n}`;
  }).join('\n\n');

  return `// Auto-generated Application Types\n\n${typeDefs}\n`;
};

export const generateRootLandingPageTemplate = (routes: {path: string, name: string}[]): string => {
  const links = routes.map(r => `            <li key="${r.path}">
              <Link href="${r.path}" className="text-slate-600 hover:text-blue-600 transition-all hover:translate-x-1 inline-block">
                ${r.name}
              </Link>
            </li>`).join('\n');
            
  const primaryAction = routes.length > 0 && routes[0] ? `
          <Link href="${routes[0].path}" className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all transform active:scale-95">
            Get Started: ${routes[0].name}
          </Link>` : '';

  const routeCards = routes.map(r => `
          <Link href="${r.path}" className="group p-6 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-3xl shadow-sm hover:shadow-xl hover:border-blue-200 transition-all transform hover:-translate-y-1">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="text-blue-600 text-xl font-bold">${r.name.charAt(0)}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">${r.name}</h3>
            <p className="text-sm text-slate-500">Explore the ${r.name} feature scaffolded by MyContext.</p>
          </Link>`).join('\n');

  return `import Link from 'next/link';
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
            ${primaryAction}
            <a href="https://github.com/farajabien/mycontext-cli" target="_blank" rel="noreferrer" className="px-8 py-4 bg-white text-slate-700 border border-slate-200 font-bold rounded-2xl shadow-sm hover:bg-slate-50 hover:shadow-md transition-all active:scale-95">
              Source Code
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          ${routeCards}
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
            Generated by MyContext DS-NLC Compiler © ${new Date().getFullYear()}
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
`;
};
