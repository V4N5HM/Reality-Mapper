// Script to add "Editing Notes" property to the Ideas database
// Run with: node scripts/add-editing-notes-to-ideas.js

require('dotenv').config({ path: '.env.local' });
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const IDEAS_DB_ID = process.env.NOTION_IDEAS_DB;

async function addEditingNotesProperty() {
  console.log('Adding "Editing Notes" property to Ideas database...');
  console.log('Database ID:', IDEAS_DB_ID);

  try {
    // First, get current database schema
    const db = await notion.databases.retrieve({ database_id: IDEAS_DB_ID });
    console.log('\nCurrent properties:', Object.keys(db.properties).join(', '));

    // Check if property already exists
    if (db.properties['Editing Notes']) {
      console.log('\n"Editing Notes" property already exists!');
      return;
    }

    // Add the Editing Notes property
    const response = await notion.databases.update({
      database_id: IDEAS_DB_ID,
      properties: {
        'Editing Notes': {
          rich_text: {}
        }
      }
    });

    console.log('\nSuccessfully added "Editing Notes" property!');
    console.log('Updated properties:', Object.keys(response.properties).join(', '));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.body) {
      console.error('Notion API error:', JSON.stringify(error.body, null, 2));
    }
  }
}

addEditingNotesProperty();
