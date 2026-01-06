// Script to check client Slack channel configurations
// Run with: node scripts/check-slack-channels.js

require('dotenv').config({ path: '.env.local' });

const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const CLIENTS_DB = process.env.NOTION_CLIENTS_DATABASE_ID || 'b219290f-cef0-4266-87e6-686ea8aa4caa';

async function checkSlackChannels() {
  console.log('Fetching clients from Notion...\n');

  try {
    const response = await notion.databases.query({
      database_id: CLIENTS_DB,
      filter: {
        property: 'Status',
        select: {
          equals: 'Active'
        }
      }
    });

    console.log(`Found ${response.results.length} active clients\n`);
    console.log('=' .repeat(80));

    const clientsWithChannel = [];
    const clientsWithoutChannel = [];

    for (const page of response.results) {
      const props = page.properties;
      const name = props['Client Name']?.title?.[0]?.plain_text ||
                   props['Name']?.title?.[0]?.plain_text ||
                   'Unknown';
      const slackChannel = props['Slack Channel']?.url || null;

      if (slackChannel) {
        // Extract channel ID from URL
        const channelIdMatch = slackChannel.match(/\/archives\/([A-Z0-9]+)/);
        const channelId = channelIdMatch ? channelIdMatch[1] : 'Invalid URL format';

        clientsWithChannel.push({
          name,
          slackChannel,
          channelId,
        });
      } else {
        clientsWithoutChannel.push({ name });
      }
    }

    console.log('\n📢 CLIENTS WITH SLACK CHANNEL CONFIGURED:\n');
    if (clientsWithChannel.length === 0) {
      console.log('  None');
    } else {
      for (const client of clientsWithChannel) {
        console.log(`  ✅ ${client.name}`);
        console.log(`     URL: ${client.slackChannel}`);
        console.log(`     Channel ID: ${client.channelId}`);
        console.log('');
      }
    }

    console.log('\n❌ CLIENTS WITHOUT SLACK CHANNEL:\n');
    if (clientsWithoutChannel.length === 0) {
      console.log('  None - All clients have channels configured!');
    } else {
      for (const client of clientsWithoutChannel) {
        console.log(`  ⚠️  ${client.name}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`\nSUMMARY:`);
    console.log(`  With Slack Channel: ${clientsWithChannel.length}`);
    console.log(`  Without Slack Channel: ${clientsWithoutChannel.length}`);
    console.log(`  Total Active Clients: ${response.results.length}`);

    // Now validate the channels by checking if they exist in Slack
    if (clientsWithChannel.length > 0 && process.env.SLACK_BOT_TOKEN) {
      console.log('\n\nValidating Slack channels...\n');

      for (const client of clientsWithChannel) {
        if (client.channelId && client.channelId !== 'Invalid URL format') {
          try {
            const slackResponse = await fetch(`https://slack.com/api/conversations.info?channel=${client.channelId}`, {
              headers: {
                'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
              },
            });
            const data = await slackResponse.json();

            if (data.ok) {
              console.log(`  ✅ ${client.name}: Channel "${data.channel.name}" is valid and accessible`);
            } else {
              console.log(`  ❌ ${client.name}: ${data.error} (Channel ID: ${client.channelId})`);
            }
          } catch (err) {
            console.log(`  ⚠️  ${client.name}: Could not validate - ${err.message}`);
          }
        }
      }
    } else if (!process.env.SLACK_BOT_TOKEN) {
      console.log('\n⚠️  SLACK_BOT_TOKEN not set - cannot validate channels');
    }

  } catch (error) {
    console.error('Error fetching clients:', error);
  }
}

checkSlackChannels();
