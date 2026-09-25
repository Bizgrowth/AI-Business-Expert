'use client';

import { useState, useEffect, useCallback } from 'react';
import type { IntegrationsConfig, IntegrationKey } from '@/types/integrations';
import { DEFAULT_INTEGRATIONS_CONFIG } from '@/types/integrations';

const STORAGE_KEY = 'ai_ops_integrations';

function loadConfig(): IntegrationsConfig {
  if (typeof window === 'undefined') return DEFAULT_INTEGRATIONS_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_INTEGRATIONS_CONFIG;
    return { ...DEFAULT_INTEGRATIONS_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_INTEGRATIONS_CONFIG;
  }
}

export function useIntegrations() {
  const [config, setConfig] = useState<IntegrationsConfig>(DEFAULT_INTEGRATIONS_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setConfig(loadConfig());
    setLoaded(true);
  }, []);

  const updateIntegration = useCallback(
    <K extends IntegrationKey>(key: K, updates: Partial<IntegrationsConfig[K]>) => {
      setConfig((prev) => {
        const next = {
          ...prev,
          [key]: { ...prev[key], ...updates },
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          console.warn('Could not save integration config');
        }
        return next;
      });
    },
    []
  );

  const isConnected = useCallback(
    (key: IntegrationKey): boolean => {
      if (!config[key].enabled) return false;
      switch (key) {
        case 'hubspot': return !!config.hubspot.token;
        case 'airtable': return !!(config.airtable.apiKey && config.airtable.baseId && config.airtable.tableId);
        case 'notion': return !!(config.notion.token && config.notion.parentPageId);
        case 'make': return !!config.make.webhookUrl;
        default: return false;
      }
    },
    [config]
  );

  return { config, loaded, updateIntegration, isConnected };
}
