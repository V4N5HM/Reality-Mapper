import { NextRequest, NextResponse } from 'next/server';
import { generateTasksFromCadence, createTasksFromCadence, TeamMemberMapping } from '@/lib/notion/cadence';

// POST - Generate tasks from cadence templates for a client
// Now supports assigning tasks to specific team members based on their roles
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, clientName, frequency, phase, dryRun, teamMemberMappings } = body;

    if (!clientId || !clientName) {
      return NextResponse.json(
        { error: 'clientId and clientName are required' },
        { status: 400 }
      );
    }

    // Generate tasks based on cadence templates
    const { generated, skipped } = await generateTasksFromCadence(
      clientId,
      clientName,
      { frequency, phase, dryRun }
    );

    // If dry run, return what would be created (including team member distribution)
    if (dryRun) {
      // Calculate how many tasks per team member would be created
      const tasksPerMember: Record<string, number> = {};
      if (teamMemberMappings && teamMemberMappings.length > 0) {
        for (const task of generated) {
          const matchingMembers = (teamMemberMappings as TeamMemberMapping[]).filter(
            member => task.roles.includes(member.role)
          );
          if (matchingMembers.length === 0) {
            tasksPerMember['Unassigned'] = (tasksPerMember['Unassigned'] || 0) + 1;
          } else {
            for (const member of matchingMembers) {
              tasksPerMember[member.name] = (tasksPerMember[member.name] || 0) + 1;
            }
          }
        }
      }

      return NextResponse.json({
        dryRun: true,
        generated,
        skipped,
        tasksPerMember,
        message: `Would create ${generated.length} tasks (${skipped.length} skipped)`,
      });
    }

    // Create the tasks with team member assignments
    const { created, failed, tasksPerMember } = await createTasksFromCadence(
      clientId,
      generated,
      teamMemberMappings as TeamMemberMapping[] | undefined
    );

    return NextResponse.json({
      success: true,
      created,
      failed,
      skipped: skipped.length,
      tasksPerMember,
      message: `Created ${created} tasks for ${clientName}`,
    });
  } catch (error) {
    console.error('Error generating cadence tasks:', error);
    return NextResponse.json(
      { error: 'Failed to generate cadence tasks' },
      { status: 500 }
    );
  }
}
