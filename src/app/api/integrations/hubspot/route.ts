import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const HS_BASE = 'https://api.hubapi.com';

async function hsRequest(token: string, path: string, method: string, body?: object) {
  const res = await fetch(`${HS_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? `HubSpot API error ${res.status}`);
  return data;
}

export async function POST(req: NextRequest) {
  try {
    const { token, engagement } = await req.json();

    if (!token) return NextResponse.json({ error: 'HubSpot token required' }, { status: 400 });
    if (!engagement) return NextResponse.json({ error: 'Engagement data required' }, { status: 400 });

    const results: Record<string, string> = {};

    // 1. Create or find contact
    if (engagement.clientName) {
      try {
        const contactRes = await hsRequest(token, '/crm/v3/objects/contacts', 'POST', {
          properties: {
            company: engagement.clientName,
            firstname: engagement.clientName.split(' ')[0] ?? engagement.clientName,
          },
        });
        results.contactId = contactRes.id;
      } catch {
        // Contact may already exist — search for it
        try {
          const search = await hsRequest(token, '/crm/v3/objects/contacts/search', 'POST', {
            filterGroups: [{
              filters: [{
                propertyName: 'company',
                operator: 'EQ',
                value: engagement.clientName,
              }],
            }],
            limit: 1,
          });
          if (search.results?.length > 0) {
            results.contactId = search.results[0].id;
          }
        } catch {
          // ignore
        }
      }
    }

    // 2. Create deal
    const dealRes = await hsRequest(token, '/crm/v3/objects/deals', 'POST', {
      properties: {
        dealname: engagement.title || `${engagement.clientName} — AI Ops Engagement`,
        dealstage: 'qualifiedtobuy',
        pipeline: 'default',
        description: engagement.primaryChallenge ?? '',
        closedate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    });
    results.dealId = dealRes.id;

    // 3. Associate contact with deal
    if (results.contactId && results.dealId) {
      try {
        await hsRequest(
          token,
          `/crm/v4/objects/deals/${results.dealId}/associations/contact/${results.contactId}/batch/create`,
          'POST',
          { inputs: [{ types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }] }] }
        );
      } catch {
        // non-fatal
      }
    }

    // 4. Add executive summary as a note
    if (engagement.executiveSummary && results.dealId) {
      try {
        const noteBody = `## AI Ops Expert Team — Analysis\n\n**Engagement:** ${engagement.title}\n**Client:** ${engagement.clientName}\n**Industry:** ${engagement.industry}\n**Challenge:** ${engagement.primaryChallenge}\n\n---\n\n${engagement.executiveSummary.slice(0, 4000)}`;
        const noteRes = await hsRequest(token, '/crm/v3/objects/notes', 'POST', {
          properties: {
            hs_note_body: noteBody,
            hs_timestamp: new Date().toISOString(),
          },
        });
        results.noteId = noteRes.id;

        await hsRequest(
          token,
          `/crm/v4/objects/notes/${results.noteId}/associations/deal/${results.dealId}/batch/create`,
          'POST',
          { inputs: [{ types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 214 }] }] }
        );
      } catch {
        // non-fatal
      }
    }

    return NextResponse.json({
      success: true,
      dealId: results.dealId,
      contactId: results.contactId,
      dealUrl: `https://app.hubspot.com/contacts/0/deal/${results.dealId}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'HubSpot sync failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
