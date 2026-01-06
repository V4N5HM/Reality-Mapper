import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// POST - Generate angle for an idea using Claude
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, clientName, contentType, hook, script, source, sourceLink, instructions } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Build context from available information
    let context = `Title/Topic: ${title}`;
    if (clientName) context += `\nClient: ${clientName}`;
    if (contentType) context += `\nContent Type: ${contentType}`;
    if (hook) context += `\nHook: ${hook}`;
    if (script) context += `\nScript/Notes: ${script}`;
    if (source) context += `\nSource: ${source}`;
    if (sourceLink) context += `\nSource Link: ${sourceLink}`;

    // Build the prompt
    const prompt = `You are a content strategist. Generate a brief, specific angle for this content idea.

${context}
${instructions ? `\nInstructions: ${instructions}` : ''}

Requirements:
- 1-2 sentences maximum
- Be specific to the topic provided
- If the topic is vague, ask what specific aspect to focus on
- Don't make up generic advice - tie directly to the title/topic

Respond with ONLY the angle text. No preamble.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract the response text
    const angleText = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : '';

    if (!angleText) {
      return NextResponse.json(
        { error: 'Failed to generate angle' },
        { status: 500 }
      );
    }

    return NextResponse.json({ angle: angleText });
  } catch (error) {
    console.error('[Ideas] Error generating angle:', error);
    return NextResponse.json(
      { error: 'Failed to generate angle' },
      { status: 500 }
    );
  }
}
