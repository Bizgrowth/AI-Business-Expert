'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Plus,
  Download,
  Copy,
  CheckCheck,
  Zap,
  LayoutList,
  MessageSquare,
  BookOpen,
  ChevronRight,
} from 'lucide-react';
import { useEngagements } from '@/hooks/useEngagements';
import ChatInterface from '@/components/chat/ChatInterface';
import ActionPlanView from '@/components/output/ActionPlanView';
import FileUploadZone from '@/components/upload/FileUploadZone';
import IntegrationPanel from '@/components/integrations/IntegrationPanel';
import { useIntegrations } from '@/hooks/useIntegrations';
import { formatDate, renderMarkdown, cn } from '@/lib/utils';
import type { Message, ActionItem } from '@/types';

type Tab = 'chat' | 'summary' | 'plan' | 'docs';

export default function EngagementPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { engagements, loaded, updateEngagement, addDocument } = useEngagements();
  const { config, isConnected } = useIntegrations();
  const [tab, setTab] = useState<Tab>('chat');
  const [copiedSummary, setCopiedSummary] = useState(false);

  const engagement = engagements.find((e) => e.id === id);

  useEffect(() => {
    if (loaded && !engagement) {
      router.push('/');
    }
  }, [loaded, engagement, router]);

  const handleMessagesUpdate = useCallback(
    (messages: Message[]) => {
      updateEngagement(id, { messages });
    },
    [id, updateEngagement]
  );

  const triggerMakeWebhook = useCallback(
    async (event: string) => {
      if (!isConnected('make')) return;
      try {
        await fetch('/api/integrations/webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ webhookUrl: config.make.webhookUrl, event, engagement }),
        });
      } catch {
        // non-fatal; fire-and-forget
      }
    },
    [config.make, isConnected, engagement]
  );

  const handleSummaryUpdate = useCallback(
    (summary: string) => {
      updateEngagement(id, { executiveSummary: summary });
      if (config.make.triggerOnAnalysis) {
        setTimeout(() => triggerMakeWebhook('analysis_completed'), 500);
      }
    },
    [id, updateEngagement, config.make.triggerOnAnalysis, triggerMakeWebhook]
  );

  const handleActionPlanUpdate = useCallback(
    (items: ActionItem[]) => {
      updateEngagement(id, { actionPlan: items });
    },
    [id, updateEngagement]
  );

  const handleDocumentAdded = useCallback(
    (doc: Parameters<typeof addDocument>[1]) => {
      addDocument(id, doc);
    },
    [id, addDocument]
  );

  const handleDocumentRemoved = useCallback(
    (docId: string) => {
      if (!engagement) return;
      updateEngagement(id, {
        documents: engagement.documents.filter((d) => d.id !== docId),
      });
    },
    [id, engagement, updateEngagement]
  );

  const copySummary = async () => {
    if (!engagement?.executiveSummary) return;
    await navigator.clipboard.writeText(engagement.executiveSummary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const exportSummary = () => {
    if (!engagement?.executiveSummary) return;
    const blob = new Blob([engagement.executiveSummary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${engagement.title || engagement.clientName || 'engagement'}-summary.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  if (!loaded || !engagement) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'summary', label: 'Summary', icon: <BookOpen className="w-4 h-4" /> },
    {
      id: 'plan',
      label: 'Action Plan',
      icon: <LayoutList className="w-4 h-4" />,
      badge: engagement.actionPlan.length || undefined,
    },
    {
      id: 'docs',
      label: 'Documents',
      icon: <FileText className="w-4 h-4" />,
      badge: engagement.documents.length || undefined,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b print:hidden"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm transition-colors hover:text-white shrink-0"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>

        <div className="flex items-center gap-1.5 text-sm min-w-0" style={{ color: 'var(--text-muted)' }}>
          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>
            {engagement.title || engagement.clientName || 'Untitled'}
          </span>
        </div>

        <div className="flex-1" />

        {/* Status badge */}
        <span
          className={cn(
            'text-xs px-2 py-0.5 rounded-full border hidden sm:inline-block',
            engagement.status === 'active'
              ? 'text-blue-400 bg-blue-400/10 border-blue-400/20'
              : 'text-green-400 bg-green-400/10 border-green-400/20'
          )}
        >
          {engagement.status}
        </span>

        {/* Actions */}
        <button
          type="button"
          onClick={printReport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors hover:bg-white/5"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export</span>
        </button>

        <button
          type="button"
          onClick={() => updateEngagement(id, { status: engagement.status === 'completed' ? 'active' : 'completed' })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-medium transition-colors hover:bg-blue-600/20"
        >
          <Zap className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{engagement.status === 'completed' ? 'Reopen' : 'Complete'}</span>
        </button>
      </header>

      {/* Tabs */}
      <div
        className="flex items-center gap-1 px-4 py-2 border-b overflow-x-auto shrink-0 print:hidden"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              tab === t.id
                ? 'bg-blue-600 text-white'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            )}
          >
            {t.icon}
            {t.label}
            {t.badge !== undefined && (
              <span className={cn(
                'text-xs px-1.5 rounded-full',
                tab === t.id ? 'bg-white/20 text-white' : 'bg-[#1e2d40] text-slate-400'
              )}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {/* Chat */}
        {tab === 'chat' && (
          <div className="h-full" style={{ height: 'calc(100vh - 114px)' }}>
            <ChatInterface
              engagement={engagement}
              onMessagesUpdate={handleMessagesUpdate}
              onSummaryUpdate={handleSummaryUpdate}
            />
          </div>
        )}

        {/* Executive Summary */}
        {tab === 'summary' && (
          <div className="h-full overflow-y-auto p-4 sm:p-6">
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                    Executive Summary
                  </h2>
                  {engagement.updatedAt && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Last updated {formatDate(engagement.updatedAt)}
                    </p>
                  )}
                </div>
                {engagement.executiveSummary && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={copySummary}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors hover:bg-white/5"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                    >
                      {copiedSummary ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedSummary ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      type="button"
                      onClick={exportSummary}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors hover:bg-white/5"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export
                    </button>
                  </div>
                )}
              </div>

              {/* Engagement details */}
              <div
                className="rounded-xl border p-4 grid grid-cols-2 gap-3 text-sm"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
              >
                {[
                  { label: 'Client', value: engagement.clientName },
                  { label: 'Industry', value: engagement.industry },
                  { label: 'Company Size', value: engagement.companySize },
                  { label: 'Created', value: formatDate(engagement.createdAt) },
                  { label: 'Challenge', value: engagement.primaryChallenge, wide: true },
                  { label: 'Desired Outcome', value: engagement.desiredOutcome, wide: true },
                ]
                  .filter((f) => f.value)
                  .map((f) => (
                    <div key={f.label} className={f.wide ? 'col-span-2' : ''}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>
                        {f.label}
                      </p>
                      <p style={{ color: 'var(--text-secondary)' }}>{f.value}</p>
                    </div>
                  ))}
              </div>

              {engagement.executiveSummary ? (
                <div
                  className="rounded-xl border p-6"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                >
                  <div
                    className="prose-agent"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(engagement.executiveSummary) }}
                  />
                </div>
              ) : (
                <div className="text-center py-16">
                  <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p className="font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    No summary yet
                  </p>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                    Run an analysis in the Chat tab — the Lead Strategist will generate your executive summary automatically.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab('chat')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors mx-auto"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Go to Chat
                  </button>
                </div>
              )}

              <IntegrationPanel engagement={engagement} />
            </div>
          </div>
        )}

        {/* Action Plan */}
        {tab === 'plan' && (
          <div className="h-full overflow-y-auto p-4 sm:p-6">
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                    Action Plan
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Click a task to edit. Toggle the status icon to track progress.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleActionPlanUpdate([
                      ...engagement.actionPlan,
                      {
                        id: crypto.randomUUID(),
                        phase: 'Quick Win (0-30 days)',
                        task: 'New task',
                        owner: 'You',
                        timeline: '1 week',
                        kpi: '',
                        priority: 'medium',
                        status: 'todo',
                      },
                    ])
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-600/20 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Task
                </button>
              </div>
              <ActionPlanView
                items={engagement.actionPlan}
                onChange={handleActionPlanUpdate}
              />

              <IntegrationPanel engagement={engagement} />
            </div>
          </div>
        )}

        {/* Documents */}
        {tab === 'docs' && (
          <div className="h-full overflow-y-auto p-4 sm:p-6">
            <div className="max-w-2xl mx-auto space-y-4">
              <div>
                <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                  Documents
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  All documents are parsed and included in every agent analysis.
                </p>
              </div>
              <FileUploadZone
                onDocumentAdded={handleDocumentAdded}
                documents={engagement.documents}
                onDocumentRemoved={handleDocumentRemoved}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
