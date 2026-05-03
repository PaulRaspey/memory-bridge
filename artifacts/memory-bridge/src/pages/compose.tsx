import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateHandoff } from "@/hooks/queries";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";
import type { ActiveWorkItem, Decision, OpenQuestion, ContextItem, EmotionalState } from "@/api/client";

// ──────────────────────────────────────────────────────────
// The prompt we tell Claude to use when generating a handoff
// ──────────────────────────────────────────────────────────
const CLAUDE_SYSTEM_PROMPT = `At the end of our session, output a JSON handoff in this exact structure (omit any field that has no data):

\`\`\`json
{
  "thread_name": "short-slug-for-this-project",
  "session_summary": "2-4 sentence arc of what we did",
  "active_work": [
    { "title": "task name", "current_state": "e.g. 80% done", "next_action": "concrete next step", "blockers": "optional" }
  ],
  "decisions_made": [
    { "decision": "what was decided", "reasoning": "why", "alternatives_considered": "optional" }
  ],
  "open_questions": [
    { "question": "unresolved question", "context": "why it matters", "tentative_lean": "optional" }
  ],
  "context_to_preserve": [
    { "label": "short label", "value": "the value", "why_it_matters": "why future-me needs this" }
  ],
  "emotional_state": {
    "energy": "high|medium|low|drained",
    "confidence": "high|medium|low|uncertain",
    "frustrations": ["optional"],
    "wins": ["optional"],
    "note_to_next_self": "optional message"
  },
  "do_not_forget": ["critical thing 1", "critical thing 2"],
  "next_session_prompt": "Optional custom prompt. Leave out to auto-generate."
}
\`\`\``;

// ──────────────────────────────────────────────────────────
// Flexible JSON parser — accepts both API names and aliases
// ──────────────────────────────────────────────────────────
interface ParsedHandoff {
  thread_name?: string;
  session_summary?: string;
  active_work?: ActiveWorkItem[];
  decisions_made?: Decision[];
  open_questions?: OpenQuestion[];
  context_to_preserve?: ContextItem[];
  emotional_state?: Partial<EmotionalState>;
  do_not_forget?: string[];
  next_session_prompt?: string;
}

function parseHandoffJson(raw: string): ParsedHandoff {
  // Strip markdown code fences if present
  const stripped = raw.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/im, "").trim();
  const obj = JSON.parse(stripped);

  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const arr = <T,>(v: unknown): T[] | undefined =>
    Array.isArray(v) && v.length > 0 ? (v as T[]) : undefined;

  return {
    thread_name: str(obj.thread_name ?? obj.thread),
    session_summary: str(obj.session_summary ?? obj.summary),
    active_work: arr<ActiveWorkItem>(obj.active_work),
    decisions_made: arr<Decision>(obj.decisions_made ?? obj.decisions),
    open_questions: arr<OpenQuestion>(obj.open_questions ?? obj.questions),
    context_to_preserve: arr<ContextItem>(obj.context_to_preserve ?? obj.context),
    emotional_state: obj.emotional_state ?? undefined,
    do_not_forget: arr<string>(obj.do_not_forget),
    next_session_prompt: str(obj.next_session_prompt ?? obj.next_prompt),
  };
}

// ──────────────────────────────────────────────────────────
// Reusable sub-components
// ──────────────────────────────────────────────────────────
function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 bg-card/30 hover:bg-card/60 transition-colors text-left"
      >
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          {badge !== undefined && badge > 0 && (
            <span className="text-xs font-mono bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {open && <div className="p-4 space-y-3 bg-background/30">{children}</div>}
    </div>
  );
}

function CopyOnceButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="gap-2">
      {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : label}
    </Button>
  );
}

