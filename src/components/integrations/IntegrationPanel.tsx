'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Zap,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useIntegrations } from '@/hooks/useIntegrations';
import { cn } from '@/lib/utils';
import type { Engagement } from '@/types';

interface ActionState {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  url?: string;
}

interface Props {
  engagement: Engagement;
  onWebhookTriggered?: () => void;
}

export default function IntegrationPanel({ engagement, onWebhookTriggered }: Props) {
  const { config, loaded, isConnected } = useIntegrations();
  const [expanded, setExpanded] = useState(false);
  const [hubspot, setHubspot] = useState<ActionState>({ status: 'idle' });
  const [airtable, setAirtable] = useState<ActionState>({ status: 'idle' });
  const [notion, setNotion] = useState<ActionState>({ status: 'idle' });
  const [webhook, setWebhook] = useState<ActionState>({ status: 'idle' });

  const connectedCount = (['hubspot', 'airtable', 'notion', 'make'] as const).filter((k) =>
    isConnected(k)
  ).length;

  if (!loaded || connectedCount === 0) {
    return (
      <div
        className="rounded-xl border p-4 flex items-center justify-between gap-3"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              No integrations connected
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Connect HubSpot, Airtable, Notion or Make to push data.
            </p>
          </div>
        </div>
        <Link
          href="/settings"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors hover:bg-white/5 shrink-0"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          <Settings className="w-3.5 h-3.5" />
          Configure
        </Link>
      </div>
    );
  }

  const pushToHubSpot = async () => {
    if (!isConnected('hubspot')) return;
    setHubspot({ status: 'loading' });
    try {
      const res = await fetch('/api/integrations/hubspot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: config.hubspot.token, engagement }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'HubSpot push failed');
      setHubspot({ status: 'success', message: `Deal #${data.dealId} created`, url: data.dealUrl });
    } catch (err) {
      setHubspot({ status: 'error', message: err instanceof Error ? err.message : 'Push failed' });
    }
  };

  const syncToAirtable = async () => {
    if (!isConnected('airtable')) return;
    if (!engagement.actionPlan?.length) {
      setAirtable({ status: 'error', message: 'No action plan items to sync' });
      return;
    }
    setAirtable({ status: 'loading' });
    try {
      const res = await fetch('/api/integrations/airtable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: config.airtable.apiKey,
          baseId: config.airtable.baseId,
          tableId: config.airtable.tableId,
          engagement,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Airtable sync failed');
      setAirtable({
        status: 'success',
        message: `${data.recordsCreated} records created`,
        url: data.airtableUrl,
      });
    } catch (err) {
      setAirtable({ status: 'error', message: err instanceof Error ? err.message : 'Sync failed' });
    }
  };

  const exportToNotion = async () => {
    if (!isConnected('notion')) return;
    if (!engagement.executiveSummary) {
      setNotion({ status: 'error', message: 'Generate an executive summary first' });
      return;
    }
    setNotion({ status: 'loading' });
    try {
      const res = await fetch('/api/integrations/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: config.notion.token,
          parentPageId: config.notion.parentPageId,
          engagement,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Notion export failed');
      setNotion({ status: 'success', message: 'Page created', url: data.pageUrl });
    } catch (err) {
      setNotion({ status: 'error', message: err instanceof Error ? err.message : 'Export failed' });
    }
  };

  const triggerWebhook = async (event = 'engagement_updated') => {
    if (!isConnected('make')) return;
    setWebhook({ status: 'loading' });
    try {
      const res = await fetch('/api/integrations/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: config.make.webhookUrl, event, engagement }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Webhook trigger failed');
      setWebhook({ status: 'success', message: `Sent (HTTP ${data.status})` });
      onWebhookTriggered?.();
    } catch (err) {
      setWebhook({ status: 'error', message: err instanceof Error ? err.message : 'Trigger failed' });
    }
  };

  const integrationActions = [
    {
      key: 'hubspot' as const,
      label: 'Push to HubSpot',
      icon: '🟠',
      state: hubspot,
      action: pushToHubSpot,
      disabled: !isConnected('hubspot'),
      disabledReason: 'HubSpot not connected',
    },
    {
      key: 'airtable' as const,
      label: 'Sync to Airtable',
      icon: '🟡',
      state: airtable,
      action: syncToAirtable,
      disabled: !isConnected('airtable'),
      disabledReason: 'Airtable not connected',
    },
    {
      key: 'notion' as const,
      label: 'Export to Notion',
      icon: '⬛',
      state: notion,
      action: exportToNotion,
      disabled: !isConnected('notion'),
      disabledReason: 'Notion not connected',
    },
    {
      key: 'make' as const,
      label: 'Trigger Webhook',
      icon: '🟣',
      state: webhook,
      action: () => triggerWebhook('engagement_updated'),
      disabled: !isConnected('make'),
      disabledReason: 'Webhook not configured',
    },
  ].filter((a) => isConnected(a.key));

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Integrations
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {connectedCount} connected · push data to your tools
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
        ) : (
          <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
        )}
      </button>

      {/* Actions (expanded) */}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 grid sm:grid-cols-2 gap-3" style={{ borderColor: 'var(--border)' }}>
          {integrationActions.map(({ key, ...ia }) => (
            <IntegrationAction key={key} {...ia} />
          ))}
          <div className="sm:col-span-2 flex justify-end">
            <Link
              href="/settings"
              className="flex items-center gap-1 text-xs transition-colors hover:text-blue-400"
              style={{ color: 'var(--text-muted)' }}
            >
              <Settings className="w-3 h-3" />
              Manage integrations
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function IntegrationAction({
  label,
  icon,
  state,
  action,
  disabled,
  disabledReason,
}: {
  label: string;
  icon: string;
  state: ActionState;
  action: () => void;
  disabled: boolean;
  disabledReason: string;
}) {
  const isLoading = state.status === 'loading';

  return (
    <div
      className="flex flex-col gap-2 p-3 rounded-lg border"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{icon}</span>
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {label}
          </span>
        </div>
        <button
          type="button"
          onClick={action}
          disabled={disabled || isLoading}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0',
            disabled
              ? 'opacity-40 cursor-not-allowed bg-white/5 text-slate-400'
              : isLoading
              ? 'bg-blue-600/20 text-blue-400 cursor-wait'
              : 'bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600/20'
          )}
          title={disabled ? disabledReason : undefined}
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Zap className="w-3 h-3" />
          )}
          {isLoading ? 'Sending…' : 'Run'}
        </button>
      </div>

      {/* Status feedback */}
      {state.status === 'success' && (
        <div className="flex items-center gap-1.5 text-xs text-green-400">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{state.message}</span>
          {state.url && (
            <a
              href={state.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 underline underline-offset-2 hover:text-green-300 ml-1"
            >
              View <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
      {state.status === 'error' && (
        <div className="flex items-center gap-1.5 text-xs text-red-400">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{state.message}</span>
        </div>
      )}
    </div>
  );
}
