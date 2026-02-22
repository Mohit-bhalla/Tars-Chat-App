import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Stores user profiles synced from Clerk
  users: defineTable({
    clerkId: v.string(),        // Clerk's user ID
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    isOnline: v.boolean(),
    lastSeen: v.number(),       // timestamp
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_name", ["name"]),

  // A conversation between two users
  conversations: defineTable({
    participantIds: v.array(v.string()),  // array of clerkIds
    lastMessageTime: v.number(),
    lastMessagePreview: v.optional(v.string()),
  })
    .index("by_lastMessageTime", ["lastMessageTime"]),

  // Individual messages
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.string(),       // clerkId
    content: v.string(),
    isDeleted: v.boolean(),
  })
    .index("by_conversation", ["conversationId"]),

  // Tracks who has read what
  readReceipts: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(),         // clerkId
    lastReadTime: v.number(),
  })
    .index("by_conversation_user", ["conversationId", "userId"]),

  // Typing indicators
  typingIndicators: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(),
    updatedAt: v.number(),
  })
    .index("by_conversation", ["conversationId"]),
});