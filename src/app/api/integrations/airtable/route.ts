import { NextRequest, NextResponse } from 'next/server';
import type { ActionItem } from '@/types';

export const runtime = 'nodejs';

const AT_BASE = 'https://api.airtable.com/v0';

async function atRequest(apiKey: string, path: string, method: string, body?: object) {
  const res = await fetch(`${AT_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? `Airtable API error ${res.status}`);
  return data;
}

export async function POST(req: NextRequest) {
  try {
    const { apiKey, baseId, tableId, engagement } = await req.json();

    if (!apiKey || !baseId || !tableId) {
      return NextResponse.json({ error: 'apiKey, baseId, and tableId are required' }, { status: 400 });
    }
    if (!engagement?.actionPlan?.length) {
      return NextResponse.json({ error: 'No action plan items to sync' }, { status: 400 });
    }

    const items: ActionItem[] = engagement.actionPlan;

    // Airtable supports up to 10 records per batch create call
    const batches: ActionItem[][] = [];
    for (let i = 0; i < items.length; i += 10) {
      batches.push(items.slice(i, i + 10));
    }

    let totalCreated = 0;
    for (const batch of batches) {
      const records = batch.map((item) => ({
        fields: {
          Task: item.task,
          Phase: item.phase,
          Owner: item.owner,
          Timeline: item.timeline,
          KPI: item.kpi,
          Priority: item.priority.charAt(0).toUpperCase() + item.priority.slice(1),
          Status: item.status === 'in-progress' ? 'In Progress' : item.status.charAt(0).toUpperCase() + item.status.slice(1),
          Engagement: engagement.title || engagement.clientName || 'Untitled',
          Client: engagement.clientName || '',
          Industry: engagement.industry || '',
          'Synced From': 'AI Ops Expert Team',
          'Sync Date': new Date().toISOString().split('T')[0],
        },
      }));

      await atRequest(apiKey, `/${baseId}/${encodeURIComponent(tableId)}`, 'POST', { records });
      totalCreated += batch.length;
    }

    return NextResponse.json({
      success: true,
      recordsCreated: totalCreated,
      airtableUrl: `https://airtable.com/${baseId}/${tableId}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Airtable sync failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
