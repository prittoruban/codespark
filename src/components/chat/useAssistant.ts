"use client";

import { agent } from "@/services";
import { detectDisease } from "@/services/disease";
import type { ChatMessage, Language, ToolCall, ToolName } from "@/lib/types";
import { uid } from "@/lib/utils";
import { useCallback, useRef, useState } from "react";

export interface ThinkingState {
  label: string;
  tool?: ToolName;
}

/**
 * Conversation controller shared by Krishi AI (text) and the Voice Assistant.
 * Each turn: route → execute tools → (optional) on-device photo analysis → grounded synthesis.
 */
export function useAssistant(lang: Language) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState<ThinkingState | null>(null);
  const busy = useRef(false);

  const send = useCallback(
    async (text: string, image?: { src: string; name: string }): Promise<ChatMessage | null> => {
      const query = text.trim() || (image ? "What is wrong with this crop? Please diagnose the photo." : "");
      if (!query || busy.current) return null;
      busy.current = true;
      const userMsg: ChatMessage = { id: uid("m"), role: "user", content: query, lang, createdAt: Date.now(), image: image?.src };
      setMessages((m) => [...m, userMsg]);

      try {
        setThinking({ label: "Understanding your question…" });
        const run = agent.route(query, { hasImage: !!image });
        const results = [];
        const tools: ToolCall[] = [];
        for (const step of run.plan) {
          setThinking({ label: `${agent.TOOL_META[step.tool].label}…`, tool: step.tool });
          const r = await agent.executeStep(step, query, { hasImage: !!image, lang });
          results.push(r);
          tools.push({ tool: step.tool, input: step.input, output: r.output, ms: r.ms });
        }

        let photoNote = "";
        if (image) {
          setThinking({ label: "Analysing photo on-device…", tool: "disease_detection" });
          const farm = agent.resolveFarm(query);
          const crop = ["Wheat", "Paddy", "Maize", "Tomato", "Groundnut"].includes(farm.crop) ? farm.crop : "Wheat";
          const d = await detectDisease(image.src, crop, image.name);
          const top = d.predictions[0];
          photoNote = d.healthy
            ? `**From your photo:** the leaf looks **healthy** (${Math.round(top.confidence * 100)}% confidence). No lesion regions were found.\n\n`
            : `**From your photo:** likely **${top.name}** (*${top.pathogen}*), ${Math.round(top.confidence * 100)}% confidence. About ${d.affectedArea}% of the leaf is affected (${d.severity}).\n\n- ${d.chemical[0]}\n- Organic option: ${d.organic[0]}\n\nOpen Crop Doctor for the full treatment plan.\n\n`;
          tools.forEach((t) => {
            if (t.tool === "disease_detection") t.output = d.healthy ? "Healthy leaf, no lesions detected." : `${top.name} · ${Math.round(top.confidence * 100)}% · ${d.affectedArea}% leaf area`;
          });
        }

        setThinking({ label: "Writing a grounded answer…" });
        const out = await agent.synthesize(run, results, lang);
        const assistantMsg: ChatMessage = {
          id: uid("m"),
          role: "assistant",
          content: photoNote + out.text,
          lang,
          createdAt: Date.now(),
          citations: out.citations,
          tools,
          followUps: out.followUps,
        };
        setMessages((m) => [...m, assistantMsg]);
        return assistantMsg;
      } finally {
        setThinking(null);
        busy.current = false;
      }
    },
    [lang],
  );

  const reset = useCallback(() => setMessages([]), []);
  return { messages, thinking, send, reset };
}
