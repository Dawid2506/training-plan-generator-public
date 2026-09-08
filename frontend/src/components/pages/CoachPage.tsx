import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PlusIcon, SendHorizonalIcon, SparklesIcon } from "lucide-react";

import { ChatMessage } from "@/components/coach/ChatMessage";
import { ThinkingIndicator } from "@/components/coach/ThinkingIndicator";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { API_CONFIG, buildApiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Must match COACH.maxUserMessageChars on the backend. */
const MAX_MESSAGE_CHARS = 4000;
/** Where the counter appears, so it only shows up when it is relevant. */
const COUNTER_THRESHOLD = 3600;

interface Message {
  id: string;
  content: string;
  isAnswer: boolean;
  createdAt: string;
  status?: "sending" | "sent" | "error";
  toolsUsed?: string[];
}

interface Session {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

// Phrased around what the tools can actually answer - a suggestion the coach
// has to guess at teaches the athlete that it guesses.
const SUGGESTIONS = [
  "How has my weekly volume trended over the last month?",
  "Compare my last three hard sessions.",
  "Am I spending enough time in Zone 2?",
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
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Grow the composer with its content. Reset to auto first: without it
  // scrollHeight only ever reports the current height and the box never shrinks.
  useLayoutEffect(() => {
    const element = inputRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [inputValue]);

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

    const markFailed = () =>
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempUserMessage.id ? { ...msg, status: "error" as const } : msg,
        ),
      );

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
          { ...data.aiResponse, toolsUsed: data.toolsUsed },
        ]);
        return;
      }

      // The cost guards each return a distinct code, and they mean genuinely
      // different things to the athlete: wait a moment, slow down, or come back
      // tomorrow. Collapsing them into one message would be unhelpful.
      const problem = await response.json().catch(() => ({}));
      const notice =
        problem.code === "coach_busy"
          ? "One question at a time - still working on the last one."
          : problem.code === "coach_burst"
            ? "Too many questions at once. Give it a minute."
            : problem.code === "daily_token_ceiling"
              ? "You've hit today's usage limit. Try again tomorrow."
              : problem.message;

      markFailed();
      if (notice) {
        setEmptyMessage(notice);
      }
    } catch (error) {
      console.error("Chat error:", error);
      markFailed();
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

  const overLimit = inputValue.length >= MAX_MESSAGE_CHARS;

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
              toolsUsed={msg.toolsUsed}
            />
          ))
        )}

        {isLoading && <ThinkingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void sendMessage(inputValue);
        }}
        className="flex shrink-0 items-end gap-2 border-t border-border p-3 sm:p-4"
      >
        <div className="flex-1">
          <Textarea
            ref={inputRef}
            rows={1}
            value={inputValue}
            maxLength={MAX_MESSAGE_CHARS}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends, Shift+Enter breaks the line. The isComposing guard
              // is not optional: without it an IME user pressing Enter to accept
              // a candidate would send a half-finished message instead.
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.metaKey &&
                !event.ctrlKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                void sendMessage(inputValue);
              }
            }}
            placeholder={
              currentSession ? "Ask your coach anything…" : "Coach unavailable"
            }
            disabled={isLoading || !currentSession}
            className="max-h-48 min-h-10 resize-none"
          />
          {inputValue.length > COUNTER_THRESHOLD && (
            <p
              className={cn(
                "tnum mt-1 px-1 text-right text-[11px] text-muted-foreground",
                overLimit && "text-destructive",
              )}
            >
              {inputValue.length} / {MAX_MESSAGE_CHARS}
            </p>
          )}
        </div>
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
