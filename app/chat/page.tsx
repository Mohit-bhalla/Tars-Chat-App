"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import Sidebar from "@/components/chat/Sidebar";
import ChatArea from "@/components/chat/ChatArea";
import { Id } from "@/convex/_generated/dataModel";

export default function ChatPage() {
  const { user } = useUser();
  const [selectedConversationId, setSelectedConversationId] =
    useState<Id<"conversations"> | null>(null);
  const [showChat, setShowChat] = useState(false); // for mobile

  if (!user) return null;

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden">
      {/* Sidebar — hidden on mobile when chat is open */}
      <div
        className={`
          w-full md:w-80 lg:w-96 shrink-0 border-r border-slate-200 bg-white
          ${showChat ? "hidden md:flex" : "flex"} flex-col
        `}
      >
        <Sidebar
          currentUserId={user.id}
          selectedConversationId={selectedConversationId}
          onSelectConversation={(id) => {
            setSelectedConversationId(id);
            setShowChat(true); // on mobile, switch to chat view
          }}
        />
      </div>

      {/* Chat area — hidden on mobile when sidebar is showing */}
      <div
        className={`
          flex-1
          ${showChat ? "flex" : "hidden md:flex"} flex-col
        `}
      >
        <ChatArea
          currentUserId={user.id}
          conversationId={selectedConversationId}
          onBack={() => setShowChat(false)} // mobile back button
        />
      </div>
    </div>
  );
}