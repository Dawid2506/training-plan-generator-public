import React from "react";

interface ChatMessageProps {
  message: string;
  isAnswer: boolean;
  timestamp: Date;
  status?: "sending" | "sent" | "error";
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isAnswer,
  timestamp,
  status,
}) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={`flex ${isAnswer ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[70%] rounded-lg p-3 ${
          isAnswer
            ? "bg-muted text-neutral-950"
            : "bg-second text-primary-foreground"
        }`}
      >
        <div className="text-sm leading-relaxed">{message}</div>
        <div
          className={`text-xs mt-1 opacity-70 flex items-center gap-1 ${
            isAnswer ? "justify-start" : "justify-end"
          }`}
        >
          <span>{formatTime(timestamp)}</span>
          {!isAnswer && status && (
            <span className="text-xs">
              {status === "sending" && "⏳"}
              {status === "sent" && "✓"}
              {status === "error" && "❌"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
