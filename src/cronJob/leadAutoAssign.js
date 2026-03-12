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

let leads = [
  {
    "name": "ᴍᴜɴɪ ᴋᴀʀᴛʜɪᴋ",
    "email": "pagadalamunikarthik@gmail.com",
    "phone_number": "+918801776965"
  },
  {
    "name": "Jeevika Sri Arul Prakash",
    "email": "a.jeevikasri@gmail.com",
    "phone_number": "+917708777780"
  },
  {
    "name": "Dhamayanthi Adhavan",
    "email": "dhamayanthiadhavan@gmail.com",
    "phone_number": "+919566078394"
  },
  {
    "name": "Selvi Sel",
    "email": "selvisrinivasanharish@gmail.com",
    "phone_number": "+919786026529"
  },
  {
    "name": "sanapriya_bandi_2611",
    "email": "veerareddybandi69@gmail.com",
    "phone_number": "+918919914941"
  },
  {
    "name": "Krishnasree ",
    "email": "krishnasreeminnu987@gmail.com",
    "phone_number": "8921092340"
  },
  {
    "name": "Ranjith",
    "phone_number": "+916383206076"
  },
  {
    "name": "Ramesh Bheemi Reddy",
    "email": "abhiram555@gmail.com",
    "phone_number": "+919440182185"
  },
  {
    "name": "Senthil kumar bose",
    "phone_number": "9884280809"
  },
  {
    "name": "Aparna Sivakumar",
    "phone_number": "+917358063885"
  },
  {
    "name": "daniel",
    "email": "danideepu1@gmail.com",
    "phone_number": "+918072630153"
  },
  {
    "name": "MANOJ",
    "email": "manojmurugesan2@gmail.com",
    "phone_number": "+919384305236"
  },
  {
    "name": "Akash Sarkar",
    "email": "Akashsarkar0752@gmail.com",
    "phone_number": "7718301590"
  },
  {
    "name": "Babu",
    "email": "babubabu48105@gmail.com",
    "phone_number": "+919444148105"
  },
  {
    "name": "Harshavardhini Visvanathan",
    "phone_number": "+995599465197"
  },
  {
    "name": "B.HITESH RAM ROYAL",
    "email": "hiteshramroyal06@gmail.com",
    "phone_number": "+918179539688"
  },
  {
    "name": "Roshni",
    "phone_number": "+919597692149"
  },
  {
    "name": "Mohammed",
    "email": "asuraalmas786@gmail.com",
    "phone_number": "+917299052013"
  },
  {
    "name": "Gopi Selvi",
    "email": "gopihp1779@gmail.com",
    "phone_number": "+919095980921"
  },
  {
    "name": "Hemalatha",
    "email": "Hemalathadurai@gmail.com",
    "phone_number": "+917538847573"
  },
  {
    "name": "Pathma Priya C. B",
    "email": "priyasudharsan1992@gmail.com",
    "phone_number": "+919629227450"
  },
  {
    "name": "Nanbakumar",
    "phone_number": "+919042305711"
  },
  {
    "name": "Abarna",
    "email": "abarnasekar1408@gmil.cam",
    "phone_number": "+918838119838"
  },
  {
    "name": "Marshalin M",
    "email": "marshalofest@gmail.com",
    "phone_number": "+919487935341"
  },
  {
    "name": "kathrin",
    "phone_number": "+919840488061"
  },
  {
    "name": "Jana Ravichandran",
    "email": "janaravibme@gmail.com",
    "phone_number": "+918220023749"
  },
  {
    "name": "Gautam Muthukumaraswamy",
    "email": "gautammuthukumaraswamy@gmail.com",
    "phone_number": "+917550151333"
  },
  {
    "name": "K. Rahul Venkatesh",
    "email": "chitrakesavan79@gmail.com",
    "phone_number": "+916380679392"
  },
  {
    "name": "Meena",
    "phone_number": "+97336580025"
  },
  {
    "name": "simhadri lokku12",
    "email": "simhadrilokku5@gmail.com",
    "phone_number": "+919014039261"
  },
  {
    "name": "Eeri John Kirankumar",
    "email": "kiruery@gmail.com",
    "phone_number": "+919293503021"
  },
  {
    "name": "Dhayanandhan J",
    "email": "ar12riya@gmail.com",
    "phone_number": "+919384531715"
  },
  {
    "name": "Guru Nath",
    "email": "Gurumathi0612@gmail.com",
    "phone_number": "+917397292303"
  },
  {
    "name": "Sumanth ",
    "email": "sumanthvejaysekar@gmail.com",
    "phone_number": "6360154247"
  },
  {
    "name": "Madeshwaran",
    "email": "madeshsudhakar@gmail.com",
    "phone_number": "+919344934022"
  },
  {
    "name": "Praveen",
    "phone_number": "+919962832092"
  },
  {
    "name": "An",
    "email": "anjuokn@gmail.com",
    "phone_number": "+919962297048"
  },
  {
    "name": " Akash Sridhar",
    "email": "akashsridhar23@gmail.com",
    "phone_number": "+919535578663"
  },
  {
    "name": "Sara",
    "phone_number": "+919884037036"
  },
  {
    "name": "Haja Kamaludheen",
    "email": "hafiz042012@gmail.com",
    "phone_number": "+918098886292"
  },
  {
    "name": "Prabhakar",
    "phone_number": "+917339140278"
  },
  {
    "name": "Nayomi yaparala",
    "email": "nayomiyaparala5@gmail.com",
    "phone_number": "+918019620966"
  },
  {
    "name": " MARIA JESINTHA A",
    "email": "jesinthamaria3@gmail.com",
    "phone_number": "+919150689998"
  },
  {
    "name": " Sanjai D",
    "email": "sanjaisanjai8366@gmail.com",
    "phone_number": "+919944358081"
  },
  {
    "name": "Latika Das",
    "email": "latika.das281088@gmail.com",
    "phone_number": "+918723808051"
  },
  {
    "name": "PREMCHANDRAN",
    "email": "hotelktr@rediffmail.com",
    "phone_number": "+919443224828"
  },
  {
    "name": "A_A",
    "email": "amshu725@gmail.com",
    "phone_number": "+918867350753"
  },
  {
    "name": "Aravind Aravind",
    "email": "popesbs@gmail.com",
    "phone_number": "+919836778616"
  },
  {
    "name": "Ponnusamy Rajkumar",
    "email": "oldmonk31@rediffmail.com",
    "phone_number": "+919884818139"
  },
  {
    "name": "ASHIKA Mathi",
    "email": "ashikamathi03@gmail.com",
    "phone_number": "+919677144954"
  },
  {
    "name": "Aravind Aravind",
    "email": "page@gmaol.cpm",
    "phone_number": "+917395940250"
  },
  {
    "name": "Sunil",
    "phone_number": "+918637463558"
  },
  {
    "name": "Vignesh",
    "phone_number": "+917695833673"
  },
  {
    "name": "Riyash shabarish",
    "email": "riyashjeeva@gmail.com",
    "phone_number": "+919003056356"
  },
  {
    "name": "Ritika",
    "phone_number": "+918681023486"
  },
  {
    "name": "ranjuranjitha15594",
    "phone_number": "+919047081168"
  },
  {
    "name": "Daphne Immanuel",
    "email": "daphneimmanuel@gmail.com",
    "phone_number": "+919600161102"
  },
  {
    "name": "Murali",
    "email": "neeelmurali@gmail.com",
    "phone_number": "+919840352666"
  },
  {
    "name": "natarajan",
    "phone_number": "+918825838015"
  },
  {
    "name": "Manish",
    "phone_number": "+919003268313"
  },
  {
    "name": "Bhanu",
    "email": "bhanupakapudi@gmail.com",
    "phone_number": "+919347355983"
  },
  {
    "name": "Sudha Kar D",
    "email": "sbstoniqe24@gmail.com",
    "phone_number": "+917386917199"
  },
  {
    "name": "Chakardhar",
    "phone_number": "+918985713409"
  },
  {
    "name": "Surya",
    "phone_number": "+917868051991"
  },
  {
    "name": "Kamini S",
    "email": "kaminisankaran81@gmail.com",
    "phone_number": "+916374294194"
  },
  {
    "name": "Suvetha Pm",
    "email": "kssrsuvethapm@gmail.com",
    "phone_number": "+918248393929"
  },
  {
    "name": "Dilip Thangavel",
    "email": "charliedilip7@gmail.com",
    "phone_number": "+917539974877"
  },
  {
    "name": "soubam nickol",
    "email": "soubamnickol@gmail.com",
    "phone_number": "+919612092746"
  },
  {
    "name": "Dhritee Bakshi",
    "email": "dhriteebakshi.sfh@gmail.com",
    "phone_number": "+918438457291"
  },
  {
    "name": "Chitra",
    "phone_number": "+919384215604"
  },
  {
    "name": "R P KHOWSHIC",
    "email": "khowshichari@gmail.com",
    "phone_number": "+919094971673"
  },
  {
    "name": "Shri Dhar",
    "phone_number": "+919361309680"
  },
  {
    "name": "Bhavya solanki",
    "email": "bs035040@gmail.com",
    "phone_number": "+918122188228"
  },
  {
    "name": "Vigneshwaran B",
    "phone_number": "+916385360537"
  },
  {
    "name": "Raja",
    "phone_number": "+19029197366"
  },
  {
    "name": "sk firoz",
    "email": "fsk60044@gmail.com",
    "phone_number": "+918985547420"
  },
  {
    "name": "Yashraj singh rajpurohit",
    "email": "yashrajrajpurohit301@gmail.com",
    "phone_number": "+919884481647"
  },
  {
    "name": "Aarthi Ismail",
    "email": "angelaarthi1987@gmail.com",
    "phone_number": "+919994191060"
  },
  {
    "name": "Suganya Ashok",
    "email": "suganyaashok16@gmail.com",
    "phone_number": "+919941420070"
  },
  {
    "name": "Ramlavan De Arumugasamyi",
    "phone_number": "+917397526332"
  },
  {
    "name": "Parvin Mahaboob",
    "email": "parv1812@gmail.com",
    "phone_number": "+919384984393"
  },
  {
    "name": "ℂ𝕙𝕒𝕣𝕒𝕟 𝕟𝕒𝕚𝕕𝕦👑👑",
    "phone_number": "+919392778246"
  },
  {
    "name": "Madan",
    "email": "madhanop035@gmail.com",
    "phone_number": "+919342889947"
  },
  {
    "name": "dharshu",
    "email": "vishwadharshini29@gmail.com",
    "phone_number": "+917358530965"
  },
  {
    "name": "Isra Adil",
    "email": "israadil33@gmail.com",
    "phone_number": "+918897216614"
  },
  {
    "name": "Musavir",
    "email": "mmusavir76@gmail.com",
    "phone_number": "+919622771530"
  },
  {
    "name": "Narmadha Prema",
    "email": "narmadhaprema@gmail.com",
    "phone_number": "+919360451545"
  },
  {
    "name": "Bhairavi Murugesan",
    "email": "bhairavihanithra@gmail.com",
    "phone_number": "9566434127"
  },
  {
    "name": "Ads",
    "email": "adhrishya@gmail.com",
    "phone_number": "+918939268081"
  },
  {
    "name": " D Jayaja",
    "email": "jayaja2626@gmail.com",
    "phone_number": "+916382358989"
  },
  {
    "name": "Darshan",
    "phone_number": "+919080123980"
  },
  {
    "name": "Shubhas",
    "phone_number": "+447384058875"
  },
  {
    "name": "Sonia",
    "phone_number": "+918072395706"
  },
  {
    "name": "→°∞Reshu∞°←",
    "email": "rakshmitha05@gmail.com",
    "phone_number": "+916379144100"
  },
  {
    "name": "Abarna",
    "email": "mabarna48@gmail.com",
    "phone_number": "+919176545819"
  },
  {
    "name": "Shriharihar",
    "phone_number": "+916379618368"
  },
  {
    "name": "Darshan Yadav",
    "email": "darshanyadav037@gmail.com",
    "phone_number": "+919606682079"
  },
  {
    "name": "Sankhadip Sharma",
    "email": "sharmaswapan07349@gmail.com",
    "phone_number": "+919863488068"
  }
]

