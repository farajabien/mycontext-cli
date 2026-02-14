
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Adjust this path based on where apps/web is getting run from
// Assuming monorepo root is two levels up from apps/web
const BRAIN_PATH = path.resolve(process.cwd(), '../../.mycontext/brain.json');

export async function GET() {
  try {
    if (!fs.existsSync(BRAIN_PATH)) {
      return NextResponse.json({ error: 'Brain not found', path: BRAIN_PATH }, { status: 404 });
    }

    const fileContent = fs.readFileSync(BRAIN_PATH, 'utf-8');
    const brain = JSON.parse(fileContent);

    return NextResponse.json(brain);
  } catch (error) {
    console.error('Error reading brain:', error);
    return NextResponse.json({ error: 'Failed to read brain' }, { status: 500 });
  }
}
