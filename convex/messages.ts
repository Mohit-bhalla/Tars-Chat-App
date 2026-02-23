import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Send a message
export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: args.senderId,
      content: args.content,
      isDeleted: false,
    });

    // Update conversation preview
    await ctx.db
      .query("conversations")
      .filter((q) => q.eq(q.field("_id"), args.conversationId))
      .unique()
      .then(async (convo) => {
        if (convo) {
          await ctx.db.patch(convo._id, {
            lastMessageTime: Date.now(),
            lastMessagePreview: args.content.slice(0, 60),
          });
        }
      });

    return messageId;
  },
});

// Get all messages in a conversation — real time!
export const getMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();
  },
});




//Type indicators setup
// Set typing indicator
export const setTyping = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
    isTyping: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .unique();

    if (args.isTyping) {
      if (existing) {
        await ctx.db.patch(existing._id, { updatedAt: Date.now() });
      } else {
        await ctx.db.insert("typingIndicators", {
          conversationId: args.conversationId,
          userId: args.userId,
          updatedAt: Date.now(),
        });
      }
    } else {
      if (existing) await ctx.db.delete(existing._id);
    }
  },
});

// Get who is typing in a conversation
export const getTypingUsers = query({
  args: {
    conversationId: v.id("conversations"),
    currentUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const twoSecondsAgo = Date.now() - 2000;

    const typing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    // Only return others who typed recently
    const active = typing.filter(
      (t) => t.userId !== args.currentUserId && t.updatedAt > twoSecondsAgo
    );

    // Get their names
    const withNames = await Promise.all(
      active.map(async (t) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", t.userId))
          .unique();
        return user?.name ?? "Someone";
      })
    );

    return withNames;
  },
});


// Soft delete a message (keeps record, just marks it deleted)
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
    senderId: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);

    // Make sure only the sender can delete their own message
    if (!message || message.senderId !== args.senderId) {
      throw new Error("Not authorized to delete this message");
    }

    await ctx.db.patch(args.messageId, { isDeleted: true });
  },
});