import { NextRequest, NextResponse } from 'next/server';
import { getClients } from '@/lib/notion/clients';
import { getContent } from '@/lib/notion/content';
import { getTasks } from '@/lib/notion/tasks';
import { getIdeas } from '@/lib/notion/ideas';

export interface SearchResult {
  id: string;
  title: string;
  type: 'client' | 'content' | 'task' | 'idea';
  subtitle?: string;
  status?: string;
  url: string;
}

// GET - Search across all entities
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // Fetch all data in parallel
    const [clients, content, tasks, ideas] = await Promise.all([
      getClients(),
      getContent(),
      getTasks(),
      getIdeas(),
    ]);

    const results: SearchResult[] = [];

    // Search clients
    clients.forEach((client) => {
      if (client.name.toLowerCase().includes(query)) {
        results.push({
          id: client.id,
          title: client.name,
          type: 'client',
          subtitle: client.packageName || 'No package',
          status: client.status,
          url: `/clients/${client.id}`,
        });
      }
    });

    // Search content
    content.forEach((item) => {
      if (item.title.toLowerCase().includes(query)) {
        // Encode content type for URL (e.g., "Short Form" -> "Short+Form")
        const typeParam = encodeURIComponent(item.contentType).replace(/%20/g, '+');
        results.push({
          id: item.id,
          title: item.title,
          type: 'content',
          subtitle: `${item.contentType} • ${item.clientName || 'Unknown client'}`,
          status: item.status,
          url: `/pipeline?type=${typeParam}&highlight=${item.id}`,
        });
      }
    });

    // Search tasks
    tasks.forEach((task) => {
      if (task.task.toLowerCase().includes(query)) {
        results.push({
          id: task.id,
          title: task.task,
          type: 'task',
          subtitle: task.clientName || 'General',
          status: task.status,
          url: `/tasks?highlight=${task.id}`,
        });
      }
    });

    // Search ideas
    ideas.forEach((idea) => {
      if (
        idea.title.toLowerCase().includes(query) ||
        idea.hook?.toLowerCase().includes(query)
      ) {
        results.push({
          id: idea.id,
          title: idea.title,
          type: 'idea',
          subtitle: `${idea.contentType} • ${idea.clientName || 'Unknown client'}`,
          status: idea.status,
          url: `/ideas?highlight=${idea.id}`,
        });
      }
    });

    // Sort by relevance (exact matches first) and limit
    const sortedResults = results
      .sort((a, b) => {
        const aExact = a.title.toLowerCase() === query;
        const bExact = b.title.toLowerCase() === query;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return 0;
      })
      .slice(0, limit);

    return NextResponse.json({ results: sortedResults });
  } catch (error) {
    console.error('Error searching:', error);
    return NextResponse.json(
      { error: 'Failed to search' },
      { status: 500 }
    );
  }
}
