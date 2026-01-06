/**
 * Script to create Team Members and Daily Check-ins databases in Notion
 * Run with: node scripts/create-team-checkin-dbs.js
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

  console.log('Finding parent page from Tasks database...');
  const db = await notion.databases.retrieve({ database_id: tasksDbId });

  if (db.parent.type === 'page_id') {
    return db.parent.page_id;
  } else if (db.parent.type === 'workspace') {
    return null;
  }

  return null;
}

async function createTeamMembersDatabase(parentPageId) {
  console.log('\n--- Creating Team Members Database ---\n');

  const properties = {
    'Name': {
      title: {},
    },
    'Email': {
      email: {},
    },
    'Role': {
      select: {
        options: [
          { name: 'Coordinator', color: 'blue' },
          { name: 'Short Form Manager', color: 'green' },
          { name: 'YouTube Manager', color: 'red' },
          { name: 'Editor', color: 'purple' },
        ],
      },
    },
    'Team': {
      multi_select: {
        options: [
          { name: 'Podcast', color: 'orange' },
          { name: 'Personal Brand', color: 'pink' },
          { name: 'Social Media', color: 'blue' },
          { name: 'Production', color: 'yellow' },
          { name: 'Advertising', color: 'green' },
        ],
      },
    },
    'Workspace Type': {
      select: {
        options: [
          { name: 'full_dashboard', color: 'green' },
          { name: 'team_workspace', color: 'blue' },
        ],
      },
    },
    'Is Admin': {
      checkbox: {},
    },
    'Slack User ID': {
      rich_text: {},
    },
    'Password Hash': {
      rich_text: {},
    },
    'Created': {
      created_time: {},
    },
    'Last Updated': {
      last_edited_time: {},
    },
  };

  const createParams = {
    title: [
      {
        type: 'text',
        text: { content: 'Team Members' },
      },
    ],
    icon: {
      type: 'emoji',
      emoji: '👥',
    },
    properties,
  };

  if (parentPageId) {
    createParams.parent = { type: 'page_id', page_id: parentPageId };
    console.log(`Creating database under page: ${parentPageId}`);
  } else {
    createParams.parent = { type: 'workspace', workspace: true };
    console.log('Creating at workspace level...');
  }

  const response = await notion.databases.create(createParams);
  const dbId = response.id.replace(/-/g, '');

  console.log('Team Members database created!');
  console.log('Database ID:', response.id);
  console.log(`\nNOTION_TEAM_MEMBERS_DB=${dbId}`);

  return dbId;
}

async function createCheckinsDatabase(parentPageId, teamMembersDbId) {
  console.log('\n--- Creating Daily Check-ins Database ---\n');

  const properties = {
    'Title': {
      title: {},
    },
    'Date': {
      date: {},
    },
    'Outcomes Today': {
      rich_text: {},
    },
    'Challenges': {
      rich_text: {},
    },
    'Learnings': {
      rich_text: {},
    },
    'Next Day Outcomes': {
      rich_text: {},
    },
    'Completed': {
      checkbox: {},
    },
    'Quality Score': {
      number: {
        format: 'number',
      },
    },
    'Sentiment': {
      select: {
        options: [
          { name: 'positive', color: 'green' },
          { name: 'neutral', color: 'gray' },
          { name: 'negative', color: 'red' },
        ],
      },
    },
    'AI Summary': {
      rich_text: {},
    },
    'Response Method': {
      select: {
        options: [
          { name: 'Speech', color: 'blue' },
          { name: 'Typed', color: 'gray' },
        ],
      },
    },
    'Team Member ID': {
      rich_text: {},
    },
    'Team Member Name': {
      rich_text: {},
    },
    'Created': {
      created_time: {},
    },
    'Last Updated': {
      last_edited_time: {},
    },
  };

  // Add Team Member relation if we have the Team Members DB
  if (teamMembersDbId) {
    properties['Team Member'] = {
      relation: {
        database_id: teamMembersDbId,
        single_property: {},
      },
    };
  }

  const createParams = {
    title: [
      {
        type: 'text',
        text: { content: 'Daily Check-ins' },
      },
    ],
    icon: {
      type: 'emoji',
      emoji: '📋',
    },
    properties,
  };

  if (parentPageId) {
    createParams.parent = { type: 'page_id', page_id: parentPageId };
    console.log(`Creating database under page: ${parentPageId}`);
  } else {
    createParams.parent = { type: 'workspace', workspace: true };
    console.log('Creating at workspace level...');
  }

  const response = await notion.databases.create(createParams);
  const dbId = response.id.replace(/-/g, '');

  console.log('Daily Check-ins database created!');
  console.log('Database ID:', response.id);
  console.log(`\nNOTION_CHECKINS_DB=${dbId}`);

  return dbId;
}

async function main() {
  console.log('Creating Team Members and Daily Check-ins databases in Notion...\n');

  try {
    const parentPageId = await getParentFromExistingDatabase();

    // Create Team Members database first
    const teamMembersDbId = await createTeamMembersDatabase(parentPageId);

    // Create Check-ins database with relation to Team Members
    const checkinsDbId = await createCheckinsDatabase(parentPageId, teamMembersDbId);

    console.log('\n========================================');
    console.log('Add these to your .env.local file:');
    console.log('========================================\n');
    console.log(`NOTION_TEAM_MEMBERS_DB=${teamMembersDbId}`);
    console.log(`NOTION_CHECKINS_DB=${checkinsDbId}`);
    console.log('\n========================================');

  } catch (error) {
    console.error('Error creating databases:', error.message);
    if (error.body) {
      console.error('Details:', JSON.stringify(error.body, null, 2));
    }
    process.exit(1);
  }
}

main();
