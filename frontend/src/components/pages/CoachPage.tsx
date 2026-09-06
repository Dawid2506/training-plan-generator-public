import { useEffect, useRef, useState } from "react";
import { PlusIcon, SendHorizonalIcon, SparklesIcon } from "lucide-react";

import { ChatMessage } from "@/components/coach/ChatMessage";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { API_CONFIG, buildApiUrl } from "@/lib/api";

interface Message {
  id: string;
  content: string;
  isAnswer: boolean;
  createdAt: string;
  status?: "sending" | "sent" | "error";
}

interface Session {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

const SUGGESTIONS = [
  "How should I structure next week?",
  "Am I recovering enough between hard sessions?",
  "Build me a threshold session for Thursday.",
];

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [emptyMessage, setEmptyMessage] = useState(
    "Ask about pacing, recovery, or what to do next - the coach can see your training.",
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    const loadLatestSession = async () => {
      try {
        setIsInitializing(true);
        const response = await fetch(
          buildApiUrl(API_CONFIG.endpoints.chat.latestSession),
          { credentials: "include" },
        );

        if (response.status === 403) {
          setEmptyMessage("You do not have permission to access the AI coach.");
          return;
        }

        if (response.ok) {
          const data = await response.json();
          setCurrentSession(data.session);
          setMessages(data.messages || []);
        } else {
          console.error("Failed to load session");
        }
      } catch (error) {
        console.error("Error loading session:", error);
      } finally {
        setIsInitializing(false);
      }
    };

    void loadLatestSession();
  }, []);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading || !currentSession) return;

    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      content,
      isAnswer: false,
      createdAt: new Date().toISOString(),
      status: "sending",
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.endpoints.chat.messages(currentSession.id)),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        // Keep the optimistic message's id so React reuses the same element -
        // swapping the key would replay its entrance animation as a blink, and
        // the "sent" tick would never be seen.
        setMessages((prev) => [
          ...prev.map((msg) =>
            msg.id === tempUserMessage.id
              ? { ...data.userMessage, id: tempUserMessage.id, status: "sent" as const }
              : msg,
          ),
          data.aiResponse,
        ]);
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempUserMessage.id ? { ...msg, status: "error" as const } : msg,
          ),
        );
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempUserMessage.id ? { ...msg, status: "error" as const } : msg,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const createNewSession = async () => {
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.endpoints.chat.sessions), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: "New conversation" }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentSession(data.session);
        setMessages([]);
        inputRef.current?.focus();
      }
    } catch (error) {
      console.error("Error creating session:", error);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[26rem] flex-col overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
            <SparklesIcon className="size-3.5" />
          </span>
          <p className="truncate text-[14px] font-semibold tracking-[-0.01em]">
            {currentSession?.title || "AI coach"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={createNewSession} disabled={isLoading}>
          <PlusIcon />
          New chat
        </Button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
        {isInitializing ? (
          <div className="space-y-4">
            <Skeleton className="h-14 w-2/3" />
            <Skeleton className="ml-auto h-10 w-1/2" />
            <Skeleton className="h-20 w-3/4" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
            icon={<SparklesIcon />}
            title="Start a conversation"
            description={emptyMessage}
            action={
              currentSession ? (
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => void sendMessage(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              ) : undefined
              }
            />
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg.content}
              isAnswer={msg.isAnswer}
              timestamp={new Date(msg.createdAt)}
              status={msg.status}
            />
          ))
        )}

        {isLoading && (
          <div className="flex gap-3">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-muted text-primary">
              <SparklesIcon className="size-3.5" />
            </span>
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3.5">
              {[0, 1, 2].map((index) => (
                <span
                  key={index}
                  className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
                  style={{ animationDelay: `${index * 120}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void sendMessage(inputValue);
        }}
        className="flex shrink-0 items-center gap-2 border-t border-border p-3 sm:p-4"
      >
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder={
            currentSession ? "Ask your coach anything…" : "Coach unavailable"
          }
          disabled={isLoading || !currentSession}
          className="h-10 flex-1"
        />
        <Button
          type="submit"
          variant="primary"
          size="icon"
          className="size-10"
          disabled={!inputValue.trim() || isLoading || !currentSession}
          aria-label="Send message"
        >
          <SendHorizonalIcon />
        </Button>
      </form>
    </div>
  );
}
