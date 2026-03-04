import React from 'react';
import { RemoveBGTool } from "@/components/RemoveBGTool";

export default async function RemoveBGPage() {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50/50">
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex flex-col gap-12">
          <RemoveBGTool />
        </div>
      </main>
    </div>
  );
}
