// Script to update client Slack channel configurations
// Run with: node scripts/update-client-slack-channels.js

require('dotenv').config({ path: '.env.local' });

const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const CLIENTS_DB = process.env.NOTION_CLIENTS_DATABASE_ID || 'b219290f-cef0-4266-87e6-686ea8aa4caa';

// Mapping of client names to their Slack channel URLs
const CHANNEL_MAPPING = {
  'Ben Carrington': 'https://pivotalconversations.slack.com/archives/C09MQC3HUUV',
  'Christian Stevens': 'https://pivotalconversations.slack.com/archives/C09G6E7NZT2',
  'Ella Cas': 'https://pivotalconversations.slack.com/archives/C08Q13J31KR',
  'Mark Kentwell': 'https://pivotalconversations.slack.com/archives/C08AJMD5EUW',
  'The System': 'https://pivotalconversations.slack.com/archives/C07SW7KMP27',
  'Tobi Pearce': 'https://pivotalconversations.slack.com/archives/C07EMFRTL5R',
};

async function updateClientSlackChannels() {
  console.log('Updating client Slack channel configurations...\n');

  try {
    const response = await notion.databases.query({
      database_id: CLIENTS_DB,
    });

    let updated = 0;
    let skipped = 0;

    for (const page of response.results) {
      const props = page.properties;
      const name = props['Client Name']?.title?.[0]?.plain_text ||
                   props['Name']?.title?.[0]?.plain_text ||
                   'Unknown';
      const currentChannel = props['Slack Channel']?.url;

      if (CHANNEL_MAPPING[name]) {
        if (currentChannel === CHANNEL_MAPPING[name]) {
          console.log(`⏭️  ${name}: Already configured correctly`);
          skipped++;
          continue;
        }

        console.log(`🔄 Updating ${name}...`);
        console.log(`   Setting Slack Channel to: ${CHANNEL_MAPPING[name]}`);

        await notion.pages.update({
          page_id: page.id,
          properties: {
            'Slack Channel': {
              url: CHANNEL_MAPPING[name],
            },
          },
        });

        console.log(`   ✅ Updated!`);
        updated++;
      } else {
        console.log(`⚠️  ${name}: No channel mapping defined`);
        skipped++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\nSUMMARY:`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped: ${skipped}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Only run if executed directly (not imported)
if (require.main === module) {
  updateClientSlackChannels();
}

module.exports = { updateClientSlackChannels, CHANNEL_MAPPING };
