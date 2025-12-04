import cron from "node-cron";
import User from "../models/User.js";
import { Lead } from "../models/Leads.js";

const CRON_SCHEDULE = "*/20 * * * * *"; // every 5 min (change as needed)
const TIMEZONE = "Asia/Kolkata";


async function assignOldestLeadsOneToOne() {
  const counselors = await User.find({ role: "counselor" })
    .select("_id")
    .sort({ _id: 1 })
    .lean();

  if (!counselors.length) {
    console.log("⚠️ No counselors found.");
    return 0;
  }
  console.log(`ℹ️ Found ${counselors.length} counselors.`);



  const leads = await Lead.find({
    $or: [
        { assignedCounselor: { $exists: false } },
        { assignedCounselor: null }
    ]
  })
    .sort({ createdAt: 1, _id: 1 }) // 🔥 oldest first
    .limit(counselors.length)
    .lean();

    console.log(`ℹ️ Found ${leads.length} unassigned leads.`);

  if (!leads.length) {
    console.log("✔ No unassigned leads.");
    return 0;
  }

  const ops = leads.map((lead, i) => ({
    updateOne: {
      filter: { _id: lead._id },
      update: {
        $set: {
          assignedCounselor: counselors[i]._id
        }
      }
    }
  }));

  const result = await Lead.bulkWrite(ops);
  return result.modifiedCount || ops.length;
}


cron.schedule(
  CRON_SCHEDULE,
  async () => {
    console.log("🔄 Auto-assign cron running:", new Date().toISOString());
    try {
      const assigned = await assignOldestLeadsOneToOne();
      console.log(`✅ Assigned ${assigned} leads this run`);
    } catch (err) {
      console.error("❌ Cron error:", err.message);
    }
  },
  { scheduled: true, timezone: TIMEZONE }
);

export const runManualLeadAssignment = assignOldestLeadsOneToOne;
