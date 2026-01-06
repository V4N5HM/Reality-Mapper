// Script to check and add missing properties to the Ideas database
require('dotenv').config({ path: '.env.local' });
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const IDEAS_DB_ID = process.env.NOTION_IDEAS_DB;

async function main() {
  console.log('Checking Ideas database properties...\n');

  // Get database schema
  const db = await notion.databases.retrieve({ database_id: IDEAS_DB_ID });

  console.log('Existing properties:');
  const existingProps = Object.keys(db.properties);
  existingProps.forEach(prop => {
    const type = db.properties[prop].type;
    console.log(`  - ${prop} (${type})`);
  });

  // Check for required properties
  const requiredProps = [
    { name: 'Angle', type: 'rich_text' },
    { name: 'Source Link', type: 'url' },
    { name: 'Brief URL', type: 'url' },
    { name: 'Rejection Reason', type: 'select', options: ['Not aligned', 'Controversial', 'Unclear on angle', 'Other'] },
    { name: 'Rejection Note', type: 'rich_text' },
  ];

  const missingProps = requiredProps.filter(p => !existingProps.includes(p.name));

  if (missingProps.length === 0) {
    console.log('\n✅ All required properties exist!');
    return;
  }

  console.log('\nMissing properties:');
  missingProps.forEach(p => console.log(`  - ${p.name} (${p.type})`));

  // Add missing properties
  console.log('\nAdding missing properties...');

  const propertiesToAdd = {};

  for (const prop of missingProps) {
    if (prop.type === 'rich_text') {
      propertiesToAdd[prop.name] = { rich_text: {} };
    } else if (prop.type === 'url') {
      propertiesToAdd[prop.name] = { url: {} };
    } else if (prop.type === 'select' && prop.options) {
      propertiesToAdd[prop.name] = {
        select: {
          options: prop.options.map(name => ({ name, color: 'default' }))
        }
      };
    }
  }

  if (Object.keys(propertiesToAdd).length > 0) {
    await notion.databases.update({
      database_id: IDEAS_DB_ID,
      properties: propertiesToAdd,
    });
    console.log('✅ Added missing properties!');
  }

  // Verify
  const updatedDb = await notion.databases.retrieve({ database_id: IDEAS_DB_ID });
  console.log('\nUpdated properties:');
  Object.keys(updatedDb.properties).forEach(prop => {
    const type = updatedDb.properties[prop].type;
    console.log(`  - ${prop} (${type})`);
  });
}

main().catch(console.error);
