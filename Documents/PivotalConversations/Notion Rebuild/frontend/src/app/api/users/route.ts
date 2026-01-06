import { NextResponse } from 'next/server';
import { notion } from '@/lib/notion/client';

export async function GET() {
    try {
        const response = await notion.users.list({});

        const users = response.results
            .filter(user => user.type === 'person')
            .map(user => ({
                id: user.id,
                name: user.name,
                avatarUrl: user.avatar_url,
                email: user.person?.email
            }));

        return NextResponse.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        );
    }
}
