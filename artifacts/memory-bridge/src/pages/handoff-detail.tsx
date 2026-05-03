import { useHandoff } from "@/hooks/queries";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Link2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/api/client";
import { RelativeTime } from "@/components/relative-time";
import { Link } from "wouter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

export function HandoffDetailView({ id }: { id: string }) {
  const { data: handoff, isLoading } = useHandoff(id);
  const { toast } = useToast();

  if (isLoading) {
    return <div className="p-8 space-y-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-32 w-full" />
    </div>;
  }

  if (!handoff) return <div className="p-8 text-muted-foreground">Handoff not found.</div>;

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(handoff.next_session_prompt);
    toast({ title: "Copied prompt to clipboard" });
  };

  const copyFullPrompt = async () => {
    try {
      const text = await api.getHandoffAsPrompt(id);
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied full handoff to clipboard" });
    } catch (e) {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const copyUrl = async () => {
    await navigator.clipboard.writeText(handoff.next_session_prompt_url);
    toast({ title: "Copied URL to clipboard" });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border p-4 bg-card/30 flex flex-wrap gap-2 items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-primary">{handoff.id}</span>
            <span className="text-muted-foreground text-sm">•</span>
            <Link href={`/threads/${encodeURIComponent(handoff.thread_name)}`} className="text-sm font-medium hover:text-primary transition-colors">
              {handoff.thread_name}
            </Link>
          </div>
          <RelativeTime date={handoff.created_at} />
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyPrompt} className="gap-2">
            <Copy className="w-4 h-4" />
            <span className="hidden sm:inline">Copy Prompt</span>
          </Button>
          <Button variant="outline" size="sm" onClick={copyFullPrompt} className="gap-2">
            <Link2 className="w-4 h-4" />
            <span className="hidden sm:inline">Copy Full</span>
          </Button>
          <Button variant="outline" size="sm" onClick={copyUrl} className="gap-2">
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto w-full space-y-8 pb-20">
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Session Summary</h3>
          <div className="text-foreground/90 whitespace-pre-wrap text-base leading-relaxed bg-secondary/30 p-4 rounded-lg border border-border/50">
            {handoff.session_summary || "No summary provided."}
          </div>
        </section>

        {handoff.active_work && handoff.active_work.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Work</h3>
            <div className="grid gap-3">
              {handoff.active_work.map((work, i) => (
                <div key={i} className="bg-card border border-border p-4 rounded-lg space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-foreground">{work.title}</h4>
                    {work.current_state && <Badge variant="outline" className="font-mono">{work.current_state}</Badge>}
                  </div>
                  {work.next_action && (
                    <p className="text-sm text-foreground/80"><span className="text-primary font-medium">Next:</span> {work.next_action}</p>
                  )}
                  {work.blockers && (
                    <p className="text-sm text-destructive"><span className="font-medium">Blockers:</span> {work.blockers}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <Accordion type="multiple" className="w-full">
          {handoff.decisions && handoff.decisions.length > 0 && (
            <AccordionItem value="decisions" className="border-border">
              <AccordionTrigger className="text-sm font-medium text-muted-foreground uppercase tracking-wider hover:no-underline hover:text-foreground">
                Decisions Made ({handoff.decisions.length})
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                {handoff.decisions.map((dec, i) => (
                  <div key={i} className="pl-4 border-l-2 border-primary/30 space-y-1">
                    <p className="font-medium text-foreground">{dec.decision}</p>
                    {dec.reasoning && <p className="text-sm text-muted-foreground">{dec.reasoning}</p>}
                    {dec.alternatives_considered && <p className="text-sm text-muted-foreground italic">Considered: {dec.alternatives_considered}</p>}
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          )}

          {handoff.open_questions && handoff.open_questions.length > 0 && (
            <AccordionItem value="questions" className="border-border">
              <AccordionTrigger className="text-sm font-medium text-muted-foreground uppercase tracking-wider hover:no-underline hover:text-foreground">
                Open Questions ({handoff.open_questions.length})
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                {handoff.open_questions.map((q, i) => (
                  <div key={i} className="pl-4 border-l-2 border-secondary space-y-1">
                    <p className="font-medium text-foreground">{q.question}</p>
                    {q.context && <p className="text-sm text-muted-foreground">{q.context}</p>}
                    {q.tentative_lean && <p className="text-sm text-primary/80">Lean: {q.tentative_lean}</p>}
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          )}

          {handoff.context && handoff.context.length > 0 && (
            <AccordionItem value="context" className="border-border">
              <AccordionTrigger className="text-sm font-medium text-muted-foreground uppercase tracking-wider hover:no-underline hover:text-foreground">
                Context to Preserve ({handoff.context.length})
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                {handoff.context.map((ctx, i) => (
                  <div key={i} className="bg-secondary/20 border border-border rounded-md p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="font-mono text-xs">{ctx.label}</Badge>
                    </div>
                    <p className="text-sm text-foreground/90">{ctx.value}</p>
                    {ctx.why_it_matters && <p className="text-xs text-muted-foreground mt-2">{ctx.why_it_matters}</p>}
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>

        {handoff.do_not_forget && handoff.do_not_forget.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Do Not Forget</h3>
            <ul className="list-disc list-inside space-y-1 text-foreground/90 pl-4">
              {handoff.do_not_forget.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {handoff.emotional_state && Object.keys(handoff.emotional_state).length > 0 && (
          <section className="space-y-3 bg-secondary/10 border border-border p-4 rounded-lg">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Note to Self</h3>
            {handoff.emotional_state.note_to_next_self && (
              <p className="text-foreground/90 italic">"{handoff.emotional_state.note_to_next_self}"</p>
            )}
            <div className="flex gap-2 mt-3 pt-3 border-t border-border/50 flex-wrap">
              {handoff.emotional_state.energy && <Badge variant="outline">Energy: {handoff.emotional_state.energy}</Badge>}
              {handoff.emotional_state.confidence && <Badge variant="outline">Confidence: {handoff.emotional_state.confidence}</Badge>}
              {handoff.emotional_state.wins && handoff.emotional_state.wins.map((w: string, i: number) => <Badge key={`w-${i}`} className="bg-success text-success-foreground">Win: {w}</Badge>)}
              {handoff.emotional_state.frustrations && handoff.emotional_state.frustrations.map((f: string, i: number) => <Badge key={`f-${i}`} variant="destructive">Frustration: {f}</Badge>)}
            </div>
          </section>
        )}

        <section className="space-y-3 pt-4 border-t border-border">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Next Session Prompt</h3>
          <div className="font-mono text-sm text-foreground/80 bg-card border border-border p-4 rounded-lg whitespace-pre-wrap select-all">
            {handoff.next_session_prompt}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function HandoffDetail() {
  // Use when rendered as an independent page
  // The layout will be defined outside or we wrap it here.
  return null;
}
