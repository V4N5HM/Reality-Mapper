import { NextResponse } from 'next/server';
import { getContentBankClients } from '@/lib/notion/ideas';

// GET /api/content-bank-clients - List all Content Bank (PB) clients
export async function GET() {
  try {
    const clients = await getContentBankClients();
    return NextResponse.json(clients);
  } catch (error) {
    console.error('Error fetching content bank clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content bank clients' },
      { status: 500 }
    );
  }
}
