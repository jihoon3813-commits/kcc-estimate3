
import { ConvexReactClient } from "convex/react";
import { api } from "./convex/_generated/api.js";

// We need the prod URL for giant-cow-962
const convexUrl = "https://giant-cow-962.convex.cloud";
const client = new ConvexReactClient(convexUrl);

const banners = [{
    img: "https://cdn.imweb.me/upload/S20250904697320f4fd9ed/4fbd6048d068a.png",
    link: "https://my-interior.co.kr/product_vilex",
    height: 100
}];

async function migrate() {
    console.log("Migrating banners to PROD...");
    try {
        const result = await client.mutation(api.sync.syncBanners, { banners });
        console.log("Migration result:", result);
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

migrate();
function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
