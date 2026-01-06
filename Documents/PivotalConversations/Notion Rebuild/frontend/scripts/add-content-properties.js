/**
 * Script to add new properties to the Content database in Notion
 * Properties to add:
 * - Assigned Strategist (Select): Options: Natasha, Kyle
 * - Assigned Coordinator (Select): Options: Eddie
 * - Style (Select): Empty for now
 * - Editing Notes (Rich Text)
 * - Podcast Clip Style (Select): Empty for now - for clips from YouTube/Podcast
 */

const { Client } = require('@notionhq/client');
require('dotenv').config({ path: '.env.local' });

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const CONTENT_DATABASE_ID = process.env.NOTION_CONTENT_DB;

async function addPropertiesToContentDatabase() {
  if (!CONTENT_DATABASE_ID) {
    console.error('NOTION_CONTENT_DB environment variable not set');
    process.exit(1);
  }

  console.log('Adding properties to Content database:', CONTENT_DATABASE_ID);

  try {
    // First, get current database schema to see what exists
    const database = await notion.databases.retrieve({ database_id: CONTENT_DATABASE_ID });
    const existingProps = Object.keys(database.properties);
    console.log('Existing properties:', existingProps.length);

    const propertiesToAdd = {};

    // Add Assigned Strategist if not exists
    if (!existingProps.includes('Assigned Strategist')) {
      propertiesToAdd['Assigned Strategist'] = {
        select: {
          options: [
            { name: 'Natasha', color: 'blue' },
            { name: 'Kyle', color: 'green' },
          ],
        },
      };
      console.log('Will add: Assigned Strategist');
    } else {
      console.log('Already exists: Assigned Strategist');
    }

    // Add Assigned Coordinator if not exists
    if (!existingProps.includes('Assigned Coordinator')) {
      propertiesToAdd['Assigned Coordinator'] = {
        select: {
          options: [
            { name: 'Eddie', color: 'purple' },
          ],
        },
      };
      console.log('Will add: Assigned Coordinator');
    } else {
      console.log('Already exists: Assigned Coordinator');
    }

    // Add Style if not exists (for Short Form content)
    if (!existingProps.includes('Style')) {
      propertiesToAdd['Style'] = {
        select: {
          options: [], // Empty for now
        },
      };
      console.log('Will add: Style');
    } else {
      console.log('Already exists: Style');
    }

    // Add Editing Notes if not exists
    if (!existingProps.includes('Editing Notes')) {
      propertiesToAdd['Editing Notes'] = {
        rich_text: {},
      };
      console.log('Will add: Editing Notes');
    } else {
      console.log('Already exists: Editing Notes');
    }

    // Add Podcast Clip Style if not exists (for clips from YouTube/Podcast)
    if (!existingProps.includes('Podcast Clip Style')) {
      propertiesToAdd['Podcast Clip Style'] = {
        select: {
          options: [], // Empty for now
        },
      };
      console.log('Will add: Podcast Clip Style');
    } else {
      console.log('Already exists: Podcast Clip Style');
    }

    if (Object.keys(propertiesToAdd).length === 0) {
      console.log('\nAll properties already exist. Nothing to add.');
      return;
    }

    console.log('\nAdding', Object.keys(propertiesToAdd).length, 'new properties...');

    const response = await notion.databases.update({
      database_id: CONTENT_DATABASE_ID,
      properties: propertiesToAdd,
    });

    console.log('\nSuccessfully added properties to Content database!');
    console.log('Database title:', response.title?.[0]?.plain_text || 'Untitled');
    console.log('New property count:', Object.keys(response.properties).length);

  } catch (error) {
    console.error('Error adding properties:', error);
    if (error.body) {
      console.error('Error details:', error.body);
    }
    process.exit(1);
  }
}

addPropertiesToContentDatabase();
