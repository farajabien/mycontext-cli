'use server';

import fs from 'fs';
import path from 'path';
import { TwitterApi } from 'twitter-api-v2';

// Read knowledge base from docs folder
function readKnowledgeBase() {
  try {
    const docsDir = path.join(process.cwd(), 'docs');
    const files = [];

    if (fs.existsSync(docsDir)) {
      const walk = (dir) => {
        for (const entry of fs.readdirSync(dir)) {
          const full = path.join(dir, entry);
          const stat = fs.statSync(full);
          if (stat.isDirectory()) walk(full);
          else if (/\.(md|txt)$/i.test(entry)) {
            try {
              const content = fs.readFileSync(full, 'utf8');
              files.push({
                file: path.relative(docsDir, full),
                content: content,
                size: content.length
              });
            } catch (error) {
              console.warn(`Could not read ${full}:`, error.message);
            }
          }
        }
      };
      walk(docsDir);
    }

    return files.filter(f => f.size > 100);
  } catch (_error) {
    console.log('Knowledge base not available, using fallback');
    return [];
  }
}

// Extract relevant context for tweet generation
function extractRelevantContext(knowledgeFiles, maxLength = 1000) {
  let context = '';
  const relevantSections = [];

  for (const file of knowledgeFiles) {
    const lines = file.content.split('\n');
    let currentSection = '';
    let inRelevantSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const hasKeywords = /mycontext|cli|react|javascript|web|component|ai|agent|workflow|generate|context|npm|package|shadcn|typescript|vercel|nextjs/i.test(line.toLowerCase());
      const isHeader = line.startsWith('#') && line.length < 100;
      const isListItem = line.startsWith('- ') || line.startsWith('* ') || line.startsWith('1. ') || /^\d+\./.test(line);
      const isCodeBlock = line.includes('```') || line.includes('mycontext') || line.includes('npm');
      const isFeatureDescription = line.length > 20 && (line.includes('AI') || line.includes('agent') || line.includes('generate'));

      if (hasKeywords || isHeader || isListItem || isCodeBlock || isFeatureDescription) {
        const start = Math.max(0, i - 1);
        const end = Math.min(lines.length, i + 2);

        for (let j = start; j < end; j++) {
          if (!currentSection.includes(lines[j])) {
            currentSection += lines[j] + '\n';
          }
        }

        inRelevantSection = true;
      } else if (inRelevantSection && line.trim() === '') {
        if (currentSection.trim()) {
          relevantSections.push({
            source: file.file,
            content: currentSection.trim(),
            relevance: currentSection.length
          });
          currentSection = '';
          inRelevantSection = false;
        }
      }
    }

    if (currentSection.trim()) {
      relevantSections.push({
        source: file.file,
        content: currentSection.trim(),
        relevance: currentSection.length
      });
    }
  }

  relevantSections.sort((a, b) => b.relevance - a.relevance);

  for (const section of relevantSections) {
    if (context.length + section.content.length > maxLength) break;
    context += section.content + ' ';
  }

  return context.trim().substring(0, 800);
}

// Generate tweet with GitHub Models
async function generateTweetWithGitHub(context) {
  try {
    const response = await fetch('https://models.github.ai/inference/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MYCONTEXT_GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant specialized in creating engaging social media content about developer tools, especially MyContext CLI - an AI-powered component generator for React developers.'
          },
          {
            role: 'user',
            content: `Generate a short, engaging tweet about MyContext CLI based on this context. Keep it under 200 characters, make it witty and highlight the unique value proposition. Include a link to https://www.npmjs.com/package/mycontext-cli at the end.

Context: ${context.substring(0, 500)}`
          }
        ],
        max_tokens: 120,
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub Models API error: ${response.status}`);
    }

    const data = await response.json();
    let tweet = data.choices[0].message.content.trim();

    tweet = tweet.replace(/^["']|["']$/g, '');
    tweet = tweet.replace(/\n/g, ' ');

    if (tweet.length > 180) {
      tweet = tweet.substring(0, 177) + '...';
    }

    const npmLink = 'https://www.npmjs.com/package/mycontext-cli';
    if (!tweet.includes(npmLink)) {
      tweet = `${tweet} — ${npmLink}`;
    }

    return tweet;
  } catch (error) {
    console.warn('GitHub Models failed:', error.message);
    return null;
  }
}

// Generate tweet with OpenAI
async function generateTweetWithOpenAI(_context) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { OpenAI } = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = `You are a social media expert promoting MyContext CLI, a revolutionary AI-powered component generator for React developers.

KEY FACTS:
- First agentic AI that actually understands your project
- Built by ONE developer competing with Codex, Claude Code, Cline
- Generates production-ready React components with shadcn/ui
- Available on npm: https://www.npmjs.com/package/mycontext-cli

Generate a short, engaging tweet under 200 characters that's witty and highlights MyContext's unique value proposition.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate an engaging tweet about MyContext CLI' }
      ],
      max_tokens: 120,
      temperature: 0.9,
    });

    let tweet = response.choices[0].message.content.trim();

    tweet = tweet.replace(/^["']|["']$/g, '');
    tweet = tweet.replace(/\n/g, ' ');

    if (tweet.length > 180) {
      tweet = tweet.substring(0, 177) + '...';
    }

    const npmLink = 'https://www.npmjs.com/package/mycontext-cli';
    if (!tweet.includes(npmLink)) {
      tweet = `${tweet} — ${npmLink}`;
    }

    return tweet;
  } catch (error) {
    console.warn('OpenAI failed:', error.message);
    return null;
  }
}

