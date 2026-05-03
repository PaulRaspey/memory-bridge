import { Layout } from "@/components/layout";
import { useThreads, useHandoffs } from "@/hooks/queries";
import type { ThreadInfo } from "@/api/client";
import { Link, useLocation } from "wouter";
import { RelativeTime } from "@/components/relative-time";
import { Skeleton } from "@/components/ui/skeleton";
import { HandoffDetailView } from "./handoff-detail";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const { data: threads, isLoading: threadsLoading } = useThreads();
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  
  useEffect(() => {
    if (threads && threads.length > 0 && !selectedThread) {
      setSelectedThread(threads[0].thread_name);
    }
  }, [threads, selectedThread]);

  const { data: handoffs, isLoading: handoffsLoading } = useHandoffs({ thread_name: selectedThread || undefined });
  const [selectedHandoffId, setSelectedHandoffId] = useState<string | null>(null);

  useEffect(() => {
    if (handoffs && handoffs.length > 0 && !selectedHandoffId) {
      setSelectedHandoffId(handoffs[0].id);
    } else if (handoffs && handoffs.length === 0) {
      setSelectedHandoffId(null);
    }
  }, [handoffs, selectedHandoffId]);

  return (
    <Layout>
      <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Threads Rail */}
        <div className="w-full md:w-64 border-r border-border bg-card/30 flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-border sticky top-0 bg-card/30 backdrop-blur-sm">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Threads</h2>
          </div>
          <div className="p-2 space-y-1">
            {threadsLoading ? (
              Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : threads?.length === 0 ? (
              <p className="text-sm text-muted-foreground p-2">No threads yet.</p>
            ) : (
              threads?.map((thread: ThreadInfo) => (
                <button
                  key={thread.thread_name}
                  onClick={() => {
                    setSelectedThread(thread.thread_name);
                    setSelectedHandoffId(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedThread === thread.thread_name
                      ? "bg-primary/10 text-primary font-medium" 
                      : "hover:bg-secondary text-foreground"
                  }`}
                >
                  {thread.thread_name}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Handoffs List */}
        <div className="w-full md:w-80 border-r border-border bg-card/20 flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-border sticky top-0 bg-card/20 backdrop-blur-sm">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Sessions</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {handoffsLoading ? (
              Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
            ) : handoffs?.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-4">No sessions in this thread.</p>
                <Link href="/new" className="text-sm text-primary hover:underline">Write your first one →</Link>
              </div>
            ) : (
              handoffs?.map((handoff) => (
                <button
                  key={handoff.id}
                  onClick={() => setSelectedHandoffId(handoff.id)}
                  className={`w-full text-left p-3 rounded-md transition-colors border ${
                    selectedHandoffId === handoff.id
                      ? "bg-secondary border-border"
                      : "border-transparent hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-xs text-muted-foreground">{handoff.id.substring(0, 8)}</span>
                    <RelativeTime date={handoff.created_at} />
                  </div>
                  <p className="text-sm line-clamp-2 text-foreground/80">{handoff.session_summary}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail View */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-background">
          {selectedHandoffId ? (
            <HandoffDetailView id={selectedHandoffId} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a session to view details
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
