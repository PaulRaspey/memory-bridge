import { Link, useLocation } from "wouter";
import { BrainCircuit, Plus, Settings } from "lucide-react";
import { Button } from "./ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border bg-card/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <BrainCircuit className="w-5 h-5 text-primary" />
            <span className="font-semibold tracking-tight">Memory Bridge</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className={location === '/settings' ? 'bg-secondary' : ''}>
              <Link href="/settings">
                <Settings className="w-4 h-4" />
              </Link>
            </Button>
            <Button size="sm" asChild className="gap-2">
              <Link href="/new">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Session</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative">
        {children}
      </main>
    </div>
  );
}
