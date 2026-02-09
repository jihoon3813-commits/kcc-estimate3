import { ConvexHttpClient } from "convex/browser";

const DEV_URL = "https://combative-caterpillar-181.convex.cloud";
const PROD_URL = "https://beaming-elk-778.convex.cloud";

async function sync() {
    const devClient = new ConvexHttpClient(DEV_URL);
    const prodClient = new ConvexHttpClient(PROD_URL);

    console.log("Fetching data from Dev...");
    const quotes = await devClient.query("quotes:listQuotes");
    const appliances = await devClient.query("config:listAppliances");
    const banners = await devClient.query("config:listBanners");

    console.log(`Found ${quotes.length} quotes, ${appliances.length} appliances, ${banners.length} banners in Dev.`);

    console.log("Syncing Quotes to Prod...");
    const quoteResult = await prodClient.mutation("sync:syncQuotes", { quotes });
    console.log(`Quotes: Added ${quoteResult.addedCount}, Skipped ${quoteResult.skippedCount}`);

    console.log("Syncing Appliances to Prod...");
    const appResult = await prodClient.mutation("sync:syncAppliances", { appliances });
    console.log(`Appliances: Added ${appResult.addedCount}, Skipped ${appResult.skippedCount}`);

    console.log("Syncing Banners to Prod...");
    const bannerResult = await prodClient.mutation("sync:syncBanners", { banners });
    console.log(`Banners: Added ${bannerResult.addedCount}, Skipped ${bannerResult.skippedCount}`);

    console.log("Migration Sync completed.");
}

sync().catch(console.error);
