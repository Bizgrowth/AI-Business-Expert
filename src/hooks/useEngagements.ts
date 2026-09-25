'use client';

import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Engagement, Message, ActionItem, UploadedDocument } from '@/types';

const STORAGE_KEY = 'ai_ops_engagements';

function loadEngagements(): Engagement[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Engagement[]) : [];
  } catch {
    return [];
  }
}

function saveEngagements(engagements: Engagement[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(engagements));
  } catch {
    // localStorage full — warn but don't crash
    console.warn('localStorage write failed — storage may be full');
  }
}

export function useEngagements() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setEngagements(loadEngagements());
    setLoaded(true);
  }, []);

  const persist = useCallback((updated: Engagement[]) => {
    setEngagements(updated);
    saveEngagements(updated);
  }, []);

  const createEngagement = useCallback(
    (data: Pick<Engagement, 'title' | 'clientName' | 'industry' | 'companySize' | 'primaryChallenge' | 'desiredOutcome'>): Engagement => {
      const now = new Date().toISOString();
      const engagement: Engagement = {
        id: uuidv4(),
        ...data,
        documents: [],
        messages: [],
        executiveSummary: '',
        actionPlan: [],
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };
      persist([engagement, ...engagements]);
      return engagement;
    },
    [engagements, persist]
  );

  const getEngagement = useCallback(
    (id: string): Engagement | undefined => {
      return engagements.find((e) => e.id === id);
    },
    [engagements]
  );

  const updateEngagement = useCallback(
    (id: string, updates: Partial<Engagement>) => {
      const updated = engagements.map((e) =>
        e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
      );
      persist(updated);
    },
    [engagements, persist]
  );

  const addDocument = useCallback(
    (engagementId: string, doc: UploadedDocument) => {
      const updated = engagements.map((e) =>
        e.id === engagementId
          ? { ...e, documents: [...e.documents, doc], updatedAt: new Date().toISOString() }
          : e
      );
      persist(updated);
    },
    [engagements, persist]
  );

  const addMessage = useCallback(
    (engagementId: string, message: Omit<Message, 'id' | 'timestamp'>) => {
      const newMsg: Message = {
        ...message,
        id: uuidv4(),
        timestamp: new Date().toISOString(),
      };
      const updated = engagements.map((e) =>
        e.id === engagementId
          ? { ...e, messages: [...e.messages, newMsg], updatedAt: new Date().toISOString() }
          : e
      );
      persist(updated);
      return newMsg;
    },
    [engagements, persist]
  );

  const updateLastMessage = useCallback(
    (engagementId: string, content: string) => {
      const updated = engagements.map((e) => {
        if (e.id !== engagementId) return e;
        const messages = [...e.messages];
        if (messages.length === 0) return e;
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          content,
        };
        return { ...e, messages, updatedAt: new Date().toISOString() };
      });
      persist(updated);
    },
    [engagements, persist]
  );

  const updateActionPlan = useCallback(
    (engagementId: string, items: ActionItem[]) => {
      updateEngagement(engagementId, { actionPlan: items });
    },
    [updateEngagement]
  );

  const deleteEngagement = useCallback(
    (id: string) => {
      persist(engagements.filter((e) => e.id !== id));
    },
    [engagements, persist]
  );

  return {
    engagements,
    loaded,
    createEngagement,
    getEngagement,
    updateEngagement,
    addDocument,
    addMessage,
    updateLastMessage,
    updateActionPlan,
    deleteEngagement,
  };
}
