import { Client } from '@/types';
import {
  DATABASE_IDS,
  queryDatabase,
  getTitle,
  getSelect,
  getDate,
  getUrl,
  getRelationIds,
  getRollupNumber,
  getTimestamp,
  getRichText,
  getEmail,
  notion,
} from './client';

// Global client cache with TTL (30 seconds)
let allClientsCache: { clients: Client[]; timestamp: number } | null = null;
const CLIENT_CACHE_TTL = 30000; // 30 seconds

// Clear the client cache (call after updates)
export function clearClientCache(): void {
  allClientsCache = null;
}

// Transform Notion page to Client type
function transformClient(page: any): Client {
  const props = page.properties;

  // Support both 'Name' (new schema) and 'Client Name' (old schema)
  const name = getTitle(props['Name']) || getTitle(props['Client Name']);

  return {
    id: page.id,
    name,
    email: getEmail(props['Email']),
    status: getSelect(props['Status']) as Client['status'],
    packageId: getRelationIds(props['Package'])[0],
    accountManager: getRichText(props['Account Manager']?.rich_text),
    startDate: getDate(props['Start Date']),
    slackChannel: getUrl(props['Slack Channel']),
    totalContent: getRollupNumber(props['Total Content']),
    totalIdeas: getRollupNumber(props['Total Ideas']),
    totalTasks: getRollupNumber(props['Total Tasks']),
    totalBrainDocs: getRollupNumber(props['Total Brain Docs']),
    createdAt: getTimestamp(props['Created']),
    updatedAt: getTimestamp(props['Last Updated']),
  };
}

// Get all clients (with caching)
export async function getClients(status?: Client['status']): Promise<Client[]> {
  // Check if we have a valid cache for all clients
  if (allClientsCache && Date.now() - allClientsCache.timestamp < CLIENT_CACHE_TTL) {
    const clients = allClientsCache.clients;
    // Filter by status if needed
    if (status) {
      return clients.filter(c => c.status === status);
    }
    return clients;
  }

  // Fetch all clients with pagination
  const allResults: any[] = [];
  let cursor: string | undefined = undefined;

  do {
    const response: any = await queryDatabase({
      database_id: DATABASE_IDS.clients,
      page_size: 100,
      start_cursor: cursor,
    });
    allResults.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  // Sort client-side by name and cache
  const clients = allResults.map(transformClient).sort((a, b) => a.name.localeCompare(b.name));
  allClientsCache = { clients, timestamp: Date.now() };

  // Filter by status if needed
  if (status) {
    return clients.filter(c => c.status === status);
  }
  return clients;
}

// Get single client by ID
export async function getClient(id: string): Promise<Client | null> {
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    return transformClient(page);
  } catch {
    return null;
  }
}

// Search clients by name (fast, limited query)
export async function searchClients(query: string, limit: number = 5): Promise<Client[]> {
  const response = await queryDatabase({
    database_id: DATABASE_IDS.clients,
    filter: {
      property: 'Name',
      title: { contains: query },
    },
    page_size: limit,
  });

  return response.results.map(transformClient);
}

// Find client by name (case-insensitive fuzzy match)
// Fetches all clients and matches locally since Notion's filter is case-sensitive
export async function findClientByName(searchName: string): Promise<Client | null> {
  const normalizedSearch = searchName.toLowerCase().trim();
  console.log(`[findClientByName] Searching for: "${normalizedSearch}"`);

  try {
    // Fetch all clients (this is fast enough for most client lists)
    const clients = await getClients();
    console.log(`[findClientByName] Found ${clients.length} total clients`);

    // First try exact match (case-insensitive)
    let match = clients.find(c => c.name.toLowerCase() === normalizedSearch);
    if (match) {
      console.log(`[findClientByName] Exact match found: "${match.name}"`);
      return match;
    }

    // Try partial match (search name contains client name or vice versa)
    match = clients.find(c =>
      normalizedSearch.includes(c.name.toLowerCase()) ||
      c.name.toLowerCase().includes(normalizedSearch)
    );
    if (match) {
      console.log(`[findClientByName] Partial match found: "${match.name}"`);
      return match;
    }

    // Try matching first name only
    const searchFirstName = normalizedSearch.split(' ')[0];
    match = clients.find(c => {
      const clientFirstName = c.name.toLowerCase().split(' ')[0];
      return clientFirstName === searchFirstName;
    });
    if (match) {
      console.log(`[findClientByName] First name match found: "${match.name}"`);
      return match;
    }

    // Try matching last name only (for cases like "Cass" matching "Ella Cass")
    const searchLastName = normalizedSearch.split(' ').pop() || '';
    if (searchLastName && searchLastName !== searchFirstName) {
      match = clients.find(c => {
        const clientLastName = c.name.toLowerCase().split(' ').pop() || '';
        return clientLastName === searchLastName;
      });
      if (match) {
        console.log(`[findClientByName] Last name match found: "${match.name}"`);
        return match;
      }
    }

    // Log available clients for debugging
    console.log(`[findClientByName] No match found. Available clients:`, clients.slice(0, 10).map(c => c.name));

    return null;
  } catch (error) {
    console.error('[findClientByName] Error:', error);
    return null;
  }
}

