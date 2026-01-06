// Script to check idea properties in Notion
require('dotenv').config({ path: '.env.local' });
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const IDEAS_DB_ID = process.env.NOTION_IDEAS_DB;

async function checkIdeaProperties() {
  console.log('Checking Ideas database properties...');
  console.log('Database ID:', IDEAS_DB_ID);

  try {
    // Get database schema
    const db = await notion.databases.retrieve({ database_id: IDEAS_DB_ID });
    console.log('\nAll properties in Ideas database:');
    Object.keys(db.properties).forEach(name => {
      console.log(`  - "${name}" (${db.properties[name].type})`);
    });

    // Check if Editing Notes exists
    if (db.properties['Editing Notes']) {
      console.log('\n✓ "Editing Notes" property exists');
    } else {
      console.log('\n✗ "Editing Notes" property NOT FOUND');
    }

    // Get a recent idea to check its values
    console.log('\n--- Fetching most recent idea ---');
    const response = await notion.databases.query({
      database_id: IDEAS_DB_ID,
      page_size: 1,
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
    });

    if (response.results.length > 0) {
      const page = response.results[0];
      const props = page.properties;
      console.log('Recent idea title:', props['Idea Title']?.title?.[0]?.text?.content || props['Headline']?.title?.[0]?.text?.content);
      console.log('Editing Notes value:', JSON.stringify(props['Editing Notes']));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkIdeaProperties();
