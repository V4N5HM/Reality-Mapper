// Script to sync editing notes from idea to content for "new test idea 16"
require('dotenv').config({ path: '.env.local' });
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const CONTENT_DB_ID = process.env.NOTION_CONTENT_DB;

async function syncEditingNotes() {
  console.log('Syncing editing notes from idea to content...');

  try {
    // Find content "new test idea 16"
    const contentResponse = await notion.databases.query({
      database_id: CONTENT_DB_ID,
      filter: {
        property: 'Title',
        title: { contains: 'new test idea 16' }
      },
      page_size: 1,
    });

    if (contentResponse.results.length === 0) {
      console.log('Content not found');
      return;
    }

    const content = contentResponse.results[0];
    const ideaSourceRelation = content.properties['Idea Source']?.relation;
    
    if (!ideaSourceRelation || ideaSourceRelation.length === 0) {
      console.log('No linked idea found');
      return;
    }

    const ideaId = ideaSourceRelation[0].id;
    console.log('Linked idea ID:', ideaId);

    // Fetch the idea
    const idea = await notion.pages.retrieve({ page_id: ideaId });
    const editingNotes = idea.properties['Editing Notes']?.rich_text?.[0]?.text?.content;
    
    console.log('Idea editing notes:', editingNotes);

    if (!editingNotes) {
      console.log('No editing notes in idea');
      return;
    }

    // Update content with editing notes
    await notion.pages.update({
      page_id: content.id,
      properties: {
        'Editing Notes': {
          rich_text: [{ text: { content: editingNotes } }]
        }
      }
    });

    console.log('✓ Successfully synced editing notes to content!');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

syncEditingNotes();
