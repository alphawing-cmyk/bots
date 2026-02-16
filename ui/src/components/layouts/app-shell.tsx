import { type PropsWithChildren } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold tracking-tight">alpaca-bot</div>
          <nav className="flex gap-4 text-sm">
            <Link to="/dashboard" className={cn("text-muted-foreground hover:text-foreground")}>Dashboard</Link>
            <Link to="/strategies" className={cn("text-muted-foreground hover:text-foreground")}>Strategies</Link>
            <Link to="/runs" className={cn("text-muted-foreground hover:text-foreground")}>Runs</Link>
            <Link to="/symbols" className={cn("text-muted-foreground hover:text-foreground")}>Symbols</Link>
          </nav>
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
