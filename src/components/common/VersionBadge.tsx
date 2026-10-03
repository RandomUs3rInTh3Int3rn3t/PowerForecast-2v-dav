import React, { useEffect, useState } from "react";
import {
  Sparkles,
  Database,
  CheckCircle2,
  AlertCircle,
  History,
  ShieldCheck,
  Radio,
} from "lucide-react";
import { APP_VERSION, checkSupabaseConnection } from "../../lib/supabaseClient";
import { SystemChangelogModal } from "../changelog/SystemChangelogModal";
import { openWhatsNewModal } from "../../lib/changelogService";
import { Button } from "../ui/button";

export const VersionBadge: React.FC = () => {
  const [dbStatus, setDbStatus] = useState<{
    checked: boolean;
    connected: boolean;
    message: string;
  }>({
    checked: false,
    connected: false,
    message: "Initializing...",
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    checkSupabaseConnection().then((res) => {
      if (isMounted) {
        setDbStatus({
          checked: true,
          connected: res.ok,
          message: res.message,
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <aside
      aria-label="PowerForecast system status badge"
      className="fixed bottom-4 right-3 lg:right-4 z-40 flex flex-col items-end gap-2 select-none print:hidden pointer-events-auto"
    >
      {/* Expanded status card */}
      {isOpen && (
        <div className="w-[300px] rounded-xl border border-border bg-card/98 p-4 text-foreground shadow-2xl backdrop-blur-xl animate-in fade-in-50 zoom-in-95">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-foreground" />
              <span className="text-sm font-bold tracking-tight">PowerForecast</span>
            </div>
            <span className="rounded-md border border-border/80 bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground">
              {APP_VERSION}
            </span>
          </div>

          <div className="my-3 h-[1px] bg-border/60" />

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">UI Design System:</span>
              <span className="font-medium text-foreground">Stack Template / shadcn</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Database:</span>
              <div className="flex items-center gap-1 font-medium text-foreground">
                <Database className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Supabase Cloud</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Live Connection:</span>
              <div className="flex items-center gap-1 font-medium">
                {dbStatus.connected ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-emerald-500 font-semibold">Connected</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-amber-500 font-semibold">Hybrid / Local</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="my-3 h-[1px] bg-border/60" />

          {/* Action buttons */}
          <div className="space-y-2">
            <Button
              size="sm"
              className="w-full font-semibold shadow-xs justify-center"
              onClick={() => {
                setIsOpen(false);
                openWhatsNewModal(APP_VERSION);
              }}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              <span>What's New in {APP_VERSION}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="w-full font-semibold justify-center"
              onClick={() => {
                setIsOpen(false);
                setIsChangelogModalOpen(true);
              }}
            >
              <History className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              <span>View Full Changelogs</span>
            </Button>
          </div>

          <div className="my-3 h-[1px] bg-border/60" />

          <div className="flex items-center justify-between pt-0.5 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Auto-sync active</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="hover:text-foreground transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Persistent Bottom-Right Tag */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-lg border border-border/80 bg-card/90 px-2.5 py-1.5 text-foreground shadow-lg backdrop-blur-md transition-all hover:border-foreground/40 hover:shadow-xl cursor-pointer"
        title="Click to view version & database connection telemetry"
      >
        <span className="relative flex h-2 w-2">
          {dbStatus.connected && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              dbStatus.connected ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
        </span>

        <span className="font-mono text-xs font-bold tracking-tight">
          {APP_VERSION}
        </span>

        <span className="rounded border border-border bg-muted/80 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-muted-foreground">
          UI
        </span>
      </button>

      {/* GitHub Version Changelogs Modal */}
      <SystemChangelogModal
        isOpen={isChangelogModalOpen}
        onClose={() => setIsChangelogModalOpen(false)}
      />
    </aside>
  );
};

export default VersionBadge;
