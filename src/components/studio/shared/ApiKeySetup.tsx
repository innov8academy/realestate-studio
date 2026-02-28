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
  const [showTutorial, setShowTutorial] = useState(false);

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

        {/* Why Kie API */}
        <div className="bg-gradient-to-br from-blue-950/50 to-neutral-900 rounded-xl p-4 border border-blue-800/30">
          <h3 className="text-sm font-semibold text-blue-300 mb-1.5">
            Why Kie.ai?
          </h3>
          <p className="text-xs text-neutral-300 leading-relaxed">
            We searched for the cheapest way to generate AI videos and images via API.{" "}
            <span className="text-blue-300 font-medium">Kie.ai is the most affordable API we found</span>{" "}
            &mdash; a full property animation (8 images + 7 video clips) costs about{" "}
            <span className="text-white font-semibold">$2.50</span>.
            No subscriptions, no minimums. You only pay for what you generate.
          </p>
        </div>

        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 bg-neutral-800 rounded-2xl mx-auto mb-3 flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-white">Connect Kie.ai</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Paste your API key below to start generating.
          </p>
        </div>

        {/* API Key Input */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Kie.ai API Key
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

        {/* Divider */}
        <div className="border-t border-neutral-800" />

        {/* Tutorial Button */}
        <button
          onClick={() => setShowTutorial((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-blue-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
            </span>
            <span className="text-xs font-medium text-neutral-300">
              {showTutorial ? "Hide guide" : "API? athenth thengaya\uD83E\uDD65! — How do I get one?"}
            </span>
          </div>
          <svg
            className={`w-4 h-4 text-neutral-500 transition-transform ${showTutorial ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Expandable Tutorial */}
        {showTutorial && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">

            {/* Cost info */}
            <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-300 mb-1.5">How much does it cost?</p>
              <p className="text-xs text-amber-200/70 leading-relaxed">
                One full property animation costs about{" "}
                <span className="text-amber-200 font-semibold">$2.50</span>.
                {" "}Add <span className="text-amber-200 font-semibold">$5</span> to your
                account and you're good for your first two animations.
              </p>
              <div className="mt-2.5 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-amber-200/60">8 AI images</span>
                  <span className="text-amber-200/80">~$0.38</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-amber-200/60">7 video clips (5s each)</span>
                  <span className="text-amber-200/80">~$1.96</span>
                </div>
                <div className="flex justify-between text-xs border-t border-amber-800/40 pt-1 mt-1">
                  <span className="text-amber-300 font-medium">Total per animation</span>
                  <span className="text-amber-300 font-semibold">~$2.34</span>
                </div>
              </div>
              <p className="text-xs text-amber-200/50 mt-2">
                Credits never expire. $5 is enough for your first full generation.
              </p>
            </div>

            {/* Simple Tutorial Steps */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                3 easy steps
              </p>

              {/* Step 1 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-900/50 border border-blue-700/50 flex items-center justify-center text-xs font-semibold text-blue-300">
                  1
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-xs font-medium text-neutral-200">Go to Kie.ai and make a free account</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Just click the link below. Sign up with your email.
                    It takes less than a minute. You don't need a credit card to sign up.
                  </p>
                  <a
                    href={KIE_REFERRAL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1.5 px-3 py-1.5 bg-blue-900/40 border border-blue-800/50 rounded-lg text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-900/60 transition-colors"
                  >
                    Open Kie.ai
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-900/50 border border-blue-700/50 flex items-center justify-center text-xs font-semibold text-blue-300">
                  2
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-xs font-medium text-neutral-200">Add $5 to your account</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Once you're logged in, look for <span className="text-neutral-400">"Billing"</span> in
                    the menu on the left side. Click it, then add <span className="text-neutral-300 font-medium">$5</span>.
                    That's enough for your first full property video.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-900/50 border border-blue-700/50 flex items-center justify-center text-xs font-semibold text-blue-300">
                  3
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-xs font-medium text-neutral-200">Copy your API key and paste it above</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    In the Kie.ai menu, look for <span className="text-neutral-400">"API Keys"</span>.
                    {" "}Click <span className="text-neutral-400">"Create"</span> to make a new key.
                    {" "}Click the copy button next to it.
                    {" "}Then come back here and paste it in the box above.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-600 text-center">
              That's it! Once you paste your key, you're ready to go.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
