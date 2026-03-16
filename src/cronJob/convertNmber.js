import cron from "node-cron";
import { Lead } from "../models/Leads.js";
import mongoose from "mongoose";

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

// insertLeadsFromArray(leads)


export const runManualLeadAssignment = normalizeLeadPhones;