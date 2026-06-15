import mongoose from "mongoose";
import { Lead } from "../models/Leads.js";
import cron from "node-cron";


// Parse messy status strings like "No Answer 1,no answer 2 - 19/3/36"
const parseStatusAndNotes = (rawStatus) => {
  if (!rawStatus || rawStatus.trim() === '') {
    return { status: 'new', note: null };
  }

  const raw = rawStatus.toLowerCase().trim();

  // === INTERESTED variations ===
  if (raw.includes('interested')) {
    if (raw.includes('but') || raw.includes('later') || raw.includes('busy') || raw.includes('tomorrow') || raw.includes('tom')) {
      return { status: 'followup', note: rawStatus.trim() };
    }
    return { status: 'interested', note: null };
  }

  // === NOT REACHABLE variations ===
  const notReachableKeywords = [
    'no answer', 'not reachable', 'not reachabale', 'not reachble', // typos
    'wrong number', 'disconnected', 'voice mail', 'voicemail',
    'couldn\'t hear', 'could not hear', 'call later', 'busy now',
    'called thrice', 'no response', 'not connecting'
  ];

  if (notReachableKeywords.some(keyword => raw.includes(keyword))) {
    return { status: 'notReachable', note: rawStatus.trim() };
  }

  // === NOT INTERESTED ===
  if (raw.includes('not interested')) {
    return { status: 'notInterested', note: null };
  }

  // === REJECTED ===
  if (raw.includes('rejected') || raw.includes('not eligible')) {
    return { status: 'rejected', note: rawStatus.trim() };
  }

  // === FOLLOW UP (generic busy/come-back-later) ===
  if (raw.includes('call later') || raw.includes('busy') || raw.includes('tomorrow') || raw.includes('next week')) {
    return { status: 'followup', note: rawStatus.trim() };
  }

  // === DEFAULT ===
  return { status: 'new', note: rawStatus.trim() };
};
// Map messy "Country " field values to LEAD_STATUSES enum
const mapCountryToStatus = (rawValue) => {

  console.log(rawValue)

  if (!rawValue || rawValue.trim() === '') return 'new';

  const raw = rawValue.toLowerCase().trim();

  // Direct matches
  if (raw === 'interested') return 'interested';
  if (raw === 'rejected') return 'rejected';
  if (raw === 'future intake') return 'futureLeads';

  // "Not Interested" variations
  if (raw.includes('not interested')) return 'notInterested';

  // "Not Reachable" variations (typos included)
  const notReachableKeywords = [
    'not answered', 'not asnwered', 'not asnswered', // typos
    'not connecting', 'not inconnecting', // typos
    'not reached', 'wrong number',
    'answered but his parent picked', // couldn't reach student directly
    'not reachable', 'unreachable', 'no response'
  ];
  if (notReachableKeywords.some(keyword => raw.includes(keyword))) {
    return 'notReachable';
  }

  // "Interested but..." variations → still interested, needs followup
  if (raw.includes('interested') && raw.includes('but')) {
    return 'followup'; // or 'interested' based on your workflow
  }

  // Default fallback
  return 'new';
};
// Helper to map raw status strings to LEAD_STATUSES enum values
const mapStatus = (rawStatus) => {
  if (!rawStatus) return 'new';

  const statusMap = {
    'not reachable': 'notReachable',
    'not interested': 'notInterested',
    'follow up': 'followup',
    'interested': 'interested',
    'future': 'futureLeads',
    'new': 'new',
    '': 'new'
  };

  const normalized = rawStatus.toLowerCase().trim();
  return statusMap[normalized] || 'new';
};

const baseDate = new Date("2026-03-19T08:00:00Z");
let leadCounter = 0; // 🔥 global counter

const getCreatedAt = () => {
  const date = new Date(baseDate);
  date.setMinutes(date.getMinutes() + leadCounter * 3);
  leadCounter++; // 🔥 increment after each use
  return date;
};

const createdAt = getCreatedAt();
let count = 0
let assignCount = 0
const insertSingleLead = async (lead, counselorId) => {

  if (!counselorId) {
    console.log("⚠️ No counselor ID provided");
    return
  }

  // console.log(lead)
  // const { status, note } = parseStatusAndNotes(lead["Status  19/3/26"]);
  try {
    const formattedLead = {
      fullName: lead["full_name"],
      phone: lead["phone_number"],
      email: lead["email"],
      city: lead.city,
      // notes: lead["note"]?.trim()
      //   ? [{
      //     text: lead["note"].trim(),
      //     createdBy: new mongoose.Types.ObjectId(counselorId),
      //     createdAt: createdAt
      //   }]
      //   : [],
      extraDetails: {
        importedAt: new Date().toISOString()
      },
      coursePreference: lead?.course || "unfilled",
      assignedCounselor: new mongoose.Types.ObjectId(counselorId),
      source: "metaAds"
    };

    const phone10 = String(formattedLead.phone).replace(/\D/g, "").slice(-10);

    console.log(phone10)

    const isExisting = await Lead.findOne({
      phone: { $regex: `${phone10}$` } // ends with last 10 digits
    });

    if (isExisting) {
      count = count + 1
      console.log(`⚠️ Lead already exists for counselor ${isExisting._id}`);
      return;
    }
    // if(assignCount > 9){
    //   return
    // }

    const inserted = await Lead.create(formattedLead);
    if (inserted) {
      assignCount = assignCount + 1
    }
    console.log(`✅ Lead inserted for counselor ${counselorId}`);
    return;

  } catch (error) {
    console.error("❌ Error inserting lead:", error);
  } finally {
    console.log(count)
    console.log("assignCount ::---" + assignCount)
  }
};

