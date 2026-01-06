/**
 * Script to create the Alerts database in Notion
 * Run with: node scripts/create-alerts-db.js
 */

const { Client } = require('@notionhq/client');
require('dotenv').config({ path: '.env.local' });

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

async function getParentFromExistingDatabase() {
  // Get the parent page from an existing database (Tasks DB)
  const tasksDbId = process.env.NOTION_TASKS_DB;
  if (!tasksDbId) {
    throw new Error('NOTION_TASKS_DB not found in environment');
  }

  console.log('📍 Finding parent page from Tasks database...');
  const db = await notion.databases.retrieve({ database_id: tasksDbId });

  if (db.parent.type === 'page_id') {
    return db.parent.page_id;
  } else if (db.parent.type === 'workspace') {
    // Database is at workspace root, we'll need to create in a different way
    return null;
  }

  return null;
}

async function createAlertsDatabase() {
  console.log('🚀 Creating Alerts database in Notion...\n');

  try {
    // First, try to get the parent page from an existing database
    const parentPageId = await getParentFromExistingDatabase();

    const properties = {
      'Title': {
        title: {},
      },
      'Message': {
        rich_text: {},
      },
      'Type': {
        select: {
          options: [
            { name: 'task_overdue', color: 'red' },
            { name: 'task_reminder', color: 'yellow' },
            { name: 'urgent_idea', color: 'orange' },
            { name: 'daily_summary', color: 'blue' },
            { name: 'general', color: 'gray' },
            { name: 'error', color: 'red' },
            { name: 'warning', color: 'yellow' },
            { name: 'info', color: 'blue' },
          ],
        },
      },
      'Priority': {
        select: {
          options: [
            { name: 'urgent', color: 'red' },
            { name: 'high', color: 'orange' },
            { name: 'normal', color: 'gray' },
            { name: 'low', color: 'green' },
          ],
        },
      },
      'Related Entity ID': {
        rich_text: {},
      },
      'Related Entity Type': {
        select: {
          options: [
            { name: 'task', color: 'blue' },
            { name: 'idea', color: 'purple' },
            { name: 'content', color: 'green' },
            { name: 'case_note', color: 'yellow' },
          ],
        },
      },
      'Read': {
        checkbox: {},
      },
      'Dismissed': {
        checkbox: {},
      },
      'Sent to Slack': {
        checkbox: {},
      },
      'Created': {
        created_time: {},
      },
      'Last Updated': {
        last_edited_time: {},
      },
    };

    // Add Client relation if we have the Clients DB
    if (process.env.NOTION_CLIENTS_DB) {
      properties['Client'] = {
        relation: {
          database_id: process.env.NOTION_CLIENTS_DB,
          single_property: {},
        },
      };
    }

    let response;

    if (parentPageId) {
      console.log(`📄 Creating database under page: ${parentPageId}\n`);
      response = await notion.databases.create({
        parent: {
          type: 'page_id',
          page_id: parentPageId,
        },
        title: [
          {
            type: 'text',
            text: {
              content: 'Alerts',
            },
          },
        ],
        icon: {
          type: 'emoji',
          emoji: '🔔',
        },
        properties,
      });
    } else {
      // Create as inline database in workspace
      console.log('⚠️  Could not find parent page. Creating at workspace level...\n');
      response = await notion.databases.create({
        parent: {
          type: 'workspace',
          workspace: true,
        },
        title: [
          {
            type: 'text',
            text: {
              content: 'Alerts',
            },
          },
        ],
        icon: {
          type: 'emoji',
          emoji: '🔔',
        },
        properties,
      });
    }

    const dbId = response.id.replace(/-/g, '');

    console.log('✅ Alerts database created successfully!\n');
    console.log('Database ID:', response.id);
    console.log('\n📋 Add this to your .env.local file:');
    console.log(`NOTION_ALERTS_DB=${dbId}`);
    console.log('\n🔗 Database URL:');
    console.log(`https://notion.so/${dbId}`);

    return response;
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    if (error.body) {
      console.error('Details:', JSON.stringify(error.body, null, 2));
    }
    process.exit(1);
  }
}

createAlertsDatabase();