// SERVER ACTION - Generate tweet from docs
export async function generateTwitterBotTweet() {
  try {
    console.log('🎯 Twitter Bot Server Action: Generating tweet');

    // Read knowledge base from docs
    const knowledgeFiles = readKnowledgeBase();
    console.log(`📚 Found ${knowledgeFiles.length} knowledge files`);

    // Extract relevant context
    const context = extractRelevantContext(knowledgeFiles);
    console.log(`📝 Context extracted: ${context.length} characters`);

    // Generate tweet with GitHub Models (primary)
    console.log('🤖 Generating tweet with GitHub Models...');
    let tweet = await generateTweetWithGitHub(context);

    // Fallback to OpenAI
    if (!tweet) {
      console.log('🔄 Falling back to OpenAI...');
      tweet = await generateTweetWithOpenAI(context);
    }

    // Final fallback
    if (!tweet) {
      console.log('⚠️ Using fallback tweet');
      tweet = 'Experience agentic AI development with MyContext CLI — the AI that actually understands your project! 🚀 — https://www.npmjs.com/package/mycontext-cli';
    }

    console.log('📝 Generated tweet:', tweet);

    return {
      success: true,
      tweet: tweet,
      posted: false,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Server Action Error:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// SERVER ACTION - Post tweet to Twitter
export async function postTweetToTwitter(tweet) {
  try {
    console.log('🐦 Posting tweet to Twitter...');

    if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET ||
        !process.env.TWITTER_ACCESS_TOKEN || !process.env.TWITTER_ACCESS_SECRET) {
      throw new Error('Twitter API credentials not configured');
    }

    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    });

    const result = await client.v2.tweet(tweet);

    console.log('✅ Tweet posted successfully!');
    console.log('🔗 URL:', `https://twitter.com/i/status/${result.data.id}`);

    return {
      success: true,
      tweetId: result.data.id,
      url: `https://twitter.com/i/status/${result.data.id}`,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Twitter API Error:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// SERVER ACTION - Generate and post tweet
export async function generateAndPostTweet() {
  try {
    console.log('🎯 Generating and posting tweet...');

    // Generate tweet
    const generateResult = await generateTwitterBotTweet();
    if (!generateResult.success) {
      return generateResult;
    }

    // Post tweet
    const postResult = await postTweetToTwitter(generateResult.tweet);

    return {
      ...postResult,
      tweet: generateResult.tweet,
      generated: true,
      posted: postResult.success
    };

  } catch (error) {
    console.error('❌ Combined Action Error:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// SERVER ACTION - Health check
export async function checkTwitterBotHealth() {
  try {
    console.log('🏥 Checking Twitter Bot Health...');

    const checks = {
      twitterCredentials: !!(process.env.TWITTER_API_KEY && process.env.TWITTER_API_SECRET &&
                            process.env.TWITTER_ACCESS_TOKEN && process.env.TWITTER_ACCESS_SECRET),
      githubToken: !!process.env.MYCONTEXT_GITHUB_TOKEN,
      openaiKey: !!process.env.OPENAI_API_KEY,
      docsFolder: fs.existsSync(path.join(process.cwd(), 'docs')),
    };

    const knowledgeFiles = readKnowledgeBase();
    checks.knowledgeBase = knowledgeFiles.length > 0;

    const allHealthy = Object.values(checks).every(check => check);

    return {
      success: true,
      healthy: allHealthy,
      checks: checks,
      knowledgeFiles: knowledgeFiles.length,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Health Check Error:', error);
    return {
      success: false,
      healthy: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}
