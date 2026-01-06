import { Client } from '@notionhq/client';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) {
    env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
});

const notion = new Client({ auth: env.NOTION_API_KEY });

async function run() {
  console.log('\n=== HARDCODED TEAM MEMBERS ===');
  const hardcoded = [
    'natasha@pivotalconversations.ai - Natasha Rofe',
    'kyle@pivotalconversations.io - Kyle Traynor',
    'eddie@pivotalconversations.ai - Eddie Dong',
    'vansh@pivotalconversations.io - Vansh Mittal',
    'olivia@pivotalconversations.io - Olivia'
  ];
  hardcoded.forEach((m, i) => console.log(`${i+1}. ${m}`));

  const teamMembersDbId = env.NOTION_TEAM_MEMBERS_DB;
  if (!teamMembersDbId) {
    console.log('\nNOTION_TEAM_MEMBERS_DB not set');
    return;
  }

  console.log('\n=== NOTION DATABASE TEAM MEMBERS ===');
  const response = await notion.databases.query({ database_id: teamMembersDbId });

  response.results.forEach((page: any, i: number) => {
    const props = page.properties;
    const email = props.Email?.email || 'No email';
    const name = props.Name?.title?.[0]?.plain_text || 'No name';
    console.log(`${i+1}. ${email} - ${name}`);
  });

  if (response.results.length === 0) {
    console.log('(No additional members in Notion database)');
  }
}

run();
