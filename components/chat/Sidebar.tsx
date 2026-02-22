"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, MessageSquare } from "lucide-react";
import { formatTimestamp } from "@/lib/utils";

interface SidebarProps {
  currentUserId: string;
  selectedConversationId: Id<"conversations"> | null;
  onSelectConversation: (id: Id<"conversations">) => void;
}

export default function Sidebar({
  currentUserId,
  selectedConversationId,
  onSelectConversation,
}: SidebarProps) {
  const [search, setSearch] = useState("");
  const [showUserList, setShowUserList] = useState(false);
  const { user } = useUser();

  const conversations = useQuery(api.conversations.getMyConversations, {
    currentUserId,
  });

  const allUsers = useQuery(api.users.getAllUsers, {
    currentClerkId: currentUserId,
    search: search || undefined,
  });

  const getOrCreate = useMutation(api.conversations.getOrCreateConversation);

  const handleUserClick = async (otherUserId: string) => {
    const id = await getOrCreate({ currentUserId, otherUserId });
    onSelectConversation(id);
    setShowUserList(false);
    setSearch("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback>{user?.firstName?.[0]}</AvatarFallback>
            </Avatar>
            <span className="font-semibold text-slate-800">Tars Chat</span>
          </div>
          <button
            onClick={() => setShowUserList(!showUserList)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            title="New conversation"
          >
            <MessageSquare className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={showUserList ? "Search users..." : "Search conversations..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setShowUserList(true)}
            className="pl-9 bg-slate-50 border-slate-200"
          />
        </div>
      </div>

      {/* User list (shown when searching or clicking new chat) */}
      {showUserList ? (
        <div className="flex-1 overflow-y-auto">
          {allUsers === undefined ? (
            <LoadingSkeleton />
          ) : allUsers.length === 0 ? (
            <EmptyState message={search ? `No users found for "${search}"` : "No other users yet"} />
          ) : (
            <>
              <p className="px-4 py-2 text-xs font-medium text-slate-400 uppercase tracking-wide">
                All Users
              </p>
              {allUsers.map((u) => (
                <button
                  key={u._id}
                  onClick={() => handleUserClick(u.clerkId)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={u.imageUrl} />
                      <AvatarFallback>{u.name[0]}</AvatarFallback>
                    </Avatar>
                    {/* Online indicator */}
                    {u.isOnline && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-slate-800 text-sm">{u.name}</p>
                    <p className="text-xs text-slate-400">
                      {u.isOnline ? "Online" : "Offline"}
                    </p>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      ) : (
        /* Conversations list */
        <div className="flex-1 overflow-y-auto">
          {conversations === undefined ? (
            <LoadingSkeleton />
          ) : conversations.length === 0 ? (
            <EmptyState message="No conversations yet. Search for a user to start chatting!" />
          ) : (
            conversations.map((convo) => (
              <ConversationItem
                key={convo._id}
                convo={convo}
                currentUserId={currentUserId}
                isSelected={selectedConversationId === convo._id}
                onClick={() => onSelectConversation(convo._id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Individual conversation row
function ConversationItem({ convo, currentUserId, isSelected, onClick }: any) {
  const unreadCount = useQuery(api.conversations.getUnreadCount, {
    conversationId: convo._id,
    userId: currentUserId,
  });

  const { otherUser } = convo;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors border-b border-slate-50
        ${isSelected ? "bg-slate-100" : "hover:bg-slate-50"}`}
    >
      <div className="relative flex-shrink-0">
        <Avatar className="h-11 w-11">
          <AvatarImage src={otherUser?.imageUrl} />
          <AvatarFallback>{otherUser?.name?.[0] ?? "?"}</AvatarFallback>
        </Avatar>
        {otherUser?.isOnline && (
          <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
        )}
      </div>

      <div className="flex-1 text-left min-w-0">
        <div className="flex justify-between items-center">
          <p className="font-medium text-slate-800 text-sm truncate">
            {otherUser?.name ?? "Unknown"}
          </p>
          <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
            {formatTimestamp(convo.lastMessageTime)}
          </span>
        </div>
        <div className="flex justify-between items-center mt-0.5">
          <p className="text-xs text-slate-400 truncate">
            {convo.lastMessagePreview ?? "Start a conversation"}
          </p>
          {unreadCount ? (
            <Badge className="ml-2 h-5 min-w-5 flex items-center justify-center bg-blue-500 text-white text-xs rounded-full flex-shrink-0">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="h-11 w-11 rounded-full bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-200 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 px-6 text-center">
      <MessageSquare className="h-10 w-10 text-slate-300 mb-3" />
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}