import { useState, useEffect, useCallback } from "react";
import { supabaseClient, APP_VERSION } from "./supabaseClient";
import { devLog } from "./devLogger";
import { COMPLETE_GITHUB_DEPLOYMENTS } from "./changelogManifest";

export interface SystemChangelogEntry {
  id?: string;
  version: string;
  description: string;
  git_commit_tag?: string;
  deployed_by?: string;
  created_at?: string;
  source?: "github" | "database" | "local";
}

export interface ParsedRelease {
  version: string;
  title: string;
  highlights: string[];
  raw: string;
  deployedBy?: string;
  createdAt?: string;
}

export const LAST_SEEN_VERSION_KEY = "powerforecast_last_seen_version";
export const GITHUB_REPO_URL = "https://github.com/hAizen-Nibba/PowerForecast-2v";

// In-memory cache for fast lookups & avoiding repeated queries
const changelogCache = new Map<string, SystemChangelogEntry>();

// Populate cache with precompiled deployments
COMPLETE_GITHUB_DEPLOYMENTS.forEach((item) => {
  if (item.version) {
    changelogCache.set(item.version, item);
  }
});

/**
 * Parses version strings like '3.4.8v' into numerical semver components
 */
export function parseVersion(v: string): [number, number, number, string] {
  const clean = v.replace(/^v/i, "").replace(/v$/i, "");
  const match = clean.match(/^(\d+)\.(\d+)\.(\d+)(.*)$/);
  if (!match) return [0, 0, 0, clean];
  return [Number(match[1]), Number(match[2]), Number(match[3]), match[4] || ""];
}

/**
 * SemVer descending comparison for sorting releases
 */
export function compareVersions(vA: string, vB: string): number {
  const [majA, minA, patchA, sufA] = parseVersion(vA);
  const [majB, minB, patchB, sufB] = parseVersion(vB);
  if (majA !== majB) return majB - majA;
  if (minA !== minB) return minB - minA;
  if (patchA !== patchB) return patchB - patchA;
  return sufB.localeCompare(sufA);
}

/**
 * Intelligently decomposes release commit messages into structured highlights
 * e.g., '3.4.8v - Implement persistent session remember-me, intelligent root routing, and closed-app W3C Web Push'
 */
export function parseReleaseHighlights(
  description: string,
  targetVersion?: string
): ParsedRelease {
  const effectiveVersion = targetVersion || APP_VERSION;

  if (!description) {
    return {
      version: effectiveVersion,
      title: `What's New in ${effectiveVersion}`,
      highlights: [
        "System stability, performance optimizations, and security patches",
        "Seamless synchronization across device platforms and local storage",
      ],
      raw: "",
    };
  }

  // 1. Strip version prefix, e.g. "3.4.8v - ", "[3.4.8v] ", "3.4.8v: "
  let cleaned = description.trim();
  const versionPrefixMatch = cleaned.match(
    /^(\[?[0-9]+\.[0-9]+\.[0-9a-zA-Z\-_]+v?\]?)\s*[-:]?\s*(.*)$/is
  );
  if (versionPrefixMatch) {
    cleaned = versionPrefixMatch[2].trim();
  }

  // 2. Check for explicit bullet lines, newlines, or semicolons
  let rawItems = cleaned
    .split(/[\r\n;•*]+/)
    .map((s) => s.trim().replace(/^[-–—]\s*/, ""))
    .filter((s) => s.length > 5);

  // 3. If it's a single compound paragraph, break down clauses joined by comma + and, commas, or periods
  if (rawItems.length <= 1 && cleaned.length > 35) {
    const clauseSplit = cleaned
      .split(/,\s+(?:and\s+)?|;\s*|\.\s+(?=[A-Z])/)
      .map((s) => s.trim().replace(/^[-–—]\s*/, "").replace(/\.$/, ""))
      .filter((s) => s.length > 10);

    if (clauseSplit.length > 1) {
      rawItems = clauseSplit;
    }
  }

  // 4. Clean emojis, leading punctuation, and capitalize
  const highlights = (rawItems.length > 0 ? rawItems : [cleaned]).map((item) => {
    const stripped = item.replace(/^[✨⚡🛠️📋🔋🛡️🚀🔔🔧\s-]+/, "").trim();
    if (!stripped) return item;
    return stripped.charAt(0).toUpperCase() + stripped.slice(1);
  });

  const title = `What's New in ${effectiveVersion}`;

  return {
    version: effectiveVersion,
    title,
    highlights,
    raw: cleaned,
  };
}

