import { NextRequest, NextResponse } from 'next/server';
import { getPackages, createPackage, updatePackage } from '@/lib/notion/packages';

// GET - Retrieve all packages
export async function GET() {
  try {
    const packages = await getPackages();
    return NextResponse.json(packages);
  } catch (error) {
    console.error('Error fetching packages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch packages' },
      { status: 500 }
    );
  }
}

// POST - Create a new package
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, shortFormPerMonth, youtubePerMonth, podcastPerMonth, monthlyRetainer, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Package name is required' },
        { status: 400 }
      );
    }

    const newPackage = await createPackage({
      name,
      shortFormPerMonth,
      youtubePerMonth,
      podcastPerMonth,
      monthlyRetainer,
      description,
    });

    return NextResponse.json(newPackage, { status: 201 });
  } catch (error) {
    console.error('Error creating package:', error);
    return NextResponse.json(
      { error: 'Failed to create package' },
      { status: 500 }
    );
  }
}

// PUT - Update an existing package
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, shortFormPerMonth, youtubePerMonth, podcastPerMonth, monthlyRetainer, description } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Package ID is required' },
        { status: 400 }
      );
    }

    const updatedPackage = await updatePackage(id, {
      name,
      shortFormPerMonth,
      youtubePerMonth,
      podcastPerMonth,
      monthlyRetainer,
      description,
    });

    return NextResponse.json(updatedPackage);
  } catch (error) {
    console.error('Error updating package:', error);
    return NextResponse.json(
      { error: 'Failed to update package' },
      { status: 500 }
    );
  }
}
