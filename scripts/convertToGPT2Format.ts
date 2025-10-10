#!/usr/bin/env node

/**
 * Convert MyContext training data to GPT-2 format
 *
 * Simplifies the complex training data for GPT-2's 1024 token limit
 * and removes special tokens that GPT-2 doesn't understand.
 */

import fs from "fs";
import path from "path";

interface GPT2Example {
  text: string;
}

interface TrainingExample {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
}

function convertToGPT2Format() {
  const inputFile = path.join(__dirname, "training_data.jsonl");
  const outputFile = path.join(__dirname, "gpt2_training_data.jsonl");

  console.log("🔄 Converting training data to GPT-2 format...");

  // Check if input file exists
  if (!fs.existsSync(inputFile)) {
    console.error(
      "❌ training_data.jsonl not found. Run generateTrainingData.ts first!"
    );
    process.exit(1);
  }

  // Read the generated training data
  const data = fs.readFileSync(inputFile, "utf8");
  const lines = data.split("\n").filter((line) => line.trim());

  console.log(`📊 Found ${lines.length} training examples`);

  const gpt2Data: GPT2Example[] = [];

  for (const line of lines) {
    try {
      const example: TrainingExample = JSON.parse(line);

      // Extract user prompt and assistant response
      const userMessage = example.messages.find((m) => m.role === "user");
      const assistantMessage = example.messages.find(
        (m) => m.role === "assistant"
      );

      if (!userMessage || !assistantMessage) {
        console.warn("⚠️ Skipping example without user/assistant messages");
        continue;
      }

      // Clean up the assistant response for GPT-2
      let response = assistantMessage.content;

      // Remove system instructions (GPT-2 doesn't need them)
      response = response.replace(/You are an expert.*?\.\n\n/g, "");

      // Simplify code blocks (remove complex reasoning)
      response = response.replace(/```typescript\n/g, "```tsx\n");

      // Remove intent mapping explanations (too complex for GPT-2)
      response = response.replace(/\*\*Intent Mapping Applied:\*\*.*$/s, "");

      // Truncate if too long (GPT-2 has 1024 token limit)
      const fullText = `User: ${userMessage.content}\nAssistant: ${response}`;

      if (fullText.length > 3000) {
        // Rough token estimate
        // Keep only the essential parts
        const shortResponse = response.split("\n").slice(0, 20).join("\n");
        const shortText = `User: ${userMessage.content}\nAssistant: ${shortResponse}`;
        gpt2Data.push({ text: shortText });
      } else {
        gpt2Data.push({ text: fullText });
      }
    } catch (error) {
      console.warn("⚠️ Skipping malformed JSON line:", error);
    }
  }

  // Write GPT-2 format
  const output = gpt2Data.map((item) => JSON.stringify(item)).join("\n");
  fs.writeFileSync(outputFile, output);

  console.log(`✅ Converted ${gpt2Data.length} examples to GPT-2 format`);
  console.log(`📁 Output saved to: ${outputFile}`);

  // Show sample
  if (gpt2Data.length > 0) {
    console.log("\n📋 Sample GPT-2 format:");
    console.log(gpt2Data[0].text.substring(0, 200) + "...");
  }

  // Show statistics
  const avgLength =
    gpt2Data.reduce((sum, item) => sum + item.text.length, 0) / gpt2Data.length;
  console.log(`\n📊 Statistics:`);
  console.log(`   Average text length: ${Math.round(avgLength)} characters`);
  console.log(
    `   Estimated tokens: ${Math.round(avgLength / 4)} (rough estimate)`
  );
}

// Run the conversion
convertToGPT2Format();
