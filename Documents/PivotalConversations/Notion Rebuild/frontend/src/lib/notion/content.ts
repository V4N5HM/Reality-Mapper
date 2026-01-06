import { Content, ContentType, ContentStatus, PipelineColumn, Client } from '@/types';
import {
  notion,
  DATABASE_IDS,
  queryDatabase,
  queryDatabasePaginated,
  getTitle,
  getSelect,
  getStatus,
  getDate,
  getUrl,
  getRichText,
  getRichTextAsArray,
  getRelationIds,
  getTimestamp,
  getPeople,
  getPerson,
} from './client';

// Cache for client ID -> name mapping
let clientNameCache: Map<string, string> | null = null;
let cacheInitPromise: Promise<void> | null = null;

// Initialize the client cache (called once, handles concurrent initialization)
async function initClientCache(): Promise<void> {
  if (clientNameCache) return;

  if (!cacheInitPromise) {
    cacheInitPromise = (async () => {
      const cache = new Map<string, string>();
      try {
        let cursor: string | undefined = undefined;
        do {
          const response: any = await queryDatabase({
            database_id: DATABASE_IDS.clients,
            page_size: 100,
            start_cursor: cursor,
          });
          for (const page of response.results) {
            // Support both 'Client Name' (current schema) and 'Name' (legacy)
            const name = getTitle((page as any).properties['Client Name']) || getTitle((page as any).properties['Name']);
            if (name) {
              cache.set(page.id, name);
            }
          }
          cursor = response.has_more ? response.next_cursor : undefined;
        } while (cursor);
        clientNameCache = cache;
      } catch (e) {
        console.error('Error fetching clients for cache:', e);
        clientNameCache = new Map(); // Set empty cache to prevent infinite retries
      }
    })();
  }

  await cacheInitPromise;
}

// Get client name by ID (cached)
async function getClientNameById(clientId: string): Promise<string | null> {
  await initClientCache();
  return clientNameCache?.get(clientId) || null;
}

// Enrich content with client name
async function enrichContentWithClientName(content: Content): Promise<Content> {
  if (content.clientId) {
    const clientName = await getClientNameById(content.clientId);
    if (clientName) {
      return { ...content, clientName };
    }
  }
  return content;
}

// Transform Notion page to Content type
function transformContent(page: any): Content {
  const props = page.properties;

  // Get assigned editor
  const assignedEditor = getPerson(props['Assigned Editor']) || getPerson(props['Editor']);
  // Get assigned strategist, coordinator, and style (hardcoded select fields)
  const assignedStrategist = getSelect(props['Assigned Strategist']);
  const assignedCoordinator = getSelect(props['Assigned Coordinator']);
  const style = getSelect(props['Style']);

  return {
    id: page.id,
    title: getTitle(props['Title']),
    contentType: getSelect(props['Content Type']) as ContentType,
    clientId: getRelationIds(props['Client'])[0] || '',
    status: (getSelect(props['Status']) || getStatus(props['Status'])) as ContentStatus,
    scheduledDate: getDate(props['Scheduled Date']),
    assignedEditor,
    assignedStrategist: assignedStrategist || undefined,
    assignedCoordinator: assignedCoordinator || undefined,
    style: style || undefined,

    // Attributes
    titleOptions: getRichText(props['Title Options']?.rich_text),
    // Thumbnails: Try Rich Text JSON array first, fall back to URL property for backwards compatibility
    thumbnails: getRichTextAsArray(props['Thumbnails']).length > 0
      ? getRichTextAsArray(props['Thumbnails'])
      : (getUrl(props['Thumbnails']) ? [getUrl(props['Thumbnails'])!] : []),
    description: getRichText(props['Description']?.rich_text),
    transcription: getRichText(props['Transcription']?.rich_text),
    script: getRichText(props['Script']?.rich_text),
    copy: getRichText(props['Copy']?.rich_text),

    // Links
    briefUrl: getUrl(props['Brief URL']),
    driveLink: getUrl(props['Drive Link']),
    frameIoLink: getUrl(props['Frame.io']) || getUrl(props['Frame.io Link']),
    frameIoAssetId: getRichText(props['Frame.io Asset ID']?.rich_text),
    editedEpisodeLink: getUrl(props['Edited Episode D...']) || getUrl(props['Edited Episode Download']),
    switchedFileFrameLink: getUrl(props['Switched File Fra...']) || getUrl(props['Switched File Frame']),
    sourceFileLink: getUrl(props['Source File Link']),
    dropboxLink: getUrl(props['Dropbox Link']),
    trailerLink: getUrl(props['Trailer']),
    trailerSocialLink: getUrl(props['Trailer Social Ver...']) || getUrl(props['Trailer Social Version']),
    snippetsLink: getUrl(props['Snippets']),

    // Notes
    clientFeedback: getRichText(props['Client Feedback']?.rich_text),
    internalNotes: getRichText(props['Internal Notes']?.rich_text),
    editingNotes: getRichText(props['Editing Notes']?.rich_text),

    // Clip-specific fields (for Short Form clips from YouTube/Podcast)
    clipTranscription: getRichText(props['Clip Transcription']?.rich_text),
    clipTimestamp: getRichText(props['Clip Timestamp']?.rich_text),
    podcastClipStyle: getSelect(props['Podcast Clip Style']) || undefined,

    // Relations
    parentContentId: getRelationIds(props['Parent Content'])[0],
    childClipIds: getRelationIds(props['Child Clips']),
    ideaSourceId: getRelationIds(props['Idea Source'])[0],
    createdAt: getTimestamp(props['Created']),
    updatedAt: getTimestamp(props['Last Updated']),
  };
}

