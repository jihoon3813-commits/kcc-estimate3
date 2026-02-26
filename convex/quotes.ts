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
        // Trim name to prevent whitespace issues
        const normalizedName = args.name.trim().normalize("NFC");
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
        const normalizedName = args.name.trim().normalize("NFC");
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

export const getQuote = query({
    args: { id: v.id("quotes") },
    handler: async (ctx, args) => {
        const quote = await ctx.db.get(args.id);
        if (!quote) return null;
        return {
            ...quote,
            pdfUrl: quote.storageId ? await ctx.storage.getUrl(quote.storageId) : quote.pdfUrl,
        };
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
        const normalizedName = args.name.trim().normalize("NFC");

        // Prepare phone variations to try (clean, dashed, etc)
        const cleanPhone = args.phone.replace(/[^0-9]/g, "");

        // Basic 3-4-4 or 3-3-4 formatting logic for Korea
        let dashedPhone = cleanPhone;
        if (cleanPhone.length === 11) {
            dashedPhone = `${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3, 7)}-${cleanPhone.slice(7)}`;
        } else if (cleanPhone.length === 10) {
            if (cleanPhone.startsWith('02')) {
                dashedPhone = `${cleanPhone.slice(0, 2)}-${cleanPhone.slice(2, 6)}-${cleanPhone.slice(6)}`;
            } else {
                dashedPhone = `${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`;
            }
        }

        // Try exact input, clean (no dashes), and standard dashed format
        const phonesToTry = new Set([args.phone, cleanPhone, dashedPhone]);

        for (const phoneVariant of phonesToTry) {
            let quotes = await ctx.db
                .query("quotes")
                .withIndex("by_name_phone", (q) =>
                    q.eq("name", normalizedName).eq("phone", phoneVariant)
                )
                .order("desc")
                .collect();

            // Filter by statusType if provided
            if (args.statusType) {
                quotes = quotes.filter((q) => q.type === args.statusType);
            }

            if (quotes.length > 0) {
                const quote = quotes[0];
                return {
                    ...quote,
                    pdfUrl: quote.storageId
                        ? await ctx.storage.getUrl(quote.storageId)
                        : quote.pdfUrl,
                };
            }
        }

        return null;
    },
});
