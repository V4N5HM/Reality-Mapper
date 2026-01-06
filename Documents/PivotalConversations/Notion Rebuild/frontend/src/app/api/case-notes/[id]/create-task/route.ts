import { NextRequest, NextResponse } from 'next/server';
import { getCaseNote } from '@/lib/notion/case-notes';
import { notion, DATABASE_IDS } from '@/lib/notion/client';
import { TaskUrgency } from '@/types';

// Calculate due date based on urgency
function calculateDueDate(urgency: TaskUrgency): string {
  const today = new Date();
  let dueDate: Date;

  switch (urgency) {
    case 'Urgent':
      // Due in 48 hours
      dueDate = new Date(today);
      dueDate.setDate(today.getDate() + 2);
      break;
    case 'This Week':
      // Due next Friday
      dueDate = new Date(today);
      const dayOfWeek = today.getDay();
      const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 7 - dayOfWeek + 5;
      dueDate.setDate(today.getDate() + daysUntilFriday);
      break;
    case 'This Month':
      // Due end of current month
      dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
    default:
      dueDate = new Date(today);
      dueDate.setDate(today.getDate() + 7);
  }

  return dueDate.toISOString().split('T')[0];
}

// POST - Create task from case note
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { taskTitle, urgency, assignedTo, notes, relatedContentId } = body;

    // Get the case note first
    const caseNote = await getCaseNote(id);
    if (!caseNote) {
      return NextResponse.json(
        { error: 'Case note not found' },
        { status: 404 }
      );
    }

    // Use provided title or generate from case note
    const finalTitle = taskTitle || `Action: ${caseNote.title}`;
    const finalUrgency: TaskUrgency = urgency || 'This Week';
    const dueDate = calculateDueDate(finalUrgency);

    // Build task properties
    const taskProperties: Record<string, unknown> = {
      'Task': { title: [{ text: { content: finalTitle } }] },
      'Client': { relation: [{ id: caseNote.clientId }] },
      'Status': { select: { name: 'To Do' } },
      'Urgency': { select: { name: finalUrgency } },
      'Due Date': { date: { start: dueDate } },
      'Source Case Note': { relation: [{ id: caseNote.id }] },
    };

    // Add context from case note to notes field
    const taskNotes: string[] = [];
    if (caseNote.fullNote) {
      taskNotes.push(`From case note: ${caseNote.fullNote}`);
    }
    if (notes) {
      taskNotes.push(notes);
    }
    if (taskNotes.length > 0) {
      taskProperties['Notes'] = {
        rich_text: [{ text: { content: taskNotes.join('\n\n') } }]
      };
    }

    // Add optional relations
    if (relatedContentId) {
      taskProperties['Related Content'] = { relation: [{ id: relatedContentId }] };
    }

    // Create the task
    const taskPage = await notion.pages.create({
      parent: { database_id: DATABASE_IDS.tasks },
      properties: taskProperties as any,
    });

    // Update the case note to link to this task
    // Note: This requires the "Generated Tasks" relation to exist in the case notes DB
    try {
      await notion.pages.update({
        page_id: caseNote.id,
        properties: {
          'Generated Tasks': {
            relation: [...(caseNote.taskIds?.map(tid => ({ id: tid })) || []), { id: taskPage.id }]
          }
        },
      });
    } catch (e) {
      // If the relation doesn't exist, continue anyway
      console.log('Could not update case note with task relation:', e);
    }

    return NextResponse.json({
      success: true,
      taskId: taskPage.id,
      dueDate,
      message: `Task "${finalTitle}" created successfully`,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating task from case note:', error);
    return NextResponse.json(
      { error: 'Failed to create task from case note' },
      { status: 500 }
    );
  }
}
