import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    quotes: defineTable({
        date: v.string(),
        branch: v.optional(v.string()),
        type: v.string(), // 가견적, 정식견적 등
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
        items: v.string(), // JSON string for now to keep it simple and compatible with existing logic
        storageId: v.optional(v.id("_storage")),
        pdfUrl: v.optional(v.string()),
        remark: v.optional(v.string()),
    }).index("by_name_phone", ["name", "phone"]),

    appliances: defineTable({
        type: v.string(), // A, B
        category: v.string(),
        img: v.string(),
        name: v.string(),
        model: v.string(),
        link: v.string(),
    }),

    banners: defineTable({
        img: v.string(),
        link: v.string(),
        height: v.optional(v.any()), // Can be string or number
    }),
});