// Create a corresponding entry in the Content Bank Clients database
// This ensures the portal and ideas system can find the client
async function createContentBankClient(clientName: string): Promise<void> {
  if (!DATABASE_IDS.contentBankClients) {
    console.log('[Clients] Content Bank Clients database not configured, skipping');
    return;
  }

  try {
    // Check if client already exists in Content Bank
    const existing = await queryDatabase({
      database_id: DATABASE_IDS.contentBankClients,
      filter: {
        property: 'Name',
        title: { equals: clientName },
      },
      page_size: 1,
    });

    if (existing.results.length > 0) {
      console.log(`[Clients] Client "${clientName}" already exists in Content Bank`);
      return;
    }

    // Create the Content Bank client entry
    await notion.pages.create({
      parent: { database_id: DATABASE_IDS.contentBankClients },
      properties: {
        'Name': { title: [{ text: { content: clientName } }] },
      },
    });

    console.log(`[Clients] Created Content Bank entry for "${clientName}"`);
  } catch (error) {
    // Log but don't fail - Content Bank entry is supplementary
    console.error(`[Clients] Failed to create Content Bank entry for "${clientName}":`, error);
  }
}

// Create new client
export async function createClient(data: {
  name: string;
  email?: string;
  status?: Client['status'];
  packageId?: string;
  startDate?: string;
  slackChannel?: string;
}): Promise<Client> {
  // Use 'Client Name' as the title property (matches Notion database schema)
  const properties: any = {
    'Client Name': { title: [{ text: { content: data.name } }] },
  };

  if (data.email) {
    properties['Email'] = { email: data.email };
  }
  if (data.status) {
    properties['Status'] = { select: { name: data.status } };
  }
  if (data.packageId) {
    properties['Package'] = { relation: [{ id: data.packageId }] };
  }
  if (data.startDate) {
    properties['Start Date'] = { date: { start: data.startDate } };
  }
  if (data.slackChannel) {
    // Slack Channel is a URL field - if it's a channel name, convert to Slack URL
    let slackUrl = data.slackChannel;
    if (slackUrl.startsWith('#')) {
      // Convert channel name to Slack URL format (without the #)
      const channelName = slackUrl.substring(1);
      slackUrl = `https://slack.com/app_redirect?channel=${channelName}`;
    } else if (!slackUrl.startsWith('http://') && !slackUrl.startsWith('https://')) {
      // If it's just a channel name without #, also convert
      slackUrl = `https://slack.com/app_redirect?channel=${slackUrl}`;
    }
    properties['Slack Channel'] = { url: slackUrl };
  }

  const page = await notion.pages.create({
    parent: { database_id: DATABASE_IDS.clients },
    properties,
  });

  const client = transformClient(page);

  // Also create entry in Content Bank Clients database (fire and forget)
  createContentBankClient(data.name).catch((err) => {
    console.error('[Clients] Background Content Bank creation failed:', err);
  });

  // Clear the client cache so the new client appears everywhere
  clearClientCache();

  return client;
}

// Update client
export async function updateClient(
  id: string,
  data: Partial<{
    name: string;
    email: string | null;
    status: Client['status'];
    packageId: string;
    startDate: string;
    slackChannel: string | null;
    accountManager: string | null;
  }>
): Promise<Client> {
  const properties: any = {};

  if (data.name) {
    properties['Client Name'] = { title: [{ text: { content: data.name } }] };
  }
  // Only update email if a non-empty value is provided
  // Skip if null/undefined to avoid Notion API issues
  if (data.email && data.email.trim()) {
    properties['Email'] = { email: data.email.trim() };
  }
  if (data.status) {
    properties['Status'] = { select: { name: data.status } };
  }
  if (data.packageId) {
    properties['Package'] = { relation: [{ id: data.packageId }] };
  }
  if (data.startDate) {
    properties['Start Date'] = { date: { start: data.startDate } };
  }
  if (data.slackChannel !== undefined) {
    if (data.slackChannel) {
      // Slack Channel is a URL field - if it's a channel name, convert to Slack URL
      let slackUrl = data.slackChannel;
      if (slackUrl.startsWith('#')) {
        const channelName = slackUrl.substring(1);
        slackUrl = `https://slack.com/app_redirect?channel=${channelName}`;
      } else if (!slackUrl.startsWith('http://') && !slackUrl.startsWith('https://')) {
        slackUrl = `https://slack.com/app_redirect?channel=${slackUrl}`;
      }
      properties['Slack Channel'] = { url: slackUrl };
    } else {
      properties['Slack Channel'] = { url: null };
    }
  }
  if (data.accountManager !== undefined) {
    properties['Account Manager'] = {
      rich_text: data.accountManager ? [{ text: { content: data.accountManager } }] : []
    };
  }

  const page = await notion.pages.update({
    page_id: id,
    properties,
  });

  return transformClient(page);
}

// Get client stats for dashboard
export async function getClientStats(): Promise<{
  total: number;
  active: number;
  onboarding: number;
  paused: number;
  churned: number;
}> {
  const clients = await getClients();

  return {
    total: clients.length,
    active: clients.filter((c) => c.status === 'Active').length,
    onboarding: clients.filter((c) => c.status === 'Onboarding').length,
    paused: clients.filter((c) => c.status === 'Paused').length,
    churned: clients.filter((c) => c.status === 'Churned').length,
  };
}

// Delete client (archive in Notion)
export async function deleteClient(id: string): Promise<boolean> {
  try {
    await notion.pages.update({
      page_id: id,
      archived: true,
    });
    return true;
  } catch (error) {
    console.error('Failed to delete client:', error);
    return false;
  }
}

// Delete multiple clients (bulk delete)
export async function deleteClients(ids: string[]): Promise<{ deleted: number; failed: number }> {
  let deleted = 0;
  let failed = 0;

  for (const id of ids) {
    const success = await deleteClient(id);
    if (success) deleted++;
    else failed++;
  }

  return { deleted, failed };
}
