import { NextRequest, NextResponse } from 'next/server';
import { getActiveCadence } from '@/lib/notion/cadence';
import { getClients } from '@/lib/notion/clients';
import { notion, DATABASE_IDS } from '@/lib/notion/client';
import {
  getCurrentCadencePhase,
  shouldCreateTaskToday,
  calculateDueDate,
} from '@/lib/cadence';

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured');
    return true; // Allow in development
  }

  return authHeader === `Bearer ${cronSecret}`;
}

// GET - Run cadence task generation (called by cron)
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = new Date();
    const currentPhase = getCurrentCadencePhase(today);
    const results: { created: string[]; skipped: string[] } = { created: [], skipped: [] };

    // Get all active cadence templates
    const cadenceTemplates = await getActiveCadence();

    // Get all active clients for client-specific tasks
    const activeClients = await getClients('Active');

    for (const template of cadenceTemplates) {
      // Check if this task should be created today
      if (!shouldCreateTaskToday(template, today)) {
        results.skipped.push(`${template.taskTemplate} (not scheduled for today)`);
        continue;
      }

      // Determine urgency based on phase
      let urgency: 'Urgent' | 'This Week' | 'This Month' = 'This Week';
      if (currentPhase === 'Performance Review' || currentPhase === 'Implementation') {
        urgency = 'Urgent';
      } else if (currentPhase === 'Execution') {
        urgency = 'This Month';
      }

      const dueDate = calculateDueDate(urgency);

      // Check if template is client-specific (contains placeholder)
      const isClientSpecific = template.taskTemplate.includes('{client}') ||
        template.description?.includes('{client}');

      if (isClientSpecific) {
        // Create task for each active client
        for (const client of activeClients) {
          const taskTitle = template.taskTemplate.replace('{client}', client.name);
          const taskDescription = template.description?.replace('{client}', client.name) || '';

          await createRecurringTask({
            title: taskTitle,
            description: taskDescription,
            clientId: client.id,
            roles: template.roles,
            urgency,
            dueDate,
            templateId: template.id,
          });

          results.created.push(`${taskTitle} (${client.name})`);
        }
      } else {
        // Create single task (not client-specific)
        await createRecurringTask({
          title: template.taskTemplate,
          description: template.description || '',
          roles: template.roles,
          urgency,
          dueDate,
          templateId: template.id,
        });

        results.created.push(template.taskTemplate);
      }
    }

    return NextResponse.json({
      success: true,
      date: today.toISOString().split('T')[0],
      currentPhase,
      tasksCreated: results.created.length,
      tasksSkipped: results.skipped.length,
      details: results,
    });
  } catch (error) {
    console.error('Cadence cron error:', error);
    return NextResponse.json({ error: 'Failed to run cadence tasks' }, { status: 500 });
  }
}

// POST - Manual trigger with options
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { phase, clientId, templateId } = body;

    // Allow manual task creation for specific scenarios
    const today = new Date();
    const currentPhase = phase || getCurrentCadencePhase(today);

    let templates = await getActiveCadence();

    // Filter by template ID if specified
    if (templateId) {
      templates = templates.filter((t) => t.id === templateId);
    }

    // Filter by phase if specified
    if (phase) {
      templates = templates.filter((t) => t.cadencePhase === phase);
    }

    const results: string[] = [];

    for (const template of templates) {
      const dueDate = calculateDueDate('This Week');

      if (clientId) {
        // Create for specific client
        const taskTitle = template.taskTemplate.replace('{client}', 'Client');

        await createRecurringTask({
          title: taskTitle,
          description: template.description || '',
          clientId,
          roles: template.roles,
          urgency: 'This Week',
          dueDate,
          templateId: template.id,
        });

        results.push(taskTitle);
      } else {
        await createRecurringTask({
          title: template.taskTemplate,
          description: template.description || '',
          roles: template.roles,
          urgency: 'This Week',
          dueDate,
          templateId: template.id,
        });

        results.push(template.taskTemplate);
      }
    }

    return NextResponse.json({
      success: true,
      currentPhase,
      tasksCreated: results,
    });
  } catch (error) {
    console.error('Manual cadence trigger error:', error);
    return NextResponse.json({ error: 'Failed to create tasks' }, { status: 500 });
  }
}

async function createRecurringTask(data: {
  title: string;
  description: string;
  clientId?: string;
  roles: string[];
  urgency: 'Urgent' | 'This Week' | 'This Month';
  dueDate: string;
  templateId: string;
}) {
  const properties: Record<string, unknown> = {
    'Task': { title: [{ text: { content: data.title } }] },
    'Status': { select: { name: 'To Do' } },
    'Urgency': { select: { name: data.urgency } },
    'Due Date': { date: { start: data.dueDate } },
  };

  if (data.clientId) {
    properties['Client'] = { relation: [{ id: data.clientId }] };
  }

  if (data.description) {
    properties['Notes'] = {
      rich_text: [{ text: { content: data.description } }],
    };
  }

  // Note: Assigned roles would need a People property with actual user IDs
  // For now, we add roles to the notes
  if (data.roles.length > 0) {
    const existingNotes = (properties['Notes'] as any)?.rich_text?.[0]?.text?.content || '';
    properties['Notes'] = {
      rich_text: [{
        text: {
          content: existingNotes
            ? `${existingNotes}\n\nAssigned to: ${data.roles.join(', ')}`
            : `Assigned to: ${data.roles.join(', ')}`,
        },
      }],
    };
  }

  await notion.pages.create({
    parent: { database_id: DATABASE_IDS.tasks },
    properties: properties as any,
  });
}
