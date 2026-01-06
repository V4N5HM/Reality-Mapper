import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getClientById } from '@/lib/report-dashboard/report-clients';
import {
  fetchPersonalBrandData,
  parsePersonalBrandDashboardData,
} from '@/lib/report-dashboard/dashboard-data';
import { buildStrategyBriefPrompt } from '@/lib/report-dashboard/prompts/strategy-brief';

const anthropic = new Anthropic();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const body = await request.json();
    const { month, year, strategistName = 'Pivotal Conversations' } = body;

    // Only support personal brand clients for now
    const client = await getClientById(clientId);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (!client.googleSheets) {
      return NextResponse.json(
        { error: 'No Google Sheets configured for this client' },
        { status: 400 }
      );
    }

    // Fetch and parse dashboard data
    const rawData = await fetchPersonalBrandData(client);
    if (!rawData) {
      return NextResponse.json(
        { error: 'Failed to fetch data from Google Sheets' },
        { status: 500 }
      );
    }

    const dashboardData = parsePersonalBrandDashboardData(client, rawData, month, year);

    // Build the prompt
    const prompt = buildStrategyBriefPrompt({
      clientName: client.name,
      strategistName,
      month,
      year,
      dashboardData,
    });

    // Generate the HTML brief using Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract HTML from response
    let htmlContent = message.content[0].type === 'text' ? message.content[0].text : '';

    // Clean up any markdown wrapping if present
    htmlContent = htmlContent.trim();
    if (htmlContent.startsWith('```html')) {
      htmlContent = htmlContent.slice(7);
    } else if (htmlContent.startsWith('```')) {
      htmlContent = htmlContent.slice(3);
    }
    if (htmlContent.endsWith('```')) {
      htmlContent = htmlContent.slice(0, -3);
    }
    htmlContent = htmlContent.trim();

    // Ensure it starts with DOCTYPE or html
    if (!htmlContent.toLowerCase().startsWith('<!doctype') && !htmlContent.toLowerCase().startsWith('<html')) {
      // Try to find the start of HTML
      const doctypeIndex = htmlContent.toLowerCase().indexOf('<!doctype');
      const htmlIndex = htmlContent.toLowerCase().indexOf('<html');
      const startIndex = Math.min(
        doctypeIndex === -1 ? Infinity : doctypeIndex,
        htmlIndex === -1 ? Infinity : htmlIndex
      );
      if (startIndex !== Infinity) {
        htmlContent = htmlContent.slice(startIndex);
      }
    }

    // Generate filename
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const nextMonth = (month + 1) % 12;
    const nextYear = nextMonth === 0 ? year + 1 : year;
    const filename = `${client.name.replace(/\s+/g, '_')}_${monthNames[nextMonth]}_${nextYear}_Strategy_Plan.html`;

    return NextResponse.json({
      success: true,
      html: htmlContent,
      filename,
      clientName: client.name,
      reportMonth: monthNames[month],
      reportYear: year,
      planMonth: monthNames[nextMonth],
      planYear: nextYear,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating strategy brief:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate strategy brief' },
      { status: 500 }
    );
  }
}
