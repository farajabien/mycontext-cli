
import { NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import { Brain, BrainUpdate } from '@myycontext/core/src/types/brain';
import { v4 as uuidv4 } from 'uuid';

// Find project root similarly to the orchestrator (simplified for this context)
// In a real app, this might be configured via env var or standard monorepo traverse
const findProjectRoot = () => {
    let current = process.cwd();
    // Move up until we find pnpm-workspace.yaml or .mycontext folder
    // For the Next.js app running in apps/web, we need to go up two levels to root
    return path.resolve(current, '../../'); 
};

const PROJECT_ROOT = findProjectRoot();
const BRAIN_PATH = path.join(PROJECT_ROOT, '.mycontext', 'brain.json');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, payload } = body;

    if (!fs.existsSync(BRAIN_PATH)) {
      return NextResponse.json({ error: 'Brain not found' }, { status: 404 });
    }

    const brain: Brain = await fs.readJson(BRAIN_PATH);

    if (type === 'comment') {
      const update: BrainUpdate = {
        id: uuidv4(),
        timestamp: Date.now(),
        agent: 'User',
        role: 'user',
        type: 'feedback',
        message: payload.message,
        metadata: {
           sentiment: 'neutral' // could use AI to analyze later
        }
      };
      brain.updates.push(update);
      brain.status = 'user_input'; // Signal to orchestrator
    } else if (type === 'pause') {
        brain.status = 'paused';
        const update: BrainUpdate = {
            id: uuidv4(),
            timestamp: Date.now(),
            agent: 'User',
            role: 'user',
            type: 'action',
            message: 'Paused the brain.'
        };
        brain.updates.push(update);
    } else if (type === 'resume') {
        brain.status = 'thinking'; // or 'idle' depending on prev state, but thinking resumes the loop
         const update: BrainUpdate = {
            id: uuidv4(),
            timestamp: Date.now(),
            agent: 'User',
            role: 'user',
            type: 'action',
            message: 'Resumed the brain.'
        };
        brain.updates.push(update);
    }

    await fs.writeJson(BRAIN_PATH, brain, { spaces: 2 });
    return NextResponse.json({ success: true, brain });

  } catch (error) {
    console.error('Error updating brain:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