// Get all content with optional filters
export async function getContent(options?: {
  clientId?: string;
  contentType?: ContentType;
  status?: ContentStatus;
  includeClientNames?: boolean;
  dateFrom?: string; // Filter content from this date (YYYY-MM-DD)
  dateTo?: string; // Filter content up to this date (YYYY-MM-DD)
  sortDirection?: 'ascending' | 'descending'; // Default ascending
  limit?: number; // Max items to fetch (default 100, use 0 for unlimited)
  hasScheduledDate?: boolean; // If true, only return content with a scheduled date
}): Promise<Content[]> {
  const filters: any[] = [];

  if (options?.clientId) {
    filters.push({ property: 'Client', relation: { contains: options.clientId } });
  }
  if (options?.contentType) {
    filters.push({ property: 'Content Type', select: { equals: options.contentType } });
  }
  if (options?.status) {
    filters.push({ property: 'Status', select: { equals: options.status } });
  }
  // Date filters - if dateFrom or dateTo is set, we don't need hasScheduledDate
  // since date range filters already imply the date exists
  if (options?.dateFrom && options?.dateTo) {
    // Use date range filter
    filters.push({ property: 'Scheduled Date', date: { on_or_after: options.dateFrom } });
    filters.push({ property: 'Scheduled Date', date: { on_or_before: options.dateTo } });
  } else if (options?.dateFrom) {
    filters.push({ property: 'Scheduled Date', date: { on_or_after: options.dateFrom } });
  } else if (options?.dateTo) {
    filters.push({ property: 'Scheduled Date', date: { on_or_before: options.dateTo } });
  } else if (options?.hasScheduledDate) {
    // Only use is_not_empty when no date range is specified
    filters.push({ property: 'Scheduled Date', date: { is_not_empty: true } });
  }

  const sortDirection = options?.sortDirection || 'ascending';
  const limit = options?.limit ?? 100; // Default to 100 items for performance
  let content: Content[];

  if (limit === 0) {
    // Unlimited - use paginated query (can be slow)
    const response = await queryDatabasePaginated({
      database_id: DATABASE_IDS.content,
      filter: filters.length > 0 ? { and: filters } : undefined,
      sorts: [{ property: 'Scheduled Date', direction: sortDirection }],
    });
    content = response.results.map(transformContent);
  } else if (limit > 100) {
    // Need multiple pages but with a cap
    const response = await queryDatabasePaginated({
      database_id: DATABASE_IDS.content,
      filter: filters.length > 0 ? { and: filters } : undefined,
      sorts: [{ property: 'Scheduled Date', direction: sortDirection }],
      maxItems: limit,
    });
    content = response.results.map(transformContent);
  } else {
    // Single page query for best performance
    const response = await queryDatabase({
      database_id: DATABASE_IDS.content,
      filter: filters.length > 0 ? { and: filters } : undefined,
      sorts: [{ property: 'Scheduled Date', direction: sortDirection }],
      page_size: limit,
    });
    content = response.results.map(transformContent);
  }

  // Enrich with client names using batch lookup (much faster than individual lookups)
  if (options?.includeClientNames !== false) {
    await initClientCache(); // Ensure cache is ready
    content = content.map(c => {
      if (c.clientId && clientNameCache) {
        const clientName = clientNameCache.get(c.clientId);
        if (clientName) {
          return { ...c, clientName };
        }
      }
      return c;
    });
  }

  return content;
}

