import cron from "node-cron";
import User from "../models/User.js";
import { Lead } from "../models/Leads.js";

const CRON_SCHEDULE = "*/60 * * * * *"; // every 5 min (change as needed)
const TIMEZONE = "Asia/Kolkata";


// async function assignOldestLeadsOneToOne() {
//   const counselors = await User.find({ role: "counselor", isActive: true })
//     .select("_id")
//     .sort({ _id: 1 })
//     .lean();

//   if (!counselors.length) {
//     console.log("⚠️ No counselors found.");
//     return 0;
//   }


//   const leads = await Lead.find({
//     $or: [
//       { assignedCounselor: { $exists: false } },
//       { assignedCounselor: null }
//     ]
//   })
//     .sort({ createdAt: 1, _id: 1 })
//     .limit(counselors.length)
//     .lean();

//   console.log(leads)
//   if (!leads.length) {
//     return 0;
//   }
//   if (leads.length == 1) {
//     let lastAssigned = await Lead.findOne({ assignedCounselor: { $exists: true } }).sort({ createdAt: -1 });

//     const lastId = lastAssigned.assignedCounselor.toString();

//     const assignTo = counselors.find(
//       (c) => c._id.toString() != lastId
//     );

//     await Lead.updateOne(
//       { _id: leads[0]._id },
//       { $set: { assignedCounselor: assignTo._id } }
//     );
//     return 1;
//   } else {
//     const ops = leads.map((lead, i) => ({
//       updateOne: {
//         filter: { _id: lead._id },
//         update: {
//           $set: {
//             assignedCounselor: counselors[i]._id
//           }
//         }
//       }
//     }));

//     const result = await Lead.bulkWrite(ops);
//     return result.modifiedCount || ops.length;

//   }
// }

async function assignOldestLeadsOneToOne() {
  const counselors = await User.find({ role: "counselor", isActive: true })
    .select("_id")
    .sort({ _id: 1 })
    .lean();

  if (!counselors.length) {
    console.log("⚠️ No counselors found");
    return 0;
  }

  const leads = await Lead.find({
    $or: [
      { assignedCounselor: { $exists: false } },
      { assignedCounselor: null }
    ]
  })
    .sort({ createdAt: 1, _id: 1 })
    .limit(10)
    .lean();

  if (!leads.length) return 0;

  // find last assigned lead
  const lastAssignedLead = await Lead.findOne({
    assignedCounselor: { $exists: true, $ne: null }
  })
    .sort({ createdAt: -1 })
    .lean();

  let startIndex = 0;

  if (lastAssignedLead) {
    const lastIndex = counselors.findIndex(
      (c) => c._id.toString() === lastAssignedLead.assignedCounselor.toString()
    );

    if (lastIndex !== -1) {
      startIndex = (lastIndex + 1) % counselors.length;
    }
  }

  const ops = leads.map((lead, i) => {
    const counselor = counselors[(startIndex + i) % counselors.length];

    return {
      updateOne: {
        filter: { _id: lead._id },
        update: {
          $set: { assignedCounselor: counselor._id }
        }
      }
    };
  });

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


async function fixPhoneNumbersStartingWithP() {
  // find leads where phone starts with "p:"
  const leads = await Lead.find({
    phone: { $regex: /^p:/i }
  }).select("_id phone");

  if (!leads.length) {
    console.log("No phone numbers starting with p:");
    return 0;
  }

  const ops = leads.map((lead) => {
    const cleanedPhone = lead.phone.replace(/^p:/i, "");

    return {
      updateOne: {
        filter: { _id: lead._id },
        update: {
          $set: { phone: cleanedPhone }
        }
      }
    };
  });

  const result = await Lead.bulkWrite(ops);

  console.log(`Updated ${result.modifiedCount} phone numbers`);
  return result.modifiedCount;
}

// fixPhoneNumbersStartingWithP()

export const runManualLeadAssignment = assignOldestLeadsOneToOne;