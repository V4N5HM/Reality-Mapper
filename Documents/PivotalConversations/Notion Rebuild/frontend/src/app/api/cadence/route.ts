import { NextRequest, NextResponse } from 'next/server';
import { getCadenceItems, createCadenceItem } from '@/lib/notion/cadence';

// GET /api/cadence - Get cadence items
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const active = searchParams.get('active');
    const frequency = searchParams.get('frequency') as 'Monthly' | 'Weekly' | 'Daily' | null;
    const phase = searchParams.get('phase') || undefined;

    const items = await getCadenceItems({
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      frequency: frequency || undefined,
      phase,
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching cadence items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cadence items' },
      { status: 500 }
    );
  }
}

// POST /api/cadence - Create new cadence item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskTemplate, roles, cadencePhase, dayOfMonth, weekOfMonth, frequency, active, description } = body;

    if (!taskTemplate) {
      return NextResponse.json(
        { error: 'Task template is required' },
        { status: 400 }
      );
    }

    const item = await createCadenceItem({
      taskTemplate,
      roles,
      cadencePhase,
      dayOfMonth,
      weekOfMonth,
      frequency,
      active,
      description,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Error creating cadence item:', error);
    return NextResponse.json(
      { error: 'Failed to create cadence item' },
      { status: 500 }
    );
  }
}
