import { NextRequest, NextResponse } from 'next/server';
import {
  getCurrentUser,
  getTeams,
  getProjects,
  getProject,
  listAssetChildren,
  listAllAssetChildren,
  findToBePostedFolder,
  findPostedFolder,
  getRecentUploads,
  getShareableLink,
  moveAsset,
  updateAssetLabel,
} from '@/lib/frameio/client';

/**
 * Frame.io API endpoint
 *
 * GET /api/frameio - Get current user info
 * GET /api/frameio?action=teams - List teams
 * GET /api/frameio?action=projects&teamId=xxx - List projects for a team
 * GET /api/frameio?action=assets&assetId=xxx - List assets in a folder
 * GET /api/frameio?action=to-be-posted&projectId=xxx - Find "To Be Posted" folder
 * GET /api/frameio?action=recent&folderId=xxx&hours=24 - Get recent uploads
 */
export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get('action');

    // Default: get current user
    if (!action) {
      const user = await getCurrentUser();
      return NextResponse.json(user);
    }

    switch (action) {
      case 'teams': {
        const teams = await getTeams();
        return NextResponse.json(teams);
      }

      case 'projects': {
        const teamId = request.nextUrl.searchParams.get('teamId');
        if (!teamId) {
          return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
        }
        const projects = await getProjects(teamId);
        return NextResponse.json(projects);
      }

      case 'project': {
        const projectId = request.nextUrl.searchParams.get('projectId');
        if (!projectId) {
          return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }
        const project = await getProject(projectId);
        return NextResponse.json(project);
      }

      case 'assets': {
        const assetId = request.nextUrl.searchParams.get('assetId');
        if (!assetId) {
          return NextResponse.json({ error: 'assetId is required' }, { status: 400 });
        }
        const all = request.nextUrl.searchParams.get('all') === 'true';
        const assets = all
          ? await listAllAssetChildren(assetId)
          : await listAssetChildren(assetId);
        return NextResponse.json(assets);
      }

      case 'to-be-posted': {
        const projectId = request.nextUrl.searchParams.get('projectId');
        const clientName = request.nextUrl.searchParams.get('clientName') || undefined;
        if (!projectId) {
          return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }
        const project = await getProject(projectId);
        const folder = await findToBePostedFolder(project.root_asset_id, clientName);
        return NextResponse.json(folder);
      }

      case 'posted': {
        const projectId = request.nextUrl.searchParams.get('projectId');
        const clientName = request.nextUrl.searchParams.get('clientName') || undefined;
        if (!projectId) {
          return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }
        const project = await getProject(projectId);
        const folder = await findPostedFolder(project.root_asset_id, clientName);
        return NextResponse.json(folder);
      }

      case 'recent': {
        const folderId = request.nextUrl.searchParams.get('folderId');
        const hours = parseInt(request.nextUrl.searchParams.get('hours') || '24');
        if (!folderId) {
          return NextResponse.json({ error: 'folderId is required' }, { status: 400 });
        }
        const uploads = await getRecentUploads(folderId, hours);
        return NextResponse.json(uploads);
      }

      case 'share-link': {
        const assetId = request.nextUrl.searchParams.get('assetId');
        if (!assetId) {
          return NextResponse.json({ error: 'assetId is required' }, { status: 400 });
        }
        const link = await getShareableLink(assetId);
        return NextResponse.json({ link });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Frame.io API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch from Frame.io' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/frameio
 *
 * Actions:
 * - move: Move asset to different folder
 * - label: Update asset label
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, assetId, destinationFolderId, label } = body;

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    switch (action) {
      case 'move': {
        if (!assetId || !destinationFolderId) {
          return NextResponse.json(
            { error: 'assetId and destinationFolderId are required' },
            { status: 400 }
          );
        }
        const asset = await moveAsset(assetId, destinationFolderId);
        return NextResponse.json(asset);
      }

      case 'label': {
        if (!assetId || !label) {
          return NextResponse.json(
            { error: 'assetId and label are required' },
            { status: 400 }
          );
        }
        const asset = await updateAssetLabel(assetId, label);
        return NextResponse.json(asset);
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Frame.io API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update Frame.io' },
      { status: 500 }
    );
  }
}
