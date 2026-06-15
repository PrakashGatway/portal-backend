import cron from "node-cron";
import { Lead } from "../models/Leads.js";
import mongoose from "mongoose";
import { Leadlogs } from "../models/leadLogs.js";

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

    if (!/^[6-9]\d{9}$/.test(phone)) {
        if (phone.length > 10) {
            phone = phone.slice(-10);
        }
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


// cron.schedule(
//     CRON_SCHEDULE,
//     async () => {
//         console.log("🔄 Auto-assign cron running:", new Date().toISOString());
//         // try {
//         //     const assigned = await normalizeLeadPhones();
//         //     console.log(`✅ Assigned ${assigned} leads this run`);
//         // } catch (err) {
//         //     console.error("❌ Cron error:", err.message);
//         // }
//     },
//     { scheduled: true, timezone: TIMEZONE }
// );


async function findLeadsByPhones(phoneList) {
  try {
    if (!phoneList || !phoneList.length) return [];

    // normalize numbers to last 10 digits
    const phone10List = phoneList.map((p) =>
      String(p).replace(/\D/g, "").slice(-10)
    );

    // create one regex (num1|num2|num3)$
    const regex = new RegExp(`(${phone10List.join("|")})$`);

    const leads = await Lead.find({
      phone: { $regex: regex }
    }).populate("assignedCounselor");

    leads.map((lead) => {
      console.log(lead.assignedCounselor.name);
    });

    console.log(`Found ${leads.length} leads`);
    return leads;

  } catch (error) {
    console.error("Error finding leads:", error);
    throw error;
  }
}
// findLeadsByPhones([
//   "8527569834", "7303488042", "9910666955", "6395944275", "8218940860",
//   "8700385951", "9103536133", "8218802819", "8979603847", "9013770642",
//   "7827303962", "7017940995", "8881333781", "7037581815", "7017837366",
//   "9907288539", "6280235837", "9761187280", "9119760522", "9870549846",
//   "8685865292", "8707875630", "8006777757", "9045870437", "8057604007",
//   "9458425506", "7056427305", "8307324191", "9193567149", "9897057516",
//   "9412710220", "9557952664", "9250002413", "9266456516", "9793217563",
//   "7668304995", "9992227032", "8171541044", "9499481924"
// ])

const leads = [
    {
        "full_name": "PiXel",
        "phone_number": "+918527569834",
        "email": "panwartanush@gmail.com",
        "city": "Rishikesh"
    },
    {
        "full_name": "Rohan Gupta",
        "phone_number": "+917303488042",
        "email": "rg5371862@gmail.com",
        "city": "Delhi"
    },
    {
        "full_name": "Paavan Gujral",
        "phone_number": "+919910666955",
        "email": "Vijaygujral@rediffmail.com",
        "city": "Delhi"
    },
    {
        "full_name": "Khushi Chaudhary",
        "phone_number": "+916395944275",
        "email": "khushichaudhary31122@gmail.com",
        "city": "Pilibhit, Uttar Pradesh"
    },
    {
        "full_name": "SHAH NAZAR",
        "phone_number": "+918218940860",
        "email": "ansarishahnazar685@gmail.com",
        "city": "Muzaffarnagar"
    },
    {
        "full_name": "Lakshay gupta",
        "phone_number": "+918700385951",
        "email": "lg2303@srmist.edu.in",
        "city": "Delhi"
    },
    {
        "full_name": "Azad Ahmed",
        "phone_number": "+919103536133",
        "email": "azadahmedkassana@gmail.com",
        "city": "Aligarh"
    },
    {
        "full_name": "Radhika jain",
        "phone_number": "+918218802819",
        "email": "radhikajain2727@gmail.com",
        "city": "Meerut"
    },
    {
        "full_name": "Adarsh Singh",
        "phone_number": "+918979603847",
        "email": "adarsh200931@gmail.com",
        "city": "Mathura"
    },
    {
        "full_name": "Anjana Jha",
        "phone_number": "+919013770642",
        "email": "anjana.jha1980@gmail.com",
        "city": "Delhi"
    },
    {
        "full_name": "Harsh Warraich",
        "phone_number": "+917827303962",
        "email": "jitendersingh8741@gmail.com",
        "city": "New delhi"
    },
    {
        "full_name": "Vaishnavi Upadhyay",
        "phone_number": "+917017940995",
        "email": "vaishnaviupadh05@gmail.com",
        "city": "Vrindavan, Mathura"
    },
    {
        "full_name": "Vaanya",
        "phone_number": "+918881333781",
        "email": "vaanyabansal882@gmail.com",
        "city": "agra"
    },
    {
        "full_name": "आराध्या",
        "phone_number": "+917037581815",
        "email": "vrisetsu@gmail.com",
        "city": "Haldwani"
    },
    {
        "full_name": "RIYA CHAUDHARY",
        "phone_number": "+917017837366",
        "email": "rc2442867@gmail.com",
        "city": "Bijnor"
    },
    {
        "full_name": "Md Aslam khan",
        "phone_number": "+919907288539",
        "email": "aslamin30@gmail.com",
        "city": "Delhi"
    },
    {
        "full_name": "ñaresh (अगस्त्य)",
        "phone_number": "+916280235837",
        "email": "nareshkumar181199@gmail.com",
        "city": "indora"
    },
    {
        "full_name": "राणा",
        "phone_number": "+919761187280",
        "email": "manishranamursan@gmail.com",
        "city": "Hathras"
    },
    {
        "full_name": "PG!",
        "phone_number": "+919119760522",
        "email": "priyanshghanshala9119@gmail.com",
        "city": "Dehradun"
    },
    {
        "full_name": "श्वेता गिरी",
        "phone_number": "+919870549846",
        "email": "shwetagiri2007@gmail.com",
        "city": "Delhi"
    },
    {
        "full_name": "Upendra Nath Sah",
        "phone_number": "+918685865292",
        "email": "upendra1978nathsah@gmail.com",
        "city": "Gurgaon"
    },
    {
        "full_name": "Shashwat.݁˖",
        "phone_number": "+918707875630",
        "email": "shashwatchaudhary77@gmail.com",
        "city": "Lucknow"
    },
    {
        "full_name": "Param Dogra",
        "phone_number": "+918006777757",
        "email": "vishalsdogra@gmail.com",
        "city": "Yes"
    },
    {
        "full_name": "Gauri Sharma",
        "phone_number": "+919045870437",
        "email": "psah244241@gmail.com",
        "city": "Hasanpur"
    },
    {
        "full_name": "Arvind Yadav",
        "phone_number": "+918057604007",
        "email": "arvindkumar8057604007@gmail.com",
        "city": "Etawah"
    },
    {
        "full_name": "Rinku Gautam",
        "phone_number": "+919458425506",
        "email": "rinkugautam1452@gmail.com",
        "city": "Bijnor"
    },
    {
        "full_name": "Tanuj",
        "phone_number": "+917056427305",
        "email": "jangidtanuj01@gmail.com",
        "city": "Mahendergarh (haryana)"
    },
    {
        "full_name": "Himani",
        "phone_number": "+918307324191",
        "email": "himani72064@gmail.com",
        "city": "Nissing karnal"
    },
    {
        "full_name": "an.jlii25",
        "phone_number": "+919193567149",
        "email": "vp175628@gmail.com",
        "city": "Bareilly"
    },
    {
        "full_name": "Sabby Singh",
        "phone_number": "+919897057516",
        "email": "jasbir1013@gmail.com",
        "city": "Dehra Dun"
    },
    {
        "full_name": "Praveen Kumar Malik",
        "phone_number": "+919412710220",
        "email": "newgayatriroadlines20@gmail.com",
        "city": "Roorkee"
    },
    {
        "full_name": "Harjot Kaur",
        "phone_number": "+919557952664",
        "email": "thisisharjot.2009@gmail.com",
        "city": "Dehradun"
    },
    {
        "full_name": "Meenakshi Arora",
        "phone_number": "+919250002413",
        "email": "Mg.arora08@gmail.com",
        "city": "East Delhi"
    },
    {
        "full_name": "Kunal",
        "phone_number": "+919266456516",
        "email": "kunalk74667@gmail.com",
        "city": "Delhi"
    },
    {
        "full_name": "Vinay Mishra",
        "phone_number": "+919793217563",
        "email": "vinaybarikhas@gmail.com",
        "city": "tilhar tehsil तिलहर shahjahanpur"
    },
    {
        "full_name": "Utkarsh kumar",
        "phone_number": "+917668304995",
        "email": "uttkarshs848@gmail.com",
        "city": "Bulandshahr"
    },
    {
        "full_name": "Jarnail Singh",
        "phone_number": "+919992227032",
        "email": "Jarnailthakur85@gmail.com",
        "city": "Kaithal"
    },
    {
        "full_name": "Soha Rahil Khan",
        "phone_number": "+918171541044",
        "email": "sohakhan0809@gmail.com",
        "city": "Aligarh"
    },
    {
        "full_name": "Arpita",
        "phone_number": "+919499481924",
        "email": "arpitagarg980@gmail.com",
        "city": "Yamunanagar"
    }
]

const insertLeadsFromArray = async (leadsArray) => {
  try {

    const formattedLeads = leadsArray.map((lead) => ({
      fullName: lead.full_name,
      phone: lead.phone_number,
      email: lead.email,
      city: lead.city,
      assignedCounselor: new mongoose.Types.ObjectId("68fca9ab2342af01fff255cb"),
      source: "metaAds" // required field
    }));

    const insertedLeads = await Lead.insertMany(formattedLeads, {
      ordered: false
    });

    console.log(`${insertedLeads.length} leads inserted successfully`);

    return insertedLeads;

  } catch (error) {
    console.error("Error inserting leads:", error);
    throw error;
  }
};

const data = [
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09741599441",
  "Executive Name": "Azeema",
  "Executive Number": "8197822934",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 03:09:55 pm",
  "End Time": "2026\/03\/18, 03:10:35 pm",
  "Client Hangup Time": "2026\/03\/18, 03:10:35 pm",
  "Duration (sec)": "39 \/ 3"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09741599441",
  "Executive Name": "Azeema",
  "Executive Number": "8197822934",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 03:09:19 pm",
  "End Time": "2026\/03\/18, 03:09:48 pm",
  "Client Hangup Time": "2026\/03\/18, 03:09:48 pm",
  "Duration (sec)": "28 \/ 2"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "08116324775",
  "Executive Name": "valensia",
  "Executive Number": "7798472157",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 03:08:55 pm",
  "End Time": "2026\/03\/18, 03:09:15 pm",
  "Client Hangup Time": "2026\/03\/18, 03:09:15 pm",
  "Duration (sec)": "19 \/ 2"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "08626881318",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 03:08:24 pm",
  "End Time": "2026\/03\/18, 03:10:57 pm",
  "Client Hangup Time": "2026\/03\/18, 03:10:57 pm",
  "Duration (sec)": "152 \/ 11"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "08626881318",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 03:07:57 pm",
  "End Time": "2026\/03\/18, 03:08:18 pm",
  "Client Hangup Time": "2026\/03\/18, 03:08:18 pm",
  "Duration (sec)": "20 \/ 2"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "08595686233",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 03:07:53 pm",
  "End Time": "2026\/03\/18, 03:08:25 pm",
  "Client Hangup Time": "2026\/03\/18, 03:08:25 pm",
  "Duration (sec)": "31 \/ 3"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "08969815383",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 03:06:46 pm",
  "End Time": "2026\/03\/18, 03:07:40 pm",
  "Client Hangup Time": "2026\/03\/18, 03:07:40 pm",
  "Duration (sec)": "54 \/ 4"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "08264156671",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 03:04:52 pm",
  "End Time": "2026\/03\/18, 03:05:32 pm",
  "Client Hangup Time": "2026\/03\/18, 03:05:32 pm",
  "Duration (sec)": "39 \/ 3"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "08368554936",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 03:03:34 pm",
  "End Time": "2026\/03\/18, 03:04:23 pm",
  "Client Hangup Time": "2026\/03\/18, 03:04:23 pm",
  "Duration (sec)": "48 \/ 4"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "08302910852",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 03:03:02 pm",
  "End Time": "2026\/03\/18, 03:03:16 pm",
  "Client Hangup Time": "2026\/03\/18, 03:03:16 pm",
  "Duration (sec)": "13 \/ 1"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "07814085287",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 03:01:08 pm",
  "End Time": "2026\/03\/18, 03:02:55 pm",
  "Client Hangup Time": "2026\/03\/18, 03:02:55 pm",
  "Duration (sec)": "107 \/ 8"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "07814085287",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:59:50 pm",
  "End Time": "2026\/03\/18, 03:00:26 pm",
  "Client Hangup Time": "2026\/03\/18, 03:00:26 pm",
  "Duration (sec)": "35 \/ 3"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09509829849",
  "Executive Name": "Manish",
  "Executive Number": "9887120429",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:59:47 pm",
  "End Time": "2026\/03\/18, 03:00:34 pm",
  "Client Hangup Time": "2026\/03\/18, 03:00:34 pm",
  "Duration (sec)": "46 \/ 4"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "07015645087",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:59:47 pm",
  "End Time": "2026\/03\/18, 03:01:00 pm",
  "Client Hangup Time": "2026\/03\/18, 03:01:00 pm",
  "Duration (sec)": "73 \/ 5"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "08766318265",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:58:31 pm",
  "End Time": "2026\/03\/18, 02:58:53 pm",
  "Client Hangup Time": "2026\/03\/18, 02:58:53 pm",
  "Duration (sec)": "22 \/ 2"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09310282819",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:50:41 pm",
  "End Time": "2026\/03\/18, 02:51:17 pm",
  "Client Hangup Time": "2026\/03\/18, 02:51:17 pm",
  "Duration (sec)": "35 \/ 3"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09810777189",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:50:38 pm",
  "End Time": "2026\/03\/18, 02:57:50 pm",
  "Client Hangup Time": "2026\/03\/18, 02:57:50 pm",
  "Duration (sec)": "432 \/ 29"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "08543082337",
  "Executive Name": "valensia",
  "Executive Number": "7798472157",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:50:15 pm",
  "End Time": "2026\/03\/18, 02:50:54 pm",
  "Client Hangup Time": "2026\/03\/18, 02:50:54 pm",
  "Duration (sec)": "38 \/ 3"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09509829849",
  "Executive Name": "Manish",
  "Executive Number": "9887120429",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:49:58 pm",
  "End Time": "2026\/03\/18, 02:50:19 pm",
  "Client Hangup Time": "2026\/03\/18, 02:50:19 pm",
  "Duration (sec)": "21 \/ 2"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09915594711",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:49:16 pm",
  "End Time": "2026\/03\/18, 02:50:21 pm",
  "Client Hangup Time": "2026\/03\/18, 02:50:21 pm",
  "Duration (sec)": "65 \/ 5"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "07837332209",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:48:54 pm",
  "End Time": "2026\/03\/18, 02:49:52 pm",
  "Client Hangup Time": "2026\/03\/18, 02:49:52 pm",
  "Duration (sec)": "58 \/ 4"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09915594711",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:48:49 pm",
  "End Time": "2026\/03\/18, 02:49:05 pm",
  "Client Hangup Time": "2026\/03\/18, 02:49:05 pm",
  "Duration (sec)": "15 \/ 1"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09799943467",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:47:48 pm",
  "End Time": "2026\/03\/18, 02:48:20 pm",
  "Client Hangup Time": "2026\/03\/18, 02:48:20 pm",
  "Duration (sec)": "32 \/ 3"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09915999580",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:47:44 pm",
  "End Time": "2026\/03\/18, 02:48:28 pm",
  "Client Hangup Time": "2026\/03\/18, 02:48:28 pm",
  "Duration (sec)": "44 \/ 3"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "08383049038",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:46:44 pm",
  "End Time": "2026\/03\/18, 02:47:32 pm",
  "Client Hangup Time": "2026\/03\/18, 02:47:32 pm",
  "Duration (sec)": "47 \/ 4"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09718114411",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:44:42 pm",
  "End Time": "2026\/03\/18, 02:45:22 pm",
  "Client Hangup Time": "2026\/03\/18, 02:45:22 pm",
  "Duration (sec)": "40 \/ 3"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09160992719",
  "Executive Name": "Swetha",
  "Executive Number": "9844022357",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:42:57 pm",
  "End Time": "2026\/03\/18, 02:43:19 pm",
  "Client Hangup Time": "2026\/03\/18, 02:43:19 pm",
  "Duration (sec)": "22 \/ 2"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "07992376705",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:42:05 pm",
  "End Time": "2026\/03\/18, 02:42:43 pm",
  "Client Hangup Time": "2026\/03\/18, 02:42:43 pm",
  "Duration (sec)": "38 \/ 3"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09509829849",
  "Executive Name": "Manish",
  "Executive Number": "9887120429",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:41:05 pm",
  "End Time": "2026\/03\/18, 02:41:26 pm",
  "Client Hangup Time": "2026\/03\/18, 02:41:26 pm",
  "Duration (sec)": "20 \/ 2"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09059992420",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:40:44 pm",
  "End Time": "2026\/03\/18, 02:41:45 pm",
  "Client Hangup Time": "2026\/03\/18, 02:41:45 pm",
  "Duration (sec)": "60 \/ 4"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "07982841067",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:40:41 pm",
  "End Time": "2026\/03\/18, 02:41:15 pm",
  "Client Hangup Time": "2026\/03\/18, 02:41:15 pm",
  "Duration (sec)": "34 \/ 3"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09235302341",
  "Executive Name": "valensia",
  "Executive Number": "7798472157",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:39:52 pm",
  "End Time": "2026\/03\/18, 02:40:46 pm",
  "Client Hangup Time": "2026\/03\/18, 02:40:46 pm",
  "Duration (sec)": "53 \/ 4"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09066828372",
  "Executive Name": "Azeema",
  "Executive Number": "8197822934",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:39:33 pm",
  "End Time": "2026\/03\/18, 02:44:47 pm",
  "Client Hangup Time": "2026\/03\/18, 02:44:47 pm",
  "Duration (sec)": "314 \/ 21"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "06397316598",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:38:51 pm",
  "End Time": "2026\/03\/18, 02:39:48 pm",
  "Client Hangup Time": "2026\/03\/18, 02:39:48 pm",
  "Duration (sec)": "57 \/ 4"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09306079561",
  "Executive Name": "Azeema",
  "Executive Number": "8197822934",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:38:23 pm",
  "End Time": "2026\/03\/18, 02:39:25 pm",
  "Client Hangup Time": "2026\/03\/18, 02:39:25 pm",
  "Duration (sec)": "61 \/ 5"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09066828372",
  "Executive Name": "Azeema",
  "Executive Number": "8197822934",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:37:23 pm",
  "End Time": "2026\/03\/18, 02:37:58 pm",
  "Client Hangup Time": "2026\/03\/18, 02:37:58 pm",
  "Duration (sec)": "35 \/ 3"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09354978986",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:35:34 pm",
  "End Time": "2026\/03\/18, 02:36:04 pm",
  "Client Hangup Time": "2026\/03\/18, 02:36:04 pm",
  "Duration (sec)": "30 \/ 2"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "08953254856",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:34:36 pm",
  "End Time": "2026\/03\/18, 02:35:28 pm",
  "Client Hangup Time": "2026\/03\/18, 02:35:28 pm",
  "Duration (sec)": "52 \/ 4"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09354978986",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:34:20 pm",
  "End Time": "2026\/03\/18, 02:34:58 pm",
  "Client Hangup Time": "2026\/03\/18, 02:34:58 pm",
  "Duration (sec)": "37 \/ 3"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09759442571",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:33:33 pm",
  "End Time": "2026\/03\/18, 02:34:04 pm",
  "Client Hangup Time": "2026\/03\/18, 02:34:04 pm",
  "Duration (sec)": "31 \/ 3"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "06381885368",
  "Executive Name": "Swetha",
  "Executive Number": "9844022357",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:31:45 pm",
  "End Time": "2026\/03\/18, 02:32:52 pm",
  "Client Hangup Time": "2026\/03\/18, 02:32:52 pm",
  "Duration (sec)": "67 \/ 5"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09027572474",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:31:25 pm",
  "End Time": "2026\/03\/18, 02:33:30 pm",
  "Client Hangup Time": "2026\/03\/18, 02:33:30 pm",
  "Duration (sec)": "125 \/ 9"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09759442571",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:30:39 pm",
  "End Time": "2026\/03\/18, 02:31:09 pm",
  "Client Hangup Time": "2026\/03\/18, 02:31:09 pm",
  "Duration (sec)": "29 \/ 2"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "08800234829",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:24:40 pm",
  "End Time": "2026\/03\/18, 02:28:33 pm",
  "Client Hangup Time": "2026\/03\/18, 02:28:33 pm",
  "Duration (sec)": "233 \/ 16"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "08791239452",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:22:16 pm",
  "End Time": "2026\/03\/18, 02:23:14 pm",
  "Client Hangup Time": "2026\/03\/18, 02:23:14 pm",
  "Duration (sec)": "57 \/ 4"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "08409989686",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:21:51 pm",
  "End Time": "2026\/03\/18, 02:22:05 pm",
  "Client Hangup Time": "2026\/03\/18, 02:22:05 pm",
  "Duration (sec)": "14 \/ 1"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09711079843",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:16:24 pm",
  "End Time": "2026\/03\/18, 02:17:01 pm",
  "Client Hangup Time": "2026\/03\/18, 02:17:01 pm",
  "Duration (sec)": "37 \/ 3"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "08954500825",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:12:33 pm",
  "End Time": "2026\/03\/18, 02:13:39 pm",
  "Client Hangup Time": "2026\/03\/18, 02:13:39 pm",
  "Duration (sec)": "66 \/ 5"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "07428062204",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:07:07 pm",
  "End Time": "2026\/03\/18, 02:11:45 pm",
  "Client Hangup Time": "2026\/03\/18, 02:11:45 pm",
  "Duration (sec)": "277 \/ 19"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09205947398",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:06:00 pm",
  "End Time": "2026\/03\/18, 02:06:41 pm",
  "Client Hangup Time": "2026\/03\/18, 02:06:41 pm",
  "Duration (sec)": "40 \/ 3"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09058015020",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:04:45 pm",
  "End Time": "2026\/03\/18, 02:05:56 pm",
  "Client Hangup Time": "2026\/03\/18, 02:05:56 pm",
  "Duration (sec)": "70 \/ 5"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09509829849",
  "Executive Name": "Manish",
  "Executive Number": "9887120429",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:04:14 pm",
  "End Time": "2026\/03\/18, 02:04:39 pm",
  "Client Hangup Time": "2026\/03\/18, 02:04:39 pm",
  "Duration (sec)": "24 \/ 2"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09692651302",
  "Executive Name": "Swetha",
  "Executive Number": "9844022357",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:03:56 pm",
  "End Time": "2026\/03\/18, 02:05:02 pm",
  "Client Hangup Time": "2026\/03\/18, 02:05:02 pm",
  "Duration (sec)": "66 \/ 5"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09354510571",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 02:02:18 pm",
  "End Time": "2026\/03\/18, 02:03:45 pm",
  "Client Hangup Time": "2026\/03\/18, 02:03:45 pm",
  "Duration (sec)": "87 \/ 6"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "07004762284",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 01:58:42 pm",
  "End Time": "2026\/03\/18, 02:01:32 pm",
  "Client Hangup Time": "2026\/03\/18, 02:01:32 pm",
  "Duration (sec)": "170 \/ 12"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "08527784595",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 01:56:52 pm",
  "End Time": "2026\/03\/18, 01:57:41 pm",
  "Client Hangup Time": "2026\/03\/18, 01:57:41 pm",
  "Duration (sec)": "48 \/ 4"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "08383095469",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 01:54:35 pm",
  "End Time": "2026\/03\/18, 01:55:00 pm",
  "Client Hangup Time": "2026\/03\/18, 01:55:00 pm",
  "Duration (sec)": "24 \/ 2"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "06005242397",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 01:53:47 pm",
  "End Time": "2026\/03\/18, 01:54:22 pm",
  "Client Hangup Time": "2026\/03\/18, 01:54:22 pm",
  "Duration (sec)": "34 \/ 3"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "07428974663",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 01:52:57 pm",
  "End Time": "2026\/03\/18, 01:53:38 pm",
  "Client Hangup Time": "2026\/03\/18, 01:53:38 pm",
  "Duration (sec)": "41 \/ 3"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "07428974663",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 01:52:31 pm",
  "End Time": "2026\/03\/18, 01:52:50 pm",
  "Client Hangup Time": "2026\/03\/18, 01:52:50 pm",
  "Duration (sec)": "18 \/ 2"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "06284338115",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 01:48:25 pm",
  "End Time": "2026\/03\/18, 01:48:58 pm",
  "Client Hangup Time": "2026\/03\/18, 01:48:58 pm",
  "Duration (sec)": "33 \/ 3"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "07018381434",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 01:47:21 pm",
  "End Time": "2026\/03\/18, 01:48:02 pm",
  "Client Hangup Time": "2026\/03\/18, 01:48:02 pm",
  "Duration (sec)": "41 \/ 3"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09910927925",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 01:46:26 pm",
  "End Time": "2026\/03\/18, 01:46:59 pm",
  "Client Hangup Time": "2026\/03\/18, 01:46:59 pm",
  "Duration (sec)": "32 \/ 3"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "08851657313",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 01:44:01 pm",
  "End Time": "2026\/03\/18, 01:44:21 pm",
  "Client Hangup Time": "2026\/03\/18, 01:44:21 pm",
  "Duration (sec)": "19 \/ 2"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09733177551",
  "Executive Name": "valensia",
  "Executive Number": "7798472157",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 01:43:51 pm",
  "End Time": "2026\/03\/18, 01:45:17 pm",
  "Client Hangup Time": "2026\/03\/18, 01:45:17 pm",
  "Duration (sec)": "85 \/ 6"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "07304033855",
  "Executive Name": "valensia",
  "Executive Number": "7798472157",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 01:23:16 pm",
  "End Time": "2026\/03\/18, 01:23:26 pm",
  "Client Hangup Time": "2026\/03\/18, 01:23:26 pm",
  "Duration (sec)": "10 \/ 1"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09509829849",
  "Executive Name": "Manish",
  "Executive Number": "9887120429",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 01:21:16 pm",
  "End Time": "2026\/03\/18, 01:21:40 pm",
  "Client Hangup Time": "2026\/03\/18, 01:21:40 pm",
  "Duration (sec)": "24 \/ 2"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "08851367928",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 01:19:46 pm",
  "End Time": "2026\/03\/18, 01:26:24 pm",
  "Client Hangup Time": "2026\/03\/18, 01:26:24 pm",
  "Duration (sec)": "397 \/ 27"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09216616640",
  "Executive Name": "valensia",
  "Executive Number": "7798472157",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 01:13:46 pm",
  "End Time": "2026\/03\/18, 01:14:32 pm",
  "Client Hangup Time": "2026\/03\/18, 01:14:32 pm",
  "Duration (sec)": "46 \/ 4"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09910115496",
  "Executive Name": "valensia",
  "Executive Number": "7798472157",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 01:10:50 pm",
  "End Time": "2026\/03\/18, 01:11:11 pm",
  "Client Hangup Time": "2026\/03\/18, 01:11:11 pm",
  "Duration (sec)": "21 \/ 2"
 },
 {
  "Call Type": "In",
  "Virtual Number": "8044569011",
  "Did Number": "+918044569011",
  "Client Number": "+919815207670",
  "Executive Name": "valensia",
  "Executive Number": "7798472157",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 01:09:38 pm",
  "End Time": "2026\/03\/18, 01:09:57 pm",
  "Client Hangup Time": "2026\/03\/18, 01:09:57 pm",
  "Duration (sec)": "19 \/ 2"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "07358311425",
  "Executive Name": "Swetha",
  "Executive Number": "9844022357",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 01:09:24 pm",
  "End Time": "2026\/03\/18, 01:10:09 pm",
  "Client Hangup Time": "2026\/03\/18, 01:10:09 pm",
  "Duration (sec)": "45 \/ 3"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09881462218",
  "Executive Name": "valensia",
  "Executive Number": "7798472157",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 01:07:44 pm",
  "End Time": "2026\/03\/18, 01:08:28 pm",
  "Client Hangup Time": "2026\/03\/18, 01:08:28 pm",
  "Duration (sec)": "43 \/ 3"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09361558858",
  "Executive Name": "Swetha",
  "Executive Number": "9844022357",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 01:07:20 pm",
  "End Time": "2026\/03\/18, 01:08:16 pm",
  "Client Hangup Time": "2026\/03\/18, 01:08:16 pm",
  "Duration (sec)": "55 \/ 4"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09871108850",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 12:57:48 pm",
  "End Time": "2026\/03\/18, 01:00:50 pm",
  "Client Hangup Time": "2026\/03\/18, 01:00:50 pm",
  "Duration (sec)": "182 \/ 13"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09811032623",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 12:55:17 pm",
  "End Time": "2026\/03\/18, 12:56:10 pm",
  "Client Hangup Time": "2026\/03\/18, 12:56:10 pm",
  "Duration (sec)": "52 \/ 4"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09876588780",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 12:54:00 pm",
  "End Time": "2026\/03\/18, 12:54:51 pm",
  "Client Hangup Time": "2026\/03\/18, 12:54:51 pm",
  "Duration (sec)": "51 \/ 4"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09582810105",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 12:49:31 pm",
  "End Time": "2026\/03\/18, 12:49:59 pm",
  "Client Hangup Time": "2026\/03\/18, 12:49:59 pm",
  "Duration (sec)": "28 \/ 2"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "08610539145",
  "Executive Name": "Azeema",
  "Executive Number": "8197822934",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 12:49:07 pm",
  "End Time": "2026\/03\/18, 12:52:16 pm",
  "Client Hangup Time": "2026\/03\/18, 12:52:16 pm",
  "Duration (sec)": "188 \/ 13"
 },
 {
  "Call Type": "In",
  "Virtual Number": "8044569011",
  "Did Number": "+918044569011",
  "Client Number": "+919759284949",
  "Executive Name": "Asmitha",
  "Executive Number": "9663533439",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 12:31:28 pm",
  "End Time": "2026\/03\/18, 12:32:05 pm",
  "Client Hangup Time": "2026\/03\/18, 12:32:05 pm",
  "Duration (sec)": "37 \/ 3"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09759284949",
  "Executive Name": "valensia",
  "Executive Number": "7798472157",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 12:29:39 pm",
  "End Time": "2026\/03\/18, 12:30:21 pm",
  "Client Hangup Time": "2026\/03\/18, 12:30:21 pm",
  "Duration (sec)": "42 \/ 3"
 },
 {
  "Call Type": "In",
  "Virtual Number": "8044569011",
  "Did Number": "+918044569011",
  "Client Number": "+918965943418",
  "Executive Name": "dummy",
  "Executive Number": "8302092630",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 12:21:59 pm",
  "End Time": "2026\/03\/18, 12:23:00 pm",
  "Client Hangup Time": "2026\/03\/18, 12:23:00 pm",
  "Duration (sec)": "60 \/ 4"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09781321320",
  "Executive Name": "Azeema",
  "Executive Number": "8197822934",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 12:20:16 pm",
  "End Time": "2026\/03\/18, 12:21:00 pm",
  "Client Hangup Time": "2026\/03\/18, 12:21:00 pm",
  "Duration (sec)": "43 \/ 3"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "07087656558",
  "Executive Name": "Azeema",
  "Executive Number": "8197822934",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 12:18:22 pm",
  "End Time": "2026\/03\/18, 12:19:11 pm",
  "Client Hangup Time": "2026\/03\/18, 12:19:11 pm",
  "Duration (sec)": "49 \/ 4"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "08873560752",
  "Executive Name": "valensia",
  "Executive Number": "7798472157",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 11:46:20 am",
  "End Time": "2026\/03\/18, 11:50:27 am",
  "Client Hangup Time": "2026\/03\/18, 11:50:27 am",
  "Duration (sec)": "246 \/ 17"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "07033588172",
  "Executive Name": "valensia",
  "Executive Number": "7798472157",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 11:40:33 am",
  "End Time": "2026\/03\/18, 11:41:26 am",
  "Client Hangup Time": "2026\/03\/18, 11:41:26 am",
  "Duration (sec)": "53 \/ 4"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "08468871418",
  "Executive Name": "valensia",
  "Executive Number": "7798472157",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 11:36:55 am",
  "End Time": "2026\/03\/18, 11:37:59 am",
  "Client Hangup Time": "2026\/03\/18, 11:37:59 am",
  "Duration (sec)": "63 \/ 5"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "07007117060",
  "Executive Name": "Azeema",
  "Executive Number": "8197822934",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 11:35:43 am",
  "End Time": "2026\/03\/18, 11:38:25 am",
  "Client Hangup Time": "2026\/03\/18, 11:38:25 am",
  "Duration (sec)": "162 \/ 11"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "09411176033",
  "Executive Name": "Swetha",
  "Executive Number": "9844022357",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 11:27:03 am",
  "End Time": "2026\/03\/18, 11:28:40 am",
  "Client Hangup Time": "2026\/03\/18, 11:28:40 am",
  "Duration (sec)": "96 \/ 7"
 },
 {
  "Call Type": "Out",
  "Did Number": "+918044569011",
  "Client Number": "07395913647",
  "Executive Name": "Swetha",
  "Executive Number": "9844022357",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 11:20:36 am",
  "End Time": "2026\/03\/18, 11:23:29 am",
  "Client Hangup Time": "2026\/03\/18, 11:23:29 am",
  "Duration (sec)": "173 \/ 12"
 },
 {
  "Call Type": "Out",
  "Did Number": "00911206957810",
  "Client Number": "09350379300",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 10:43:42 am",
  "End Time": "2026\/03\/18, 10:44:28 am",
  "Client Hangup Time": "2026\/03\/18, 10:44:28 am",
  "Duration (sec)": "45 \/ 3"
 },
 {
  "Call Type": "Out",
  "Did Number": "00911206957810",
  "Client Number": "06203298920",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 10:42:24 am",
  "End Time": "2026\/03\/18, 10:42:47 am",
  "Client Hangup Time": "2026\/03\/18, 10:42:47 am",
  "Duration (sec)": "22 \/ 2"
 },
 {
  "Call Type": "Out",
  "Did Number": "00911206957810",
  "Client Number": "08920094951",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 10:41:52 am",
  "End Time": "2026\/03\/18, 10:42:19 am",
  "Client Hangup Time": "2026\/03\/18, 10:42:19 am",
  "Duration (sec)": "27 \/ 2"
 },
 {
  "Call Type": "Out",
  "Did Number": "00911206957810",
  "Client Number": "07428108223",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 10:40:59 am",
  "End Time": "2026\/03\/18, 10:41:50 am",
  "Client Hangup Time": "2026\/03\/18, 10:41:50 am",
  "Duration (sec)": "51 \/ 4"
 },
 {
  "Call Type": "Out",
  "Did Number": "00911206957810",
  "Client Number": "07657858667",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 10:40:22 am",
  "End Time": "2026\/03\/18, 10:40:50 am",
  "Client Hangup Time": "2026\/03\/18, 10:40:50 am",
  "Duration (sec)": "28 \/ 2"
 },
 {
  "Call Type": "Out",
  "Did Number": "00911206957810",
  "Client Number": "08709910373",
  "Executive Name": "Swetha",
  "Executive Number": "9844022357",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 10:34:11 am",
  "End Time": "2026\/03\/18, 10:36:05 am",
  "Client Hangup Time": "2026\/03\/18, 10:36:05 am",
  "Duration (sec)": "113 \/ 8"
 },
 {
  "Call Type": "Out",
  "Did Number": "00911206957810",
  "Client Number": "08838948242",
  "Executive Name": "Azeema",
  "Executive Number": "8197822934",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 10:29:51 am",
  "End Time": "2026\/03\/18, 10:30:36 am",
  "Client Hangup Time": "2026\/03\/18, 10:30:36 am",
  "Duration (sec)": "44 \/ 3"
 },
 {
  "Call Type": "Out",
  "Did Number": "00911206957810",
  "Client Number": "08882198837",
  "Executive Name": "Azeema",
  "Executive Number": "8197822934",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 10:24:50 am",
  "End Time": "2026\/03\/18, 10:25:20 am",
  "Client Hangup Time": "2026\/03\/18, 10:25:20 am",
  "Duration (sec)": "29 \/ 2"
 },
 {
  "Call Type": "Out",
  "Did Number": "00911206957810",
  "Client Number": "09026831353",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 10:19:11 am",
  "End Time": "2026\/03\/18, 10:22:57 am",
  "Client Hangup Time": "2026\/03\/18, 10:22:57 am",
  "Duration (sec)": "225 \/ 15"
 },
 {
  "Call Type": "Out",
  "Did Number": "00911206957810",
  "Client Number": "08053274125",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 10:17:08 am",
  "End Time": "2026\/03\/18, 10:17:25 am",
  "Client Hangup Time": "2026\/03\/18, 10:17:25 am",
  "Duration (sec)": "16 \/ 2"
 },
 {
  "Call Type": "Out",
  "Did Number": "00911206957810",
  "Client Number": "07973207958",
  "Executive Name": "Siddharth",
  "Executive Number": "8005602662",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 10:11:36 am",
  "End Time": "2026\/03\/18, 10:12:03 am",
  "Client Hangup Time": "2026\/03\/18, 10:12:03 am",
  "Duration (sec)": "27 \/ 2"
 },
 {
  "Call Type": "Out",
  "Did Number": "00911206957810",
  "Client Number": "09509829849",
  "Executive Name": "Manish",
  "Executive Number": "9887120429",
  "Call Status": "Answer",
  "Start Time": "2026\/03\/18, 09:18:27 am",
  "End Time": "2026\/03\/18, 09:19:15 am",
  "Client Hangup Time": "2026\/03\/18, 09:19:15 am",
  "Duration (sec)": "47 \/ 4"
 }
]

