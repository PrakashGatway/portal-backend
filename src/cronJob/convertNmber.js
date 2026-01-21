import cron from "node-cron";
import { Lead } from "../models/Leads.js";

const CRON_SCHEDULE = "*/60 * * * * *";
const TIMEZONE = "Asia/Kolkata";

const normalizeIndianPhone = (number) => {
    if (!number) return null;

    let phone = String(number).trim();

    // Remove all non-digits
    phone = phone.replace(/\D/g, "");

    // Remove country code / leading prefixes
    if (phone.startsWith("91") && phone.length > 10) {
        phone = phone.slice(-10);
    }

    if (phone.startsWith("0") && phone.length > 10) {
        phone = phone.slice(-10);
    }

    // Validate Indian mobile number
    if (!/^[6-9]\d{9}$/.test(phone)) {
        return null;
    }

    return phone;
};


async function normalizeLeadPhones() {
    try {
        // Fetch latest leads first
        const leads = await Lead.find(
            {
                phone: { $exists: true, $ne: "" },
                $or: [
                    { phone10: { $exists: false } },
                    { phone10: null },
                    { phone10: "" }
                ]
            },
            { _id: 1, phone: 1 }
        )
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();


        if (!leads.length) {
            console.log("ℹ️ No leads found");
            return 0;
        }

        const bulkOps = [];

        for (const lead of leads) {
            const normalizedPhone = normalizeIndianPhone(lead.phone);

            if (normalizedPhone) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: lead._id },
                        update: {
                            $set: {
                                phone10: normalizedPhone, // 🔥 overwrite with 10-digit
                            },
                        },
                    },
                });
            }
        }

        if (!bulkOps.length) {
            console.log("✅ All lead phones already normalized");
            return 0;
        }

        const result = await Lead.bulkWrite(bulkOps, { ordered: false });

        console.log(`✅ Normalized ${result.modifiedCount} lead phones`);
        return result.modifiedCount;

    } catch (error) {
        console.error("❌ Phone normalization cron failed:", error);
        throw error;
    }
}


cron.schedule(
    CRON_SCHEDULE,
    async () => {
        console.log("🔄 Auto-assign cron running:", new Date().toISOString());
        try {
            const assigned = await normalizeLeadPhones();
            console.log(`✅ Assigned ${assigned} leads this run`);
        } catch (err) {
            console.error("❌ Cron error:", err.message);
        }
    },
    { scheduled: true, timezone: TIMEZONE }
);

export const runManualLeadAssignment = normalizeLeadPhones;