// ──────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────
export default function Compose() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const createHandoff = useCreateHandoff();

  // Form fields
  const [threadName, setThreadName] = useState("");
  const [summary, setSummary] = useState("");
  const [nextPrompt, setNextPrompt] = useState("");
  const [doNotForget, setDoNotForget] = useState<string[]>([""]);
  const [activeWork, setActiveWork] = useState<ActiveWorkItem[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [openQuestions, setOpenQuestions] = useState<OpenQuestion[]>([]);
  const [context, setContext] = useState<ContextItem[]>([]);
  const [emotionalState, setEmotionalState] = useState<Partial<EmotionalState>>({});

  // JSON import state
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [importDone, setImportDone] = useState(false);

  // ── field helpers ──
  const addActiveWork = () =>
    setActiveWork((p) => [...p, { title: "", current_state: "", next_action: "" }]);
  const removeActiveWork = (i: number) =>
    setActiveWork((p) => p.filter((_, idx) => idx !== i));
  const updateActiveWork = (i: number, field: keyof ActiveWorkItem, value: string) =>
    setActiveWork((p) => p.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));

  const addDecision = () => setDecisions((p) => [...p, { decision: "", reasoning: "" }]);
  const removeDecision = (i: number) => setDecisions((p) => p.filter((_, idx) => idx !== i));
  const updateDecision = (i: number, field: keyof Decision, value: string) =>
    setDecisions((p) => p.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));

  const addQuestion = () => setOpenQuestions((p) => [...p, { question: "", context: "" }]);
  const removeQuestion = (i: number) =>
    setOpenQuestions((p) => p.filter((_, idx) => idx !== i));
  const updateQuestion = (i: number, field: keyof OpenQuestion, value: string) =>
    setOpenQuestions((p) => p.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));

  const addContext = () =>
    setContext((p) => [...p, { label: "", value: "", why_it_matters: "" }]);
  const removeContext = (i: number) => setContext((p) => p.filter((_, idx) => idx !== i));
  const updateContext = (i: number, field: keyof ContextItem, value: string) =>
    setContext((p) => p.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));

  const updateDoNotForget = (i: number, value: string) =>
    setDoNotForget((p) => p.map((item, idx) => (idx === i ? value : item)));
  const addDoNotForget = () => setDoNotForget((p) => [...p, ""]);
  const removeDoNotForget = (i: number) =>
    setDoNotForget((p) => p.filter((_, idx) => idx !== i));

  // ── JSON import ──
  const applyImport = () => {
    setJsonError(null);
    try {
      const parsed = parseHandoffJson(jsonText);

      if (parsed.thread_name) setThreadName(parsed.thread_name);
      if (parsed.session_summary) setSummary(parsed.session_summary);
      if (parsed.next_session_prompt) setNextPrompt(parsed.next_session_prompt);
      if (parsed.active_work?.length) setActiveWork(parsed.active_work);
      if (parsed.decisions_made?.length) setDecisions(parsed.decisions_made);
      if (parsed.open_questions?.length) setOpenQuestions(parsed.open_questions);
      if (parsed.context_to_preserve?.length) setContext(parsed.context_to_preserve);
      if (parsed.emotional_state) setEmotionalState(parsed.emotional_state);
      if (parsed.do_not_forget?.length) setDoNotForget(parsed.do_not_forget);

      setImportDone(true);
      setJsonText("");
      toast({
        title: "Imported successfully",
        description: "Form populated from JSON. Review and save.",
      });
    } catch (err) {
      setJsonError(`Parse error: ${(err as Error).message}`);
    }
  };

  // ── submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!threadName.trim() || !summary.trim()) {
      toast({ title: "Thread name and summary are required", variant: "destructive" });
      return;
    }
    try {
      const handoff = await createHandoff.mutateAsync({
        thread_name: threadName.trim(),
        session_summary: summary.trim(),
        next_session_prompt: nextPrompt.trim() || undefined,
        active_work: activeWork.filter((w) => w.title.trim()),
        decisions_made: decisions.filter((d) => d.decision.trim()),
        open_questions: openQuestions.filter((q) => q.question.trim()),
        context_to_preserve: context.filter((c) => c.label.trim()),
        emotional_state: Object.values(emotionalState).some(Boolean)
          ? (emotionalState as EmotionalState)
          : undefined,
        do_not_forget: doNotForget.filter((s) => s.trim()),
      });
      toast({ title: "Session saved", description: `ID: ${handoff.handoff_id.substring(0, 8)}` });
      navigate("/");
    } catch (err) {
      toast({ title: "Failed to save session", description: String(err), variant: "destructive" });
    }
  };

  const hasData =
    threadName || summary || activeWork.length || decisions.length || openQuestions.length;

  return (
    <Layout>
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">New Session Handoff</h1>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => navigate("/")}>
              Cancel
            </Button>
            <Button type="submit" disabled={createHandoff.isPending}>
              {createHandoff.isPending ? "Saving…" : "Save Handoff"}
            </Button>
          </div>
        </div>

        {/* ── JSON Import panel ── */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-primary/20">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Import from Claude JSON</span>
            </div>
            <div className="flex items-center gap-2">
              <CopyOnceButton text={CLAUDE_SYSTEM_PROMPT} label="Copy prompt for Claude" />
              {importDone && (
                <span className="text-xs text-primary flex items-center gap-1">
                  <Check className="w-3 h-3" /> Imported
                </span>
              )}
            </div>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Copy the prompt above → paste it into Claude at the end of your session → paste
              Claude's JSON output here.
            </p>
            <Textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setJsonError(null);
                setImportDone(false);
              }}
              placeholder={`Paste Claude's JSON here (code fences are fine)…\n\n{\n  "thread_name": "my-project",\n  "session_summary": "…"\n}`}
              rows={7}
              className="font-mono text-xs resize-y bg-card/40 border-border/60 placeholder:text-muted-foreground/40"
              spellCheck={false}
            />
            {jsonError && (
              <p className="text-xs text-destructive font-mono bg-destructive/10 px-3 py-2 rounded-md">
                {jsonError}
              </p>
            )}
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={applyImport}
                disabled={!jsonText.trim()}
                className="gap-2"
                size="sm"
              >
                <ClipboardPaste className="w-4 h-4" />
                Parse &amp; Fill Form
              </Button>
            </div>
          </div>
        </div>

        {/* ── Required fields ── */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">
              Thread Name <span className="text-destructive">*</span>
            </label>
            <Input
              value={threadName}
              onChange={(e) => setThreadName(e.target.value)}
              placeholder="e.g. memory-bridge, personal-project, work-task"
              className="font-mono"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Groups related sessions together. Use a short slug.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">
              Session Summary <span className="text-destructive">*</span>
            </label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="What did you accomplish this session? What was the overall arc?"
              rows={4}
              required
            />
          </div>
        </div>

        {/* ── Active Work ── */}
        <CollapsibleSection
          title="Active Work Items"
          defaultOpen={activeWork.length > 0}
          badge={activeWork.length}
        >
          {activeWork.map((work, i) => (
            <div key={i} className="bg-card border border-border rounded-md p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <Input
                    value={work.title}
                    onChange={(e) => updateActiveWork(i, "title", e.target.value)}
                    placeholder="Task title"
                    className="font-medium"
                  />
                  <Input
                    value={work.current_state}
                    onChange={(e) => updateActiveWork(i, "current_state", e.target.value)}
                    placeholder="Current state (e.g. 'WIP', '80% done')"
                    className="font-mono text-sm"
                  />
                  <Textarea
                    value={work.next_action}
                    onChange={(e) => updateActiveWork(i, "next_action", e.target.value)}
                    placeholder="Next concrete action"
                    rows={2}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeActiveWork(i)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addActiveWork}
            className="gap-2 w-full"
          >
            <Plus className="w-4 h-4" />
            Add Work Item
          </Button>
        </CollapsibleSection>

        {/* ── Decisions ── */}
        <CollapsibleSection
          title="Decisions Made"
          defaultOpen={decisions.length > 0}
          badge={decisions.length}
        >
          {decisions.map((dec, i) => (
            <div key={i} className="bg-card border border-border rounded-md p-4 space-y-2">
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <Input
                    value={dec.decision}
                    onChange={(e) => updateDecision(i, "decision", e.target.value)}
                    placeholder="What was decided?"
                  />
                  <Textarea
                    value={dec.reasoning}
                    onChange={(e) => updateDecision(i, "reasoning", e.target.value)}
                    placeholder="Why? What alternatives were considered?"
                    rows={2}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDecision(i)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addDecision}
            className="gap-2 w-full"
          >
            <Plus className="w-4 h-4" />
            Add Decision
          </Button>
        </CollapsibleSection>

        {/* ── Open Questions ── */}
        <CollapsibleSection
          title="Open Questions"
          defaultOpen={openQuestions.length > 0}
          badge={openQuestions.length}
        >
          {openQuestions.map((q, i) => (
            <div key={i} className="bg-card border border-border rounded-md p-4 space-y-2">
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <Input
                    value={q.question}
                    onChange={(e) => updateQuestion(i, "question", e.target.value)}
                    placeholder="What remains unresolved?"
                  />
                  <Input
                    value={q.context}
                    onChange={(e) => updateQuestion(i, "context", e.target.value)}
                    placeholder="Context / why it matters"
                  />
                  <Input
                    value={q.tentative_lean ?? ""}
                    onChange={(e) => updateQuestion(i, "tentative_lean", e.target.value)}
                    placeholder="Tentative lean (optional)"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeQuestion(i)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addQuestion}
            className="gap-2 w-full"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </Button>
        </CollapsibleSection>

        {/* ── Context ── */}
        <CollapsibleSection
          title="Context to Preserve"
          defaultOpen={context.length > 0}
          badge={context.length}
        >
          {context.map((ctx, i) => (
            <div key={i} className="bg-card border border-border rounded-md p-4 space-y-2">
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <Input
                    value={ctx.label}
                    onChange={(e) => updateContext(i, "label", e.target.value)}
                    placeholder="Label (e.g. 'API endpoint', 'User preference')"
                    className="font-mono text-sm"
                  />
                  <Textarea
                    value={ctx.value}
                    onChange={(e) => updateContext(i, "value", e.target.value)}
                    placeholder="Value"
                    rows={2}
                  />
                  <Input
                    value={ctx.why_it_matters}
                    onChange={(e) => updateContext(i, "why_it_matters", e.target.value)}
                    placeholder="Why it matters"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeContext(i)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addContext}
            className="gap-2 w-full"
          >
            <Plus className="w-4 h-4" />
            Add Context Item
          </Button>
        </CollapsibleSection>

        {/* ── Do Not Forget ── */}
        <CollapsibleSection
          title="Do Not Forget"
          defaultOpen={doNotForget.some((s) => s.trim())}
          badge={doNotForget.filter((s) => s.trim()).length}
        >
          {doNotForget.map((item, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={item}
                onChange={(e) => updateDoNotForget(i, e.target.value)}
                placeholder="Critical thing to remember"
              />
              {doNotForget.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDoNotForget(i)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addDoNotForget}
            className="gap-2 w-full"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        </CollapsibleSection>

        {/* ── Emotional State ── */}
        <CollapsibleSection
          title="Note to Next Self"
          defaultOpen={!!emotionalState.note_to_next_self || !!emotionalState.energy}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Energy</label>
                <select
                  value={emotionalState.energy ?? ""}
                  onChange={(e) =>
                    setEmotionalState((s) => ({
                      ...s,
                      energy: (e.target.value as EmotionalState["energy"]) || undefined,
                    }))
                  }
                  className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground"
                >
                  <option value="">— select —</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="drained">Drained</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Confidence</label>
                <select
                  value={emotionalState.confidence ?? ""}
                  onChange={(e) =>
                    setEmotionalState((s) => ({
                      ...s,
                      confidence: (e.target.value as EmotionalState["confidence"]) || undefined,
                    }))
                  }
                  className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground"
                >
                  <option value="">— select —</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="uncertain">Uncertain</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Note to Next Self</label>
              <Textarea
                value={emotionalState.note_to_next_self ?? ""}
                onChange={(e) =>
                  setEmotionalState((s) => ({ ...s, note_to_next_self: e.target.value }))
                }
                placeholder="What do you want your future self to know? Mood, mindset, encouragement…"
                rows={3}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* ── Next Session Prompt ── */}
        <div>
          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 block">
            Next Session Prompt{" "}
            <span className="normal-case font-normal text-xs ml-1">(optional)</span>
          </label>
          <Textarea
            value={nextPrompt}
            onChange={(e) => setNextPrompt(e.target.value)}
            placeholder="Leave blank to auto-generate. Or write a custom prompt for Claude to continue this thread."
            rows={4}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">
            If blank, the API generates a structured prompt from your data automatically.
          </p>
        </div>

        {/* ── Footer ── */}
        <div className="flex justify-between items-center pt-4 border-t border-border">
          {hasData ? (
            <p className="text-xs text-muted-foreground">Review all sections before saving.</p>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => navigate("/")}>
              Cancel
            </Button>
            <Button type="submit" disabled={createHandoff.isPending} className="px-8">
              {createHandoff.isPending ? "Saving…" : "Save Handoff"}
            </Button>
          </div>
        </div>
      </form>
    </Layout>
  );
}
