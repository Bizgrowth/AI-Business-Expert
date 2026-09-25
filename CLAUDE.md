# AI Ops Expert Team

AI-powered business consulting platform for solo consultants. Upload client data, converse with specialist AI agents, and generate executive summaries + action plans.

## Tech Stack
- Next.js 15 (App Router, TypeScript)
- Tailwind CSS v3
- Anthropic SDK (Claude claude-sonnet-5 / claude-opus-5-5)
- localStorage for engagement persistence (no database)

## Dev
```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # production build
```

## Required Env Vars
```
ANTHROPIC_API_KEY=sk-ant-...
```
Copy `.env.example` → `.env.local` and fill in the key.

## Project Structure
```
src/
  app/
    page.tsx                    # Dashboard
    engagements/new/page.tsx    # New engagement (2-step: upload + context)
    engagements/[id]/page.tsx   # Workspace (chat / summary / plan / docs tabs)
    api/upload/route.ts         # Parse PDF/DOCX/XLSX/CSV/TXT
    api/chat/route.ts           # Streaming Claude agent responses
  lib/
    agents/prompts.ts           # All 7 agent system prompts
    parsers/index.ts            # File text extraction
    anthropic.ts                # Claude client + model IDs
  hooks/
    useEngagements.ts           # localStorage CRUD for engagements
  types/index.ts                # Shared TypeScript types
  components/
    upload/FileUploadZone.tsx   # Drag-drop + voice recording
    chat/ChatInterface.tsx      # Streaming agent chat UI
    output/ActionPlanView.tsx   # Interactive action plan tracker
```

## Agents
| ID | Name | Specialization |
|----|------|---------------|
| orchestrator | Lead Strategist | Synthesis, executive summaries, routing |
| analyst | Business Analyst | Root cause, strategic options |
| operations | Ops & Automation | Workflow mapping, automation ROI |
| sales | Sales & Marketing | Funnel, GTM, copy |
| finance | Financial Analyst | ROI models, business cases |
| copywriter | Copywriter | Proposals, emails, decks |
| technical | Technical Advisor | AI/LLM stack, integrations |

## Deployment
Deploy to Vercel: connect GitHub repo, set `ANTHROPIC_API_KEY` in environment variables.

## Phase 2 Integrations (planned)
- HubSpot — push engagements and contacts
- Airtable / Notion — sync action plans
- Google Drive — import files directly
- Make.com / Zapier — trigger downstream workflows on engagement events
