import React, { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, Smile } from "lucide-react";
import { ChatMessage } from "../types";

interface Props {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (text: string) => void;
  onClose: () => void;
}

export const ChatPanel: React.FC<Props> = ({
  messages,
  currentUserId,
  onSendMessage,
  onClose,
}) => {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const quickEmojis = ["👍", "🎉", "🔥", "❤️", "🙌"];

  return (
    <div className="w-80 md:w-96 h-full flex flex-col bg-slate-900 border-l border-slate-800 text-slate-100 shadow-2xl select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">In-Call Chat</h3>
            <p className="text-[11px] text-slate-400">Messages sent to everyone</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800"
        >
          ✕
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-600" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.isSystem) {
              return (
                <div key={msg.id} className="text-center my-2 text-[11px] text-slate-400 italic">
                  {msg.text}
                </div>
              );
            }

            const isMe = msg.senderId === currentUserId;
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div className="flex items-baseline gap-2 mb-1 px-1">
                  <span className="font-semibold text-[11px] text-slate-300">
                    {isMe ? "You" : msg.senderName}
                  </span>
                  <span className="text-[10px] text-slate-400">{timeStr}</span>
                </div>
                <div
                  className={`px-3 py-2 rounded-2xl max-w-[85%] break-words leading-relaxed shadow-sm ${
                    isMe
                      ? "bg-indigo-600 text-white rounded-tr-none"
                      : "bg-slate-800 border border-slate-700/60 text-slate-200 rounded-tl-none"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Emojis */}
      <div className="flex items-center gap-1.5 px-4 py-1.5 border-t border-slate-800 bg-slate-950/40">
        {quickEmojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSendMessage(emoji)}
            className="p-1 text-sm hover:scale-125 transition-transform"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input box */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Send a message to everyone..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-40 transition-colors shadow-md"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
