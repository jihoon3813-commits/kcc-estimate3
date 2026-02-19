import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
});

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
        const id = await ctx.db.insert("rental_applications", {
            ...args,
            status: "pending",
            createdAt: new Date().toISOString(),
        });

        // Send Discord Notification
        await ctx.scheduler.runAfter(0, internal.discord.sendNotification, {
            type: 'rental',
            name: args.name,
            phone: args.phone,
            selectedAmount: `${args.selectedAmount}만원`,
            address: args.address,
        });

        return id;
    },
});

export const listApplications = query({
    args: {},
    handler: async (ctx) => {
        const apps = await ctx.db.query("rental_applications").order("desc").collect();
        const results = [];

        for (const app of apps) {
            const filesWithUrls = await Promise.all(
                app.files.map(async (f) => ({
                    ...f,
                    url: await ctx.storage.getUrl(f.storageId as any),
                }))
            );
            results.push({
                ...app,
                files: filesWithUrls,
            });
        }

        return results;
    },
});
