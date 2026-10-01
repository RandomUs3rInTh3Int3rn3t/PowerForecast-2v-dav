import React, { useState, useEffect, useMemo } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import {
  Close as CloseIcon,
  Search as SearchIcon,
  GitHub as GitHubIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  HistoryEdu as ChangelogIcon,
  Refresh as RefreshIcon,
  OpenInNew as OpenInNewIcon,
  Verified as VerifiedIcon,
  Terminal as TerminalIcon,
  FiberManualRecord as DotIcon,
  RocketLaunch as DeploymentIcon,
} from "@mui/icons-material";
import { supabaseClient, APP_VERSION } from "../../lib/supabaseClient";

import type { SystemChangelogEntry } from "../../lib/changelogService";
export type { SystemChangelogEntry };
import { compareVersions } from "../../lib/changelogService";
import { COMPLETE_GITHUB_DEPLOYMENTS } from "../../lib/changelogManifest";

const GITHUB_REPO_URL = "https://github.com/hAizen-Nibba/PowerForecast-2v";

interface SystemChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemChangelogModal: React.FC<SystemChangelogModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [changelogs, setChangelogs] = useState<SystemChangelogEntry[]>(COMPLETE_GITHUB_DEPLOYMENTS);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagFilter, setSelectedTagFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchChangelogs = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch from Supabase system_changelogs
      const { data: dbLogs } = await supabaseClient
        .from("system_changelogs")
        .select("*")
        .order("created_at", { ascending: false });

      // 2. Fetch live commits from GitHub API
      let gitLogs: SystemChangelogEntry[] = [];
      try {
        const ghRes = await fetch("https://api.github.com/repos/hAizen-Nibba/PowerForecast-2v/commits?per_page=60", {
          headers: { Accept: "application/vnd.github.v3+json" },
        });
        if (ghRes.ok) {
          const ghData = await ghRes.json();
          if (Array.isArray(ghData)) {
            gitLogs = ghData
              .filter((c: any) => c.commit && c.commit.message)
              .map((c: any) => {
                const fullMsg = c.commit.message || "";
                const firstLine = fullMsg.split("\n")[0];
                const match = firstLine.match(/^([0-9]+\.[0-9]+\.[0-9a-zA-Z\-_]+v?)\s*[-:]?\s*(.*)$/);
                const version = match ? match[1] : firstLine.slice(0, 15);
                return {
                  id: c.sha,
                  version: version.startsWith("2.") || version.startsWith("3.") ? version : `commit-${c.sha.slice(0, 7)}`,
                  description: fullMsg,
                  git_commit_tag: match ? match[1] : c.sha.slice(0, 7),
                  deployed_by: c.commit.author?.name || c.author?.login || "GitHub Committer",
                  created_at: c.commit.author?.date || c.commit.committer?.date,
                  source: "github" as const,
                };
              })
              .filter((entry) => entry.version.startsWith("2.") || entry.version.startsWith("3."));
          }
        }
      } catch {
        // GitHub API network error or rate limit, continue with DB/manifest
      }

      // 3. Merge: Live GitHub Commits + Database Records + Master Deployment Manifest
      const mergedMap = new Map<string, SystemChangelogEntry>();

      // Base manifest first
      COMPLETE_GITHUB_DEPLOYMENTS.forEach((item) => {
        mergedMap.set(item.version, item);
      });

      // DB logs override / augment
      if (dbLogs && Array.isArray(dbLogs)) {
        dbLogs.forEach((item: any) => {
          if (!mergedMap.has(item.version)) {
            mergedMap.set(item.version, { ...item, source: "database" });
          } else {
            const existing = mergedMap.get(item.version)!;
            mergedMap.set(item.version, {
              ...existing,
              ...item,
              source: "database",
            });
          }
        });
      }

      // Git API live logs override / augment
      gitLogs.forEach((item) => {
        if (!mergedMap.has(item.version)) {
          mergedMap.set(item.version, item);
        }
      });

      // Ensure active APP_VERSION is always in the map
      if (!mergedMap.has(APP_VERSION)) {
        mergedMap.set(APP_VERSION, {
          id: "current-runtime",
          version: APP_VERSION,
          description: `${APP_VERSION} - Active runtime development version with live database and GitHub synchronization`,
          git_commit_tag: APP_VERSION,
          deployed_by: "Antigravity Pair Programmer",
          created_at: "2026-09-20T12:00:00.000Z",
          source: "local",
        });
      }

      const sorted = Array.from(mergedMap.values()).sort((a, b) => {
        const verDiff = compareVersions(a.version, b.version);
        if (verDiff !== 0) return verDiff;
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });

      setChangelogs(sorted);
    } catch {
      setChangelogs(COMPLETE_GITHUB_DEPLOYMENTS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchChangelogs();
    }
  }, [isOpen]);

  const handleCopyChangelog = (item: SystemChangelogEntry) => {
    const text = `[PowerForecast Release ${item.version}]\nDate: ${item.created_at ? new Date(item.created_at).toLocaleString() : "Recent"}\nAuthor: ${item.deployed_by || "Developer"}\n\n${item.description}`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id || item.version);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter options for fast version series navigation
  const filterOptions = [
    { id: "all", label: "All Deployments" },
    { id: "3.3", label: "v3.3.x" },
    { id: "3.2", label: "v3.2.x" },
    { id: "3.1", label: "v3.1.x" },
    { id: "3.0", label: "v3.0.x" },
    { id: "2.13", label: "v2.13.x" },
    { id: "2.12", label: "v2.12.x" },
    { id: "2.11", label: "v2.11.x" },
    { id: "2.10", label: "v2.10.x" },
    { id: "2.9", label: "v2.9.x" },
    { id: "2.8", label: "v2.8.x" },
    { id: "2.7", label: "v2.7.x" },
    { id: "2.6", label: "v2.6.x" },
    { id: "2.5", label: "v2.5.x" },
    { id: "2.1", label: "v2.1.x" },
  ];

  const filteredChangelogs = useMemo(() => {
    return changelogs.filter((entry) => {
      const matchesSearch =
        searchQuery === "" ||
        entry.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.deployed_by && entry.deployed_by.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTag =
        selectedTagFilter === "all" ||
        entry.version.toLowerCase().startsWith(selectedTagFilter.toLowerCase());

      return matchesSearch && matchesTag;
    });
  }, [changelogs, searchQuery, selectedTagFilter]);

  const openGitHubTag = (tag?: string) => {
    if (tag && (tag.startsWith("2.") || tag.startsWith("3."))) {
      window.open(`${GITHUB_REPO_URL}/releases/tag/${tag}`, "_blank", "noopener,noreferrer");
    } else {
      window.open(GITHUB_REPO_URL, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: "blur(8px)",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
          },
        },
        paper: {
          sx: {
            borderRadius: 2.5,
            bgcolor: (theme) => (theme.palette.mode === "dark" ? "#13161c" : "#ffffff"),
            backgroundImage: "none",
            border: "1px solid",
            borderColor: (theme) => (theme.palette.mode === "dark" ? "#262c37" : "#e2e8f0"),
            boxShadow: (theme) =>
              theme.palette.mode === "dark"
                ? "0 24px 64px rgba(0, 0, 0, 0.7)"
                : "0 20px 50px rgba(0, 0, 0, 0.15)",
            color: "text.primary",
            maxHeight: "88vh",
            display: "flex",
            flexDirection: "column",
          },
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          p: 2.5,
          pb: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid",
          borderColor: (theme) => (theme.palette.mode === "dark" ? "#242934" : "#e2e8f0"),
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "#181c23" : "#f8fafc"),
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.12)" : "rgba(13, 148, 136, 0.1)"),
              border: "1px solid",
              borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.3)" : "rgba(13, 148, 136, 0.25)"),
              color: "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <DeploymentIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "1.1rem", color: "text.primary" }}>
                GitHub Deployment & Version Changelogs
              </Typography>
              <Chip
                label={`${APP_VERSION} • Current`}
                size="small"
                sx={{
                  height: 22,
                  fontSize: "0.6875rem",
                  fontWeight: 800,
                  fontFamily: "monospace",
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.15)" : "rgba(13, 148, 136, 0.12)"),
                  color: (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488"),
                  border: "1px solid",
                  borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.35)" : "rgba(13, 148, 136, 0.3)"),
                }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem", display: "block" }}>
              Complete deployment audit trail synchronized with GitHub Releases, Tags, and Supabase DB
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<GitHubIcon sx={{ fontSize: 16 }} />}
            endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
            onClick={() => window.open(GITHUB_REPO_URL, "_blank", "noopener,noreferrer")}
            sx={{
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "none",
              color: "text.primary",
              borderColor: (theme) => (theme.palette.mode === "dark" ? "#2e3542" : "#cbd5e1"),
              bgcolor: (theme) => (theme.palette.mode === "dark" ? "#1c2028" : "#ffffff"),
              "&:hover": {
                borderColor: "primary.main",
                bgcolor: (theme) => (theme.palette.mode === "dark" ? "#242a35" : "#f1f5f9"),
              },
            }}
          >
            GitHub Repo
          </Button>
          <IconButton
            size="small"
            onClick={fetchChangelogs}
            disabled={isLoading}
            title="Refresh deployments from GitHub & Database"
            sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}
          >
            <RefreshIcon sx={{ fontSize: 18, animation: isLoading ? "spin 1s linear infinite" : "none" }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{ color: "text.secondary", "&:hover": { color: "text.primary", bgcolor: "action.hover" } }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Search & Filter Toolbar */}
      <Box
        sx={{
          p: 2,
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "#15181f" : "#f8fafc"),
          borderBottom: "1px solid",
          borderColor: (theme) => (theme.palette.mode === "dark" ? "#242934" : "#e2e8f0"),
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <TextField
            size="small"
            placeholder="Search deployments by version (e.g. 2.9, 2.7, 2.13), keyword, module, or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery("")}>
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
                sx: {
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? "#1c2028" : "#ffffff"),
                  borderRadius: 1.5,
                  fontSize: "0.8125rem",
                  "& fieldset": { borderColor: (theme) => (theme.palette.mode === "dark" ? "#2e3542" : "#cbd5e1") },
                  "&:hover fieldset": { borderColor: "primary.main" },
                  "&.Mui-focused fieldset": { borderColor: "primary.main" },
                },
              },
            }}
          />
        </Box>

        {/* Filter Pills */}
        <Box sx={{ display: "flex", gap: 0.75, overflowX: "auto", pb: 0.25 }}>
          {filterOptions.map((opt) => (
            <Chip
              key={opt.id}
              label={opt.label}
              size="small"
              clickable
              onClick={() => setSelectedTagFilter(opt.id)}
              sx={{
                height: 24,
                fontSize: "0.6875rem",
                fontWeight: 700,
                borderRadius: 1.5,
                bgcolor: selectedTagFilter === opt.id ? "primary.main" : (theme) => (theme.palette.mode === "dark" ? "#1c2028" : "#ffffff"),
                color: selectedTagFilter === opt.id ? "#ffffff" : "text.secondary",
                border: "1px solid",
                borderColor: selectedTagFilter === opt.id ? "primary.main" : (theme) => (theme.palette.mode === "dark" ? "#282e3a" : "#cbd5e1"),
                "&:hover": {
                  bgcolor: selectedTagFilter === opt.id ? "primary.dark" : (theme) => (theme.palette.mode === "dark" ? "#242a35" : "#f1f5f9"),
                  color: selectedTagFilter === opt.id ? "#ffffff" : "text.primary",
                },
              }}
            />
          ))}
          <Box sx={{ ml: "auto", display: "flex", alignItems: "center" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem", fontFamily: "monospace" }}>
              Showing {filteredChangelogs.length} of {changelogs.length} deployment(s)
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Changelog Feed */}
      <DialogContent
        sx={{
          p: 2.5,
          flex: 1,
          overflowY: "auto",
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "#13161c" : "#f8fafc"),
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {isLoading && changelogs.length === 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 8, gap: 1.5 }}>
            <CircularProgress size={32} sx={{ color: "primary.main" }} />
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Loading deployment audit changelogs from GitHub & Database...
            </Typography>
          </Box>
        ) : filteredChangelogs.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
            <TerminalIcon sx={{ fontSize: 40, opacity: 0.4, mb: 1 }} />
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              No deployments matching "{searchQuery}"
            </Typography>
            <Typography variant="caption">
              Try adjusting your search query or tag filter above.
            </Typography>
          </Box>
        ) : (
          filteredChangelogs.map((item, idx) => {
            const isLatest = idx === 0;
            const isCurrentRuntime = item.version === APP_VERSION;
            const isCopied = copiedId === (item.id || item.version);
            const dateStr = item.created_at
              ? new Date(item.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Recent";

            return (
              <Paper
                key={item.id || item.version}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  bgcolor: isCurrentRuntime
                    ? (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.04)" : "rgba(13, 148, 136, 0.05)")
                    : (theme) => (theme.palette.mode === "dark" ? "#181c23" : "#ffffff"),
                  borderColor: isCurrentRuntime
                    ? "primary.main"
                    : (theme) => (theme.palette.mode === "dark" ? "#242a34" : "#e2e8f0"),
                  boxShadow: isCurrentRuntime
                    ? (theme) => (theme.palette.mode === "dark" ? "0 4px 20px rgba(0, 229, 201, 0.08)" : "0 4px 16px rgba(13, 148, 136, 0.08)")
                    : (theme) => (theme.palette.mode === "dark" ? "none" : "0 1px 3px rgba(0,0,0,0.05)"),
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: isCurrentRuntime
                      ? (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.06)" : "rgba(13, 148, 136, 0.08)")
                      : (theme) => (theme.palette.mode === "dark" ? "#1b1f27" : "#ffffff"),
                  },
                }}
              >
                {/* Release Card Header */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 1.25 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Chip
                      icon={isLatest ? <DotIcon sx={{ fontSize: "10px !important", color: "#10b981 !important" }} /> : undefined}
                      label={item.version}
                      size="small"
                      sx={{
                        fontFamily: "monospace",
                        fontWeight: 800,
                        fontSize: "0.75rem",
                        bgcolor: isCurrentRuntime
                          ? (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.18)" : "rgba(13, 148, 136, 0.12)")
                          : (theme) => (theme.palette.mode === "dark" ? "#202530" : "#f1f5f9"),
                        color: isCurrentRuntime
                          ? (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488")
                          : "text.primary",
                        border: "1px solid",
                        borderColor: isCurrentRuntime
                          ? (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.45)" : "rgba(13, 148, 136, 0.35)")
                          : (theme) => (theme.palette.mode === "dark" ? "#2e3544" : "#cbd5e1"),
                      }}
                    />
                    {isCurrentRuntime && (
                      <Chip
                        label="ACTIVE UI VERSION"
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.625rem",
                          fontWeight: 800,
                          bgcolor: "rgba(16, 185, 129, 0.15)",
                          color: "#10b981",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                        }}
                      />
                    )}
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                      • {dateStr}
                    </Typography>
                  </Box>

                  {/* Actions */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    {item.deployed_by && (
                      <Chip
                        icon={<VerifiedIcon sx={{ fontSize: "12px !important", color: "#06b6d4 !important" }} />}
                        label={item.deployed_by}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.625rem",
                          fontWeight: 600,
                          bgcolor: "rgba(6, 182, 212, 0.1)",
                          color: (theme) => (theme.palette.mode === "dark" ? "#22d3ee" : "#0891b2"),
                          border: "1px solid rgba(6, 182, 212, 0.2)",
                        }}
                      />
                    )}
                    <Tooltip title={isCopied ? "Copied to clipboard!" : "Copy release details"}>
                      <IconButton
                        size="small"
                        onClick={() => handleCopyChangelog(item)}
                        sx={{
                          p: 0.5,
                          borderRadius: 1.5,
                          bgcolor: (theme) => (theme.palette.mode === "dark" ? "#1e232c" : "#f1f5f9"),
                          color: isCopied ? "#10b981" : "text.secondary",
                          border: "1px solid",
                          borderColor: (theme) => (theme.palette.mode === "dark" ? "#29303d" : "#cbd5e1"),
                          "&:hover": { color: "primary.main", bgcolor: (theme) => (theme.palette.mode === "dark" ? "#262c37" : "#e2e8f0") },
                        }}
                      >
                        {isCopied ? <CheckIcon sx={{ fontSize: 14 }} /> : <CopyIcon sx={{ fontSize: 14 }} />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View on GitHub">
                      <IconButton
                        size="small"
                        onClick={() => openGitHubTag(item.git_commit_tag || item.version)}
                        sx={{
                          p: 0.5,
                          borderRadius: 1.5,
                          bgcolor: (theme) => (theme.palette.mode === "dark" ? "#1e232c" : "#f1f5f9"),
                          color: "text.secondary",
                          border: "1px solid",
                          borderColor: (theme) => (theme.palette.mode === "dark" ? "#29303d" : "#cbd5e1"),
                          "&:hover": { color: "primary.main", bgcolor: (theme) => (theme.palette.mode === "dark" ? "#262c37" : "#e2e8f0") },
                        }}
                      >
                        <GitHubIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Description Body */}
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: "0.8125rem",
                    lineHeight: 1.6,
                    color: "text.primary",
                    fontFamily: "inherit",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {item.description}
                </Typography>
              </Paper>
            );
          })
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SystemChangelogModal;
