import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Quotes Mutations
export const saveQuote = mutation({
    args: {
        date: v.string(),
        branch: v.optional(v.string()),
        type: v.string(),
        name: v.string(),
        phone: v.string(),
        address: v.optional(v.string()),
        kccPrice: v.number(),
        finalQuote: v.number(),
        finalBenefit: v.number(),
        discountRate: v.number(),
        extraDiscount: v.number(),
        marginAmt: v.optional(v.number()),
        marginRate: v.optional(v.number()),
        sub24: v.number(),
        sub36: v.number(),
        sub48: v.number(),
        sub60: v.number(),
        items: v.string(),
        storageId: v.optional(v.id("_storage")),
        pdfUrl: v.optional(v.string()),
        remark: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const normalizedName = args.name.normalize("NFC");
        const quoteId = await ctx.db.insert("quotes", { ...args, name: normalizedName });
        return quoteId;
    },
});

export const internalSaveQuote = internalMutation({
    args: {
        date: v.string(),
        branch: v.optional(v.string()),
        type: v.string(),
        name: v.string(),
        phone: v.string(),
        address: v.optional(v.string()),
        kccPrice: v.number(),
        finalQuote: v.number(),
        finalBenefit: v.number(),
        discountRate: v.number(),
        extraDiscount: v.number(),
        marginAmt: v.optional(v.number()),
        marginRate: v.optional(v.number()),
        sub24: v.number(),
        sub36: v.number(),
        sub48: v.number(),
        sub60: v.number(),
        items: v.string(),
        pdfUrl: v.optional(v.string()),
        remark: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const normalizedName = args.name.normalize("NFC");
        const quoteId = await ctx.db.insert("quotes", { ...args, name: normalizedName });
        return quoteId;
    },
});

export const updateRemark = mutation({
    args: {
        id: v.id("quotes"),
        remark: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { remark: args.remark });
    },
});

export const updateItems = mutation({
    args: {
        id: v.id("quotes"),
        items: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { items: args.items });
    },
});

export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});

export const clearAllQuotes = internalMutation({
    args: {},
    handler: async (ctx) => {
        const quotes = await ctx.db.query("quotes").collect();
        for (const q of quotes) {
            await ctx.db.delete(q._id);
        }
    },
});

// Queries
export const listQuotes = query({
    handler: async (ctx) => {
        const quotes = await ctx.db.query("quotes").order("desc").collect();
        return Promise.all(
            quotes.map(async (q) => ({
                ...q,
                pdfUrl: q.storageId ? await ctx.storage.getUrl(q.storageId) : q.pdfUrl,
            }))
        );
    },
});

export const searchQuote = query({
    args: {
        name: v.string(),
        phone: v.string(),
        statusType: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const normalizedName = args.name.normalize("NFC");
        let quotes = await ctx.db
            .query("quotes")
            .withIndex("by_name_phone", (q) =>
                q.eq("name", normalizedName).eq("phone", args.phone)
            )
            .order("desc")
            .collect();

        if (args.statusType) {
            quotes = quotes.filter((q) => q.type === args.statusType);
        }

        const quote = quotes[0];
        if (!quote) return null;

        return {
            ...quote,
            pdfUrl: quote.storageId
                ? await ctx.storage.getUrl(quote.storageId)
                : quote.pdfUrl,
        };
    },
});
