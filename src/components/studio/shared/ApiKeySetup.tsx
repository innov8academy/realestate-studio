"use client";

import { useState } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { configureNodesForProvider } from "@/lib/studio/nodeMap";

export function ApiKeySetup() {
  const updateProviderApiKey = useWorkflowStore(
    (state) => state.updateProviderApiKey
  );
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setError("Please enter your API key");
      return;
    }
    // Save the API key
    updateProviderApiKey("kie", trimmed);
    // Reconfigure all generation nodes to use Kie provider
    configureNodesForProvider(updateNodeData, "kie");
  };

  return (
    <div className="h-full flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-neutral-800 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-white">
            Welcome to Studio
          </h1>
          <p className="text-sm text-neutral-400 mt-2">
            Enter your Kie.ai API key to get started with AI-powered real estate
            animations.
          </p>
        </div>

        {/* API Key Input */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Kie.ai API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Enter your API key..."
              className="w-full h-11 px-3 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors"
            />
            {error && (
              <p className="text-xs text-red-400 mt-1">{error}</p>
            )}
          </div>

          <button
            onClick={handleSubmit}
            className="w-full h-11 bg-white text-neutral-900 rounded-lg font-medium text-sm hover:bg-neutral-200 active:scale-[0.98] transition-all"
          >
            Get Started
          </button>

          <a
            href="https://kie.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-xs text-neutral-500 hover:text-neutral-400 transition-colors"
          >
            Don&apos;t have an API key? Get one at kie.ai &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
