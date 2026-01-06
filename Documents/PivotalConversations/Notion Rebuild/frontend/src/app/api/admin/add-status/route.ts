import { NextRequest, NextResponse } from 'next/server';
import { notion, DATABASE_IDS } from '@/lib/notion/client';

// Admin endpoint to add "Final Review" status to Notion Content database
export async function POST(request: NextRequest) {
  try {
    console.log('Fetching current database schema...');

    // Get current database schema
    const database = await notion.databases.retrieve({
      database_id: DATABASE_IDS.content,
    });

    const statusProperty = (database.properties as any)['Status'];
    console.log('Current Status property type:', statusProperty?.type);

    if (statusProperty?.type === 'select') {
      const currentOptions = statusProperty.select?.options || [];
      console.log('Current status options:', currentOptions.map((o: any) => o.name));

      // Check if "Final Review" already exists
      const hasFinalReview = currentOptions.some((o: any) => o.name === 'Final Review');

      if (hasFinalReview) {
        return NextResponse.json({
          success: true,
          message: '"Final Review" status already exists!',
          options: currentOptions.map((o: any) => o.name),
        });
      }

      // Add "Final Review" to the options
      const updatedOptions = [
        ...currentOptions,
        { name: 'Final Review', color: 'pink' }
      ];

      console.log('Adding "Final Review" status...');

      await notion.databases.update({
        database_id: DATABASE_IDS.content,
        properties: {
          'Status': {
            select: {
              options: updatedOptions
            }
          }
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Successfully added "Final Review" status!',
        options: updatedOptions.map((o: any) => o.name),
      });

    } else if (statusProperty?.type === 'status') {
      // Native status type
      const currentOptions = statusProperty.status?.options || [];
      const hasFinalReview = currentOptions.some((o: any) => o.name === 'Final Review');

      if (hasFinalReview) {
        return NextResponse.json({
          success: true,
          message: '"Final Review" status already exists!',
          options: currentOptions.map((o: any) => o.name),
        });
      }

      // Try to add to native status
      const updatedOptions: Array<{ name: string; color: string }> = [
        ...currentOptions.map((o: any) => ({ name: o.name as string, color: o.color as string })),
        { name: 'Final Review', color: 'pink' }
      ];

      try {
        await notion.databases.update({
          database_id: DATABASE_IDS.content,
          properties: {
            'Status': {
              status: {
                options: updatedOptions as any
              }
            }
          } as any
        });

        return NextResponse.json({
          success: true,
          message: 'Successfully added "Final Review" status!',
          options: updatedOptions.map((o: any) => o.name),
        });
      } catch (updateError: any) {
        return NextResponse.json({
          success: false,
          message: 'Notion API does not support adding options to native status properties. Please add "Final Review" manually in Notion.',
          error: updateError.message,
          currentOptions: currentOptions.map((o: any) => o.name),
        }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: false,
      message: 'Unexpected Status property type',
      type: statusProperty?.type,
    }, { status: 400 });

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.body,
    }, { status: 500 });
  }
}

// GET to check current status options
export async function GET(request: NextRequest) {
  try {
    const database = await notion.databases.retrieve({
      database_id: DATABASE_IDS.content,
    });

    const statusProperty = (database.properties as any)['Status'];

    let options: string[] = [];
    if (statusProperty?.type === 'select') {
      options = statusProperty.select?.options?.map((o: any) => o.name) || [];
    } else if (statusProperty?.type === 'status') {
      options = statusProperty.status?.options?.map((o: any) => o.name) || [];
    }

    return NextResponse.json({
      propertyType: statusProperty?.type,
      options,
      hasFinalReview: options.includes('Final Review'),
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
    }, { status: 500 });
  }
}
