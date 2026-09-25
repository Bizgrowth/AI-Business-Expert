'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, XCircle, Eye, EyeOff, ExternalLink, Zap, Save, TestTube2 } from 'lucide-react';
import { useIntegrations } from '@/hooks/useIntegrations';
import { INTEGRATION_META } from '@/types/integrations';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { config, updateIntegration, isConnected } = useIntegrations();
  const [saved, setSaved] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const handleSave = (key: string) => {
    setSaved(key);
    setTimeout(() => setSaved(null), 2000);
  };

  const testConnection = async (key: string) => {
    setTesting(key);
    setTestResult((prev) => ({ ...prev, [key]: { ok: false, msg: 'Testing...' } }));

    try {
      let res: Response;

      if (key === 'hubspot') {
        res = await fetch('https://api.hubapi.com/crm/v3/objects/deals?limit=1', {
          headers: { Authorization: `Bearer ${config.hubspot.token}` },
        });
        if (!res.ok) throw new Error(`HubSpot returned ${res.status}`);
        setTestResult((prev) => ({ ...prev, hubspot: { ok: true, msg: 'Connected — HubSpot CRM access confirmed' } }));
      } else if (key === 'airtable') {
        res = await fetch(`https://api.airtable.com/v0/meta/bases`, {
          headers: { Authorization: `Bearer ${config.airtable.apiKey}` },
        });
        if (!res.ok) throw new Error(`Airtable returned ${res.status}`);
        setTestResult((prev) => ({ ...prev, airtable: { ok: true, msg: 'Connected — Airtable access confirmed' } }));
      } else if (key === 'notion') {
        res = await fetch('https://api.notion.com/v1/users/me', {
          headers: {
            Authorization: `Bearer ${config.notion.token}`,
            'Notion-Version': '2022-06-28',
          },
        });
        if (!res.ok) throw new Error(`Notion returned ${res.status}`);
        const data = await res.json();
        setTestResult((prev) => ({
          ...prev,
          notion: { ok: true, msg: `Connected as ${data.name ?? data.bot?.owner?.user?.name ?? 'Notion user'}` },
        }));
      } else if (key === 'make') {
        if (!config.make.webhookUrl) throw new Error('No webhook URL configured');
        const testRes = await fetch('/api/integrations/webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            webhookUrl: config.make.webhookUrl,
            event: 'connection_test',
            engagement: { id: 'test', title: 'Test from AI Ops Expert Team', clientName: 'Test' },
          }),
        });
        if (!testRes.ok) throw new Error('Webhook test failed');
        setTestResult((prev) => ({
          ...prev,
          make: { ok: true, msg: 'Webhook triggered successfully — check your Make/Zapier scenario' },
        }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setTestResult((prev) => ({ ...prev, [key]: { ok: false, msg } }));
    } finally {
      setTesting(null);
    }
  };

  const toggleSecret = (field: string) => {
    setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 flex items-center gap-3 px-4 sm:px-6 py-4 border-b"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-sm hover:text-white transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            Integrations
          </span>
        </div>
        <div className="flex-1" />
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Integrations
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Connect your existing tools so AI Ops can push deliverables and trigger automations automatically.
          </p>
        </div>

        {INTEGRATION_META.map((meta) => {
          const connected = isConnected(meta.key);
          const result = testResult[meta.key];

          return (
            <div
              key={meta.key}
              className="rounded-2xl border overflow-hidden"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
            >
              {/* Card header */}
              <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{meta.icon}</span>
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{meta.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{meta.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {connected ? (
                    <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 border border-[#1e2d40] px-2.5 py-1 rounded-full">
                      <XCircle className="w-3 h-3" />
                      Not connected
                    </span>
                  )}
                </div>
              </div>

              {/* Card body — config fields */}
              <div className="p-5 space-y-4">
                {meta.key === 'hubspot' && (
                  <HubSpotForm
                    value={config.hubspot.token}
                    show={showSecrets['hubspot_token']}
                    onToggleShow={() => toggleSecret('hubspot_token')}
                    onChange={(v) => updateIntegration('hubspot', { token: v, enabled: !!v })}
                    docsUrl={meta.docsUrl}
                  />
                )}

                {meta.key === 'airtable' && (
                  <AirtableForm
                    apiKey={config.airtable.apiKey}
                    baseId={config.airtable.baseId}
                    tableId={config.airtable.tableId}
                    showKey={showSecrets['airtable_key']}
                    onToggleShow={() => toggleSecret('airtable_key')}
                    onChange={(updates) => updateIntegration('airtable', { ...updates, enabled: !!(updates.apiKey ?? config.airtable.apiKey) })}
                    docsUrl={meta.docsUrl}
                  />
                )}

                {meta.key === 'notion' && (
                  <NotionForm
                    token={config.notion.token}
                    parentPageId={config.notion.parentPageId}
                    showToken={showSecrets['notion_token']}
                    onToggleShow={() => toggleSecret('notion_token')}
                    onChange={(updates) => updateIntegration('notion', { ...updates, enabled: !!(updates.token ?? config.notion.token) })}
                    docsUrl={meta.docsUrl}
                  />
                )}

                {meta.key === 'make' && (
                  <MakeForm
                    webhookUrl={config.make.webhookUrl}
                    triggerOnAnalysis={config.make.triggerOnAnalysis}
                    triggerOnComplete={config.make.triggerOnComplete}
                    onChange={(updates) => updateIntegration('make', { ...updates, enabled: !!(updates.webhookUrl ?? config.make.webhookUrl) })}
                    docsUrl={meta.docsUrl}
                  />
                )}

                {/* Test result */}
                {result && (
                  <div
                    className={cn(
                      'flex items-start gap-2 p-3 rounded-xl text-sm',
                      result.ok
                        ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                        : 'bg-red-500/10 border border-red-500/20 text-red-400'
                    )}
                  >
                    {result.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                    {result.msg}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      handleSave(meta.key);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    {saved === meta.key ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Saved
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save
                      </>
                    )}
                  </button>

                  {connected && (
                    <button
                      type="button"
                      onClick={() => testConnection(meta.key)}
                      disabled={testing === meta.key}
                      className="flex items-center gap-1.5 px-4 py-2 border rounded-xl text-sm font-medium transition-colors hover:bg-white/5 disabled:opacity-50"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                    >
                      <TestTube2 className={cn('w-4 h-4', testing === meta.key && 'animate-spin')} />
                      Test
                    </button>
                  )}

                  <a
                    href={meta.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs ml-auto transition-colors hover:text-blue-400"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    How to get credentials
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Sub-forms ─────────────────────────────────────────────────────────────

function SecretInput({
  label,
  value,
  show,
  onChange,
  onToggle,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  show: boolean;
  onChange: (v: string) => void;
  onToggle: () => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      {hint && <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 pr-10 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-blue-500 transition-colors"
          style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--text-muted)' }}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function PlainInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      {hint && <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-blue-500 transition-colors"
        style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
      />
    </div>
  );
}

function HubSpotForm({ value, show, onToggleShow, onChange, docsUrl }: {
  value: string; show: boolean; onToggleShow: () => void;
  onChange: (v: string) => void; docsUrl: string;
}) {
  return (
    <div className="space-y-3">
      <SecretInput
        label="Private App Token"
        value={value}
        show={show}
        onChange={onChange}
        onToggle={onToggleShow}
        placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        hint={`Create a Private App in HubSpot → Settings → Integrations → Private Apps. Grant: CRM (contacts, deals, notes) read + write.`}
      />
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        On sync: creates a Deal + Contact in your CRM and attaches the executive summary as a note.
      </p>
    </div>
  );
}

function AirtableForm({ apiKey, baseId, tableId, showKey, onToggleShow, onChange, docsUrl }: {
  apiKey: string; baseId: string; tableId: string;
  showKey: boolean; onToggleShow: () => void;
  onChange: (v: Partial<{ apiKey: string; baseId: string; tableId: string }>) => void;
  docsUrl: string;
}) {
  return (
    <div className="space-y-3">
      <SecretInput
        label="Personal Access Token"
        value={apiKey}
        show={showKey}
        onChange={(v) => onChange({ apiKey: v })}
        onToggle={onToggleShow}
        placeholder="patXXXXXXXXXXXXXX.XXXXX..."
        hint="airtable.com/create/tokens → Create token → Scope: data.records:write"
      />
      <PlainInput
        label="Base ID"
        value={baseId}
        onChange={(v) => onChange({ baseId: v })}
        placeholder="appXXXXXXXXXXXXXX"
        hint="Found in the URL: airtable.com/appXXX/..."
      />
      <PlainInput
        label="Table Name or ID"
        value={tableId}
        onChange={(v) => onChange({ tableId: v })}
        placeholder="Action Plan (or tblXXXXXXXXXXXXXX)"
        hint="The exact table name or ID where action plan records will be created."
      />
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        On sync: creates one record per action plan item with Task, Phase, Owner, Timeline, KPI, Status, and Priority fields.
      </p>
    </div>
  );
}

function NotionForm({ token, parentPageId, showToken, onToggleShow, onChange, docsUrl }: {
  token: string; parentPageId: string;
  showToken: boolean; onToggleShow: () => void;
  onChange: (v: Partial<{ token: string; parentPageId: string }>) => void;
  docsUrl: string;
}) {
  return (
    <div className="space-y-3">
      <SecretInput
        label="Integration Token"
        value={token}
        show={showToken}
        onChange={(v) => onChange({ token: v })}
        onToggle={onToggleShow}
        placeholder="secret_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
        hint="notion.so/my-integrations → New integration → Internal → Copy secret. Then share the parent page with your integration."
      />
      <PlainInput
        label="Parent Page ID"
        value={parentPageId}
        onChange={(v) => onChange({ parentPageId: v })}
        placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        hint="Open the Notion page → Copy link → the ID is the 32-char hex in the URL."
      />
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        On export: creates a new sub-page with the executive summary and action plan checklist.
      </p>
    </div>
  );
}

function MakeForm({ webhookUrl, triggerOnAnalysis, triggerOnComplete, onChange, docsUrl }: {
  webhookUrl: string; triggerOnAnalysis: boolean; triggerOnComplete: boolean;
  onChange: (v: Partial<{ webhookUrl: string; triggerOnAnalysis: boolean; triggerOnComplete: boolean }>) => void;
  docsUrl: string;
}) {
  return (
    <div className="space-y-3">
      <PlainInput
        label="Webhook URL"
        value={webhookUrl}
        onChange={(v) => onChange({ webhookUrl: v })}
        placeholder="https://hook.eu1.make.com/xxxxxxxxxxxx or https://hooks.zapier.com/..."
        hint="Make: Create a scenario → Webhooks → Custom Webhook → Copy URL. Zapier: Catch Hook → Copy URL."
      />
      <div className="space-y-2">
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Auto-trigger when:</p>
        <ToggleRow
          label="Analysis complete (first AI response)"
          checked={triggerOnAnalysis}
          onChange={(v) => onChange({ triggerOnAnalysis: v })}
        />
        <ToggleRow
          label="Engagement marked complete"
          checked={triggerOnComplete}
          onChange={(v) => onChange({ triggerOnComplete: v })}
        />
      </div>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Payload includes: engagement id, title, client, status, summary preview, action item counts, and timestamps.
      </p>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        className={cn(
          'w-9 h-5 rounded-full transition-colors relative',
          checked ? 'bg-blue-600' : 'bg-[#1e2d40]'
        )}
        onClick={() => onChange(!checked)}
      >
        <div
          className={cn(
            'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-4'
          )}
        />
      </div>
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </label>
  );
}