const kjkjk = [
  {
    "full_name": "jamadar",
    "phone_number": "6360362757",
    "email": "muhammadjamadar123@gmail.com",
    "": "",
    "city": "NAN"
  },
  {
    "full_name": "Krupa Jayanth",
    "phone_number": "9845232815",
    "email": "krupa.jay@gmail.com",
    "": "",
    "city": "Bangalore"
  },
  {
    "full_name": "Mirza suban",
    "phone_number": "9380822824",
    "email": "amanbaig82@gmail.com",
    "": "",
    "city": "Bidar"
  },
  {
    "full_name": "Vaishnavi S V",
    "phone_number": "7483967699",
    "email": "vaishnavisv08@gmail.com",
    "": "",
    "city": "Banglore"
  },
  {
    "full_name": "مبرور پالیگار",
    "phone_number": "7899859313",
    "email": "mabrrorbgm@gmail.com",
    "": "",
    "city": "Belagavi"
  },
  {
    "full_name": "Ranjith Ranji",
    "phone_number": "9361309004",
    "email": "ranjithranji5252@gmail.com",
    "": "",
    "city": "Salem"
  },
  {
    "full_name": " Neha",
    "phone_number": "9963971900",
    "email": "wingss9710@gmail.com",
    "": "",
    "city": "Bangalore"
  },
  {
    "full_name": "shravani ",
    "phone_number": "7899371364",
    "email": "shravaniii146@gmail.com",
    "": "",
    "city": "bangalore"
  },
  {
    "full_name": "Piyush Chaudhary",
    "phone_number": "9279050114",
    "email": "pyush.chaudhary599@gmail.com",
    "": "",
    "city": "Bangalore"
  },
  {
    "full_name": "Abhi ",
    "phone_number": "8867091353",
    "email": "abhiabhisheknaik022@gmail.com",
    "": "",
    "city": "Bengaluru"
  },
  {
    "full_name": "Karthik Bhavanashi",
    "phone_number": "9620180859",
    "email": " karthikb9303@gmail.com",
    "": "",
    "city": "Bengaluru"
  },
  {
    "full_name": "萨钦.姓名",
    "phone_number": "8310861237",
    "email": "basaweswaramobiles@gmail.com",
    "": "",
    "city": "Maski karnataka"
  },
  {
    "full_name": "𝚂 𝚠 𝚊 𝚜 𝚝 𝚒 𝚔",
    "phone_number": "9136700589",
    "email": "ranjithranji5252@gmail.com",
    "": "",
    "city": "Salem"
  },
  {
    "full_name": "Neha ",
    "phone_number": "9963971900",
    "email": "wingss9710@gmail.com ",
    "": "",
    "city": "Bangalore"
  },
  {
    "full_name": " shravani ",
    "phone_number": "7899371364",
    "email": "shravaniii146@gmail.com",
    "": "",
    "city": "bangalore"
  },
  {
    "full_name": "Tenzin Gopi Mahend",
    "phone_number": "9535494098",
    "email": "tenzingopimahend@gmail.com",
    "": "",
    "city": "Bengaluru"
  },
  {
    "full_name": "Shrinivas S",
    "phone_number": "8073421420",
    "email": "vshrini15@gmail.com",
    "": "",
    "city": "Kollegal"
  },
  {
    "full_name": "ʜᴀʀꜱʜ",
    "phone_number": "9019369869",
    "email": "kumarharsh4116@gmail.com ",
    "": "",
    "city": "Bangalore"
  },
  {
    "full_name": " Prashant",
    "phone_number": "9845129683",
    "email": "prashantheklare@gmail.com",
    "": "",
    "city": "Bidar"
  }
]


console.log(kjkjk.length)

const leadQueues = {
  one: kjkjk, // First 10 leads for counselor 1
  // sid: kjkjk.slice(10) // Next 10 leads for counselor 2
};

export const startLeadCron = (queueName, counselorId) => {
  cron.schedule("*/70 * * * * *", async () => {

    const queue = leadQueues[queueName];

    if (!queue || queue.length === 0) {
      console.log(`⚠️ No leads left for ${queueName}`);
      return;
    }

    const nextLead = queue.shift();

    await insertSingleLead(nextLead, counselorId);

  });
};