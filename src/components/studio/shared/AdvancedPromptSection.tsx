"use client";

import { useState, useCallback } from "react";
import { useWorkflowStore } from "@/store/workflowStore";

interface AdvancedPromptSectionProps {
  promptNodeId: string;
  label?: string;
}

export function AdvancedPromptSection({
  promptNodeId,
  label = "Advanced",
}: AdvancedPromptSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const nodes = useWorkflowStore((s) => s.nodes);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);

  const promptNode = nodes.find((n) => n.id === promptNodeId);
  const currentPrompt = (promptNode?.data as { prompt?: string })?.prompt || "";

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(promptNodeId, { prompt: e.target.value });
    },
    [promptNodeId, updateNodeData]
  );

  return (
    <div className="border border-neutral-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-neutral-400 hover:text-neutral-300 transition-colors"
      >
        <span>{label}</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-3 pb-3">
          <textarea
            value={currentPrompt}
            onChange={handleChange}
            rows={4}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-300 placeholder-neutral-600 resize-y focus:outline-none focus:border-neutral-500"
            placeholder="Edit prompt..."
          />
        </div>
      )}
    </div>
  );
}
