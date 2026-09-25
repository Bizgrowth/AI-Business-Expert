'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  TrendingUp,
  Clock,
  CheckCircle2,
  FileText,
  Trash2,
  BarChart3,
  Zap,
  Target,
  Settings,
  ChevronRight,
  Briefcase,
} from 'lucide-react';
import { useEngagements } from '@/hooks/useEngagements';
import { formatRelativeTime, cn } from '@/lib/utils';
import type { Engagement } from '@/types';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
  active: { label: 'Active', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  completed: { label: 'Completed', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
};

export default function Dashboard() {
  const { engagements, loaded, deleteEngagement } = useEngagements();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | Engagement['status']>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = engagements.filter((e) => {
    const matchSearch =
      !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.clientName.toLowerCase().includes(search.toLowerCase()) ||
      e.industry.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || e.status === filter;
    return matchSearch && matchFilter;
  });

  const stats = {
    total: engagements.length,
    active: engagements.filter((e) => e.status === 'active').length,
    completed: engagements.filter((e) => e.status === 'completed').length,
    withDocs: engagements.filter((e) => e.documents.length > 0).length,
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 hidden lg:flex flex-col border-r z-30"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>
              AI Ops Expert
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Business Consulting AI</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          <NavItem icon={<BarChart3 className="w-4 h-4" />} label="Dashboard" active />
          <NavItem icon={<Briefcase className="w-4 h-4" />} label="Engagements" />
          <NavItem icon={<Target className="w-4 h-4" />} label="Templates" badge="Soon" />
          <NavItem icon={<Zap className="w-4 h-4" />} label="Integrations" badge="Soon" />
        </nav>

        <div className="p-3 border-t space-y-1" style={{ borderColor: 'var(--border)' }}>
          <NavItem icon={<Settings className="w-4 h-4" />} label="Settings" href="/settings" />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-4 border-b"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>AI Ops Expert Team</span>
          </div>
          <h1 className="hidden lg:block font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
            Dashboard
          </h1>
          <Link
            href="/engagements/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Engagement</span>
            <span className="sm:hidden">New</span>
          </Link>
        </header>

        <main className="flex-1 px-4 sm:px-6 py-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<FileText className="w-5 h-5" />} label="Total Engagements" value={stats.total} color="blue" />
            <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Active" value={stats.active} color="purple" />
            <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Completed" value={stats.completed} color="green" />
            <StatCard icon={<Clock className="w-5 h-5" />} label="With Documents" value={stats.withDocs} color="orange" />
          </div>

          {/* Engagements list */}
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search engagements..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-sm border focus:outline-none focus:border-blue-500 transition-colors"
                  style={{
                    background: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div className="flex items-center gap-1 bg-[#111827] border border-[#1e2d40] rounded-xl p-1">
                {(['all', 'active', 'draft', 'completed'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={cn(
                      'px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all',
                      filter === f
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-500 hover:text-slate-300'
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {!loaded && (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {loaded && filtered.length === 0 && (
              <EmptyState search={search} />
            )}

            <div className="grid gap-3">
              {filtered.map((engagement) => (
                <EngagementCard
                  key={engagement.id}
                  engagement={engagement}
                  onDelete={() => {
                    if (deleteConfirm === engagement.id) {
                      deleteEngagement(engagement.id);
                      setDeleteConfirm(null);
                    } else {
                      setDeleteConfirm(engagement.id);
                      setTimeout(() => setDeleteConfirm(null), 3000);
                    }
                  }}
                  isConfirmingDelete={deleteConfirm === engagement.id}
                />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function NavItem({
  icon,
  label,
  active = false,
  badge,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
  href?: string;
}) {
  const Tag = href ? Link : 'button';
  return (
    <Tag
      href={href ?? '#'}
      type={href ? undefined : 'button'}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
        active
          ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
          : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
      )}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">{badge}</span>
      )}
    </Tag>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-400/10',
    purple: 'text-purple-400 bg-purple-400/10',
    green: 'text-green-400 bg-green-400/10',
    orange: 'text-orange-400 bg-orange-400/10',
  };
  return (
    <div
      className="rounded-xl p-4 border"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', colors[color])}>
        {icon}
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}

function EngagementCard({
  engagement,
  onDelete,
  isConfirmingDelete,
}: {
  engagement: Engagement;
  onDelete: () => void;
  isConfirmingDelete: boolean;
}) {
  const cfg = STATUS_CONFIG[engagement.status];
  const progress =
    engagement.actionPlan.length > 0
      ? Math.round(
          (engagement.actionPlan.filter((i) => i.status === 'done').length /
            engagement.actionPlan.length) *
            100
        )
      : null;

  return (
    <div
      className="group flex items-center gap-4 p-4 rounded-xl border hover:border-blue-500/30 transition-all"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center shrink-0">
        <Briefcase className="w-5 h-5 text-blue-400" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
            {engagement.title || engagement.clientName || 'Untitled Engagement'}
          </p>
          <span className={cn('text-xs px-2 py-0.5 rounded-full border shrink-0', cfg.color)}>
            {cfg.label}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs flex-wrap" style={{ color: 'var(--text-muted)' }}>
          {engagement.clientName && <span>{engagement.clientName}</span>}
          {engagement.industry && (
            <>
              <span>·</span>
              <span>{engagement.industry}</span>
            </>
          )}
          <span>·</span>
          <span>{formatRelativeTime(engagement.updatedAt)}</span>
          {engagement.documents.length > 0 && (
            <>
              <span>·</span>
              <span className="text-blue-500">{engagement.documents.length} doc{engagement.documents.length !== 1 ? 's' : ''}</span>
            </>
          )}
          {engagement.messages.length > 0 && (
            <>
              <span>·</span>
              <span>{engagement.messages.length} messages</span>
            </>
          )}
        </div>
        {progress !== null && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 bg-[#0d1630] rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-blue-400 shrink-0">{progress}%</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onDelete}
          className={cn(
            'opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all',
            isConfirmingDelete
              ? 'opacity-100 bg-red-500/20 text-red-400'
              : 'text-slate-600 hover:text-red-400 hover:bg-red-500/10'
          )}
          title={isConfirmingDelete ? 'Click again to confirm delete' : 'Delete engagement'}
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <Link
          href={`/engagements/${engagement.id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-600/20 transition-colors"
        >
          Open
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

function EmptyState({ search }: { search: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
        <Briefcase className="w-8 h-8 text-blue-400" />
      </div>
      <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        {search ? 'No matching engagements' : 'No engagements yet'}
      </h3>
      <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--text-muted)' }}>
        {search
          ? 'Try a different search term or clear the filter.'
          : 'Start by creating your first engagement. Upload client data and let the AI agents get to work.'}
      </p>
      {!search && (
        <Link
          href="/engagements/new"
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create First Engagement
        </Link>
      )}
    </div>
  );
}
