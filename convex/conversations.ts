import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get or create a conversation between two users
export const getOrCreateConversation = mutation({
  args: {
    currentUserId: v.string(),
    otherUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if a conversation already exists between these two users
    const existing = await ctx.db.query("conversations").collect();

    const found = existing.find((c) => {
      const ids = c.participantIds;
      return (
        ids.includes(args.currentUserId) && ids.includes(args.otherUserId)
      );
    });

    if (found) return found._id;

    // Create a new conversation
    const newId = await ctx.db.insert("conversations", {
      participantIds: [args.currentUserId, args.otherUserId],
      lastMessageTime: Date.now(),
      lastMessagePreview: undefined,
    });

    return newId;
  },
});

// Get all conversations for the current user
export const getMyConversations = query({
  args: { currentUserId: v.string() },
  handler: async (ctx, args) => {
    const allConversations = await ctx.db
      .query("conversations")
      .order("desc")
      .collect();

    // Filter to only conversations this user is part of
    const mine = allConversations.filter((c) =>
      c.participantIds.includes(args.currentUserId)
    );

    // For each conversation, get the other user's info
    const withUserInfo = await Promise.all(
      mine.map(async (convo) => {
        const otherId = convo.participantIds.find(
          (id) => id !== args.currentUserId
        );

        const otherUser = otherId
          ? await ctx.db
              .query("users")
              .withIndex("by_clerkId", (q) => q.eq("clerkId", otherId))
              .unique()
          : null;

        return { ...convo, otherUser };
      })
    );

    return withUserInfo;
  },
});


// read receipts 
// Mark a conversation as read
export const markAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("readReceipts")
      .withIndex("by_conversation_user", (q) =>
        q
          .eq("conversationId", args.conversationId)
          .eq("userId", args.userId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { lastReadTime: Date.now() });
    } else {
      await ctx.db.insert("readReceipts", {
        conversationId: args.conversationId,
        userId: args.userId,
        lastReadTime: Date.now(),
      });
    }
  },
});

// Get unread count for a conversation
export const getUnreadCount = query({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const receipt = await ctx.db
      .query("readReceipts")
      .withIndex("by_conversation_user", (q) =>
        q
          .eq("conversationId", args.conversationId)
          .eq("userId", args.userId)
      )
      .unique();

    const lastReadTime = receipt?.lastReadTime ?? 0;

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    // Count messages after last read time that weren't sent by this user
    return messages.filter(
      (m) =>
        m._creationTime > lastReadTime && m.senderId !== args.userId
    ).length;
  },
});