import cron from "node-cron";
import { Lead } from "../models/Leads.js";

const getDateRangeIST = (dateStr) => {
    const startIST = new Date(`${dateStr}T00:00:00+05:30`);
    const endIST = new Date(`${dateStr}T23:59:59.999+05:30`);

    return {
        start: new Date(startIST.toISOString()),
        end: new Date(endIST.toISOString())
    };
};

cron.schedule("*/1 * * * * *", async () => {
    console.log("⏳ Running Lead Status Cron...");

    try {
        // 🔥 CHANGE DATE HERE
        const { start, end } = getDateRangeIST("2026-03-19");

        const leads = await Lead.find({ phone10: { $exists: true } })
            .select("_id phone10 status");

        for (const lead of leads) {
            const logs = await Leadlogs.find({
                phone: { $regex: `${lead.phone10}$` },
                createdAt: { $gte: start, $lte: end }
            }).lean();

            if (!logs.length) continue;

            console.log(`📊 Logs for ${lead.phone10}: ${logs.length}`);

            const allMissed = logs.every(log => Number(log.duration) === 0);

            if (allMissed) {
                if (lead.status !== "notReachable") {
                    await Lead.updateOne(
                        { _id: lead._id },
                        { status: "notReachable" }
                    );
                    console.log(`✅ Updated ${lead.phone10} → notReachable`);
                }
            }
        }

        console.log("✅ Lead Status Cron Completed");

    } catch (err) {
        console.error("❌ Cron Error:", err.message);
    }
});