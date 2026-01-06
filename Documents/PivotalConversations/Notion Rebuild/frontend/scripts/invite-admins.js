// Script to create invites for Kyle and Vansh in the Notion Team Members database
// Run with: node scripts/invite-admins.js

const { Client } = require('@notionhq/client');
require('dotenv').config({ path: '.env.local' });

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const teamMembersDbId = process.env.NOTION_TEAM_MEMBERS_DB;

const adminsToInvite = [
  {
    name: 'Kyle Traynor',
    email: 'kyle@pivotalconversations.io',
    role: 'YouTube Manager',
    team: ['Personal Brand'],
    workspaceType: 'full_dashboard',
    isAdmin: true,
  },
  {
    name: 'Vansh Mittal',
    email: 'vansh@pivotalconversations.io',
    role: 'Editor', // Using Editor as placeholder, can be changed
    team: ['Personal Brand'],
    workspaceType: 'full_dashboard',
    isAdmin: true,
  },
];

async function createInvites() {
  if (!teamMembersDbId) {
    console.error('NOTION_TEAM_MEMBERS_DB not set in .env.local');
    process.exit(1);
  }

  console.log('Creating invites for admins...\n');

  for (const admin of adminsToInvite) {
    try {
      // Check if already exists
      const existing = await notion.databases.query({
        database_id: teamMembersDbId,
        filter: {
          property: 'Email',
          email: {
            equals: admin.email.toLowerCase(),
          },
        },
      });

      if (existing.results.length > 0) {
        console.log(`⚠️  ${admin.name} (${admin.email}) already exists in database`);
        continue;
      }

      // Create the invite
      await notion.pages.create({
        parent: { database_id: teamMembersDbId },
        properties: {
          Name: {
            title: [{ text: { content: admin.name } }],
          },
          Email: {
            email: admin.email.toLowerCase(),
          },
          Role: {
            select: { name: admin.role },
          },
          Team: {
            multi_select: admin.team.map(t => ({ name: t })),
          },
          'Workspace Type': {
            select: { name: admin.workspaceType },
          },
          'Is Admin': {
            checkbox: admin.isAdmin,
          },
          // Password Hash is left empty - they'll set it on signup
        },
      });

      console.log(`✅ Created invite for ${admin.name} (${admin.email})`);
    } catch (error) {
      console.error(`❌ Error creating invite for ${admin.name}:`, error.message);
    }
  }

  console.log('\nDone! Admins can now go to /signup to set their passwords.');
}

createInvites();
