// Script to check content properties in Notion
require('dotenv').config({ path: '.env.local' });
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const CONTENT_DB_ID = process.env.NOTION_CONTENT_DB;

async function checkContentProperties() {
  console.log('Checking Content database...');
  console.log('Database ID:', CONTENT_DB_ID);

  try {
    // Get database schema
    const db = await notion.databases.retrieve({ database_id: CONTENT_DB_ID });
    console.log('\nAll properties in Content database:');
    Object.keys(db.properties).forEach(name => {
      console.log(`  - "${name}" (${db.properties[name].type})`);
    });

    // Check if Editing Notes exists
    if (db.properties['Editing Notes']) {
      console.log('\n✓ "Editing Notes" property exists in Content DB');
    } else {
      console.log('\n✗ "Editing Notes" property NOT FOUND in Content DB');
    }

    // Get the most recent content item with title "new test idea 16"
    console.log('\n--- Searching for content "new test idea 16" ---');
    const response = await notion.databases.query({
      database_id: CONTENT_DB_ID,
      filter: {
        property: 'Title',
        title: { contains: 'new test idea 16' }
      },
      page_size: 1,
    });

    if (response.results.length > 0) {
      const page = response.results[0];
      const props = page.properties;
      console.log('Found content!');
      console.log('Title:', props['Title']?.title?.[0]?.text?.content);
      console.log('Editing Notes:', JSON.stringify(props['Editing Notes']));
      console.log('Idea Source:', JSON.stringify(props['Idea Source']));
    } else {
      console.log('Content not found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkContentProperties();
