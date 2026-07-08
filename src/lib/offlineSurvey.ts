import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { APP_NAME } from "@/lib/eventSettings";

export interface OfflineSurveyResponse {
  id: string;
  event_id: string;
  ratings: Json;
  suggestion: string | null;
  created_at: string;
}

export interface CachedSurveyEvent {
  id: string;
  title: string;
  description: string | null;
  cachedAt: string;
}

const QUEUE_KEY = `${APP_NAME}:offline-responses:v1`;
const EVENT_CACHE_KEY = `${APP_NAME}:event-cache:v1`;

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = <T>(key: string, value: T) => {
  window.localStorage.setItem(key, JSON.stringify(value));
};

const duplicateKeyPattern = /duplicate key|23505/i;

export const createResponseId = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const getPendingResponseCount = () => readJson<OfflineSurveyResponse[]>(QUEUE_KEY, []).length;

const queueResponse = (response: OfflineSurveyResponse) => {
  const queue = readJson<OfflineSurveyResponse[]>(QUEUE_KEY, []);
  if (!queue.some((item) => item.id === response.id)) {
    try {
      writeJson(QUEUE_KEY, [...queue, response]);
    } catch {
      writeJson(QUEUE_KEY, queue.slice(-100).concat(response));
    }
  }
};

export const submitSurveyResponse = async (response: OfflineSurveyResponse) => {
  if (!navigator.onLine) {
    queueResponse(response);
    return { queued: true };
  }

  try {
    const { error } = await supabase.from("survey_responses").insert(response);

    if (!error || duplicateKeyPattern.test(`${error.code || ""} ${error.message || ""}`)) {
      return { queued: false };
    }
  } catch {
    queueResponse(response);
    return { queued: true };
  }

  queueResponse(response);
  return { queued: true };
};

export const syncPendingSurveyResponses = async () => {
  if (!navigator.onLine) return getPendingResponseCount();

  const queue = readJson<OfflineSurveyResponse[]>(QUEUE_KEY, []);
  if (queue.length === 0) return 0;

  const unsynced: OfflineSurveyResponse[] = [];

  for (const response of queue) {
    try {
      const { error } = await supabase.from("survey_responses").insert(response);
      if (error && !duplicateKeyPattern.test(`${error.code || ""} ${error.message || ""}`)) {
        unsynced.push(response);
      }
    } catch {
      unsynced.push(response);
    }
  }

  writeJson(QUEUE_KEY, unsynced);
  return unsynced.length;
};

export const cacheSurveyEvent = (eventKey: string, event: Omit<CachedSurveyEvent, "cachedAt">) => {
  const cache = readJson<Record<string, CachedSurveyEvent>>(EVENT_CACHE_KEY, {});
  const cachedEvent = { ...event, cachedAt: new Date().toISOString() };

  writeJson(EVENT_CACHE_KEY, {
    ...cache,
    [eventKey]: cachedEvent,
    [event.id]: cachedEvent,
  });
};

export const getCachedSurveyEvent = (eventKey: string) => {
  return readJson<Record<string, CachedSurveyEvent>>(EVENT_CACHE_KEY, {})[eventKey] || null;
};
