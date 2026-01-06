// Script to list available Slack channels
// Run with: node scripts/list-slack-channels.js

require('dotenv').config({ path: '.env.local' });

async function listSlackChannels() {
  const token = process.env.SLACK_BOT_TOKEN;

  if (!token) {
    console.error('SLACK_BOT_TOKEN not configured');
    return;
  }

  console.log('Fetching Slack channels...\n');

  try {
    // Fetch public channels
    const publicResponse = await fetch('https://slack.com/api/conversations.list?types=public_channel&exclude_archived=true&limit=200', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const publicData = await publicResponse.json();

    // Fetch private channels
    const privateResponse = await fetch('https://slack.com/api/conversations.list?types=private_channel&exclude_archived=true&limit=200', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const privateData = await privateResponse.json();

    if (!publicData.ok) {
      console.error('Error fetching public channels:', publicData.error);
    }
    if (!privateData.ok) {
      console.error('Error fetching private channels:', privateData.error);
    }

    const allChannels = [
      ...(publicData.channels || []).map(c => ({ ...c, type: 'public' })),
      ...(privateData.channels || []).map(c => ({ ...c, type: 'private' })),
    ];

    // Sort alphabetically
    allChannels.sort((a, b) => a.name.localeCompare(b.name));

    console.log(`Found ${allChannels.length} channels\n`);
    console.log('='.repeat(100));

    // Client names to look for
    const clientNames = [
      'thomas hawley', 'christian stevens', 'mark kentwell', 'ella cas',
      'the system', 'australian property scout', 'top 1% podcast', 'ben carrington',
      'jack henderson', 'nicholas king', 'pivotal conversations', 'tobi pearce',
      'my next property'
    ];

    console.log('\n🔍 POTENTIAL CLIENT CHANNELS (matching client names):\n');

    const potentialMatches = [];
    for (const channel of allChannels) {
      const channelLower = channel.name.toLowerCase();
      for (const clientName of clientNames) {
        const nameParts = clientName.split(' ');
        // Check if any part of the client name is in the channel name
        if (nameParts.some(part => channelLower.includes(part.toLowerCase()))) {
          const slackUrl = `https://pivotalconversations.slack.com/archives/${channel.id}`;
          potentialMatches.push({
            clientName,
            channelName: channel.name,
            channelId: channel.id,
            type: channel.type,
            slackUrl,
            members: channel.num_members || 'N/A',
          });
        }
      }
    }

    // Deduplicate
    const seen = new Set();
    const uniqueMatches = potentialMatches.filter(m => {
      const key = `${m.clientName}-${m.channelId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (uniqueMatches.length === 0) {
      console.log('  No potential matches found');
    } else {
      // Group by client name
      const byClient = {};
      for (const match of uniqueMatches) {
        if (!byClient[match.clientName]) {
          byClient[match.clientName] = [];
        }
        byClient[match.clientName].push(match);
      }

      for (const [clientName, matches] of Object.entries(byClient)) {
        console.log(`  📌 ${clientName.charAt(0).toUpperCase() + clientName.slice(1)}:`);
        for (const match of matches) {
          console.log(`     ${match.type === 'private' ? '🔒' : '📢'} #${match.channelName}`);
          console.log(`        URL: ${match.slackUrl}`);
          console.log(`        Members: ${match.members}`);
        }
        console.log('');
      }
    }

    console.log('\n' + '='.repeat(100));
    console.log('\n📋 ALL CHANNELS:\n');

    for (const channel of allChannels) {
      const icon = channel.type === 'private' ? '🔒' : '📢';
      const slackUrl = `https://pivotalconversations.slack.com/archives/${channel.id}`;
      console.log(`  ${icon} #${channel.name} (${channel.num_members || 0} members)`);
      console.log(`     ${slackUrl}`);
    }

    console.log('\n' + '='.repeat(100));
    console.log(`\nTotal: ${allChannels.length} channels (${publicData.channels?.length || 0} public, ${privateData.channels?.length || 0} private)`);

  } catch (error) {
    console.error('Error:', error);
  }
}

listSlackChannels();
