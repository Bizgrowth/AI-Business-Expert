import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const NOTION_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

async function notionRequest(token: string, path: string, method: string, body?: object) {
  const res = await fetch(`${NOTION_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? `Notion API error ${res.status}`);
  return data;
}

function markdownToNotionBlocks(markdown: string): object[] {
  const blocks: object[] = [];
  const lines = markdown.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('### ')) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: { rich_text: [{ type: 'text', text: { content: line.slice(4).trim() } }] },
      });
    } else if (line.startsWith('## ')) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ type: 'text', text: { content: line.slice(3).trim() } }] },
      });
    } else if (line.startsWith('# ')) {
      blocks.push({
        object: 'block',
        type: 'heading_1',
        heading_1: { rich_text: [{ type: 'text', text: { content: line.slice(2).trim() } }] },
      });
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: line.slice(2).trim() } }],
        },
      });
    } else if (/^\d+\. /.test(line)) {
      blocks.push({
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [{ type: 'text', text: { content: line.replace(/^\d+\. /, '').trim() } }],
        },
      });
    } else if (line.startsWith('---')) {
      blocks.push({ object: 'block', type: 'divider', divider: {} });
    } else if (line.trim()) {
      // Convert **bold** inline (simplified)
      const cleanText = line.replace(/\*\*(.+?)\*\*/g, '$1');
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: cleanText.trim() } }],
        },
      });
    }
  }

  return blocks.slice(0, 100); // Notion limit per page creation call
}

export async function POST(req: NextRequest) {
  try {
    const { token, parentPageId, engagement } = await req.json();

    if (!token || !parentPageId) {
      return NextResponse.json({ error: 'Notion token and parentPageId are required' }, { status: 400 });
    }
    if (!engagement) {
      return NextResponse.json({ error: 'Engagement data required' }, { status: 400 });
    }

    const title = engagement.title || `${engagement.clientName || 'Client'} — AI Ops Analysis`;
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const headerBlocks: object[] = [
      {
        object: 'block',
        type: 'callout',
        callout: {
          icon: { type: 'emoji', emoji: '🎯' },
          rich_text: [
            {
              type: 'text',
              text: {
                content: `Client: ${engagement.clientName || '—'} | Industry: ${engagement.industry || '—'} | Size: ${engagement.companySize || '—'} | Created: ${date}`,
              },
            },
          ],
        },
      },
    ];

    if (engagement.primaryChallenge) {
      headerBlocks.push({
        object: 'block',
        type: 'callout',
        callout: {
          icon: { type: 'emoji', emoji: '⚡' },
          rich_text: [{ type: 'text', text: { content: `Challenge: ${engagement.primaryChallenge}` } }],
        },
      } as object);
    }

    const summaryBlocks = engagement.executiveSummary
      ? [
          { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: '📋 Executive Summary' } }] } },
          ...markdownToNotionBlocks(engagement.executiveSummary),
        ]
      : [];

    const planBlocks =
      engagement.actionPlan?.length > 0
        ? [
            { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: '✅ Action Plan' } }] } },
            ...engagement.actionPlan.slice(0, 30).map((item: { phase: string; task: string; owner: string; timeline: string; status: string; priority: string }) => ({
              object: 'block',
              type: 'to_do',
              to_do: {
                checked: item.status === 'done',
                rich_text: [
                  {
                    type: 'text',
                    text: {
                      content: `[${item.phase}] ${item.task} — ${item.owner} | ${item.timeline} | ${item.priority}`,
                    },
                  },
                ],
              },
            })),
          ]
        : [];

    const pageRes = await notionRequest(token, '/pages', 'POST', {
      parent: { type: 'page_id', page_id: parentPageId.replace(/-/g, '') },
      icon: { type: 'emoji', emoji: '🤖' },
      properties: {
        title: {
          title: [{ type: 'text', text: { content: title } }],
        },
      },
      children: [...headerBlocks, ...summaryBlocks, ...planBlocks].slice(0, 100),
    });

    return NextResponse.json({
      success: true,
      pageId: pageRes.id,
      pageUrl: pageRes.url,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Notion export failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
