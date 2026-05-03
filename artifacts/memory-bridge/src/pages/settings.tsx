import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getToken, setToken, clearToken } from "@/api/client";
import { useConfig, useThreads } from "@/hooks/queries";
import { Copy, Check, Eye, EyeOff } from "lucide-react";
import { RelativeTime } from "@/components/relative-time";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="icon" onClick={copy} className="h-8 w-8">
      {copied ? (
        <Check className="w-4 h-4 text-primary" />
      ) : (
        <Copy className="w-4 h-4 text-muted-foreground" />
      )}
    </Button>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const [token, setTokenState] = useState(getToken());
  const [showToken, setShowToken] = useState(false);
  const [dirty, setDirty] = useState(false);

  const { data: config } = useConfig();
  const { data: threads } = useThreads();

  useEffect(() => {
    setTokenState(getToken());
  }, []);

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTokenState(e.target.value);
    setDirty(true);
  };

  const saveToken = () => {
    if (!token.trim()) {
      toast({ title: "Token cannot be empty", variant: "destructive" });
      return;
    }
    setToken(token.trim());
    setDirty(false);
    toast({ title: "Token saved", description: "You may need to refresh if requests were failing." });
  };

  const resetToken = () => {
    clearToken();
    setTokenState(getToken());
    setDirty(false);
    toast({ title: "Token reset to default" });
  };

  const publicBase = config?.base_url ?? window.location.origin;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto w-full px-4 py-8 space-y-10">
        <h1 className="text-xl font-semibold">Settings</h1>

        {/* Auth Token */}
        <section className="space-y-4">
          <h2 className="text-base font-medium border-b border-border pb-2">Authentication</h2>
          <p className="text-sm text-muted-foreground">
            The bearer token used to authenticate API requests. Must match{" "}
            <code className="font-mono text-xs bg-secondary px-1 py-0.5 rounded">BRIDGE_TOKEN</code>{" "}
            on the server.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={handleTokenChange}
                className="font-mono pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button onClick={saveToken} disabled={!dirty}>
              Save
            </Button>
            <Button variant="outline" onClick={resetToken}>
              Reset
            </Button>
          </div>
        </section>

        {/* Public URLs */}
        <section className="space-y-4">
          <h2 className="text-base font-medium border-b border-border pb-2">Public Share URLs</h2>
          <p className="text-sm text-muted-foreground">
            Handoffs can be accessed publicly (read-only) via these URLs — no auth required. Share
            with Claude at the start of a new session.
          </p>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Latest in a thread
            </p>
            <div className="flex items-center gap-2 bg-card border border-border rounded-md px-3 py-2">
              <code className="text-xs font-mono text-foreground/80 flex-1 truncate">
                {publicBase}/p/&lt;thread_name&gt;/latest
              </code>
              <CopyButton text={`${publicBase}/p/<thread_name>/latest`} />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Specific handoff by ID
            </p>
            <div className="flex items-center gap-2 bg-card border border-border rounded-md px-3 py-2">
              <code className="text-xs font-mono text-foreground/80 flex-1 truncate">
                {publicBase}/p/&lt;handoff_id&gt;
              </code>
              <CopyButton text={`${publicBase}/p/<handoff_id>`} />
            </div>
          </div>
        </section>

        {/* Threads summary */}
        {threads && threads.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-base font-medium border-b border-border pb-2">Threads</h2>
            <div className="divide-y divide-border">
              {threads.map((t) => (
                <div key={t.thread_name} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-mono text-sm font-medium text-primary">{t.thread_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.handoff_count} session{t.handoff_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <RelativeTime date={t.last_updated} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* API docs link */}
        <section className="space-y-3">
          <h2 className="text-base font-medium border-b border-border pb-2">API</h2>
          <p className="text-sm text-muted-foreground">
            The FastAPI backend exposes interactive docs:
          </p>
          <div className="flex gap-3">
            <a
              href="/v1/docs"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary hover:underline font-mono"
            >
              /v1/docs
            </a>
            <a
              href="/v1/redoc"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary hover:underline font-mono"
            >
              /v1/redoc
            </a>
          </div>
        </section>
      </div>
    </Layout>
  );
}
