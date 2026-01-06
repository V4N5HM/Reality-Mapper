import { NextRequest, NextResponse } from 'next/server';
import { getHubstaffClient, isHubstaffEnabled } from '@/lib/integrations/hubstaff-client';
import { getTask, updateTask as updateNotionTask } from '@/lib/notion/tasks';
import { HubstaffSyncResult } from '@/types';

/**
 * POST /api/hubstaff/sync
 * Sync a single task to Hubstaff
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { taskId, projectId } = body;

        if (!taskId) {
            return NextResponse.json(
                { error: 'taskId is required' },
                { status: 400 }
            );
        }

        if (!isHubstaffEnabled()) {
            return NextResponse.json(
                { error: 'Hubstaff integration is not enabled' },
                { status: 400 }
            );
        }

        const client = getHubstaffClient();
        if (!client) {
            return NextResponse.json(
                { error: 'Failed to initialize Hubstaff client' },
                { status: 500 }
            );
        }

        // Get the task from Notion
        const task = await getTask(taskId);
        if (!task) {
            return NextResponse.json(
                { error: 'Task not found' },
                { status: 404 }
            );
        }

        // Determine which project to use
        const targetProjectId = projectId ||
            task.hubstaffProjectId ||
            process.env.HUBSTAFF_DEFAULT_PROJECT_ID;

        if (!targetProjectId) {
            return NextResponse.json(
                { error: 'No Hubstaff project specified' },
                { status: 400 }
            );
        }

        let hubstaffTaskId: string;
        let isNewTask = false;

        // Check if task already exists in Hubstaff
        if (task.hubstaffTaskId) {
            // Update existing task
            try {
                await client.updateTask(task.hubstaffTaskId, {
                    summary: task.task,
                    details: task.notes,
                });
                hubstaffTaskId = task.hubstaffTaskId;
            } catch (error) {
                console.error('Failed to update Hubstaff task, creating new one:', error);
                // If update fails, create a new task
                const hubstaffTask = await client.createTask(
                    targetProjectId,
                    task.task,
                    task.notes
                );
                hubstaffTaskId = hubstaffTask.id;
                isNewTask = true;
            }
        } else {
            // Create new task in Hubstaff
            const hubstaffTask = await client.createTask(
                targetProjectId,
                task.task,
                task.notes
            );
            hubstaffTaskId = hubstaffTask.id;
            isNewTask = true;
        }

        // Update the Notion task with Hubstaff sync info
        await updateNotionTask(taskId, {
            hubstaffTaskId,
            hubstaffProjectId: targetProjectId,
            syncStatus: 'Synced',
            lastSynced: new Date().toISOString(),
        } as any);

        const result: HubstaffSyncResult = {
            success: true,
            taskId,
            hubstaffTaskId,
            syncedAt: new Date().toISOString(),
        };

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error syncing task to Hubstaff:', error);

        // Try to update sync status to failed
        try {
            const { taskId } = await request.json();
            if (taskId) {
                await updateNotionTask(taskId, {
                    syncStatus: 'Failed',
                } as any);
            }
        } catch (updateError) {
            console.error('Failed to update sync status:', updateError);
        }

        return NextResponse.json(
            {
                error: 'Failed to sync task to Hubstaff',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
