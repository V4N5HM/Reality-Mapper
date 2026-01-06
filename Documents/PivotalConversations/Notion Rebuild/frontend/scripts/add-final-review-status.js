// Script to add "Final Review" status option to the Notion Content database
const { Client } = require('@notionhq/client');

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const DATABASE_ID = process.env.NOTION_CONTENT_DB;

async function addFinalReviewStatus() {
  try {
    console.log('Fetching current database schema...');

    // Get current database schema
    const database = await notion.databases.retrieve({
      database_id: DATABASE_ID,
    });

    const statusProperty = database.properties['Status'];
    console.log('Current Status property type:', statusProperty?.type);

    if (statusProperty?.type === 'select') {
      const currentOptions = statusProperty.select?.options || [];
      console.log('Current status options:', currentOptions.map(o => o.name));

      // Check if "Final Review" already exists
      const hasFinalReview = currentOptions.some(o => o.name === 'Final Review');

      if (hasFinalReview) {
        console.log('"Final Review" status already exists!');
        return;
      }

      // Add "Final Review" to the options
      const updatedOptions = [
        ...currentOptions,
        { name: 'Final Review', color: 'pink' }
      ];

      console.log('Adding "Final Review" status...');

      await notion.databases.update({
        database_id: DATABASE_ID,
        properties: {
          'Status': {
            select: {
              options: updatedOptions
            }
          }
        }
      });

      console.log('Successfully added "Final Review" status!');
    } else if (statusProperty?.type === 'status') {
      console.log('Status property is using Notion native status type.');
      console.log('Current groups:', statusProperty.status?.groups?.map(g => ({
        name: g.name,
        options: g.option_ids
      })));
      console.log('Current options:', statusProperty.status?.options?.map(o => o.name));

      // For native status type, we need to add to options
      const currentOptions = statusProperty.status?.options || [];
      const hasFinalReview = currentOptions.some(o => o.name === 'Final Review');

      if (hasFinalReview) {
        console.log('"Final Review" status already exists!');
        return;
      }

      // Add to the "In progress" group (or first available group)
      const groups = statusProperty.status?.groups || [];
      const inProgressGroup = groups.find(g => g.name === 'In progress') || groups[1] || groups[0];

      console.log('Adding "Final Review" to group:', inProgressGroup?.name);

      // Note: Notion API doesn't support adding status options directly
      // We need to update the database with new options
      const updatedOptions = [
        ...currentOptions.map(o => ({ name: o.name, color: o.color })),
        { name: 'Final Review', color: 'pink' }
      ];

      try {
        await notion.databases.update({
          database_id: DATABASE_ID,
          properties: {
            'Status': {
              status: {
                options: updatedOptions
              }
            }
          }
        });
        console.log('Successfully added "Final Review" status!');
      } catch (updateError) {
        console.log('Note: Notion API may not support adding status options to native status properties.');
        console.log('Error:', updateError.message);
        console.log('\nPlease add "Final Review" manually in Notion:');
        console.log('1. Open your Content database');
        console.log('2. Click on the Status column header');
        console.log('3. Add a new option called "Final Review"');
      }
    } else {
      console.log('Unexpected Status property type:', statusProperty?.type);
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.body) {
      console.error('Details:', error.body);
    }
  }
}

addFinalReviewStatus();
