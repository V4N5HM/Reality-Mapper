import { NextResponse } from 'next/server';
import { getCurrentCadencePhase, getCadencePhaseDescription, CADENCE_PHASES } from '@/lib/notion/cadence';

// GET - Get the current cadence phase
export async function GET() {
  try {
    const currentPhase = getCurrentCadencePhase();
    const description = getCadencePhaseDescription(currentPhase);

    // Get next phase dates for context
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    return NextResponse.json({
      currentPhase,
      description,
      date: today.toISOString().split('T')[0],
      allPhases: CADENCE_PHASES,
    });
  } catch (error) {
    console.error('Error getting current cadence phase:', error);
    return NextResponse.json(
      { error: 'Failed to get current cadence phase' },
      { status: 500 }
    );
  }
}
