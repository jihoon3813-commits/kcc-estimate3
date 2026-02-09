
const { ConvexReactClient } = require("convex/react");
const api = require("./convex/_generated/api").api;

const client = new ConvexReactClient("https://beaming-elk-778.convex.cloud");

async function check() {
    const quotes = await client.query(api.quotes.listQuotes);
    const newest = quotes[0];
    console.log("Newest Quote Name:", newest.name);
    console.log("Newest Quote Phone:", newest.phone);
    console.log("Newest Quote Date:", newest.date);
    process.exit(0);
}

check();
