"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, MessageSquare } from "lucide-react";
import { formatTimestamp } from "@/lib/utils";

interface ChatAreaProps {
  currentUserId: string;
  conversationId: Id<"conversations"> | null;
  onBack: () => void;
}

export default function ChatArea({
  currentUserId,
  conversationId,
  onBack,
}: ChatAreaProps) {
  const [input, setInput] = useState("");
  const [isAtBottom, setIsAtBottom] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = useQuery(
    api.messages.getMessages,
    conversationId ? { conversationId } : "skip"
  );

  const conversations = useQuery(api.conversations.getMyConversations, {
    currentUserId,
  });

  const typingUsers = useQuery(
    api.messages.getTypingUsers,
    conversationId ? { conversationId, currentUserId } : "skip"
  );

  const sendMessage = useMutation(api.messages.sendMessage);
  const setTyping = useMutation(api.messages.setTyping);
  const markAsRead = useMutation(api.conversations.markAsRead);

  // Get the other user in this conversation
  const currentConvo = conversations?.find((c) => c._id === conversationId);
  const otherUser = currentConvo?.otherUser;

  // Mark as read when opening conversation
  useEffect(() => {
    if (conversationId && currentUserId) {
      markAsRead({ conversationId, userId: currentUserId });
    }
  }, [conversationId, currentUserId, markAsRead]);

  // Auto-scroll to bottom when new messages arrive (only if already at bottom)
  useEffect(() => {
    if (isAtBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAtBottom]);

  // Detect scroll position
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    setIsAtBottom(atBottom);
  };

  // Handle typing indicator
  let typingTimeout: ReturnType<typeof setTimeout>;
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (!conversationId) return;

    setTyping({ conversationId, userId: currentUserId, isTyping: true });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      setTyping({ conversationId, userId: currentUserId, isTyping: false });
    }, 2000);
  };

  const handleSend = async () => {
    if (!input.trim() || !conversationId) return;
    const content = input.trim();
    setInput("");

    await sendMessage({ conversationId, senderId: currentUserId, content });
    setTyping({ conversationId, userId: currentUserId, isTyping: false });

    // Always scroll to bottom after sending
    setIsAtBottom(true);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // No conversation selected
  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50">
        <MessageSquare className="h-16 w-16 text-slate-300 mb-4" />
        <p className="text-slate-400 text-lg font-medium">Select a conversation</p>
        <p className="text-slate-300 text-sm mt-1">
          or search for a user to start chatting
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-white shadow-sm">
        {/* Back button - mobile only */}
        <button
          onClick={onBack}
          className="md:hidden p-1 hover:bg-slate-100 rounded-full"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>

        {otherUser && (
          <>
            <div className="relative">
              <Avatar className="h-9 w-9">
                <AvatarImage src={otherUser.imageUrl} />
                <AvatarFallback>{otherUser.name[0]}</AvatarFallback>
              </Avatar>
              {otherUser.isOnline && (
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-white" />
              )}
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{otherUser.name}</p>
              <p className="text-xs text-slate-400">
                {otherUser.isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
      >
        {messages === undefined ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Avatar className="h-16 w-16 mb-3">
              <AvatarImage src={otherUser?.imageUrl} />
              <AvatarFallback>{otherUser?.name?.[0]}</AvatarFallback>
            </Avatar>
            <p className="text-slate-500 font-medium">{otherUser?.name}</p>
            <p className="text-slate-300 text-sm mt-1">
              Say hello to start the conversation! 👋
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const isMine = msg.senderId === currentUserId;
              const prevMsg = messages[i - 1];
              const showTimestamp =
                !prevMsg ||
                msg._creationTime - prevMsg._creationTime > 5 * 60 * 1000;

              return (
                <div key={msg._id}>
                  {showTimestamp && (
                    <div className="flex justify-center my-3">
                      <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                        {formatTimestamp(msg._creationTime)}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm
                        ${isMine
                          ? "bg-blue-500 text-white rounded-br-sm"
                          : "bg-slate-100 text-slate-800 rounded-bl-sm"
                        }
                        ${msg.isDeleted ? "italic opacity-60" : ""}
                      `}
                    >
                      {msg.isDeleted ? "This message was deleted" : msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* New messages button (shows when scrolled up) */}
      {!isAtBottom && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
          <button
            onClick={() => {
              setIsAtBottom(true);
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }}
            className="bg-blue-500 text-white text-xs px-4 py-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors flex items-center gap-1"
          >
            ↓ New messages
          </button>
        </div>
      )}

      {/* Typing indicator */}
      {typingUsers && typingUsers.length > 0 && (
        <div className="px-4 py-1">
          <span className="text-xs text-slate-400 italic">
            {typingUsers[0]} is typing
            <span className="inline-flex gap-0.5 ml-1">
              <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
            </span>
          </span>
        </div>
      )}

      {/* Input area */}
      <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2 bg-white">
        <Input
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          className="flex-1 rounded-full bg-slate-50 border-slate-200"
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim()}
          size="icon"
          className="rounded-full bg-blue-500 hover:bg-blue-600 h-10 w-10 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}