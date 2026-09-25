'use client';

import { useState } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import type { ActionItem } from '@/types';

const PHASES = ['Quick Win (0-30 days)', 'Foundation (30-90 days)', 'Scale (90-180 days)', 'Ongoing'];

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-500/10 text-red-400 border-red-500/20',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  low: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

interface ActionPlanViewProps {
  items: ActionItem[];
  onChange: (items: ActionItem[]) => void;
}

export default function ActionPlanView({ items, onChange }: ActionPlanViewProps) {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(PHASES));
  const [editingId, setEditingId] = useState<string | null>(null);

  const togglePhase = (phase: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      next.has(phase) ? next.delete(phase) : next.add(phase);
      return next;
    });
  };

  const addItem = (phase: string) => {
    const item: ActionItem = {
      id: uuidv4(),
      phase,
      task: 'New action item',
      owner: 'You',
      timeline: '1 week',
      kpi: 'To be defined',
      priority: 'medium',
      status: 'todo',
    };
    onChange([...items, item]);
    setEditingId(item.id);
  };

  const updateItem = (id: string, updates: Partial<ActionItem>) => {
    onChange(items.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  };

  const deleteItem = (id: string) => {
    onChange(items.filter((i) => i.id !== id));
  };

  const toggleStatus = (item: ActionItem) => {
    const cycle: ActionItem['status'][] = ['todo', 'in-progress', 'done'];
    const next = cycle[(cycle.indexOf(item.status) + 1) % cycle.length];
    updateItem(item.id, { status: next });
  };

  const grouped = PHASES.reduce<Record<string, ActionItem[]>>((acc, phase) => {
    acc[phase] = items.filter((i) => i.phase === phase);
    return acc;
  }, {});

  const totalDone = items.filter((i) => i.status === 'done').length;
  const progress = items.length > 0 ? Math.round((totalDone / items.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress */}
      {items.length > 0 && (
        <div className="bg-[#111827] border border-[#1e2d40] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">Overall Progress</span>
            <span className="text-sm font-semibold text-blue-400">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-[#0d1630] rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            {totalDone} of {items.length} tasks complete
          </p>
        </div>
      )}

      {/* Phases */}
      {PHASES.map((phase) => {
        const phaseItems = grouped[phase] ?? [];
        const phaseExpanded = expandedPhases.has(phase);
        const phaseDone = phaseItems.filter((i) => i.status === 'done').length;

        return (
          <div key={phase} className="bg-[#111827] border border-[#1e2d40] rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => togglePhase(phase)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-200">{phase}</span>
                <span className="text-xs text-slate-500 bg-[#0d1630] px-2 py-0.5 rounded-full">
                  {phaseItems.length} task{phaseItems.length !== 1 ? 's' : ''}
                </span>
                {phaseItems.length > 0 && (
                  <span className="text-xs text-green-400">
                    {phaseDone}/{phaseItems.length} done
                  </span>
                )}
              </div>
              {phaseExpanded ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {phaseExpanded && (
              <div className="border-t border-[#1e2d40]">
                {phaseItems.length === 0 && (
                  <p className="text-sm text-slate-600 text-center py-6">
                    No tasks yet — add one below
                  </p>
                )}
                {phaseItems.map((item) => (
                  <ActionItemRow
                    key={item.id}
                    item={item}
                    isEditing={editingId === item.id}
                    onToggleEdit={() => setEditingId(editingId === item.id ? null : item.id)}
                    onUpdate={(updates) => updateItem(item.id, updates)}
                    onDelete={() => deleteItem(item.id)}
                    onToggleStatus={() => toggleStatus(item)}
                  />
                ))}
                <div className="p-3 border-t border-[#1e2d40]/50">
                  <button
                    type="button"
                    onClick={() => addItem(phase)}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-400 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add task
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {items.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500 text-sm mb-2">No action plan yet</p>
          <p className="text-slate-600 text-xs">Run an analysis in the Chat tab to generate one, or add tasks manually</p>
        </div>
      )}
    </div>
  );
}

interface ActionItemRowProps {
  item: ActionItem;
  isEditing: boolean;
  onToggleEdit: () => void;
  onUpdate: (updates: Partial<ActionItem>) => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}

function ActionItemRow({ item, isEditing, onToggleEdit, onUpdate, onDelete, onToggleStatus }: ActionItemRowProps) {
  const StatusIcon = item.status === 'done' ? CheckCircle2 : item.status === 'in-progress' ? Clock : Circle;
  const statusColors = {
    todo: 'text-slate-500',
    'in-progress': 'text-yellow-400',
    done: 'text-green-400',
  };

  return (
    <div
      className={cn(
        'group border-b border-[#1e2d40]/50 last:border-0',
        item.status === 'done' && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-3 p-3 hover:bg-white/5 transition-colors">
        <button
          type="button"
          onClick={onToggleStatus}
          className={cn('mt-0.5 shrink-0 transition-colors hover:opacity-80', statusColors[item.status])}
        >
          <StatusIcon className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              autoFocus
              value={item.task}
              onChange={(e) => onUpdate({ task: e.target.value })}
              onBlur={onToggleEdit}
              className="w-full bg-[#0d1630] border border-blue-500/50 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={onToggleEdit}
              className={cn(
                'text-sm text-left text-slate-200 hover:text-blue-400 transition-colors',
                item.status === 'done' && 'line-through'
              )}
            >
              {item.task}
            </button>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={cn('text-xs px-1.5 py-0.5 rounded border', PRIORITY_COLORS[item.priority])}>
              {item.priority}
            </span>
            <span className="text-xs text-slate-500">{item.owner}</span>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs text-slate-500">{item.timeline}</span>
            {item.kpi && item.kpi !== 'To be defined' && (
              <>
                <span className="text-xs text-slate-600">·</span>
                <span className="text-xs text-slate-500 truncate max-w-[120px]">KPI: {item.kpi}</span>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10 text-slate-600 hover:text-red-400 shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
