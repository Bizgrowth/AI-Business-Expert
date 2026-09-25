export type AgentType =
  | 'orchestrator'
  | 'analyst'
  | 'operations'
  | 'sales'
  | 'finance'
  | 'copywriter'
  | 'technical';

export interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  extractedText: string;
  uploadedAt: string;
}

export interface ActionItem {
  id: string;
  phase: string;
  task: string;
  owner: string;
  timeline: string;
  kpi: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'in-progress' | 'done';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentType?: AgentType;
  timestamp: string;
}

export interface Engagement {
  id: string;
  title: string;
  clientName: string;
  industry: string;
  companySize: string;
  primaryChallenge: string;
  desiredOutcome: string;
  documents: UploadedDocument[];
  messages: Message[];
  executiveSummary: string;
  actionPlan: ActionItem[];
  status: 'draft' | 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface AgentMeta {
  type: AgentType;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const AGENT_META: Record<AgentType, AgentMeta> = {
  orchestrator: {
    type: 'orchestrator',
    name: 'Lead Strategist',
    description: 'Orchestrates all agents, produces executive summaries and roadmaps',
    icon: '🎯',
    color: 'blue',
  },
  analyst: {
    type: 'analyst',
    name: 'Business Analyst',
    description: 'Root cause analysis, strategic options, business case development',
    icon: '📊',
    color: 'purple',
  },
  operations: {
    type: 'operations',
    name: 'Ops & Automation',
    description: 'Workflow mapping, process optimization, automation opportunities',
    icon: '⚙️',
    color: 'orange',
  },
  sales: {
    type: 'sales',
    name: 'Sales & Marketing',
    description: 'Funnel analysis, go-to-market strategy, copy and positioning',
    icon: '📈',
    color: 'green',
  },
  finance: {
    type: 'finance',
    name: 'Financial Analyst',
    description: 'ROI models, business cases, cost-benefit and budget analysis',
    icon: '💰',
    color: 'yellow',
  },
  copywriter: {
    type: 'copywriter',
    name: 'Copywriter',
    description: 'Compelling copy for proposals, pitches, emails, and deliverables',
    icon: '✍️',
    color: 'pink',
  },
  technical: {
    type: 'technical',
    name: 'Technical Advisor',
    description: 'Tech stack design, AI/LLM architecture, integration roadmaps',
    icon: '🔧',
    color: 'cyan',
  },
};
