import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
});

export const submitApplication = mutation({
    args: {
        id: v.optional(v.id("rental_applications")), // Optional ID for existing draft
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
        const { id, ...data } = args;
        let finalId;

        if (id) {
            await ctx.db.patch(id, {
                ...data,
                status: "접수",
            });
            finalId = id;
        } else {
            finalId = await ctx.db.insert("rental_applications", {
                ...data,
                status: "접수",
                createdAt: new Date().toISOString(),
            });
        }

        // Send Discord Notification
        await ctx.scheduler.runAfter(0, internal.discord.sendNotification, {
            type: 'rental',
            name: args.name,
            phone: args.phone,
            selectedAmount: `${args.selectedAmount}만원`,
            address: args.address,
        });

        return finalId;
    },
});

export const getDraft = query({
    args: { quoteId: v.optional(v.id("quotes")), name: v.string(), phone: v.string() },
    handler: async (ctx, args) => {
        let draft;
        if (args.quoteId) {
            draft = await ctx.db
                .query("rental_applications")
                .withIndex("by_quoteId", (q) => q.eq("quoteId", args.quoteId))
                .filter((q) => q.eq(q.field("status"), "임시저장"))
                .first();
        }
        if (!draft) {
            draft = await ctx.db
                .query("rental_applications")
                .withIndex("by_name_phone", (q) => q.eq("name", args.name).eq("phone", args.phone))
                .filter((q) => q.eq(q.field("status"), "임시저장"))
                .order("desc")
                .first();
        }
        return draft;
    },
});

export const saveDraft = mutation({
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
        let existingDraft;
        if (args.quoteId) {
            existingDraft = await ctx.db
                .query("rental_applications")
                .withIndex("by_quoteId", (q) => q.eq("quoteId", args.quoteId))
                .filter((q) => q.eq(q.field("status"), "임시저장"))
                .first();
        }
        if (!existingDraft) {
            existingDraft = await ctx.db
                .query("rental_applications")
                .withIndex("by_name_phone", (q) => q.eq("name", args.name).eq("phone", args.phone))
                .filter((q) => q.eq(q.field("status"), "임시저장"))
                .order("desc")
                .first();
        }

        if (existingDraft) {
            await ctx.db.patch(existingDraft._id, {
                ...args,
            });
            return existingDraft._id;
        } else {
            return await ctx.db.insert("rental_applications", {
                ...args,
                status: "임시저장",
                createdAt: new Date().toISOString(),
            });
        }
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

export const updateStatus = mutation({
    args: {
        id: v.id("rental_applications"),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        console.log("Updating rental status for:", args.id, "to:", args.status);
        await ctx.db.patch(args.id, { status: args.status });
    },
});
