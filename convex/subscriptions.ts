
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const submitApplication = mutation({
    args: {
        quoteId: v.optional(v.id("quotes")),
        name: v.string(),
        phone: v.string(),
        address: v.string(),
        birthDate: v.string(),
        gender: v.string(),
        selectedAmount: v.number(),
        ownershipType: v.string(),
        files: v.array(v.object({
            category: v.string(),
            name: v.string(),
            storageId: v.string(),
        })),
        agreements: v.object({
            agree1: v.boolean(),
            agree2: v.boolean(),
            agree3: v.boolean(),
        }),
    },
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("subscription_applications", {
            ...args,
            status: "pending",
            createdAt: new Date().toISOString(),
        });
        return id;
    },
});

export const listApplications = query({
    args: {},
    handler: async (ctx) => {
        const apps = await ctx.db.query("subscription_applications").order("desc").collect();
        const results = [];

        for (const app of apps) {
            let monthlyAmount = 0;
            if (app.quoteId) {
                const quote = await ctx.db.get(app.quoteId);
                if (quote) {
                    const fb = (quote as any).finalBenefit || 0;
                    const term = app.selectedAmount;
                    const multiplier = term === 24 ? 1.15 : (term === 36 ? 1.20 : (term === 48 ? 1.25 : 1.30));
                    monthlyAmount = Math.floor(fb / term * multiplier / 10) * 10;
                }
            }

            const filesWithUrls = await Promise.all(
                app.files.map(async (f) => ({
                    ...f,
                    url: await ctx.storage.getUrl(f.storageId as any),
                }))
            );
            results.push({
                ...app,
                monthlyAmount,
                files: filesWithUrls,
            });
        }

        return results;
    },
});
