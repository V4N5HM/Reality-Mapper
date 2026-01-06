/**
 * This script adds an "Assignee" relation property to the Tasks database
 * that links to the Team Members database.
 *
 * This allows task assignment without requiring Notion workspace membership.
 */

const fs = require('fs');
const { Client } = require('@notionhq/client');

// Read .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) {
    env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
});

const notion = new Client({ auth: env.NOTION_API_KEY });

const TASKS_DB = env.NOTION_TASKS_DB;
const TEAM_MEMBERS_DB = env.NOTION_TEAM_MEMBERS_DB;

async function run() {
  if (!TASKS_DB) {
    console.error('NOTION_TASKS_DB not set');
    process.exit(1);
  }

  if (!TEAM_MEMBERS_DB) {
    console.error('NOTION_TEAM_MEMBERS_DB not set');
    process.exit(1);
  }

  console.log('Tasks DB:', TASKS_DB);
  console.log('Team Members DB:', TEAM_MEMBERS_DB);

  // First, check current properties of Tasks database
  console.log('\n=== Checking current Tasks database properties ===');
  const tasksDb = await notion.databases.retrieve({ database_id: TASKS_DB });

  const hasAssignee = 'Assignee' in tasksDb.properties;
  const hasAssignedTo = 'Assigned To' in tasksDb.properties;

  console.log('Has "Assignee" property:', hasAssignee);
  console.log('Has "Assigned To" property:', hasAssignedTo);

  if (hasAssignee) {
    console.log('\n"Assignee" property already exists!');
    console.log('Type:', tasksDb.properties['Assignee'].type);
    return;
  }

  // Add the Assignee relation property
  console.log('\n=== Adding "Assignee" relation property ===');

  try {
    const updateResult = await notion.databases.update({
      database_id: TASKS_DB,
      properties: {
        'Assignee': {
          relation: {
            database_id: TEAM_MEMBERS_DB,
            single_property: {} // Single select - one assignee per task
          }
        }
      }
    });

    console.log('Successfully added "Assignee" relation property!');
    console.log('The Tasks database now has a relation to Team Members.');
    console.log('\nNext steps:');
    console.log('1. Update the code to use "Assignee" (relation) instead of "Assigned To" (people)');
    console.log('2. Migrate existing assignments if needed');
  } catch (error) {
    console.error('Error adding property:', error.message);
    if (error.body) {
      console.error('Details:', error.body);
    }
  }
}

run().catch(console.error);
