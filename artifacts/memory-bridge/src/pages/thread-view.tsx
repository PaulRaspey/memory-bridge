import { useParams, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useHandoffs, useDeleteHandoff } from "@/hooks/queries";
import { HandoffDetailView } from "./handoff-detail";
import { RelativeTime } from "@/components/relative-time";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ThreadView() {
  const params = useParams<{ name: string }>();
  const threadName = decodeURIComponent(params.name ?? "");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: handoffs, isLoading } = useHandoffs({ thread_name: threadName });
  const deleteHandoff = useDeleteHandoff();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteHandoff.mutateAsync(deleteId);
      if (selectedId === deleteId) setSelectedId(null);
      setDeleteId(null);
      toast({ title: "Session deleted" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Sidebar */}
        <div className="w-full md:w-80 border-r border-border bg-card/20 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border bg-card/30 sticky top-0">
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="h-8 w-8"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h2 className="font-semibold font-mono text-primary truncate">{threadName}</h2>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {handoffs?.length ?? 0} sessions
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/new")}
                className="gap-1 h-7 text-xs"
              >
                <Plus className="w-3 h-3" />
                New
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoading ? (
              Array(5)
                .fill(0)
                .map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : handoffs?.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">No sessions yet.</p>
            ) : (
              handoffs?.map((h) => (
                <div
                  key={h.id}
                  className={`group relative rounded-md transition-colors border cursor-pointer ${
                    selectedId === h.id
                      ? "bg-secondary border-border"
                      : "border-transparent hover:bg-secondary/50"
                  }`}
                  onClick={() => setSelectedId(h.id)}
                >
                  <div className="p-3 pr-10">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono text-xs text-muted-foreground">
                        {h.id.substring(0, 8)}
                      </span>
                      <RelativeTime date={h.created_at} />
                    </div>
                    <p className="text-sm line-clamp-2 text-foreground/80">{h.session_summary}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(h.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detail */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-background">
          {selectedId ? (
            <HandoffDetailView id={selectedId} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <p>Select a session to view details</p>
              <Button variant="outline" onClick={() => navigate("/new")} className="gap-2">
                <Plus className="w-4 h-4" />
                Write first session
              </Button>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this session?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The handoff record will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