const normalizePhone10 = (phone) => {
  if (!phone) return null;

  let p = String(phone).replace(/\D/g, "");
  return p.slice(-10);
};

export const assignExistingLeads = async (incomingLeads) => {

  const emails = incomingLeads
    .map(l => l.email?.toLowerCase()?.trim())
    .filter(Boolean);

  const phones = incomingLeads
    .map(l => normalizePhone10(l.phone_number))
    .filter(Boolean);

  const existingLeads = await Lead.find({
    $or: [
      // { email: { $in: emails } },
      { phone10: { $in: phones } }
    ]
  });

  const counselors = [
    "68fcaa8e2342af01fff255e5",
    "68fcaa8e2342af01fff255e5"
  ];

  let index = 0;

  const updates = existingLeads.map(lead => {
    const counselor = counselors[index % 2];
    index++;

    return {
      updateOne: {
        filter: { _id: lead._id },
        update: {
          $set: {
            assignedCounselor: counselor,
            secondaryStatus: "new",
            createdAt: new Date()
          }
        },
        timestamps: false
      }
    };
  });

  if (updates.length) {
    await Lead.bulkWrite(updates);
  }

  console.log({
    totalExisting: existingLeads.length,
    assigned: updates.length
  })
};

function getTop50Leads(leads) {
  return leads.slice(0, 50);
}

// assignExistingLeads(getTop50Leads(leads));



export const runManualLeadAssignment = assignOldestLeadsOneToOne;