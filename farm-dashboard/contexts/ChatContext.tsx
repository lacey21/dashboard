"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useFarm } from "@/contexts/FarmContext";

export type ChatLink = { label: string; href: string };

export type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  link?: ChatLink | null;
  /** Marks an assistant message as an error so the UI can style it. */
  isError?: boolean;
};

type ChatContextValue = {
  /** Whether the slide-over chat overlay is open. */
  open: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  messages: ChatMessage[];
  loading: boolean;
  /** Send a question; appends the user turn and the assistant reply. */
  send: (question: string) => Promise<void>;
  reset: () => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { farm } = useFarm();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const openChat = useCallback(() => setOpen(true), []);
  const closeChat = useCallback(() => setOpen(false), []);
  const toggleChat = useCallback(() => setOpen((o) => !o), []);
  const reset = useCallback(() => setMessages([]), []);

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || loading) return;

      const history: ChatMessage[] = [...messages, { role: "user", text: trimmed }];
      setMessages(history);
      setLoading(true);

      try {
        const res = await fetch("/api/ollama/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            farm,
            messages: history.map((m) => ({ role: m.role, text: m.text })),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Chat failed");
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: data.answer, link: data.link ?? null },
        ]);
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: e instanceof Error ? e.message : "Something went wrong. Please try again.",
            isError: true,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [farm, messages, loading],
  );

  return (
    <ChatContext.Provider
      value={{ open, openChat, closeChat, toggleChat, messages, loading, send, reset }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within a ChatProvider");
  return ctx;
}