const filterCallsByDateRange = (data, startUTC, endUTC) => {
  return data
    .map(item => {
      if (!item["Start Time"]) return null;

      const createdAt = new Date(
        item["Start Time"]
          .replace(/\//g, "-")
          .replace(",", "") + " +05:30"
      );

      return { ...item, createdAt };
    })
    .filter(item => item && item.createdAt >= startUTC && item.createdAt <= endUTC);
};

console.log(data.length)

const start = new Date("2026-03-18T05:25:53.000Z");
const end = new Date("2026-03-18T09:30:00.000Z");

const result = filterCallsByDateRange(data, start, end);

// console.log(result[0]);
function parseDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr.replace(/\//g, "-"));
}

async function insertCallLogs(dataArray) {
  try {
    const logs = dataArray.map((item) => {
      const phone10 = String(item["Client Number"] || "")
        .replace(/\D/g, "")
        .slice(-10);


      let duration = 0;
      if (item["Duration (sec)"]) {
        duration = parseInt(item["Duration (sec)"].split("/")[0].trim()) || 0;
      }

      return {
        phone: phone10,
        masterCallNumber: item["Executive Number"] || "",
        callerId: item["Executive Number"] || "",
        duration,
        status: item["Call Status"] || "",
        ivrSTime: parseDate(item["Start Time"]),
        ivrETime: parseDate(
          item["End Time"] || item["Client Hangup Time"]
        ),
        recordingData: "https://api.dndfilter.com/api/final/ivr/call-recording/play/69b787d8db847b5a81abb88a",
        extraDetails: {
          Direction: item["Call Type"], cType: item["Call Type"] == "In" ? "IBD" : "CTC"
        }
      };
    });

    const result = await Leadlogs.insertMany(logs);
    console.log(`Inserted ${result.length} call logs`);
    return result.length;
  } catch (error) {
    console.error("Error inserting call logs:", error);
    throw error;
  }
}
// insertCallLogs(result)
// insertLeadsFromArray(leads)


export const runManualLeadAssignment = normalizeLeadPhones;