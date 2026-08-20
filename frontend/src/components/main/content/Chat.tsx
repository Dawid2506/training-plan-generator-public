import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ChatMessage from "./ChatMessage";
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

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [backgroundMessage, setBackgroundMessage] = useState(
    "Start chatting with your assistant!"
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadLatestSession();
  }, []);

  const loadLatestSession = async () => {
    try {
      setIsInitializing(true);
      const response = await fetch(
        buildApiUrl(API_CONFIG.endpoints.chat.latestSession),
        {
          credentials: "include",
        }
      );

      if (response.status === 403) {
        console.error("Insufficient roles to access AI chat");
        setBackgroundMessage(
          "You do not have permission to access the AI chat."
        );
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || !currentSession) return;

    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      content: inputValue,
      isAnswer: false,
      createdAt: new Date().toISOString(),
      status: "sending",
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    const messageContent = inputValue;
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.endpoints.chat.messages(currentSession.id)),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content: messageContent }),
        }
      );

      if (response.ok) {
        const data = await response.json();

        setMessages((prev) => {
          const withoutTemp = prev.filter(
            (msg) => msg.id !== tempUserMessage.id
          );
          return [...withoutTemp, data.userMessage, data.aiResponse];
        });
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempUserMessage.id
              ? { ...msg, status: "error" as const }
              : msg
          )
        );
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempUserMessage.id
            ? { ...msg, status: "error" as const }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const createNewSession = async () => {
    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.endpoints.chat.sessions),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title: "New conversation" }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCurrentSession(data.session);
        setMessages([]);
      }
    } catch (error) {
      console.error("Error creating session:", error);
    }
  };

  if (isInitializing) {
    return (
      <div className="w-full rounded-lg shadow-lg bg-background p-4 flex items-center justify-center h-[90vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg shadow-lg bg-background p-4 flex flex-col h-[90vh]">
      <header className="flex items-center justify-between mb-4 pb-4 border-b">
        <h2 className="text-xl font-semibold">
          {currentSession?.title || "Business AI Assistant"}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={createNewSession}
          disabled={isLoading}
        >
          New chat
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2">
        {messages.length === 0 ? (
          <div className="text-center text-bright-text py-8">
            <p>{backgroundMessage}</p>
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
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask for business, strategy, marketing..."
          disabled={isLoading || !currentSession}
          className="flex-1"
        />
        <Button
          variant="secondary"
          type="submit"
          disabled={!inputValue.trim() || isLoading || !currentSession}
        >
          {isLoading ? "..." : "Send"}
        </Button>
      </form>
    </div>
  );
};

export default Chat;
