import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Appliances
export const addAppliance = internalMutation({
    args: {
        type: v.string(),
        category: v.string(),
        img: v.string(),
        name: v.string(),
        model: v.string(),
        link: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("appliances", args);
    },
});

export const listAppliances = query({
    handler: async (ctx) => {
        return await ctx.db.query("appliances").collect();
    },
});

// Banners
export const addBanner = internalMutation({
    args: {
        img: v.string(),
        link: v.string(),
        height: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("banners", args);
    },
});

export const listBanners = query({
    handler: async (ctx) => {
        return await ctx.db.query("banners").collect();
    },
});

// Bulk Clear (useful for migration)
export const clearAllConfig = internalMutation({
    handler: async (ctx) => {
        const appliances = await ctx.db.query("appliances").collect();
        for (const item of appliances) {
            await ctx.db.delete(item._id);
        }
        const banners = await ctx.db.query("banners").collect();
        for (const item of banners) {
            await ctx.db.delete(item._id);
        }
    },
});
