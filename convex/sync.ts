import { mutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const syncQuotes = mutation({
    args: {
        quotes: v.array(v.any()),
    },
    handler: async (ctx, args) => {
        let addedCount = 0;
        let skippedCount = 0;
        for (const q of args.quotes) {
            // Check if exists by name and phone and date
            const existing = await ctx.db
                .query("quotes")
                .withIndex("by_name_phone", (idx) => idx.eq("name", q.name).eq("phone", q.phone))
                .collect();

            const isAlreadyThere = existing.some(e => e.date === q.date);

            if (isAlreadyThere) {
                skippedCount++;
                continue;
            }

            // Remove _id and _creationTime before inserting
            const { _id, _creationTime, ...data } = q;
            await ctx.db.insert("quotes", data);
            addedCount++;
        }
        return { addedCount, skippedCount };
    },
});

export const syncAppliances = mutation({
    args: {
        appliances: v.array(v.any()),
    },
    handler: async (ctx, args) => {
        let addedCount = 0;
        let skippedCount = 0;
        for (const app of args.appliances) {
            const existing = await ctx.db
                .query("appliances")
                .filter((row) => row.eq(row.field("model"), app.model))
                .first();

            if (existing) {
                skippedCount++;
                continue;
            }

            const { _id, _creationTime, ...data } = app;
            await ctx.db.insert("appliances", data);
            addedCount++;
        }
        return { addedCount, skippedCount };
    },
});

export const syncBanners = mutation({
    args: {
        banners: v.array(v.any()),
    },
    handler: async (ctx, args) => {
        let addedCount = 0;
        let skippedCount = 0;
        for (const b of args.banners) {
            const existing = await ctx.db
                .query("banners")
                .filter((row) => row.eq(row.field("img"), b.img))
                .first();

            if (existing) {
                skippedCount++;
                continue;
            }

            const { _id, _creationTime, ...data } = b;
            await ctx.db.insert("banners", data);
            addedCount++;
        }
        return { addedCount, skippedCount };
    },
});

export const normalizeNames = mutation({
    args: {},
    handler: async (ctx) => {
        const quotes = await ctx.db.query("quotes").collect();
        let fixedCount = 0;
        for (const q of quotes) {
            const normalized = q.name.normalize("NFC");
            if (normalized !== q.name) {
                await ctx.db.patch(q._id, { name: normalized });
                fixedCount++;
            }
        }
        return { fixedCount };
    },
});

