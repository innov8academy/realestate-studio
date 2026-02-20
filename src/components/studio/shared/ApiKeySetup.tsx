"use client";

import { useState } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { configureNodesForProvider } from "@/lib/studio/nodeMap";

const KIE_REFERRAL_URL = "https://kie.ai?ref=12958ec99c19bb81d7c76295b16a7df7";

export function ApiKeySetup() {
  const updateProviderApiKey = useWorkflowStore(
    (state) => state.updateProviderApiKey
  );
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [showKey, setShowKey] = useState(false);

  const handleSubmit = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setError("Please enter your API key");
      return;
    }
    updateProviderApiKey("kie", trimmed);
    configureNodesForProvider(updateNodeData, "kie");
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-5 py-6 space-y-5 max-w-sm mx-auto">

        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 bg-neutral-800 rounded-2xl mx-auto mb-3 flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-white">Connect Kie.ai</h1>
          <p className="text-xs text-neutral-400 mt-1">
            This app uses Kie.ai to generate your property animation.
          </p>
        </div>

        {/* Cost Estimate Card */}
        <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-4">
          <div className="flex items-start gap-2.5">
            <span className="text-amber-400 mt-0.5 shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </span>
            <div>
              <p className="text-xs font-semibold text-amber-300 mb-1">How much will it cost?</p>
              <p className="text-xs text-amber-200/70 leading-relaxed">
                Each full property animation costs approximately{" "}
                <span className="text-amber-200 font-semibold">$2 – $5 in API credits</span>{" "}
                (8 AI images + 7 videos).
              </p>
              <div className="mt-2.5 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-amber-200/60">8 image generations</span>
                  <span className="text-amber-200/80">~$0.50</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-amber-200/60">7 video clips (5s each)</span>
                  <span className="text-amber-200/80">~$1.50</span>
                </div>
                <div className="flex justify-between text-xs border-t border-amber-800/40 pt-1 mt-1">
                  <span className="text-amber-300 font-medium">Minimum top-up recommended</span>
                  <span className="text-amber-300 font-semibold">$10</span>
                </div>
              </div>
              <p className="text-xs text-amber-200/50 mt-2">
                Credits never expire. $10 covers 2–4 full generations.
              </p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
            How to get started
          </p>

          {/* Step 1 */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-semibold text-neutral-300">
              1
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-xs font-medium text-neutral-200">Create a free Kie.ai account</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Sign up takes under 1 minute — no credit card required.
              </p>
              <a
                href={KIE_REFERRAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Go to Kie.ai to sign up
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-semibold text-neutral-300">
              2
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-xs font-medium text-neutral-200">Add credits to your account</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Go to <span className="text-neutral-400">Billing</span> in your Kie.ai dashboard and top up. We recommend <span className="text-neutral-300 font-medium">$10</span> to get started comfortably.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-semibold text-neutral-300">
              3
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-xs font-medium text-neutral-200">Copy your API key</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                In your Kie.ai dashboard, go to <span className="text-neutral-400">API Keys</span>, create a new key, and paste it below.
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-neutral-800" />

        {/* API Key Input */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Paste your Kie.ai API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="sk-..."
                className="w-full h-11 px-3 pr-10 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                tabIndex={-1}
              >
                {showKey ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          </div>

          <button
            onClick={handleSubmit}
            className="w-full h-11 bg-white text-neutral-900 rounded-lg font-medium text-sm hover:bg-neutral-200 active:scale-[0.98] transition-all"
          >
            Start Generating
          </button>

          <p className="text-xs text-neutral-600 text-center">
            Your API key is stored locally and never shared.
          </p>
        </div>
      </div>
    </div>
  );
}
