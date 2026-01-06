import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/auth/session';
import { notion, databases, getRichText } from '@/lib/notion/client';

// GET - Get Fireflies API key status (not the actual key for security)
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.userType !== 'team') {
      return NextResponse.json({ error: 'Only team members can access this' }, { status: 403 });
    }

    if (!databases.teamMembers) {
      return NextResponse.json({
        hasApiKey: false,
        message: 'Team database not configured'
      });
    }

    // Find the Notion page for this user
    const existingMembers = await notion.databases.query({
      database_id: databases.teamMembers,
      filter: {
        property: 'Email',
        email: {
          equals: session.email.toLowerCase(),
        },
      },
    });

    if (existingMembers.results.length === 0) {
      return NextResponse.json({
        hasApiKey: false,
        message: 'User not found in database'
      });
    }

    const page = existingMembers.results[0] as any;
    const apiKey = getRichText(page.properties['Fireflies API Key']?.rich_text || []);

    return NextResponse.json({
      hasApiKey: !!apiKey && apiKey.length > 0,
      // Show last 4 chars masked for verification
      maskedKey: apiKey ? `****${apiKey.slice(-4)}` : null,
    });
  } catch (error) {
    console.error('Fireflies GET error:', error);
    return NextResponse.json({ error: 'Failed to get Fireflies status' }, { status: 500 });
  }
}

// POST - Save Fireflies API key
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.userType !== 'team') {
      return NextResponse.json({ error: 'Only team members can access this' }, { status: 403 });
    }

    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // Basic validation - Fireflies API keys are typically long strings
    if (apiKey.length < 20) {
      return NextResponse.json({ error: 'Invalid API key format' }, { status: 400 });
    }

    if (!databases.teamMembers) {
      return NextResponse.json({ error: 'Team database not configured' }, { status: 500 });
    }

    // Find the Notion page for this user
    const existingMembers = await notion.databases.query({
      database_id: databases.teamMembers,
      filter: {
        property: 'Email',
        email: {
          equals: session.email.toLowerCase(),
        },
      },
    });

    if (existingMembers.results.length === 0) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    const pageId = existingMembers.results[0].id;

    // Validate the API key by trying to fetch users from Fireflies
    try {
      const testResponse = await fetch('https://api.fireflies.ai/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query: `{ users { name email } }`,
        }),
      });

      const testData = await testResponse.json();

      if (testData.errors) {
        return NextResponse.json({
          error: 'Invalid Fireflies API key - authentication failed'
        }, { status: 400 });
      }
    } catch (validationError) {
      return NextResponse.json({
        error: 'Could not validate Fireflies API key'
      }, { status: 400 });
    }

    // Save the API key to Notion
    await notion.pages.update({
      page_id: pageId,
      properties: {
        'Fireflies API Key': {
          rich_text: [{ text: { content: apiKey } }],
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Fireflies API key saved successfully',
      maskedKey: `****${apiKey.slice(-4)}`,
    });
  } catch (error) {
    console.error('Fireflies POST error:', error);
    return NextResponse.json({ error: 'Failed to save Fireflies API key' }, { status: 500 });
  }
}

// DELETE - Remove Fireflies API key
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.userType !== 'team') {
      return NextResponse.json({ error: 'Only team members can access this' }, { status: 403 });
    }

    if (!databases.teamMembers) {
      return NextResponse.json({ error: 'Team database not configured' }, { status: 500 });
    }

    // Find the Notion page for this user
    const existingMembers = await notion.databases.query({
      database_id: databases.teamMembers,
      filter: {
        property: 'Email',
        email: {
          equals: session.email.toLowerCase(),
        },
      },
    });

    if (existingMembers.results.length === 0) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    const pageId = existingMembers.results[0].id;

    // Clear the API key
    await notion.pages.update({
      page_id: pageId,
      properties: {
        'Fireflies API Key': {
          rich_text: [],
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Fireflies API key removed',
    });
  } catch (error) {
    console.error('Fireflies DELETE error:', error);
    return NextResponse.json({ error: 'Failed to remove Fireflies API key' }, { status: 500 });
  }
}