// Get single content by ID
export async function getContentById(id: string): Promise<Content | null> {
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    const content = transformContent(page);
    // Enrich with client name
    return enrichContentWithClientName(content);
  } catch {
    return null;
  }
}

// Alias for getContentById (used by some routes)
export const getContentItem = getContentById;

// Search content by title (fast, limited query)
export async function searchContent(query: string, limit: number = 5): Promise<Content[]> {
  const response = await queryDatabase({
    database_id: DATABASE_IDS.content,
    filter: {
      property: 'Name',
      title: { contains: query },
    },
    page_size: limit,
  });

  const content = response.results.map(transformContent);
  // Enrich with client names
  return Promise.all(content.map(enrichContentWithClientName));
}

// Get content for a specific client
export async function getClientContent(clientId: string): Promise<Content[]> {
  return getContent({ clientId });
}

// Get all pipeline data in a single query (much faster than 3 separate queries)
export async function getAllPipelineData(options?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<{
  shortForm: PipelineColumn[];
  youtube: PipelineColumn[];
  podcast: PipelineColumn[];
}> {
  // Fetch all content types in one query (150 items max)
  const PIPELINE_LIMIT = 150;

  let filter: any;

  if (options?.dateFrom || options?.dateTo) {
    const dateFilters: any[] = [];
    const withDateFilters: any[] = [];
    if (options?.dateFrom) {
      withDateFilters.push({ property: 'Scheduled Date', date: { on_or_after: options.dateFrom } });
    }
    if (options?.dateTo) {
      withDateFilters.push({ property: 'Scheduled Date', date: { on_or_before: options.dateTo } });
    }
    if (withDateFilters.length > 0) {
      dateFilters.push(withDateFilters.length === 1 ? withDateFilters[0] : { and: withDateFilters });
    }
    dateFilters.push({ property: 'Scheduled Date', date: { is_empty: true } });
    filter = { or: dateFilters };
  }

  const recentContent = await queryDatabase({
    database_id: DATABASE_IDS.content,
    filter,
    sorts: [{ timestamp: 'created_time', direction: 'descending' }],
    page_size: PIPELINE_LIMIT,
  });

  let content = recentContent.results.map(transformContent);

  // Enrich with client names
  await initClientCache();
  content = content.map((c: Content) => {
    if (c.clientId && clientNameCache) {
      const clientName = clientNameCache.get(c.clientId);
      if (clientName) return { ...c, clientName };
    }
    return c;
  });

  // Split by content type
  const shortFormContent = content.filter((c: Content) => c.contentType === 'Short Form');
  const youtubeContent = content.filter((c: Content) => c.contentType === 'YouTube');
  const podcastContent = content.filter((c: Content) => c.contentType === 'Podcast');

  // Define stages
  const shortFormStages: ContentStatus[] = [
    'Filmed', 'In Progress', 'PC Feedback', 'Client Feedback',
    'Approved', 'Not Approved', 'Scheduled', 'Posted'
  ];
  const youtubeStages: ContentStatus[] = [
    'Research', 'Brief', 'Filmed', 'Edit', 'Thumbnail Design',
    'PC Review', 'Client Review', 'Final Review', 'To Schedule', 'Scheduled',
    'Live', 'Live: 24 Hour Review', 'Live: 48 Hour Review', 'Live: 5 Day Review', 'Complete'
  ];
  const podcastStages: ContentStatus[] = [
    'Guest Booked', 'Research', 'Brief', 'Filmed', 'Edit',
    'Thumbnail Design', 'PC Review', 'Client Review', 'Final Review',
    'To Schedule', 'Scheduled', 'Live', 'Live: 24 Hour Review', 'Live: 48 Hour Review',
    'Live: 5 Day Review', 'Complete'
  ];

  return {
    shortForm: shortFormStages.map(stage => ({ id: stage, title: stage, items: shortFormContent.filter((c: Content) => c.status === stage) })),
    youtube: youtubeStages.map(stage => ({ id: stage, title: stage, items: youtubeContent.filter((c: Content) => c.status === stage) })),
    podcast: podcastStages.map(stage => ({ id: stage, title: stage, items: podcastContent.filter((c: Content) => c.status === stage) })),
  };
}

// Get pipeline data for kanban view (single content type)
export async function getPipelineData(
  contentType: ContentType,
  options?: {
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<PipelineColumn[]> {
  // For pipeline, we limit to recent content for performance
  // Fetch up to 50 most recent items per query
  const PIPELINE_LIMIT = 50;

  // Build base filter for content type
  const baseFilter = { property: 'Content Type', select: { equals: contentType } };

  // If date range is provided, we need to fetch content that either:
  // 1. Has a scheduled date within the range, OR
  // 2. Has NO scheduled date (still in progress, not yet scheduled)
  // This ensures content doesn't "disappear" from the pipeline when date filters are applied
  let filter: any;

  if (options?.dateFrom || options?.dateTo) {
    const dateFilters: any[] = [];

    // Build date range filter for content WITH scheduled dates
    const withDateFilters: any[] = [];
    if (options?.dateFrom) {
      withDateFilters.push({ property: 'Scheduled Date', date: { on_or_after: options.dateFrom } });
    }
    if (options?.dateTo) {
      withDateFilters.push({ property: 'Scheduled Date', date: { on_or_before: options.dateTo } });
    }

    // Content within date range
    if (withDateFilters.length > 0) {
      dateFilters.push(
        withDateFilters.length === 1
          ? withDateFilters[0]
          : { and: withDateFilters }
      );
    }

    // Content WITHOUT a scheduled date (include these always so they don't disappear)
    dateFilters.push({ property: 'Scheduled Date', date: { is_empty: true } });

    // Combine: content type AND (date in range OR no date)
    filter = {
      and: [
        baseFilter,
        { or: dateFilters }
      ]
    };
  } else {
    // No date filtering - just filter by content type
    filter = baseFilter;
  }

  // Get recent content by creation date (most recent first)
  const recentContent = await queryDatabase({
    database_id: DATABASE_IDS.content,
    filter,
    sorts: [{ timestamp: 'created_time', direction: 'descending' }],
    page_size: PIPELINE_LIMIT,
  });

  // Transform results
  let content = recentContent.results.map(transformContent);

  // Enrich with client names using batch lookup (faster than individual lookups)
  await initClientCache();
  content = content.map((c: Content) => {
    if (c.clientId && clientNameCache) {
      const clientName = clientNameCache.get(c.clientId);
      if (clientName) {
        return { ...c, clientName };
      }
    }
    return c;
  });

  // Define stages based on content type
  const shortFormStages: ContentStatus[] = [
    'Filmed', 'In Progress', 'PC Feedback', 'Client Feedback',
    'Approved', 'Not Approved', 'Scheduled', 'Posted'
  ];

  const youtubeStages: ContentStatus[] = [
    'Research', 'Brief', 'Filmed', 'Edit', 'Thumbnail Design',
    'PC Review', 'Client Review', 'Final Review', 'To Schedule', 'Scheduled',
    'Live', 'Live: 24 Hour Review', 'Live: 48 Hour Review', 'Live: 5 Day Review', 'Complete'
  ];

  const podcastStages: ContentStatus[] = [
    'Guest Booked', 'Research', 'Brief', 'Filmed', 'Edit',
    'Thumbnail Design', 'PC Review', 'Client Review', 'Final Review',
    'To Schedule', 'Scheduled', 'Live', 'Live: 24 Hour Review', 'Live: 48 Hour Review',
    'Live: 5 Day Review', 'Complete'
  ];

  const stages = contentType === 'Short Form' ? shortFormStages
    : contentType === 'YouTube' ? youtubeStages
      : podcastStages;

  return stages.map((stage) => ({
    id: stage,
    title: stage,
    items: content.filter((c: Content) => c.status === stage),
  }));
}

// Update content status (for drag-and-drop)
export async function updateContentStatus(
  id: string,
  status: ContentStatus
): Promise<Content> {
  const page = await notion.pages.update({
    page_id: id,
    properties: {
      'Status': { select: { name: status } },
    },
  });

  return transformContent(page);
}

// Create new content
export async function createContent(data: {
  title: string;
  contentType: ContentType;
  clientId: string;
  status?: ContentStatus;
  scheduledDate?: string;
  parentContentId?: string;
  ideaSourceId?: string;
  frameIoLink?: string;
  frameIoAssetId?: string;
}): Promise<Content> {
  const properties: any = {
    'Title': { title: [{ text: { content: data.title } }] },
    'Content Type': { select: { name: data.contentType } },
    'Client': { relation: [{ id: data.clientId }] },
  };

  if (data.status) {
    properties['Status'] = { select: { name: data.status } };
  }
  if (data.scheduledDate) {
    properties['Scheduled Date'] = { date: { start: data.scheduledDate } };
  }
  if (data.parentContentId) {
    properties['Parent Content'] = { relation: [{ id: data.parentContentId }] };
  }
  if (data.ideaSourceId) {
    properties['Idea Source'] = { relation: [{ id: data.ideaSourceId }] };
  }
  if (data.frameIoLink) {
    properties['Frame.io Link'] = { url: data.frameIoLink };
  }
  if (data.frameIoAssetId) {
    properties['Frame.io Asset ID'] = { rich_text: [{ text: { content: data.frameIoAssetId } }] };
  }

  const page = await notion.pages.create({
    parent: { database_id: DATABASE_IDS.content },
    properties,
  });

  return transformContent(page);
}

// Get content stats
export async function getContentStats(clientId?: string): Promise<{
  total: number;
  byType: Record<ContentType, number>;
  byStatus: Partial<Record<ContentStatus, number>>;
}> {
  const content = await getContent({ clientId });

  const byType: Record<ContentType, number> = {
    'Short Form': 0,
    'YouTube': 0,
    'Podcast': 0,
  };

  const byStatus: Partial<Record<ContentStatus, number>> = {};

  content.forEach((c) => {
    byType[c.contentType]++;
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
  });

  return {
    total: content.length,
    byType,
    byStatus,
  };
}

// Get child clips for a parent content (YouTube or Podcast)
export async function getChildClips(parentContentId: string): Promise<Content[]> {
  const response = await queryDatabase({
    database_id: DATABASE_IDS.content,
    filter: {
      property: 'Parent Content',
      relation: { contains: parentContentId },
    },
    sorts: [{ property: 'Scheduled Date', direction: 'ascending' }],
  });

  return response.results.map(transformContent);
}

// Get content with its children
export async function getContentWithChildren(contentId: string): Promise<{
  content: Content | null;
  children: Content[];
}> {
  const content = await getContentById(contentId);
  if (!content) {
    return { content: null, children: [] };
  }

  const children = await getChildClips(contentId);
  return { content, children };
}

// Get upcoming scheduled content
export async function getUpcomingContent(days: number = 7): Promise<Content[]> {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + days);

  const response = await queryDatabase({
    database_id: DATABASE_IDS.content,
    filter: {
      and: [
        { property: 'Scheduled Date', date: { on_or_after: today.toISOString().split('T')[0] } },
        { property: 'Scheduled Date', date: { on_or_before: futureDate.toISOString().split('T')[0] } },
      ],
    },
    sorts: [{ property: 'Scheduled Date', direction: 'ascending' }],
  });

  return response.results.map(transformContent);
}

// Paginated content query with cursor support for "load more" functionality
export async function getContentPaginated(options?: {
  clientId?: string;
  contentType?: ContentType;
  status?: ContentStatus;
  includeClientNames?: boolean;
  dateFrom?: string;
  dateTo?: string;
  sortDirection?: 'ascending' | 'descending';
  pageSize?: number;
  cursor?: string;
}): Promise<{
  content: Content[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const filters: any[] = [];

  if (options?.clientId) {
    filters.push({ property: 'Client', relation: { contains: options.clientId } });
  }
  if (options?.contentType) {
    filters.push({ property: 'Content Type', select: { equals: options.contentType } });
  }
  if (options?.status) {
    filters.push({ property: 'Status', select: { equals: options.status } });
  }
  if (options?.dateFrom) {
    filters.push({ property: 'Scheduled Date', date: { on_or_after: options.dateFrom } });
  }
  if (options?.dateTo) {
    filters.push({ property: 'Scheduled Date', date: { on_or_before: options.dateTo } });
  }

  const sortDirection = options?.sortDirection || 'ascending';
  const pageSize = options?.pageSize || 100;

  const response = await queryDatabase({
    database_id: DATABASE_IDS.content,
    filter: filters.length > 0 ? { and: filters } : undefined,
    sorts: [{ property: 'Scheduled Date', direction: sortDirection }],
    page_size: Math.min(pageSize, 100),
    start_cursor: options?.cursor,
  });

  let content = response.results.map(transformContent);

  // Enrich with client names using batch lookup (faster than individual lookups)
  if (options?.includeClientNames !== false) {
    await initClientCache();
    content = content.map((c: Content) => {
      if (c.clientId && clientNameCache) {
        const clientName = clientNameCache.get(c.clientId);
        if (clientName) {
          return { ...c, clientName };
        }
      }
      return c;
    });
  }

  return {
    content,
    nextCursor: response.has_more ? (response.next_cursor as string) : null,
    hasMore: response.has_more,
  };
}

// Get content by Frame.io asset ID
export async function getContentByFrameIoAssetId(assetId: string): Promise<Content | null> {
  const response = await queryDatabase({
    database_id: DATABASE_IDS.content,
    filter: {
      property: 'Frame.io Asset ID',
      rich_text: { equals: assetId },
    },
    page_size: 1,
  });

  if (response.results.length === 0) {
    return null;
  }

  return transformContent(response.results[0]);
}

// Update content with Frame.io info
export async function updateContentFrameIo(
  id: string,
  data: {
    frameIoLink?: string;
    frameIoAssetId?: string;
    status?: ContentStatus;
  }
): Promise<Content> {
  const properties: any = {};

  if (data.frameIoLink !== undefined) {
    properties['Frame.io Link'] = data.frameIoLink ? { url: data.frameIoLink } : { url: null };
  }
  if (data.frameIoAssetId !== undefined) {
    properties['Frame.io Asset ID'] = data.frameIoAssetId
      ? { rich_text: [{ text: { content: data.frameIoAssetId } }] }
      : { rich_text: [] };
  }
  if (data.status) {
    properties['Status'] = { select: { name: data.status } };
  }

  const page = await notion.pages.update({
    page_id: id,
    properties,
  });

  return transformContent(page);
}

// Delete content (archive in Notion)
export async function deleteContent(id: string): Promise<boolean> {
  try {
    await notion.pages.update({
      page_id: id,
      archived: true,
    });
    return true;
  } catch (error) {
    console.error('Failed to delete content:', error);
    return false;
  }
}

// Delete multiple content items (bulk delete)
export async function deleteContents(ids: string[]): Promise<{ deleted: number; failed: number }> {
  let deleted = 0;
  let failed = 0;

  for (const id of ids) {
    const success = await deleteContent(id);
    if (success) deleted++;
    else failed++;
  }

  return { deleted, failed };
}
