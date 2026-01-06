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

async function run() {
  // Get Notion workspace users
  console.log('=== NOTION WORKSPACE USERS ===');
  const usersResponse = await notion.users.list({});
  const notionUserMap = new Map();

  for (const user of usersResponse.results) {
    if (user.type === 'person') {
      const email = user.person && user.person.email ? user.person.email : 'no email';
      const name = user.name || 'No name';
      console.log('- ' + name + ' (' + email + ') -> ID: ' + user.id);
      if (user.person && user.person.email) {
        notionUserMap.set(user.person.email.toLowerCase(), user.id);
      }
    }
  }

  console.log('\n=== HARDCODED TEAM MEMBERS - ID MAPPING ===');
  // Updated to match the actual team.ts file
  const hardcoded = [
    { name: 'Natasha Rofe', email: 'natasha@pivotalconversations.ai' },
    { name: 'Kyle Traynor', email: 'kyle@pivotalconversations.io' },
    { name: 'Eddie Dong', email: 'eddie@pivotalconversations.ai' },
    { name: 'Vansh Mittal', email: 'vansh@pivotalconversations.ai' }, // Fixed: .ai matches Notion
    { name: 'Olivia', email: 'olivia@pivotalconversations.io' },
  ];

  for (let i = 0; i < hardcoded.length; i++) {
    const member = hardcoded[i];
    const notionId = notionUserMap.get(member.email.toLowerCase());
    const assignedId = notionId || ('team-member-' + i);
    const canAssign = notionId ? 'YES - can assign tasks' : 'NO - will be unassigned';
    console.log('- ' + member.name + ' (' + member.email + ')');
    console.log('  Notion ID: ' + assignedId);
    console.log('  Can auto-assign: ' + canAssign);
    console.log('');
  }
}

run().catch(console.error);
