import { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
console.log("Initializing Convex client with URL:", convexUrl);
const convex = new ConvexReactClient(convexUrl);

/**
 * 견적 데이터 저장
 */
export const saveQuote = async (data, file) => {
    let storageId = undefined;

    if (file) {
        try {
            console.log("Starting PDF upload...");
            // 1. Get upload URL
            const postUrl = await convex.mutation(api.quotes.generateUploadUrl);
            console.log("Got upload URL:", postUrl);

            // 2. Upload file
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });

            if (!result.ok) throw new Error("File upload failed");

            const { storageId: sid } = await result.json();
            storageId = sid;
            console.log("File uploaded successfully, storageId:", storageId);
        } catch (error) {
            console.error("PDF Upload Error:", error);
        }
    }

    const params = {
        date: new Date().toISOString().split('T')[0],
        branch: data.branch || "",
        type: data.statusType || "가견적",
        name: data.customerName || "",
        phone: data.customerPhone || "",
        address: data.address || "",
        kccPrice: Number(data.totalSum) || 0,
        finalQuote: Number(data.finalQuote) || 0,
        finalBenefit: Number(data.finalBenefit) || 0,
        discountRate: Number(data.discountRate) || 0,
        extraDiscount: Number(data.extraDiscount) || 0,
        marginAmt: Number(data.marginAmount) || 0,
        marginRate: Number(data.marginRate) || 0,
        sub24: Number(data.subs[24]) || 0,
        sub36: Number(data.subs[36]) || 0,
        sub48: Number(data.subs[48]) || 0,
        sub60: Number(data.subs[60]) || 0,
        items: JSON.stringify(data.items || []),
        storageId: storageId || undefined,
        pdfUrl: "",
        remark: ""
    };

    try {
        console.log("Saving quote to Convex...", params);
        const id = await convex.mutation(api.quotes.saveQuote, params);
        console.log("Quote saved successfully, ID:", id);
        return { success: true, id };
    } catch (error) {
        console.error("Convex Save Error:", error);
        return { success: false, message: error.message };
    }
};

export const getAdminQuoteList = async () => {
    try {
        const data = await convex.query(api.quotes.listQuotes);
        return { success: true, data: data.map(q => ({ ...q, id: q._id })) };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const updateQuoteRemark = async (params) => {
    try {
        await convex.mutation(api.quotes.updateRemark, { id: params.id, remark: params.remark });
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const updateQuoteItems = async (params) => {
    try {
        await convex.mutation(api.quotes.updateItems, { id: params.id, items: JSON.stringify(params.items) });
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

/**
 * 견적 데이터 조회
 */
export const searchQuote = async (name, phone, statusType) => {
    try {
        const quote = await convex.query(api.quotes.searchQuote, { name, phone, statusType });
        if (!quote) return { success: false, message: "일치하는 견적 정보를 찾을 수 없습니다." };

        const [appliances, banners] = await Promise.all([
            convex.query(api.config.listAppliances),
            convex.query(api.config.listBanners)
        ]);

        const formattedAppliances = { A: [], B: [] };
        appliances.forEach(app => {
            formattedAppliances[app.type].push({
                type: app.type,
                cat: app.category,
                img: app.img,
                name: app.name,
                model: app.model,
                link: app.link
            });
        });

        return {
            success: true,
            data: {
                ...quote,
                subs: { 24: quote.sub24, 36: quote.sub36, 48: quote.sub48, 60: quote.sub60 },
                items: JSON.parse(quote.items || "[]")
            },
            config: {
                appliances: formattedAppliances,
                banners: banners
            }
        };
    } catch (error) {
        return { success: false, message: error.message };
    }
};
