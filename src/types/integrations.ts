export interface HubSpotConfig {
  enabled: boolean;
  token: string;
  lastSynced?: string;
}

export interface AirtableConfig {
  enabled: boolean;
  apiKey: string;
  baseId: string;
  tableId: string;
  lastSynced?: string;
}

export interface NotionConfig {
  enabled: boolean;
  token: string;
  parentPageId: string;
  lastSynced?: string;
}

export interface MakeConfig {
  enabled: boolean;
  webhookUrl: string;
  triggerOnAnalysis: boolean;
  triggerOnComplete: boolean;
}

export interface IntegrationsConfig {
  hubspot: HubSpotConfig;
  airtable: AirtableConfig;
  notion: NotionConfig;
  make: MakeConfig;
}

export const DEFAULT_INTEGRATIONS_CONFIG: IntegrationsConfig = {
  hubspot: { enabled: false, token: '' },
  airtable: { enabled: false, apiKey: '', baseId: '', tableId: '' },
  notion: { enabled: false, token: '', parentPageId: '' },
  make: { enabled: false, webhookUrl: '', triggerOnAnalysis: true, triggerOnComplete: true },
};

export type IntegrationKey = keyof IntegrationsConfig;

export interface IntegrationMeta {
  key: IntegrationKey;
  name: string;
  description: string;
  icon: string;
  color: string;
  docsUrl: string;
}

export const INTEGRATION_META: IntegrationMeta[] = [
  {
    key: 'hubspot',
    name: 'HubSpot',
    description: 'Push engagements as deals, create contacts, and sync executive summaries as CRM notes.',
    icon: '🟠',
    color: 'orange',
    docsUrl: 'https://developers.hubspot.com/docs/api/private-apps',
  },
  {
    key: 'airtable',
    name: 'Airtable',
    description: 'Sync action plan items as records into any Airtable base and table.',
    icon: '🟡',
    color: 'yellow',
    docsUrl: 'https://support.airtable.com/docs/creating-personal-access-tokens',
  },
  {
    key: 'notion',
    name: 'Notion',
    description: 'Export executive summaries as Notion pages inside any workspace.',
    icon: '⬛',
    color: 'slate',
    docsUrl: 'https://developers.notion.com/docs/create-a-notion-integration',
  },
  {
    key: 'make',
    name: 'Make / Zapier',
    description: 'Trigger downstream automations via webhook when analysis is complete.',
    icon: '🟣',
    color: 'purple',
    docsUrl: 'https://www.make.com/en/help/tools/webhooks',
  },
];