/**
 * Retrieves the last seen version recorded in browser localStorage
 */
export function getLastSeenVersion(): string | null {
  try {
    return localStorage.getItem(LAST_SEEN_VERSION_KEY);
  } catch {
    return null;
  }
}

/**
 * Sets the last seen version in localStorage and notifies all open tabs
 */
export function setLastSeenVersion(version: string): void {
  try {
    localStorage.setItem(LAST_SEEN_VERSION_KEY, version);
    window.dispatchEvent(
      new CustomEvent("powerforecast:version-seen", { detail: { version } })
    );
  } catch (err) {
    devLog.warn("ChangelogService", "Failed to write last seen version to storage", err);
  }
}

/**
 * Checks if the current runtime version has not been viewed yet by this client
 */
export function shouldShowWhatsNew(currentVersion: string = APP_VERSION): boolean {
  const lastSeen = getLastSeenVersion();
  return !lastSeen || lastSeen !== currentVersion;
}

/**
 * Programmatically triggers the What's New modal from any component
 */
export function openWhatsNewModal(version?: string): void {
  window.dispatchEvent(
    new CustomEvent("powerforecast:open-whats-new", {
      detail: { version: version || APP_VERSION },
    })
  );
}

/**
 * Multi-Tier fetcher for changelog entries:
 * Tier 1: Memory Cache
 * Tier 2: Supabase database audit table (system_changelogs)
 * Tier 3: Live GitHub commit API
 * Tier 4: Bundled master manifest
 */
export async function fetchChangelogForVersion(
  targetVersion: string
): Promise<SystemChangelogEntry> {
  // Check memory cache first
  if (changelogCache.has(targetVersion)) {
    return changelogCache.get(targetVersion)!;
  }

  // 1. Supabase database check
  try {
    const { data, error } = await supabaseClient
      .from("system_changelogs")
      .select("*")
      .eq("version", targetVersion)
      .maybeSingle();

    if (!error && data && data.description) {
      const entry: SystemChangelogEntry = {
        id: data.id || data.version,
        version: data.version,
        description: data.description,
        git_commit_tag: data.git_commit_tag || targetVersion,
        deployed_by: data.deployed_by || "PowerForecast Core Team",
        created_at: data.created_at || new Date().toISOString(),
        source: "database",
      };
      changelogCache.set(targetVersion, entry);
      return entry;
    }
  } catch (err) {
    devLog.warn("ChangelogService", "Supabase changelog fetch warning:", err);
  }

  // 2. GitHub Commits API check
  try {
    const ghRes = await fetch(
      "https://api.github.com/repos/hAizen-Nibba/PowerForecast-2v/commits?per_page=30",
      {
        headers: { Accept: "application/vnd.github.v3+json" },
      }
    );
    if (ghRes.ok) {
      const ghData = await ghRes.json();
      if (Array.isArray(ghData)) {
        for (const c of ghData) {
          const msg: string = c.commit?.message || "";
          if (msg.includes(targetVersion)) {
            const entry: SystemChangelogEntry = {
              id: c.sha,
              version: targetVersion,
              description: msg,
              git_commit_tag: targetVersion,
              deployed_by:
                c.commit?.author?.name || c.author?.login || "GitHub Committer",
              created_at: c.commit?.author?.date || c.commit?.committer?.date,
              source: "github",
            };
            changelogCache.set(targetVersion, entry);
            return entry;
          }
        }
      }
    }
  } catch (err) {
    devLog.warn("ChangelogService", "GitHub commits fetch warning:", err);
  }

  // 3. Fallback to Local Manifest
  const manifestMatch = COMPLETE_GITHUB_DEPLOYMENTS.find(
    (d) => d.version === targetVersion
  );
  if (manifestMatch) {
    changelogCache.set(targetVersion, manifestMatch);
    return manifestMatch;
  }

  // 4. Default synthetic entry
  const fallbackEntry: SystemChangelogEntry = {
    id: targetVersion,
    version: targetVersion,
    description: `${targetVersion} - Latest PowerForecast production release with optimized performance and user experience enhancements.`,
    git_commit_tag: targetVersion,
    deployed_by: "PowerForecast Core Team",
    created_at: new Date().toISOString(),
    source: "local",
  };
  changelogCache.set(targetVersion, fallbackEntry);
  return fallbackEntry;
}

