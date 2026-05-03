export const getToken = () =>
  localStorage.getItem("bridge_token") || "dev-bridge-token-change-me";

export const setToken = (token: string) =>
  localStorage.setItem("bridge_token", token);

export const clearToken = () =>
  localStorage.removeItem("bridge_token");

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
  "Content-Type": "application/json",
});

// The API returns handoff_id and written_at; we normalize to id/created_at for the UI
function normalizeHandoff(raw: RawHandoff): Handoff {
  return {
    ...raw,
    id: raw.handoff_id,
    created_at: raw.written_at,
    decisions: raw.decisions_made ?? [],
    context: raw.context_to_preserve ?? [],
  };
}

interface RawHandoff {
  handoff_id: string;
  thread_name: string;
  written_at: string;
  session_summary: string;
  active_work?: ActiveWorkItem[];
  decisions_made?: Decision[];
  open_questions?: OpenQuestion[];
  context_to_preserve?: ContextItem[];
  emotional_state?: EmotionalState;
  do_not_forget?: string[];
  next_session_prompt?: string;
  next_session_prompt_url?: string;
}

export interface ActiveWorkItem {
  title: string;
  current_state: string;
  next_action: string;
  blockers?: string[];
}

export interface Decision {
  decision: string;
  reasoning: string;
  alternatives_considered?: string[];
}

export interface OpenQuestion {
  question: string;
  context: string;
  tentative_lean?: string;
}

export interface ContextItem {
  label: string;
  value: string;
  why_it_matters: string;
}

export interface EmotionalState {
  energy: "high" | "medium" | "low" | "drained";
  confidence: "high" | "medium" | "low" | "uncertain";
  frustrations?: string[];
  wins?: string[];
  note_to_next_self?: string;
}

export interface ThreadInfo {
  thread_name: string;
  handoff_count: number;
  last_updated: string;
}

export interface Handoff {
  id: string;
  handoff_id: string;
  thread_name: string;
  written_at: string;
  created_at: string;
  session_summary: string;
  active_work: ActiveWorkItem[];
  decisions: Decision[];
  open_questions: OpenQuestion[];
  context: ContextItem[];
  emotional_state?: EmotionalState;
  do_not_forget: string[];
  next_session_prompt: string;
  next_session_prompt_url: string;
}

export interface HandoffCreatePayload {
  thread_name: string;
  session_summary: string;
  active_work?: ActiveWorkItem[];
  decisions_made?: Decision[];
  open_questions?: OpenQuestion[];
  context_to_preserve?: ContextItem[];
  emotional_state?: EmotionalState;
  do_not_forget?: string[];
  next_session_prompt?: string;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: authHeaders(), ...options });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

async function apiFetchText(url: string, options?: RequestInit): Promise<string> {
  const res = await fetch(url, { headers: authHeaders(), ...options });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.text();
}

export const api = {
  getThreads: () => apiFetch<ThreadInfo[]>("/v1/threads"),

  getHandoffs: (params?: { thread_name?: string; limit?: number; offset?: number }) => {
    const url = new URL("/v1/handoffs", window.location.origin);
    if (params?.thread_name) url.searchParams.set("thread_name", params.thread_name);
    if (params?.limit) url.searchParams.set("limit", String(params.limit));
    if (params?.offset) url.searchParams.set("offset", String(params.offset));
    return apiFetch<RawHandoff[]>(url.pathname + url.search).then((list) =>
      list.map(normalizeHandoff)
    );
  },

  getHandoff: (id: string) =>
    apiFetch<RawHandoff>(`/v1/handoffs/${id}`).then(normalizeHandoff),

  getLatest: (thread_name: string) =>
    apiFetch<RawHandoff>(`/v1/handoffs/latest?thread_name=${encodeURIComponent(thread_name)}`).then(
      normalizeHandoff
    ),

  getHandoffAsPrompt: (id: string) => apiFetchText(`/v1/handoffs/${id}/as-prompt`),

  createHandoff: (data: HandoffCreatePayload) =>
    apiFetch<RawHandoff>("/v1/handoffs", {
      method: "POST",
      body: JSON.stringify(data),
    }).then(normalizeHandoff),

  updateHandoff: (id: string, data: Partial<HandoffCreatePayload>) =>
    apiFetch<RawHandoff>(`/v1/handoffs/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }).then(normalizeHandoff),

  deleteHandoff: (id: string) =>
    apiFetch<{ deleted: string }>(`/v1/handoffs/${id}`, { method: "DELETE" }),

  getConfig: () => apiFetch<{ base_url: string }>("/v1/config"),
};
