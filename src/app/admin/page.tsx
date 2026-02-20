"use client";

import { useEffect, useState, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

interface AnalyticsStats {
  totalSessions: number;
  totalGenerations: number;
  successes: number;
  failures: number;
  modelCounts: Record<string, number>;
  dailyCounts: Record<string, number>;
}

interface AnalyticsData {
  stats: AnalyticsStats;
  recentErrors: { time: string; model: string; error: string }[];
  sessions: { id: string; start: string; end?: string; entries: number; hasError: boolean }[];
}

interface ModelInfo {
  label: string;
  kieModel: string;
  geminiModel: string;
}

interface ConfigData {
  prompts: Record<string, string>;
  defaultProvider: "kie" | "gemini";
  models: Record<string, ModelInfo>;
  promptKeys: string[];
}

type Tab = "analytics" | "models" | "prompts";

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-neutral-800 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-neutral-500 uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-bold text-white">{value}</span>
      {sub && <span className="text-xs text-neutral-500">{sub}</span>}
    </div>
  );
}

// ── Login ──────────────────────────────────────────────────────────────────

function LoginGate({ onAuthed }: { onAuthed: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    const r = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    const data = await r.json();
    setLoading(false);
    if (data.ok) onAuthed();
    else setErr(data.error ?? "Wrong password");
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="w-full max-w-sm bg-neutral-900 rounded-2xl p-8 border border-neutral-800">
        <div className="flex items-center gap-3 mb-8">
          <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" aria-label="PlotAI">
            <polygon points="16,2 30,12 30,20 16,30 2,20 2,12" fill="#fff" opacity="0.08" stroke="#fff" strokeWidth="1.5"/>
            <rect x="11" y="11" width="10" height="10" rx="1" fill="none" stroke="#fff" strokeWidth="1.5"/>
            <circle cx="16" cy="16" r="1.5" fill="#fff"/>
          </svg>
          <span className="text-lg font-semibold text-white">PlotAI Admin</span>
        </div>
        <form onSubmit={login} className="flex flex-col gap-4">
          <input
            type="password"
            placeholder="Admin password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="bg-neutral-800 text-white rounded-xl px-4 py-3 text-sm outline-none border border-neutral-700 focus:border-neutral-500 placeholder:text-neutral-600"
            autoFocus
          />
          {err && <p className="text-xs text-red-400">{err}</p>}
          <button
            type="submit"
            disabled={loading || !pw}
            className="h-11 bg-white text-neutral-900 font-semibold rounded-xl text-sm disabled:opacity-40 hover:bg-neutral-100 transition-colors"
          >
            {loading ? "Checking..." : "Enter Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Analytics Tab ──────────────────────────────────────────────────────────

function AnalyticsTab() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <p className="text-neutral-500 text-sm">Loading analytics...</p>;
  if (!data) return <p className="text-red-400 text-sm">Failed to load analytics</p>;

  const { stats } = data;
  const successRate = stats.totalGenerations > 0
    ? Math.round((stats.successes / stats.totalGenerations) * 100)
    : 0;

  const topModels = Object.entries(stats.modelCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  const recentDays = Object.entries(stats.dailyCounts)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 7)
    .reverse();

  return (
    <div className="flex flex-col gap-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Sessions" value={stats.totalSessions} />
        <StatCard label="Generations" value={stats.totalGenerations} />
        <StatCard label="Success rate" value={`${successRate}%`} sub={`${stats.successes} ok / ${stats.failures} failed`} />
        <StatCard label="Unique models" value={Object.keys(stats.modelCounts).length} />
      </div>

      {/* Model usage */}
      {topModels.length > 0 && (
        <div className="bg-neutral-800/60 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">Model Usage</h3>
          <div className="flex flex-col gap-2">
            {topModels.map(([model, count]) => {
              const pct = Math.round((count / stats.totalGenerations) * 100);
              return (
                <div key={model} className="flex items-center gap-3">
                  <span className="text-xs text-neutral-300 w-52 truncate font-mono">{model}</span>
                  <div className="flex-1 bg-neutral-700 rounded-full h-1.5">
                    <div className="bg-white rounded-full h-1.5 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-neutral-400 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity by day */}
      {recentDays.length > 0 && (
        <div className="bg-neutral-800/60 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">Sessions by Day (last 7)</h3>
          <div className="flex items-end gap-2 h-16">
            {recentDays.map(([day, count]) => {
              const max = Math.max(...recentDays.map(([, c]) => c));
              const h = max > 0 ? Math.round((count / max) * 56) : 4;
              return (
                <div key={day} className="flex flex-col items-center gap-1 flex-1">
                  <div className="bg-white/30 rounded-sm w-full transition-all" style={{ height: `${h}px` }} />
                  <span className="text-[9px] text-neutral-600 truncate w-full text-center">{day.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent errors */}
      {data.recentErrors.length > 0 && (
        <div className="bg-neutral-800/60 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">Recent Errors</h3>
          <div className="flex flex-col gap-2">
            {data.recentErrors.slice(0, 8).map((e, i) => (
              <div key={i} className="flex gap-3 text-xs">
                <span className="text-neutral-600 whitespace-nowrap">{fmt(e.time).split(",")[0]}</span>
                {e.model && <span className="text-blue-400 font-mono truncate max-w-[120px]">{e.model}</span>}
                <span className="text-red-400 truncate">{e.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent sessions */}
      <div className="bg-neutral-800/60 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">Recent Sessions</h3>
        <div className="flex flex-col gap-2">
          {data.sessions.map((s) => (
            <div key={s.id} className="flex items-center gap-3 text-xs">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.hasError ? "bg-red-400" : "bg-emerald-400"}`} />
              <span className="text-neutral-400 font-mono truncate flex-1">{s.id}</span>
              <span className="text-neutral-600">{fmt(s.start)}</span>
              <span className="text-neutral-600">{s.entries} events</span>
            </div>
          ))}
          {data.sessions.length === 0 && <p className="text-neutral-600 text-xs">No sessions logged yet</p>}
        </div>
      </div>
    </div>
  );
}

// ── Models Tab ─────────────────────────────────────────────────────────────

function ModelsTab({ config, onSave }: { config: ConfigData; onSave: (provider: "kie" | "gemini") => void }) {
  const [provider, setProvider] = useState<"kie" | "gemini">(config.defaultProvider);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await onSave(provider);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Provider toggle */}
      <div className="bg-neutral-800/60 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-1">Default Provider</h3>
        <p className="text-xs text-neutral-500 mb-4">Which API provider the studio uses for new generations.</p>
        <div className="flex gap-2">
          {(["kie", "gemini"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                provider === p ? "bg-white text-neutral-900" : "bg-neutral-700 text-neutral-400 hover:text-white"
              }`}
            >
              {p === "kie" ? "Kie.ai" : "Gemini (Google)"}
            </button>
          ))}
        </div>
      </div>

      {/* Model mapping table */}
      <div className="bg-neutral-800/60 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Current Model Mapping</h3>
        <div className="flex flex-col gap-3">
          {Object.entries(config.models).map(([, m]) => (
            <div key={m.label} className="border border-neutral-700 rounded-lg p-3">
              <p className="text-xs font-semibold text-neutral-300 mb-2">{m.label}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-neutral-600 uppercase tracking-wide mb-0.5">Kie.ai</p>
                  <p className="text-xs font-mono text-blue-400">{m.kieModel}</p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-600 uppercase tracking-wide mb-0.5">Gemini</p>
                  <p className="text-xs font-mono text-purple-400">{m.geminiModel}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={save}
        className={`h-11 rounded-xl text-sm font-semibold transition-all ${
          saved ? "bg-emerald-600 text-white" : "bg-white text-neutral-900 hover:bg-neutral-100"
        }`}
      >
        {saved ? "Saved ✓" : "Save Provider Setting"}
      </button>
      <p className="text-xs text-neutral-600 text-center">
        Provider change applies to new studio sessions. Existing loaded sessions keep their current model.
      </p>
    </div>
  );
}

// ── Prompts Tab ────────────────────────────────────────────────────────────

const PROMPT_LABELS: Record<string, string> = {
  mapEnhance: "Map Enhance (legacy)",
  mapEnhanceClean: "Map Enhance Clean (no text)",
  mapEnhanceWithArea: "Map Enhance With Area text",
  videoMapAreaPopup: "Video: Area text popup",
  streetEnhance: "Street View Enhancement",
  halfBuilding: "Half-Constructed Building (with reference)",
  halfBuildingNoRef: "Half-Constructed Building (no reference)",
  fullBuilding: "Fully Constructed Building (with reference)",
  fullBuildingNoRef: "Fully Constructed Building (no reference)",
  angleFront: "Angle: Front aerial",
  angleAerial: "Angle: Balcony lifestyle",
  angleCorner: "Angle: Interior",
  videoMapToStreet: "Video: Map → Street transition",
  videoStreetToHalf: "Video: Street → Half construction",
  videoHalfToFull: "Video: Half → Full construction",
};

function PromptsTab({ config, onSavePrompts }: { config: ConfigData; onSavePrompts: (prompts: Record<string, string>) => void }) {
  const [prompts, setPrompts] = useState<Record<string, string>>(config.prompts);
  const [active, setActive] = useState(config.promptKeys[0] ?? "");
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await onSavePrompts(prompts);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const reset = () => {
    if (confirm("Reset this prompt to the default from code?")) {
      setPrompts((p) => ({ ...p, [active]: config.prompts[active] }));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        {config.promptKeys.map((k) => (
          <button
            key={k}
            onClick={() => setActive(k)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              active === k ? "bg-white text-neutral-900" : "bg-neutral-800 text-neutral-400 hover:text-white"
            }`}
          >
            {PROMPT_LABELS[k] ?? k}
          </button>
        ))}
      </div>

      {active && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">{PROMPT_LABELS[active] ?? active}</p>
            <button onClick={reset} className="text-xs text-neutral-500 hover:text-neutral-300">Reset to default</button>
          </div>
          <textarea
            value={prompts[active] ?? ""}
            onChange={(e) => setPrompts((p) => ({ ...p, [active]: e.target.value }))}
            rows={12}
            className="bg-neutral-800 text-white text-xs font-mono rounded-xl p-3 resize-y outline-none border border-neutral-700 focus:border-neutral-500 leading-relaxed"
          />
          <p className="text-xs text-neutral-600">{(prompts[active] ?? "").length} chars</p>
        </div>
      )}

      <button
        onClick={save}
        className={`h-11 rounded-xl text-sm font-semibold transition-all ${
          saved ? "bg-emerald-600 text-white" : "bg-white text-neutral-900 hover:bg-neutral-100"
        }`}
      >
        {saved ? "Saved ✓" : "Save All Prompts"}
      </button>
      <p className="text-xs text-neutral-600 text-center">
        Saved prompts are stored in admin-config.json on the server and used for new studio sessions.
      </p>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("analytics");
  const [config, setConfig] = useState<ConfigData | null>(null);

  // Check if already authed on mount
  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => {
        setAuthed(r.status !== 401);
      })
      .catch(() => setAuthed(false));
  }, []);

  const loadConfig = useCallback(() => {
    fetch("/api/admin/config")
      .then((r) => r.json())
      .then(setConfig);
  }, []);

  useEffect(() => {
    if (authed) loadConfig();
  }, [authed, loadConfig]);

  const logout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setAuthed(false);
    setConfig(null);
  };

  const saveProvider = async (provider: "kie" | "gemini") => {
    await fetch("/api/admin/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultProvider: provider }),
    });
    loadConfig();
  };

  const savePrompts = async (prompts: Record<string, string>) => {
    await fetch("/api/admin/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompts }),
    });
    loadConfig();
  };

  if (authed === null) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!authed) return <LoginGate onAuthed={() => setAuthed(true)} />;

  const tabs: { id: Tab; label: string }[] = [
    { id: "analytics", label: "Analytics" },
    { id: "models", label: "Models" },
    { id: "prompts", label: "Prompts" },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-neutral-900">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none" aria-label="PlotAI">
              <polygon points="16,2 30,12 30,20 16,30 2,20 2,12" fill="#fff" opacity="0.08" stroke="#fff" strokeWidth="1.5"/>
              <rect x="11" y="11" width="10" height="10" rx="1" fill="none" stroke="#fff" strokeWidth="1.5"/>
              <circle cx="16" cy="16" r="1.5" fill="#fff"/>
            </svg>
            <span className="text-sm font-semibold">PlotAI Admin</span>
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Live</span>
          </div>
          <button onClick={logout} className="text-xs text-neutral-500 hover:text-white transition-colors">Logout</button>
        </div>
        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4 flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-white text-white"
                  : "border-transparent text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {tab === "analytics" && <AnalyticsTab />}
        {tab === "models" && config && (
          <ModelsTab config={config} onSave={saveProvider} />
        )}
        {tab === "prompts" && config && (
          <PromptsTab config={config} onSavePrompts={savePrompts} />
        )}
        {(tab === "models" || tab === "prompts") && !config && (
          <p className="text-neutral-500 text-sm">Loading config...</p>
        )}
      </div>
    </div>
  );
}
