'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Zap, Loader2 } from 'lucide-react';
import { useEngagements } from '@/hooks/useEngagements';
import FileUploadZone from '@/components/upload/FileUploadZone';
import type { UploadedDocument } from '@/types';
import { cn } from '@/lib/utils';

const INDUSTRIES = [
  'Technology / SaaS',
  'Professional Services',
  'Healthcare',
  'E-commerce / Retail',
  'Real Estate',
  'Financial Services',
  'Marketing / Agency',
  'Manufacturing',
  'Education',
  'Hospitality / Food & Beverage',
  'Construction / Trades',
  'Other',
];

const COMPANY_SIZES = ['1-10 (Solopreneur/Micro)', '11-50 (Small)', '51-200 (Mid-Market)', '201-500', '500+'];

export default function NewEngagementPage() {
  const router = useRouter();
  const { createEngagement, addDocument } = useEngagements();
  const [step, setStep] = useState<1 | 2>(1);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    clientName: '',
    industry: '',
    companySize: '',
    primaryChallenge: '',
    desiredOutcome: '',
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  const handleDocumentAdded = (doc: UploadedDocument) => {
    setDocuments((prev) => [...prev, doc]);
  };

  const handleDocumentRemoved = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const validateStep2 = () => {
    const errs: Partial<typeof form> = {};
    if (!form.clientName.trim()) errs.clientName = 'Client name is required';
    if (!form.primaryChallenge.trim()) errs.primaryChallenge = 'Describe the primary challenge';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreate = async () => {
    if (!validateStep2()) return;
    setIsCreating(true);

    try {
      const engagement = createEngagement({
        title:
          form.title.trim() ||
          `${form.clientName || 'New'} — ${form.industry || 'Engagement'}`,
        clientName: form.clientName,
        industry: form.industry,
        companySize: form.companySize,
        primaryChallenge: form.primaryChallenge,
        desiredOutcome: form.desiredOutcome,
      });

      for (const doc of documents) {
        addDocument(engagement.id, doc);
      }

      router.push(`/engagements/${engagement.id}`);
    } catch {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-4 border-b"
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
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            New Engagement
          </span>
        </div>
        <div className="w-20" />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          <StepBadge num={1} label="Upload Data" active={step === 1} done={step > 1} />
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          <StepBadge num={2} label="Context & Details" active={step === 2} done={false} />
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                Upload client data
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Drop in any files — PDFs, spreadsheets, reports, contracts, or voice notes. The AI agents will extract and analyze all content.
              </p>
            </div>

            <FileUploadZone
              onDocumentAdded={handleDocumentAdded}
              documents={documents}
              onDocumentRemoved={handleDocumentRemoved}
            />

            <div className="flex items-center justify-between pt-2">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {documents.length > 0
                  ? `${documents.length} file${documents.length !== 1 ? 's' : ''} ready`
                  : 'You can also skip and add documents later'}
              </p>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                Engagement context
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Give the agents the context they need to deliver targeted, relevant analysis.
              </p>
            </div>

            <div className="space-y-4">
              <FormField
                label="Engagement Title"
                hint="Optional — auto-generated if blank"
                value={form.title}
                onChange={(v) => setForm((f) => ({ ...f, title: v }))}
                placeholder="e.g. Q4 Growth Strategy — Acme Corp"
              />

              <FormField
                label="Client / Company Name"
                required
                value={form.clientName}
                onChange={(v) => setForm((f) => ({ ...f, clientName: v }))}
                error={errors.clientName}
                placeholder="e.g. Acme Corporation"
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Industry
                  </label>
                  <select
                    value={form.industry}
                    onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                    style={{
                      background: 'var(--bg-card)',
                      borderColor: 'var(--border)',
                      color: form.industry ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    <option value="">Select industry</option>
                    {INDUSTRIES.map((i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Company Size
                  </label>
                  <select
                    value={form.companySize}
                    onChange={(e) => setForm((f) => ({ ...f, companySize: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                    style={{
                      background: 'var(--bg-card)',
                      borderColor: 'var(--border)',
                      color: form.companySize ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    <option value="">Select size</option>
                    {COMPANY_SIZES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <FormField
                label="Primary Challenge"
                required
                value={form.primaryChallenge}
                onChange={(v) => setForm((f) => ({ ...f, primaryChallenge: v }))}
                error={errors.primaryChallenge}
                placeholder="e.g. Sales pipeline is stalled at 30% close rate, need to identify bottlenecks and fix conversion"
                multiline
                rows={3}
              />

              <FormField
                label="Desired Outcome"
                value={form.desiredOutcome}
                onChange={(v) => setForm((f) => ({ ...f, desiredOutcome: v }))}
                placeholder="e.g. Increase close rate to 50% within 90 days, add $200k in ARR"
                multiline
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between pt-2 gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Launch Analysis
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepBadge({ num, label, active, done }: { num: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
          active ? 'bg-blue-600 text-white' : done ? 'bg-green-600 text-white' : 'text-slate-500'
        )}
        style={!active && !done ? { background: 'var(--bg-card)', border: '1px solid var(--border)' } : undefined}
      >
        {done ? '✓' : num}
      </div>
      <span
        className={cn('text-sm font-medium hidden sm:block transition-colors', active ? 'text-white' : 'text-slate-500')}
      >
        {label}
      </span>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  required,
  multiline,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
}) {
  const baseClass = cn(
    'w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none transition-colors',
    error ? 'border-red-500' : 'border-[#1e2d40] focus:border-blue-500'
  );
  const style = { background: 'var(--bg-card)', color: 'var(--text-primary)' };

  return (
    <div>
      <label className="flex items-center gap-1 text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      {hint && <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={cn(baseClass, 'resize-none')}
          style={style}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={baseClass}
          style={style}
        />
      )}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
