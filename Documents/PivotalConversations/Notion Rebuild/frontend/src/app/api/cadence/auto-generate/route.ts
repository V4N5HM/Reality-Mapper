import { NextRequest, NextResponse } from 'next/server';
import { generateTasksFromCadence, createTasksFromCadence, TeamMemberMapping } from '@/lib/notion/cadence';
import { getTeamMembers } from '@/lib/notion/team';
import { getClients } from '@/lib/notion/clients';
import { getTaskAlerts } from '@/lib/notion/tasks';

// POST - Auto-generate recurring tasks for all active clients
// This endpoint is designed to be called by a cron job (e.g., daily at 9am)
// It uses autoMode to only generate tasks that are due today based on their frequency
export async function POST(request: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all active clients
    const clients = await getClients('Active');

    if (clients.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active clients found',
        results: [],
      });
    }

    // Get team members for task assignment
    const teamMembers = await getTeamMembers();

    // Build team member mappings
    const teamMemberMappings: TeamMemberMapping[] = [];
    for (const member of teamMembers) {
      for (const role of member.roles) {
        teamMemberMappings.push({
          role: role as any,
          userId: member.id,
          name: member.name,
        });
      }
    }

    const results: Array<{
      clientName: string;
      created: number;
      failed: number;
      skipped: number;
    }> = [];

    let totalCreated = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    // Generate tasks for each active client
    for (const client of clients) {
      try {
        // Use autoMode to only generate tasks due today
        const { generated, skipped } = await generateTasksFromCadence(
          client.id,
          client.name,
          { autoMode: true }
        );

        if (generated.length === 0) {
          results.push({
            clientName: client.name,
            created: 0,
            failed: 0,
            skipped: skipped.length,
          });
          totalSkipped += skipped.length;
          continue;
        }

        // Create tasks with team member assignments
        const { created, failed } = await createTasksFromCadence(
          client.id,
          generated,
          teamMemberMappings
        );

        results.push({
          clientName: client.name,
          created,
          failed,
          skipped: skipped.length,
        });

        totalCreated += created;
        totalFailed += failed;
        totalSkipped += skipped.length;
      } catch (error) {
        console.error(`Error generating tasks for ${client.name}:`, error);
        results.push({
          clientName: client.name,
          created: 0,
          failed: 1,
          skipped: 0,
        });
        totalFailed++;
      }
    }

    // Also get current alerts to include in response
    const alerts = await getTaskAlerts();
    const memberMap = new Map(teamMembers.map(m => [m.id, m.name]));

    return NextResponse.json({
      success: true,
      summary: {
        totalClients: clients.length,
        totalCreated,
        totalFailed,
        totalSkipped,
      },
      results,
      // Include alerts in the response for awareness
      alerts: {
        overdue: alerts.overdue.length,
        dueToday: alerts.dueToday.length,
        dueThisWeek: alerts.dueThisWeek.length,
        overdueByMember: Object.entries(alerts.byAssignee)
          .filter(([_, counts]) => counts.overdue > 0)
          .map(([id, counts]) => ({
            name: memberMap.get(id) || id,
            count: counts.overdue,
          })),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in auto-generate cadence tasks:', error);
    return NextResponse.json(
      { error: 'Failed to auto-generate cadence tasks' },
      { status: 500 }
    );
  }
}

// GET - Check what tasks would be generated today (dry run)
export async function GET(request: NextRequest) {
  try {
    // Get all active clients
    const clients = await getClients('Active');

    if (clients.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active clients found',
        preview: [],
      });
    }

    // Get team members for task assignment preview
    const teamMembers = await getTeamMembers();

    const preview: Array<{
      clientName: string;
      tasksToGenerate: number;
      tasks: Array<{ task: string; dueDate: string; roles: string[] }>;
      skipped: number;
    }> = [];

    let totalTasks = 0;

    // Preview tasks for each active client
    for (const client of clients) {
      const { generated, skipped } = await generateTasksFromCadence(
        client.id,
        client.name,
        { autoMode: true }
      );

      if (generated.length > 0) {
        preview.push({
          clientName: client.name,
          tasksToGenerate: generated.length,
          tasks: generated.map(t => ({
            task: t.task,
            dueDate: t.dueDate,
            roles: t.roles,
          })),
          skipped: skipped.length,
        });
        totalTasks += generated.length;
      }
    }

    return NextResponse.json({
      success: true,
      date: new Date().toISOString().split('T')[0],
      dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
      totalTasksToGenerate: totalTasks,
      totalClients: clients.length,
      clientsWithTasks: preview.length,
      teamMembers: teamMembers.map(m => ({ name: m.name, roles: m.roles })),
      preview,
    });
  } catch (error) {
    console.error('Error previewing auto-generate:', error);
    return NextResponse.json(
      { error: 'Failed to preview auto-generate' },
      { status: 500 }
    );
  }
}
