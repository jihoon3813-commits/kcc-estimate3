import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const GAS_API_URL = "https://script.google.com/macros/s/AKfycby_MxxNoFNbDMTISH8G4WVpxoVuFSfngw110l2matqS3i0paXPLPxXErv7Qw93eShOW/exec";

export const importFromGas = action({
    handler: async (ctx) => {
        console.log("Starting migration from GAS...");

        // 1. Fetch Admin List (Quotes)
        const quoteResponse = await fetch(GAS_API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "admin_list" }),
        });
        const quoteResult = await quoteResponse.json();

        if (quoteResult.success) {
            console.log(`Fetched ${quoteResult.data.length} quotes.`);
            for (const q of quoteResult.data) {
                await ctx.runMutation(internal.quotes.internalSaveQuote, {
                    date: q.date,
                    branch: q.branch,
                    type: q.type,
                    name: q.name,
                    phone: q.phone,
                    address: q.address,
                    kccPrice: Number(q.kccPrice) || 0,
                    finalQuote: Number(q.finalQuote) || 0,
                    finalBenefit: Number(q.finalBenefit) || 0,
                    discountRate: Number(q.discountRate) || 0,
                    extraDiscount: Number(q.extraDiscount) || 0,
                    marginAmt: Number(q.marginAmt) || 0,
                    marginRate: Number(q.marginRate) || 0,
                    sub24: Number(q.sub24) || 0,
                    sub36: Number(q.sub36) || 0,
                    sub48: Number(q.sub48) || 0,
                    sub60: Number(q.sub60) || 0,
                    items: typeof q.items === 'string' ? q.items : JSON.stringify(q.items || []),
                    pdfUrl: q.pdfUrl,
                    remark: q.remark,
                });
            }
        }

        // 2. Fetch Config (Appliances & Banners)
        let configResult: any = null;
        if (quoteResult.data && quoteResult.data.length > 0) {
            const firstQuote = quoteResult.data[0];
            const name = encodeURIComponent(firstQuote.name);
            const phone = firstQuote.phone;
            const configResponse = await fetch(`${GAS_API_URL}?action=search&name=${name}&phone=${phone}`);
            configResult = await configResponse.json();
        } else {
            const configResponse = await fetch(`${GAS_API_URL}?action=get_config`);
            configResult = await configResponse.json();
        }

        if (configResult.config) {
            const { appliances, banners } = configResult.config;

            await ctx.runMutation(internal.config.clearAllConfig, {});

            if (appliances) {
                for (const type of ['A', 'B']) {
                    for (const app of appliances[type]) {
                        await ctx.runMutation(internal.config.addAppliance, {
                            type: app.type,
                            category: app.cat,
                            img: app.img,
                            name: app.name,
                            model: app.model,
                            link: app.link
                        });
                    }
                }
            }

            if (banners) {
                for (const b of banners) {
                    await ctx.runMutation(internal.config.addBanner, {
                        img: b.img,
                        link: b.link,
                        height: b.height
                    });
                }
            }
        }

        return { success: true, message: "Migration completed" };
    },
});
