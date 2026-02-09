
import { query } from "./_generated/server";

export const getLatest = query({
    handler: async (ctx) => {
        const quotes = await ctx.db.query("quotes").order("desc").take(10);
        return quotes.map(q => ({ name: q.name, date: q.date, _creationTime: q._creationTime }));
    }
});
