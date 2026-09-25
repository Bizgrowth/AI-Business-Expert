import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { webhookUrl, event, engagement } = await req.json();

    if (!webhookUrl) {
      return NextResponse.json({ error: 'webhookUrl is required' }, { status: 400 });
    }

    const payload = {
      event: event ?? 'engagement_updated',
      timestamp: new Date().toISOString(),
      source: 'AI Ops Expert Team',
      engagement: {
        id: engagement.id,
        title: engagement.title,
        clientName: engagement.clientName,
        industry: engagement.industry,
        companySize: engagement.companySize,
        primaryChallenge: engagement.primaryChallenge,
        desiredOutcome: engagement.desiredOutcome,
        status: engagement.status,
        documentCount: engagement.documents?.length ?? 0,
        messageCount: engagement.messages?.length ?? 0,
        actionItemCount: engagement.actionPlan?.length ?? 0,
        completedItems: engagement.actionPlan?.filter((i: { status: string }) => i.status === 'done').length ?? 0,
        hasExecutiveSummary: !!engagement.executiveSummary,
        executiveSummaryPreview: engagement.executiveSummary
          ? engagement.executiveSummary.slice(0, 500) + '...'
          : null,
        createdAt: engagement.createdAt,
        updatedAt: engagement.updatedAt,
      },
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`Webhook returned ${res.status} ${res.statusText}`);
    }

    return NextResponse.json({ success: true, status: res.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Webhook trigger failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
