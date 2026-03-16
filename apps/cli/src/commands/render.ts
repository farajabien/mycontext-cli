/**
 * Render Command
 *
 * CLI command to ingest Authority Engine Production Blueprints and produce
 * final media artifacts through the MyContext rendering pipeline.
 *
 * Usage:
 *   mycontext render <blueprint.json>          — Render from a blueprint file
 *   mycontext render --demo                    — Run with built-in sample blueprint
 *   mycontext render --demo --voiceover        — Include AI voiceover generation
 */

import chalk from "chalk";
import { Command } from "commander";
import * as path from "path";
import * as fs from "fs-extra";
import { v4 as uuidv4 } from "uuid";
import { ProductionBlueprint, RenderOutput } from "../types/blueprint-types";
import { VisionTestStep, VOScript, VOSegment, DemoConfig } from "../types/vision-testing";
import { DemoRecorderAgent } from "../agents/implementations/DemoRecorderAgent";
import { VOScriptExtractorAgent } from "../agents/implementations/VOScriptExtractorAgent";
import { AICore } from "../core/ai/AICore";

// ─────────────────────────────────────────────────────────────────────────────
// Blueprint → Pipeline Adapter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert Authority Engine scenes into MyContext VisionTestSteps
 * This bridges the Authority Engine schema to the existing demo pipeline.
 */
function blueprintToSteps(blueprint: ProductionBlueprint): VisionTestStep[] {
  return blueprint.scenes.map((scene, index) => ({
    // TestStep base fields
    id: `scene-${scene.sceneNumber}`,
    order: index,
    action: scene.title,
    intent: scene.script,
    screenshot: undefined,
    success: true,
    timestamp: new Date().toISOString(),
    duration: scene.duration * 1000, // ms
    selector: undefined,

    // VisionTestStep extensions
    visionDecision: {
      action: "complete" as const,
      confidence: 100,
      reasoning: `Scene ${scene.sceneNumber}: ${scene.plotPillar || "narrative scene"}`,
      visualContext: scene.visualPrompt,
      intent: scene.storyBeat || "narration",
      alignsWithPrimeObjective: true,
      gravityScore: 100,
    },
    visualAnalysis: {
      componentsDetected: ["scene-frame"],
      interactiveElements: [],
      textContent: [scene.script],
      colorPalette: [],
      layoutStructure: `${blueprint.outputFormat.aspectRatio} vertical video — ${scene.transition || "cut"} transition`,
    },
  }));
}

/**
 * Build a rich HTML storyboard from blueprint visual prompts
 */