/**
 * Subscribes to Supabase Realtime deployment broadcasts
 */
export function subscribeToChangelogUpdates(
  onNewChangelog: (entry: SystemChangelogEntry) => void
): () => void {
  try {
    const channel = supabaseClient
      .channel("public:system_changelogs:feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "system_changelogs",
        },
        (payload) => {
          if (payload.new && payload.new.version) {
            devLog.info("ChangelogService", "Realtime deployment detected:", payload.new);
            const entry: SystemChangelogEntry = {
              id: payload.new.id || payload.new.version,
              version: payload.new.version,
              description: payload.new.description,
              git_commit_tag: payload.new.git_commit_tag,
              deployed_by: payload.new.deployed_by,
              created_at: payload.new.created_at,
              source: "database",
            };
            changelogCache.set(entry.version, entry);
            onNewChangelog(entry);
          }
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  } catch (err) {
    devLog.warn("ChangelogService", "Realtime channel subscription error:", err);
    return () => {};
  }
}

/**
 * React hook to control the What's New modal with automatic detection and multi-tab sync
 */
export function useWhatsNew() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeVersion, setActiveVersion] = useState<string>(APP_VERSION);
  const [changelogEntry, setChangelogEntry] = useState<SystemChangelogEntry | null>(null);
  const [parsedRelease, setParsedRelease] = useState<ParsedRelease | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadVersionChangelog = useCallback(async (ver: string) => {
    setIsLoading(true);
    try {
      const entry = await fetchChangelogForVersion(ver);
      setChangelogEntry(entry);
      setParsedRelease(parseReleaseHighlights(entry.description, ver));
    } catch (err) {
      devLog.warn("useWhatsNew", "Error fetching changelog:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check on mount if an unseen update is present
  useEffect(() => {
    const unseen = shouldShowWhatsNew(APP_VERSION);
    if (unseen) {
      setActiveVersion(APP_VERSION);
      loadVersionChangelog(APP_VERSION);
      // Slight delay so initial page layout mounts smoothly without jarring pop
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [loadVersionChangelog]);

  // Listen for manual trigger events or cross-tab dismiss events
  useEffect(() => {
    const handleOpenEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ version?: string }>;
      const ver = customEvent.detail?.version || APP_VERSION;
      setActiveVersion(ver);
      loadVersionChangelog(ver);
      setIsOpen(true);
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === LAST_SEEN_VERSION_KEY && e.newValue === activeVersion) {
        setIsOpen(false);
      }
    };

    const handleSeenEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ version: string }>;
      if (customEvent.detail?.version === activeVersion) {
        setIsOpen(false);
      }
    };

    window.addEventListener("powerforecast:open-whats-new", handleOpenEvent);
    window.addEventListener("powerforecast:version-seen", handleSeenEvent);
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.removeEventListener("powerforecast:open-whats-new", handleOpenEvent);
      window.removeEventListener("powerforecast:version-seen", handleSeenEvent);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [activeVersion, loadVersionChangelog]);

  const dismiss = useCallback(() => {
    setLastSeenVersion(activeVersion);
    setIsOpen(false);
  }, [activeVersion]);

  const openForVersion = useCallback(
    (ver: string = APP_VERSION) => {
      setActiveVersion(ver);
      loadVersionChangelog(ver);
      setIsOpen(true);
    },
    [loadVersionChangelog]
  );

  return {
    isOpen,
    activeVersion,
    changelogEntry,
    parsedRelease,
    isLoading,
    dismiss,
    openForVersion,
  };
}
