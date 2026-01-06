/**
 * Script to create the Alerts database in Notion
 *
 * Run with: npx ts-node scripts/create-alerts-database.ts
 *
 * Prerequisites:
 * - NOTION_API_KEY must be set in .env
 * - The Notion integration must have access to the parent page
 */

import { Client } from '@notionhq/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// You'll need to set this to a page ID where you want the database created
// This can be any page in your workspace that your integration has access to
const PARENT_PAGE_ID = process.env.NOTION_WORKSPACE_PAGE_ID || '';

async function createAlertsDatabase() {
  if (!process.env.NOTION_API_KEY) {
    console.error('❌ NOTION_API_KEY is not set in environment variables');
    process.exit(1);
  }

  if (!PARENT_PAGE_ID) {
    console.error('❌ NOTION_WORKSPACE_PAGE_ID is not set.');
    console.log('\nTo find your workspace page ID:');
    console.log('1. Open your Notion workspace in a browser');
    console.log('2. Navigate to the page where you want to create the Alerts database');
    console.log('3. Copy the page ID from the URL (the 32-character string after the page name)');
    console.log('4. Add it to your .env file as NOTION_WORKSPACE_PAGE_ID=your_page_id');
    console.log('\nAlternatively, you can pass it as an argument:');
    console.log('NOTION_WORKSPACE_PAGE_ID=your_page_id npx ts-node scripts/create-alerts-database.ts');
    process.exit(1);
  }

  console.log('🚀 Creating Alerts database in Notion...\n');

  try {
    const response = await notion.databases.create({
      parent: {
        type: 'page_id',
        page_id: PARENT_PAGE_ID,
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
      properties: {
        // Title property (required)
        'Title': {
          title: {},
        },
        // Message - rich text for alert details
        'Message': {
          rich_text: {},
        },
        // Type - select for categorizing alerts
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
        // Priority - select for urgency level
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
        // Client - relation to Clients database (will be linked manually if needed)
        // For now, we'll store the client ID as text since we need the DB ID
        'Client': {
          relation: {
            database_id: process.env.NOTION_CLIENTS_DB || '',
            single_property: {},
          },
        },
        // Related Entity ID - to link back to tasks, ideas, content
        'Related Entity ID': {
          rich_text: {},
        },
        // Related Entity Type - what type of entity this alert is about
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
        // Read - checkbox to track if user has seen the alert
        'Read': {
          checkbox: {},
        },
        // Dismissed - checkbox to hide from active view
        'Dismissed': {
          checkbox: {},
        },
        // Sent to Slack - checkbox to track if notification was sent
        'Sent to Slack': {
          checkbox: {},
        },
        // Created - auto timestamp
        'Created': {
          created_time: {},
        },
        // Last Updated - auto timestamp
        'Last Updated': {
          last_edited_time: {},
        },
      },
    });

    console.log('✅ Alerts database created successfully!\n');
    console.log('Database ID:', response.id);
    console.log('\n📋 Add this to your .env file:');
    console.log(`NOTION_ALERTS_DB=${response.id.replace(/-/g, '')}`);
    console.log('\n🔗 Database URL:');
    console.log(`https://notion.so/${response.id.replace(/-/g, '')}`);

    return response;
  } catch (error: any) {
    if (error.code === 'object_not_found') {
      console.error('❌ Parent page not found or integration does not have access.');
      console.log('\nMake sure:');
      console.log('1. The page ID is correct');
      console.log('2. Your Notion integration has been added to that page');
      console.log('   (Click "..." menu on the page → "Add connections" → Select your integration)');
    } else if (error.code === 'validation_error') {
      console.error('❌ Validation error:', error.message);
      if (error.message.includes('Client')) {
        console.log('\n⚠️  The Client relation requires NOTION_CLIENTS_DB to be set.');
        console.log('Creating database without Client relation...\n');
        return createAlertsDatabaseWithoutRelation();
      }
    } else {
      console.error('❌ Error creating database:', error.message || error);
    }
    process.exit(1);
  }
}

// Fallback function without Client relation
async function createAlertsDatabaseWithoutRelation() {
  const response = await notion.databases.create({
    parent: {
      type: 'page_id',
      page_id: PARENT_PAGE_ID,
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
    properties: {
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
      'Client ID': {
        rich_text: {},
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
    },
  });

  console.log('✅ Alerts database created successfully (without Client relation)!\n');
  console.log('Database ID:', response.id);
  console.log('\n📋 Add this to your .env file:');
  console.log(`NOTION_ALERTS_DB=${response.id.replace(/-/g, '')}`);
  console.log('\n🔗 Database URL:');
  console.log(`https://notion.so/${response.id.replace(/-/g, '')}`);
  console.log('\n⚠️  Note: Client relation was not created. You can add it manually in Notion');
  console.log('    by adding a Relation property linked to your Clients database.');

  return response;
}

// Run the script
createAlertsDatabase();
