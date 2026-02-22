import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Called when a user logs in — creates or updates their profile
export const upsertUser = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        email: args.email,
        imageUrl: args.imageUrl,
        isOnline: true,
        lastSeen: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      ...args,
      isOnline: true,
      lastSeen: Date.now(),
    });
  },
});

// Get all users except yourself
export const getAllUsers = query({
  args: { currentClerkId: v.string(), search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let users = await ctx.db.query("users").collect();
    users = users.filter((u) => u.clerkId !== args.currentClerkId);

    if (args.search) {
      const lower = args.search.toLowerCase();
      users = users.filter((u) => u.name.toLowerCase().includes(lower));
    }

    return users;
  },
});

// Set online/offline status
export const setOnlineStatus = mutation({
  args: { clerkId: v.string(), isOnline: v.boolean() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (user) {
      await ctx.db.patch(user._id, {
        isOnline: args.isOnline,
        lastSeen: Date.now(),
      });
    }
  },
});

// Get a single user by clerkId
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});