function buildBlueprintStoryboardHTML(blueprint: ProductionBlueprint): string {
  const scenesHTML = blueprint.scenes
    .map((scene, index) => {
      // Beat-based color coding
      const beatColors: Record<string, string> = {
        hook: "#ff4444",
        build: "#ff8c00",
        payoff: "#00c853",
        transition: "#2979ff",
      };
      const beatColor = beatColors[scene.storyBeat || "build"] || "#666";

      return `
      <div class="scene" data-scene="${index}" ${index === 0 ? 'style="display:flex"' : ""}>
        <div class="scene-visual">
          <div class="visual-prompt-card">
            <div class="scene-badge" style="background:${beatColor}">
              ${(scene.storyBeat || "scene").toUpperCase()}
            </div>
            <h3>Scene ${scene.sceneNumber}: ${scene.title}</h3>
            <p class="visual-prompt">${scene.visualPrompt}</p>
            ${scene.bRollNotes ? `<p class="broll"><strong>B-Roll:</strong> ${scene.bRollNotes}</p>` : ""}
            <div class="scene-meta">
              <span class="duration">⏱ ${scene.duration}s</span>
              <span class="transition">→ ${scene.transition || "cut"}</span>
              ${scene.plotPillar ? `<span class="pillar">🎯 ${scene.plotPillar}</span>` : ""}
            </div>
          </div>
        </div>
        <div class="scene-script">
          <div class="script-card">
            <h4>🎙️ Script</h4>
            <blockquote>${scene.script}</blockquote>
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${blueprint.title} — MyContext Storyboard</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: #0a0a0a;
      color: #e0e0e0;
      min-height: 100vh;
    }
    .container { max-width: 1100px; margin: 0 auto; padding: 40px 20px; }

    /* Header */
    .header {
      text-align: center;
      padding: 60px 30px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      border-radius: 16px;
      margin-bottom: 30px;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .header h1 {
      font-size: 32px;
      font-weight: 700;
      background: linear-gradient(135deg, #00d2ff, #7b2ff7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 12px;
    }
    .header .subtitle { color: #888; font-size: 16px; line-height: 1.6; max-width: 600px; margin: 0 auto; }
    .header .meta {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-top: 20px;
      font-size: 13px;
      color: #666;
    }
    .header .meta span { display: flex; align-items: center; gap: 6px; }

    /* Narrative Strip */
    .narrative {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 30px;
    }
    .narrative-card {
      background: #111;
      border: 1px solid #222;
      border-radius: 12px;
      padding: 20px;
    }
    .narrative-card h4 { color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .narrative-card p { font-size: 14px; line-height: 1.5; }
    .narrative-card.mission p { color: #00d2ff; }
    .narrative-card.villain p { color: #ff4444; }
    .narrative-card.identity p { color: #00c853; }

    /* Controls */
    .controls {
      background: #111;
      border: 1px solid #222;
      border-radius: 12px;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }
    button {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      background: linear-gradient(135deg, #7b2ff7, #00d2ff);
      color: white;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: opacity 0.2s;
    }
    button:hover { opacity: 0.85; }
    button:disabled { opacity: 0.3; cursor: not-allowed; }
    .step-indicator { margin-left: auto; color: #666; font-size: 14px; }
    .voice-badge {
      background: #1a1a2e;
      color: #7b2ff7;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Scene */
    .scene { display: none; gap: 24px; }
    .scene-visual, .scene-script { flex: 1; }
    .visual-prompt-card, .script-card {
      background: #111;
      border: 1px solid #222;
      border-radius: 12px;
      padding: 24px;
      height: 100%;
    }
    .scene-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      color: white;
      letter-spacing: 1px;
      margin-bottom: 12px;
    }
    .visual-prompt-card h3 { font-size: 20px; margin-bottom: 16px; color: #fff; }
    .visual-prompt { color: #aaa; line-height: 1.7; font-size: 14px; }
    .broll { color: #666; margin-top: 12px; font-size: 13px; font-style: italic; }
    .scene-meta {
      display: flex;
      gap: 16px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #222;
      font-size: 13px;
      color: #666;
    }
    .script-card h4 { color: #888; margin-bottom: 16px; font-size: 14px; }
    .script-card blockquote {
      font-size: 18px;
      line-height: 1.8;
      color: #ddd;
      border-left: 3px solid #7b2ff7;
      padding-left: 20px;
      font-style: italic;
    }

    /* Footer */
    .footer {
      text-align: center;
      padding: 40px;
      color: #444;
      font-size: 12px;
    }
    .footer a { color: #7b2ff7; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${blueprint.title}</h1>
      <p class="subtitle">${blueprint.description}</p>
      <div class="meta">
        <span>📐 ${blueprint.outputFormat.aspectRatio}</span>
        <span>🎬 ${blueprint.scenes.length} scenes</span>
        <span>⏱ ${blueprint.totalDuration}s</span>
        <span>🎙️ ${blueprint.voiceTone.style} tone</span>
      </div>
    </div>

    <div class="narrative">
      <div class="narrative-card mission">
        <h4>🎯 Mission</h4>
        <p>${blueprint.narrative.mission}</p>
      </div>
      <div class="narrative-card villain">
        <h4>👿 Villain</h4>
        <p>${blueprint.narrative.villain}</p>
      </div>
      <div class="narrative-card identity">
        <h4>🦋 Identity Shift</h4>
        <p>${blueprint.narrative.identityShift}</p>
      </div>
    </div>

    <div class="controls">
      <button id="prevBtn">← Prev</button>
      <button id="nextBtn">Next →</button>
      <span class="voice-badge">🎙️ ${blueprint.voiceTone.style} · ${blueprint.voiceTone.pace || "moderate"}</span>
      <div class="step-indicator">
        Scene <span id="currentScene">1</span> / <span id="totalScenes">${blueprint.scenes.length}</span>
      </div>
    </div>

    <div class="scenes">
      ${scenesHTML}
    </div>

    <div class="footer">
      Rendered by <a href="https://github.com/farajabien/mycontext-cli">MyContext</a> · Authority Engine Integration
    </div>
  </div>

  <script>
    let current = 0;
    const total = ${blueprint.scenes.length};

    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const currentSpan = document.getElementById('currentScene');

    function show(i) {
      document.querySelectorAll('.scene').forEach(s => s.style.display = 'none');
      const el = document.querySelector('[data-scene="' + i + '"]');
      if (el) el.style.display = 'flex';
      current = i;
      currentSpan.textContent = i + 1;
      prevBtn.disabled = i === 0;
      nextBtn.disabled = i === total - 1;
    }

    prevBtn.addEventListener('click', () => { if (current > 0) show(current - 1); });
    nextBtn.addEventListener('click', () => { if (current < total - 1) show(current + 1); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' && current > 0) show(current - 1);
      if (e.key === 'ArrowRight' && current < total - 1) show(current + 1);
    });

    show(0);
  </script>
</body>
</html>`;
}


// ─────────────────────────────────────────────────────────────────────────────
// Render Pipeline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Execute the full render pipeline for an Authority Engine blueprint
 */
async function executeRender(
  blueprint: ProductionBlueprint,
  options: { voiceover?: boolean; audio?: boolean; outputDir?: string },
  projectPath: string
): Promise<RenderOutput> {
  const startTime = Date.now();
  const renderDir = options.outputDir ||
    path.join(projectPath, ".mycontext", "renders", `${blueprint.id}-${Date.now()}`);
  await fs.ensureDir(renderDir);

  console.log(chalk.bold.magenta(`\n${"═".repeat(70)}`));
  console.log(chalk.bold.magenta(`🎬 MYCONTEXT RENDER ENGINE`));
  console.log(chalk.bold.magenta(`${"═".repeat(70)}\n`));
  console.log(chalk.white(`Blueprint: ${blueprint.title}`));
  console.log(chalk.gray(`Scenes: ${blueprint.scenes.length}`));
  console.log(chalk.gray(`Duration: ${blueprint.totalDuration}s`));
  console.log(chalk.gray(`Voice: ${blueprint.voiceTone.style} (${blueprint.voiceTone.pace || "moderate"})`));
  console.log(chalk.gray(`Format: ${blueprint.outputFormat.aspectRatio} @ ${blueprint.outputFormat.resolution}`));
  console.log(chalk.gray(`Output: ${renderDir}\n`));

  // ── Narrative Context ──────────────────────────────────────────────────
  console.log(chalk.bold.cyan(`\n━━━ NARRATIVE CONTEXT ━━━`));
  console.log(chalk.white(`  🎯 Mission: ${blueprint.narrative.mission}`));
  console.log(chalk.red(`  👿 Villain: ${blueprint.narrative.villain}`));
  console.log(chalk.green(`  🦋 Shift:   ${blueprint.narrative.identityShift}\n`));

  // Convert blueprint to steps
  const steps = blueprintToSteps(blueprint);

  // ── PHASE 1: Storyboard HTML ───────────────────────────────────────────
  console.log(chalk.bold.cyan(`\n━━━ PHASE 1: STORYBOARD GENERATION ━━━`));
  const storyboardPath = path.join(renderDir, "storyboard.html");
  const storyboardHTML = buildBlueprintStoryboardHTML(blueprint);
  await fs.writeFile(storyboardPath, storyboardHTML, "utf-8");
  console.log(chalk.green(`  ✓ Interactive storyboard → ${storyboardPath}`));

  // ── PHASE 2: Voiceover Script ──────────────────────────────────────────
  console.log(chalk.bold.cyan(`\n━━━ PHASE 2: VOICEOVER SCRIPT ━━━`));

  const voScriptPath = path.join(renderDir, "voiceover-script.json");

  // Build segments directly from blueprint (no vision extraction needed)
  const segments: VOSegment[] = blueprint.scenes.map((scene, i) => {
    const wordCount = scene.script.split(/\s+/).length;
    const estimatedDuration = Math.max((wordCount / 150) * 60, scene.duration);

    return {
      id: uuidv4(),
      timestamp: blueprint.scenes.slice(0, i).reduce((sum, s) => sum + s.duration, 0),
      duration: estimatedDuration,
      narration: scene.script,
      action: scene.title,
      metadata: {
        step: scene.sceneNumber,
        uiState: scene.visualPrompt.substring(0, 80) + "...",
        textOnScreen: [scene.title, scene.plotPillar || ""].filter(Boolean),
      },
    };
  });

  const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0);
  const fullScriptMd = buildVOScriptMarkdown(blueprint, segments);

  const voScript: VOScript = {
    title: blueprint.title,
    totalDuration,
    segments,
    fullScript: fullScriptMd,
  };

  await fs.writeFile(voScriptPath, JSON.stringify(voScript, null, 2), "utf-8");
  console.log(chalk.green(`  ✓ VO Script JSON → ${voScriptPath}`));

  const voScriptMdPath = path.join(renderDir, "voiceover-script.md");
  await fs.writeFile(voScriptMdPath, fullScriptMd, "utf-8");
  console.log(chalk.green(`  ✓ VO Script Markdown → ${voScriptMdPath}`));

  segments.forEach((seg, i) => {
    console.log(chalk.gray(`    [${formatTimestamp(seg.timestamp)}] Scene ${i + 1}: "${seg.narration.substring(0, 50)}..."`));
  });

  // ── PHASE 3: AI Voice Enhancement (optional) ──────────────────────────
  let audioSegments: string[] = [];
  if (options.voiceover) {
    console.log(chalk.bold.cyan(`\n━━━ PHASE 3: AI VOICEOVER ━━━`));

    try {
      // Initialize AICore if not already
      try {
        AICore.getInstance();
      } catch {
        AICore.getInstance({
          workingDirectory: projectPath,
          fallbackEnabled: true,
        });
      }

      const aiCore = AICore.getInstance();

      // Use Gemini to enhance the script with professional narration
      for (let i = 0; i < segments.length; i++) {
        const scene = blueprint.scenes[i]!;
        const seg = segments[i]!;

        console.log(chalk.cyan(`  🎙️ Enhancing Scene ${i + 1}: ${scene.title}`));

        const enhancePrompt = `You are a professional voiceover script editor.

Voice Tone: ${blueprint.voiceTone.style}, pace: ${blueprint.voiceTone.pace || "moderate"}
${blueprint.voiceTone.emphasis?.length ? `Emphasis words: ${blueprint.voiceTone.emphasis.join(", ")}` : ""}

Story Beat: ${scene.storyBeat || "narration"}
Plot Pillar: ${scene.plotPillar || "general"}

Original Script:
"${scene.script}"

Polish this script for AI voiceover delivery. Keep the exact meaning but optimize for:
1. Natural speech rhythm and breathing points (marked with ...)
2. ${blueprint.voiceTone.style} tone throughout
3. Emphasis on key phrases
4. Clean pronunciation-friendly phrasing

Return ONLY the polished script text, nothing else.`;

        try {
          const enhanced = await aiCore.generateText(enhancePrompt, {
            temperature: 0.6,
            maxTokens: 500,
          });
          seg.narration = enhanced.trim();
          console.log(chalk.gray(`    ✓ Enhanced: "${seg.narration.substring(0, 60)}..."`));
        } catch (err: any) {
          console.log(chalk.yellow(`    ⚠ Enhancement failed, using original: ${err.message?.substring(0, 50)}`));
        }
      }

      // Save enhanced script
      const enhancedScript: VOScript = {
        ...voScript,
        segments,
        fullScript: buildVOScriptMarkdown(blueprint, segments),
      };
      await fs.writeFile(voScriptPath, JSON.stringify(enhancedScript, null, 2), "utf-8");
      await fs.writeFile(voScriptMdPath, enhancedScript.fullScript, "utf-8");
      console.log(chalk.green(`\n  ✓ Enhanced scripts saved`));

    } catch (err: any) {
      console.log(chalk.yellow(`\n  ⚠ AI voiceover enhancement failed: ${err.message}`));
      console.log(chalk.gray(`    Falling back to original scripts`));
    }
  }

  // ── PHASE 4: Markdown Production Script ────────────────────────────────
  console.log(chalk.bold.cyan(`\n━━━ PHASE ${options.voiceover ? "4" : "3"}: PRODUCTION SCRIPT ━━━`));
  const prodScriptPath = path.join(renderDir, "production-script.md");
  const prodScript = buildProductionScript(blueprint);
  await fs.writeFile(prodScriptPath, prodScript, "utf-8");
  console.log(chalk.green(`  ✓ Production Script → ${prodScriptPath}`));

  // ── Summary ────────────────────────────────────────────────────────────
  const endTime = Date.now();
  const wordsSpoken = segments.reduce((sum, s) => sum + s.narration.split(/\s+/).length, 0);

  const renderOutput: RenderOutput = {
    blueprintId: blueprint.id,
    renderedAt: new Date().toISOString(),
    outputDir: renderDir,
    artifacts: {
      voiceoverScript: voScriptPath,
      voiceoverMarkdown: voScriptMdPath,
      storyboardHtml: storyboardPath,
      audioSegments: audioSegments.length > 0 ? audioSegments : undefined,
    },
    stats: {
      totalScenes: blueprint.scenes.length,
      totalDuration: blueprint.totalDuration,
      wordsSpoken,
      generationTime: endTime - startTime,
    },
  };

  // Save render manifest
  const manifestPath = path.join(renderDir, "render-manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(renderOutput, null, 2), "utf-8");

  console.log(chalk.bold.magenta(`\n${"═".repeat(70)}`));
  console.log(chalk.bold.green(`✅ RENDER COMPLETE`));
  console.log(chalk.bold.magenta(`${"═".repeat(70)}\n`));
  console.log(chalk.white(`  📐 Scenes:      ${renderOutput.stats.totalScenes}`));
  console.log(chalk.white(`  ⏱  Duration:    ${renderOutput.stats.totalDuration}s`));
  console.log(chalk.white(`  📝 Words:       ${renderOutput.stats.wordsSpoken}`));
  console.log(chalk.white(`  ⚡ Generated in: ${(renderOutput.stats.generationTime / 1000).toFixed(1)}s`));
  console.log(chalk.gray(`\n  📂 Output: ${renderDir}`));
  console.log(chalk.gray(`     ├── storyboard.html`));
  console.log(chalk.gray(`     ├── voiceover-script.json`));
  console.log(chalk.gray(`     ├── voiceover-script.md`));
  console.log(chalk.gray(`     ├── production-script.md`));
  console.log(chalk.gray(`     └── render-manifest.json\n`));

  return renderOutput;
}


// ─────────────────────────────────────────────────────────────────────────────
// Helper: Build Markdown Scripts
// ─────────────────────────────────────────────────────────────────────────────

function buildVOScriptMarkdown(blueprint: ProductionBlueprint, segments: VOSegment[]): string {
  const lines: string[] = [
    `# ${blueprint.title} — Voice-Over Script`,
    "",
    blueprint.description,
    "",
    `**Voice Tone**: ${blueprint.voiceTone.style} · ${blueprint.voiceTone.pace || "moderate"}`,
    `**Duration**: ${formatDuration(segments.reduce((sum, s) => sum + s.duration, 0))}`,
    `**Segments**: ${segments.length}`,
    `**Format**: ${blueprint.outputFormat.aspectRatio} @ ${blueprint.outputFormat.resolution}`,
    "",
    "---",
    "",
    "## Narration",
    "",
  ];

  segments.forEach((segment, index) => {
    const scene = blueprint.scenes[index];
    lines.push(`### [${formatTimestamp(segment.timestamp)}] Scene ${index + 1}: ${segment.action}`);
    lines.push("");
    if (scene?.storyBeat) lines.push(`> **Beat**: ${scene.storyBeat.toUpperCase()} · **Pillar**: ${scene.plotPillar || "—"}`);
    lines.push("");
    lines.push(`**Duration**: ${segment.duration.toFixed(1)}s`);
    lines.push("");
    lines.push(`> ${segment.narration}`);
    lines.push("");
    if (scene?.visualPrompt) {
      lines.push(`*Visual: ${scene.visualPrompt.substring(0, 120)}...*`);
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  });

  return lines.join("\n");
}

function buildProductionScript(blueprint: ProductionBlueprint): string {
  const lines: string[] = [
    `# ${blueprint.title}`,
    `## Production Script`,
    "",
    `**Source**: ${blueprint.source}`,
    `**Created**: ${blueprint.createdAt}`,
    `**Format**: ${blueprint.outputFormat.aspectRatio} · ${blueprint.outputFormat.resolution}`,
    `**Total Duration**: ${blueprint.totalDuration}s`,
    "",
    "---",
    "",
    "## Narrative Framework",
    "",
    `| Element | Content |`,
    `|---------|---------|`,
    `| 🎯 Mission | ${blueprint.narrative.mission} |`,
    `| 👿 Villain | ${blueprint.narrative.villain} |`,
    `| 🦋 Identity Shift | ${blueprint.narrative.identityShift} |`,
    "",
    "---",
    "",
    "## Scene Breakdown",
    "",
  ];

  blueprint.scenes.forEach((scene) => {
    lines.push(`### Scene ${scene.sceneNumber}: ${scene.title}`);
    lines.push("");
    lines.push(`| Property | Value |`);
    lines.push(`|----------|-------|`);
    lines.push(`| ⏱ Duration | ${scene.duration}s |`);
    lines.push(`| 🎯 Plot Pillar | ${scene.plotPillar || "—"} |`);
    lines.push(`| 🎭 Story Beat | ${scene.storyBeat || "—"} |`);
    lines.push(`| → Transition | ${scene.transition || "cut"} |`);
    lines.push("");
    lines.push("**🎙️ Script:**");
    lines.push(`> ${scene.script}`);
    lines.push("");
    lines.push("**🎨 Visual Direction:**");
    lines.push(`> ${scene.visualPrompt}`);
    lines.push("");
    if (scene.bRollNotes) {
      lines.push(`**📹 B-Roll:** ${scene.bRollNotes}`);
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  });

  if (blueprint.storyBeats) {
    lines.push("## Story Architecture");
    lines.push("");
    lines.push(`**Beats**: ${blueprint.storyBeats.join(" → ")}`);
    lines.push("");
    if (blueprint.plotPillars) {
      lines.push(`**Pillars**: ${blueprint.plotPillars.join(" → ")}`);
      lines.push("");
    }
  }

  lines.push("---");
  lines.push(`*Rendered by MyContext · Authority Engine Integration*`);

  return lines.join("\n");
}


// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}


// ─────────────────────────────────────────────────────────────────────────────
// CLI Command Registration
// ─────────────────────────────────────────────────────────────────────────────

export function registerRenderCommand(program: Command): void {
  program
    .command("render")
    .description("Render an Authority Engine Production Blueprint into media artifacts")
    .argument("[blueprint]", "Path to blueprint JSON file")
    .option("--demo", "Use built-in sample blueprint for demo")
    .option("--voiceover", "Enhance scripts with AI voiceover processing")
    .option("--audio", "Generate audio files using TTS (requires voiceover)")
    .option("--output <dir>", "Custom output directory")
    .action(async (blueprintPath: string | undefined, options: any) => {
      const projectPath = process.cwd();

      let blueprint: ProductionBlueprint;

      if (options.demo) {
        // Load built-in sample blueprint
        console.log(chalk.blue("\n📦 Loading built-in Authority Engine sample blueprint...\n"));

        // Try loading from the templates directory (works in both dev and built modes)
        const candidates = [
          path.join(__dirname, "..", "templates", "sample-authority-blueprint.json"),
          path.join(__dirname, "templates", "sample-authority-blueprint.json"),
          path.join(projectPath, "apps", "cli", "src", "templates", "sample-authority-blueprint.json"),
        ];

        let loaded = false;
        for (const candidate of candidates) {
          if (await fs.pathExists(candidate)) {
            blueprint = await fs.readJson(candidate);
            loaded = true;
            break;
          }
        }

        if (!loaded) {
        console.error(chalk.red("❌ Could not find sample blueprint. Try specifying a blueprint file path."));
        process.exit(1);
        }

        blueprint = blueprint!;
      } else if (blueprintPath) {
        // Load from specified file
        const resolvedPath = path.resolve(projectPath, blueprintPath);

        if (!(await fs.pathExists(resolvedPath))) {
          console.error(chalk.red(`❌ Blueprint file not found: ${resolvedPath}`));
          process.exit(1);
        }

        try {
          blueprint = await fs.readJson(resolvedPath);
        } catch (err: any) {
          console.error(chalk.red(`❌ Invalid blueprint JSON: ${err.message}`));
          process.exit(1);
        }
      } else {
        console.error(chalk.red("❌ Please specify a blueprint file or use --demo"));
        console.log(chalk.gray("\n  Usage:"));
        console.log(chalk.gray("    mycontext render <blueprint.json>    Render from a file"));
        console.log(chalk.gray("    mycontext render --demo              Run with sample blueprint"));
        console.log(chalk.gray("    mycontext render --demo --voiceover  Include AI voiceover\n"));
        process.exit(1);
      }

      // Validate blueprint has required fields
      if (!blueprint.scenes || blueprint.scenes.length === 0) {
        console.error(chalk.red("❌ Blueprint must contain at least one scene"));
        process.exit(1);
      }

      // Execute render
      await executeRender(blueprint, {
        voiceover: options.voiceover,
        audio: options.audio,
        outputDir: options.output,
      }, projectPath);
    });
}
