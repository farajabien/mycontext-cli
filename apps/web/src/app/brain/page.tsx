
"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, BrainStatus } from "@myycontext/core/src/types/brain"; 
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function BrainPage() {
  const [brain, setBrain] = useState<Brain | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const fetchBrain = async () => {
      try {
        const res = await fetch('/api/brain');
        if (!res.ok) throw new Error('Failed to fetch brain');
        const data = await res.json();
        setBrain(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    fetchBrain();
    const interval = setInterval(fetchBrain, 2000); // Poll every 2s
    return () => clearInterval(interval);
  }, []);

  const handleInteract = async (type: 'comment' | 'pause' | 'resume', payload?: any) => {
    setIsSending(true);
    try {
      await fetch('/api/brain/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload })
      });
      if (type === 'comment') setComment("");
    } catch (err) {
      console.error("Failed to interact:", err);
    } finally {
      setIsSending(false);
    }
  };

  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!brain) return <div className="p-8">Loading Brain...</div>;

  return (
    <div className="container mx-auto p-8 space-y-8 h-screen flex flex-col">
      <header className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Living Brain</h1>
          <p className="text-muted-foreground mt-2">{brain.narrative}</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex gap-2">
             <Button 
               variant={brain.status === 'paused' ? "default" : "outline"}
               size="sm"
               onClick={() => handleInteract(brain.status === 'paused' ? 'resume' : 'pause')}
               disabled={isSending}
             >
               {brain.status === 'paused' ? "Resume" : "Pause"}
             </Button>
           </div>
           <Badge variant={
             brain.status === 'idle' ? 'secondary' : 
             brain.status === 'thinking' ? 'default' : 
             brain.status === 'error' ? 'destructive' : 
             brain.status === 'paused' ? 'outline' : 'outline'
           }>
             {brain.status.toUpperCase()}
           </Badge>
           <span className="text-xs text-muted-foreground self-center">v{brain.version}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Left Column: Updates Feed */}
        <Card className="md:col-span-1 flex flex-col h-full overflow-hidden">
          <CardHeader className="shrink-0 pb-2">
            <CardTitle>Stream of Consciousness</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
             <ScrollArea className="flex-1 px-6 pb-4">
                <div className="space-y-4">
                  {brain.updates.slice().reverse().map((update) => (
                    <div key={update.id} className={`border-l-2 pl-4 py-1 ${
                      update.type === 'error' ? 'border-red-500 bg-red-50/10' : 
                      update.role === 'user' ? 'border-blue-500 bg-blue-50/10' : 
                      'border-primary/20'
                    }`}>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className={`text-xs font-semibold ${
                           update.role === 'user' ? 'text-blue-500' : 'text-primary'
                        }`}>{update.agent}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(update.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm prose prose-sm dark:prose-invert max-w-none">{update.message}</p>
                      {update.type === 'thought' && <span className="text-[10px] italic text-muted-foreground">Thinking...</span>}
                      {update.type === 'action' && <span className="text-[10px] font-bold text-green-600">Action</span>}
                    </div>
                  ))}
                  {brain.updates.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
                </div>
             </ScrollArea>
             
             {/* Input Area */}
             <div className="p-4 border-t bg-muted/20 shrink-0">
               <div className="flex gap-2">
                 <Textarea 
                   placeholder="Inject a thought or feedback..." 
                   value={comment}
                   onChange={(e) => setComment(e.target.value)}
                   className="min-h-[60px] resize-none text-sm"
                   onKeyDown={(e) => {
                     if (e.key === 'Enter' && !e.shiftKey) {
                       e.preventDefault();
                       if (comment.trim()) handleInteract('comment', { message: comment });
                     }
                   }}
                 />
                 <Button 
                   size="icon" 
                   className="h-[60px] w-[60px]"
                   onClick={() => comment.trim() && handleInteract('comment', { message: comment })}
                   disabled={isSending || !comment.trim()}
                 >
                   ➤
                 </Button>
               </div>
             </div>
          </CardContent>
        </Card>

        {/* Right Column: Artifacts & Tasks */}
        <div className="md:col-span-2 flex flex-col h-full space-y-6">
           <Card className="flex-1">
             <CardContent className="h-full p-6">
               <Tabs defaultValue="prd" className="h-full flex flex-col">
                 <TabsList>
                   <TabsTrigger value="prd">PRD</TabsTrigger>
                   <TabsTrigger value="code">Code</TabsTrigger>
                   <TabsTrigger value="tasks">Tasks ({brain.tasks.filter(t => t.status !== 'completed').length})</TabsTrigger>
                 </TabsList>
                 
                 <TabsContent value="prd" className="flex-1 overflow-auto mt-4">
                    {brain.artifacts?.prd ? (
                      <div className="prose dark:prose-invert max-w-none">
                        <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-md">
                          {brain.artifacts.prd.content}
                        </pre>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No PRD generated yet.
                      </div>
                    )}
                 </TabsContent>

                 <TabsContent value="code" className="flex-1 overflow-auto mt-4">
                    {brain.artifacts?.code ? (
                      <div className="prose dark:prose-invert max-w-none">
                         <div className="mb-2 text-xs text-muted-foreground">{brain.artifacts.code.path}</div>
                         <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-md">
                          {brain.artifacts.code.content}
                        </pre>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No code generated yet.
                      </div>
                    )}
                 </TabsContent>

                 <TabsContent value="tasks" className="flex-1 overflow-auto mt-4">
                    <div className="space-y-2">
                      {brain.tasks.map(task => (
                        <div key={task.id} className="flex justify-between items-center p-3 border rounded-md">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              task.status === 'completed' ? 'bg-green-500' : 
                              task.status === 'in-progress' ? 'bg-blue-500' : 'bg-gray-300'
                            }`} />
                            <span className={task.status === 'completed' ? 'line-through text-muted-foreground' : ''}>
                              {task.title}
                            </span>
                          </div>
                          <Badge variant="outline">{task.assignedTo}</Badge>
                        </div>
                      ))}
                      {brain.tasks.length === 0 && <p className="text-muted-foreground">No active tasks.</p>}
                    </div>
                 </TabsContent>
               </Tabs>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
