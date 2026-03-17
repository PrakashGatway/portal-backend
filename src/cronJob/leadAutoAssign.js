import cron from "node-cron";
import User from "../models/User.js";
import { Lead } from "../models/Leads.js";
import mongoose from "mongoose";
import { readAssignmentConfig, writeAssignmentConfig } from "../services/jsonFunction.js";
import { Leadlogs } from "../models/leadLogs.js";

const CRON_SCHEDULE = "*/60 * * * * *";
const TIMEZONE = "Asia/Kolkata";


function sendDummyLeadNotification() {
  setInterval(() => {
    const leadNamespace = global.io.of("/lead-notifications");
    leadNamespace
      .to("689ec9f452b5c61e3d2def2a")
      .emit("leadAssigned", {
        leadId: "123",
        name: "Naveen",
        phone: "1234567890",
        message: "Dummy lead notification",
        createdAt: new Date()
      });
    console.log("Dummy lead notification sent");
  }, 10000);
}
// sendDummyLeadNotification()

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

export async function assignOldestLeadsByForm() {

  const config = readAssignmentConfig();

  if (!config.length) {
    console.log("⚠️ No form assignment config found");
    return 0;
  }

  const leads = await Lead.find({
    $or: [
      { assignedCounselor: { $exists: false } },
      { assignedCounselor: null }
    ],
    "adsDetails.formId": { $exists: true, $ne: null }
  })
    .sort({ createdAt: 1 })
    .limit(10)
    .lean();


  if (!leads.length) return 0;

  const ops = [];

  for (const lead of leads) {

    const formId = lead?.adsDetails?.formId;

    if (!formId) continue;

    const formConfig = config.find(c => c.formId === formId);

    if (!formConfig || !formConfig.counselors?.length) continue;

    const counselors = formConfig.counselors;

    let nextIndex = (formConfig.lastAssignedIndex + 1) % counselors.length;

    const counselorId = counselors[nextIndex];

    ops.push({
      updateOne: {
        filter: { _id: lead._id },
        update: {
          $set: {
            assignedCounselor: new mongoose.Types.ObjectId(counselorId)
          }
        }
      }
    });

    const leadNamespace = global.io.of("/lead-notifications");
    leadNamespace
      .to(counselorId)
      .emit("leadAssigned", {
        leadId: lead._id.toString(),
        name: lead.fullName || "Unknown",
        phone: lead.phone || "Unknown",
        message: `${lead.fullName} has been assigned to you`,
        createdAt: new Date()
      });

    const [counsellor, admins] = await Promise.all([User.findOne({ _id: counselorId, isActive: true }), User.find({ role: "admin", isActive: true })]);
    if (counsellor.leader) {
      leadNamespace
        .to(counsellor.leader)
        .emit("leadAssigned", {
          leadId: lead._id.toString(),
          name: lead.fullName || "Unknown",
          phone: lead.phone || "Unknown",
          message: `${lead.fullName} has been assigned to you`,
          createdAt: new Date()
        });
    }
    admins.map((admin) => {
      leadNamespace
        .to(admin._id)
        .emit("leadAssigned", {
          leadId: lead._id.toString(),
          name: lead.fullName || "Unknown",
          phone: lead.phone || "Unknown",
          message: `${lead.fullName} has been assigned to you`,
          createdAt: new Date()
        });
    })

    formConfig.lastAssignedIndex = nextIndex;
  }

  if (!ops.length) return 0;

  const result = await Lead.bulkWrite(ops);

  writeAssignmentConfig(config);
  return result.modifiedCount || ops.length;
}

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
      const assigned = await assignOldestLeadsByForm();
      console.log(`✅ Assigned ${assigned} leads this run`);
    } catch (err) {
      console.error("❌ Cron error:", err.message);
    }
  },
  { scheduled: true, timezone: TIMEZONE }
);

async function fixPhoneNumbersStartingWithP() {
  // find leads where phone starts with "p:"
  // const leads = await Lead.find({
  //   phone: { $regex: /^p:/i }
  // }).select("_id phone");

  const leads = await Lead.find({
    phone: { $exists: true, $ne: "" },
    $or: [
      { phone10: { $exists: false } },
      { phone10: null },
      { phone10: "" }
    ]
  })

  console.log(leads)

  if (!leads.length) {
    console.log("No phone numbers starting with p:");
    return 0;
  }

  // return 0

  const ops = leads.map((lead) => {
    // const cleanedPhone = lead.phone.replace(/^p:/i, "");
    const phone10 = lead.phone.replace(/\D/g, "").slice(-10);

    return {
      updateOne: {
        filter: { _id: lead._id, phone10: { $exists: false } },
        update: {
          $set: { phone10: phone10 }
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

const NewLeads = [

  {
    "name": "Abhishek ",
    "email": "",
    "phone_number": "+917010994839"
  },
  {
    "name": "Preeti ",
    "email": "",
    "phone_number": "+918086937000"
  },
  {
    "name": "Jai",
    "email": "jaihari8804@gmail.com",
    "phone_number": "+916369314762"
  },
  {
    "name": "Arvind",
    "email": "xarvindsrinix@gmail.com",
    "phone_number": "+918778504907"
  },
  {
    "name": "Louis Varun",
    "email": "louis.varun2005@gmail.com",
    "phone_number": "+919499961379"
  },
  {
    "name": "varsha ",
    "email": "",
    "phone_number": "+918098077999"
  },
  {
    "name": "Reshma",
    "email": "",
    "phone_number": "+919940201499"
  },
  {
    "name": "M BALACHANDRAN",
    "email": "maniias@gov.in",
    "phone_number": "+919411176033"
  },
  {
    "name": "Subhashini G",
    "email": "gksubha06@gmail.com",
    "phone_number": "+916382605861"
  },
  {
    "name": "Srinivasan subramanian",
    "email": "srini.classikplywoods@gmail.com",
    "phone_number": "+919884470089"
  },
  {
    "name": "karthic G",
    "email": "gkarthicgnanam@gmail.com",
    "phone_number": "+919790804605"
  },
  {
    "name": "Sreelakshmi",
    "email": "venkateshjamuna09@gmail.com",
    "phone_number": "+918072818917"
  },
  {
    "name": "shanthosh",
    "email": "nala38207@gmail.com",
    "phone_number": "+19123555802"
  },
  {
    "name": "Mrithyum Jai",
    "email": "mrithyumjaimp@gmail.com",
    "phone_number": "+918248771076"
  },
  {
    "name": "Reenu",
    "email": "",
    "phone_number": "+919952006312"
  },
  {
    "name": "Akash",
    "email": "asbroakash@gmail.com",
    "phone_number": "+919003009664"
  },
  {
    "name": "Shrisai Amruthaa",
    "email": "",
    "phone_number": "+919940088052"
  },
  {
    "name": "Krishika",
    "email": "krishikabudhani28@gmail.com",
    "phone_number": "+919322161236"
  },
  {
    "name": "Chandra Shekhar",
    "email": "shekar232002@gmail.com",
    "phone_number": "+919342643695"
  },
  {
    "name": "Aswin",
    "email": "achuaswin11@gmail.com",
    "phone_number": "+917907361218"
  },
  {
    "name": "Sanjana",
    "email": "",
    "phone_number": "+917358311425"
  },
  {
    "name": "Lavanya V",
    "email": "lavanyatamil8204@gmail.com",
    "phone_number": "+917358911494"
  },
  {
    "name": "Ramyaa",
    "email": "c05219325@gmail.com",
    "phone_number": "+918925493778"
  },
  {
    "name": "SANDHIYA.... ....",
    "email": "sandhiya2005621@gmail.com",
    "phone_number": "+918122156297"
  },
  {
    "name": "V.Hari Haran",
    "email": "vhatiharanicf@gmail.com",
    "phone_number": "+917418646367"
  },
  {
    "name": "Aditya",
    "email": "asmurugaian123@gmail.com",
    "phone_number": "+918788394509"
  },
  {
    "name": "hassana",
    "email": "fathimahassana46@gmail.com",
    "phone_number": "+918807709085"
  },
  {
    "name": "Anees",
    "email": "Aneesfathima@hotmail.com",
    "phone_number": "+919791750056"
  },
  {
    "name": "A'bee",
    "email": "abinayamadhavan16@gmail.com",
    "phone_number": "+917339585703"
  },
  {
    "name": "🆂🅼",
    "email": "samlawrence.n2005@icloud.com",
    "phone_number": "+918072198637"
  },
  {
    "name": "Karan Baskaran",
    "email": "",
    "phone_number": "+917305982066"
  },
  {
    "name": "Ramana Moorthy ",
    "email": "ramana110805@gmail.com",
    "phone_number": "+91 8925925565"
  },
  {
    "name": "Jagadish",
    "email": "naikjagadish7075@gmail.com",
    "phone_number": "+917993184551"
  },
  {
    "name": "Avinash Vs",
    "email": "avinashvs209@gmail.com",
    "phone_number": "+919176140682"
  },
  {
    "name": "Navee____",
    "email": "samsaninaveen122@gmail.com",
    "phone_number": "+919182767910"
  },
  {
    "name": "Shakti Purni",
    "email": "",
    "phone_number": "+918925246657"
  },
  {
    "name": "Mohamad Nibraz",
    "email": "",
    "phone_number": "+919840575226"
  },
  {
    "name": "Abhishek",
    "email": "",
    "phone_number": "+919360598115"
  },
  {
    "name": "Amritha",
    "email": "amrithav2803@gmail.com",
    "phone_number": "+917550007010"
  },
  {
    "name": "Thrisha K",
    "email": "thrishakabilan@gmail.com",
    "phone_number": "+917305343075"
  },
  {
    "name": "Jatin",
    "email": "jatin.johnny007@gmail.com",
    "phone_number": "+918700496400"
  },
  {
    "name": "EATHAMUKKALA SOWMYA",
    "email": "e.sowmya91@gmail.com",
    "phone_number": "+919346801892"
  },
  {
    "name": "NAGENDRAN ",
    "email": "nareshakshaya007@gmail.com",
    "phone_number": "+919884825199"
  },
  {
    "name": "Abdullah",
    "email": "abdull55726@gmail.com",
    "phone_number": "+919150995724"
  },
  {
    "name": "Nishanth Reddy Siddavatam",
    "email": "nishanthreddysiddavatam@gmail.com",
    "phone_number": "+919490103424"
  },
  {
    "name": "vimaleasan",
    "email": "",
    "phone_number": "+918667436656"
  },
  {
    "name": "Priyadarshani",
    "email": "",
    "phone_number": "+918608515275"
  },
  {
    "name": "kameshkanna srinivasan",
    "email": "rajnivas28@gmail.com",
    "phone_number": "+918124667147"
  },
  {
    "name": "Pooja Vinayagamoorthy",
    "email": "poojavinayagamoorthy@gmail.com",
    "phone_number": "+918883575404"
  },
  {
    "name": "Abi Shek",
    "email": "abishekdharshan@karunya.edu.in",
    "phone_number": "+919345569453"
  },
  {
    "name": "Harshita",
    "email": "",
    "phone_number": "+919755645798"
  },
  {
    "name": "Yoshitha ",
    "email": "yoshithamakkina@gmail.com",
    "phone_number": "+919390883805"
  },
  {
    "name": "Harshita Pant",
    "email": "pantharshita16@gmail.com",
    "phone_number": "+919165405111"
  },
  {
    "name": "Sriram",
    "email": "julakarthu@gmail.com",
    "phone_number": "+919597762122"
  },
  {
    "name": "Magesh ",
    "email": "",
    "phone_number": "+919840040441"
  },
  {
    "name": "Arif shekh",
    "email": "shaikaarifshaikaarif5@gmail.com",
    "phone_number": "+919022755905"
  },
  {
    "name": "Mahesh Babu",
    "email": "amgothmaheshbabu@gmail.com",
    "phone_number": "+919494220374"
  },
  {
    "name": "Swethaaaa",
    "email": "88swetharaj@gmail.com",
    "phone_number": "+919342043713"
  },
  {
    "name": "Reshma Rahamathulla",
    "email": "afraidris1522@gmail.com",
    "phone_number": "+919941296866"
  },
  {
    "name": "Dharshini Suresh",
    "email": "dharshinisuresh324@gmail.com",
    "phone_number": "+917708620224"
  },
  {
    "name": "Aisha",
    "email": "",
    "phone_number": "+919043966313"
  },
  {
    "name": "Aleem",
    "email": "Kogatamaleem386@gmail.com",
    "phone_number": "+916305182750"
  },
  {
    "name": "Saran",
    "email": "",
    "phone_number": "+919840809513"
  },
  {
    "name": "aathesshh >!",
    "email": "athays.th@gmail.com",
    "phone_number": "+919043365990"
  },
  {
    "name": "Kirthika",
    "email": "Kirthikasarava7@gmail.com",
    "phone_number": "+917358057598"
  },
  {
    "name": "Bala Guru",
    "email": "",
    "phone_number": "+918825960813"
  },
  {
    "name": "Varsha",
    "email": "maadhusep16@gmail.com",
    "phone_number": "+919789112791"
  },
  {
    "name": "JAI SUNDAR J",
    "email": "jaisundarjeevanandam@gmail.com",
    "phone_number": "+917338811547"
  },
  {
    "name": "abinaya prabakar",
    "email": "abinayaprabakar007@gmail.com",
    "phone_number": "+919342212821"
  },
  {
    "name": "Suve Tha",
    "email": "Suverenu15@gmail.com",
    "phone_number": "+919360247600"
  },
  {
    "name": "P Karthik Manikantan",
    "email": "manikantanp1313@gmail.com",
    "phone_number": "+918982666983"
  },
  {
    "name": "Mohamed Nazim",
    "email": "nazim2732@gmail.com",
    "phone_number": "+919042507345"
  },
  {
    "name": "sr!",
    "email": "thiyagasri410@gmail.com",
    "phone_number": "+916369063417"
  },
  {
    "name": "S.sivaramakrishnan",
    "email": "sivaramakrishnan925@gmail.com",
    "phone_number": "+917449133133"
  },
  {
    "name": "Monica",
    "email": "",
    "phone_number": "+966531252015"
  },
  {
    "name": "Subash",
    "email": "sub241104@gmail.com",
    "phone_number": "+916380151607"
  },
  {
    "name": "Hari Prasath",
    "email": "hariprasath1909@gmail.com",
    "phone_number": "+918220296385"
  },
  {
    "name": "Arul Kumaran",
    "email": "arulkumaran.racerak.05@gmail.com",
    "phone_number": "+919943295725"
  },
  {
    "name": "GRISH KRITHIK",
    "email": "noobgamerbgmivictor@gmail.com",
    "phone_number": "+918072760561"
  },
  {
    "name": "Badrinath",
    "email": "",
    "phone_number": "+918870245025"
  },
  {
    "name": "Amla",
    "email": "",
    "phone_number": "+919940629443"
  },
  {
    "name": "Bharani",
    "email": "bharaniblof20@gmail.com",
    "phone_number": "+919360445381"
  },
  {
    "name": "Divya ",
    "email": "",
    "phone_number": "+918438796591"
  },
  {
    "name": "T",
    "email": "tejaswiniveenadhakshin@gmail.com",
    "phone_number": "+919789014745"
  },
  {
    "name": "Padmashri",
    "email": "padmashri2023@gmail.com",
    "phone_number": "+919043005720"
  },
  {
    "name": "Shree Ranjana",
    "email": "shreeshiny293@gmail.com",
    "phone_number": "+918122682551"
  },
  {
    "name": "Raaj",
    "email": "logeshraaj07@gmail.com",
    "phone_number": "+919600572755"
  },
  {
    "name": "Faizal Ahmed ",
    "email": "faizalahmed0805@gmail.com ",
    "phone_number": "9043629588"
  },
  {
    "name": "JeniAsh96",
    "email": "ashlinjensha96@gmail.com",
    "phone_number": "+1919500940731"
  },
  {
    "name": "Bhuvaneswari Aravind Kumar",
    "email": "bhuvani.aravind@gmail.com",
    "phone_number": "+919841405854"
  },
  {
    "name": "Bhavika",
    "email": "paduchurubhavika04@gmail.com",
    "phone_number": "+916380238620"
  },
  {
    "name": "G Austen Sanjay",
    "email": "gaustensanjay@gmail.com",
    "phone_number": "+917395967581"
  },
  {
    "name": "Gokul",
    "email": "",
    "phone_number": "+917386668432"
  },
  {
    "name": "Aadith Aadith",
    "email": "suganyamurugavel1978@gmail.com",
    "phone_number": "8431875894"
  },
  {
    "name": "Madhusmita",
    "email": "",
    "phone_number": "+916369372614"
  },
  {
    "name": "Aishwarya K ",
    "email": "aishudass071@gmail.com",
    "phone_number": "9003620870"
  },
  {
    "name": "Durainathan ",
    "email": "durainathana70@gmail.com",
    "phone_number": "8825930830"
  },
  {
    "name": "Vignesh",
    "email": "",
    "phone_number": "+918925238017"
  },
  {
    "name": "Vijaya Sarathy",
    "email": "vijaynautical999@gmail.com",
    "phone_number": "+919790999736"
  },
  {
    "name": "Tarit Biswas",
    "email": "taritbiswas78@gmail.com",
    "phone_number": "+917823938678"
  },
  {
    "name": "Kumaravel",
    "email": "kumaravelramesh23@gmail.com",
    "phone_number": "+918220668196"
  },
  {
    "name": "Selvarani S",
    "email": "selvaraniberlin45e@gmail.com",
    "phone_number": "+917598269178"
  },
  {
    "name": "Kijolin Johisha ",
    "email": "johishakijolin@gmail.com",
    "phone_number": "8524004603"
  },
  {
    "name": "Heena",
    "email": "heenasithik976@gmail.com ",
    "phone_number": "6374426961"
  },
  {
    "name": "Faritha",
    "email": "farithaparveen14a@gmail.com",
    "phone_number": "+917397624499"
  },
  {
    "name": "Shiva",
    "email": "shiva20045535@gmail.com",
    "phone_number": "+916374693979"
  },
  {
    "name": "Abilash N",
    "email": "abilash1322004@gmail.com",
    "phone_number": "+918925299629"
  },
  {
    "name": "Sanjaay Hariharan",
    "email": "sanjaayh@gmail.com",
    "phone_number": "+917550202333"
  },
  {
    "name": " Nagul",
    "email": "",
    "phone_number": "+919940695123"
  },
  {
    "name": "Pranav",
    "email": "drpranav2012@gmail.com",
    "phone_number": "+918056279626"
  },
  {
    "name": "Sushmitha",
    "email": "",
    "phone_number": "+919789943684"
  },
  {
    "name": "R Rohit",
    "email": "",
    "phone_number": "+919952562649"
  },
  {
    "name": "Sterlin jino",
    "email": "sterlinjino07@gmail.com",
    "phone_number": "+918124197571"
  },
  {
    "name": "Sandhya",
    "email": "nsandhya2612004@gmail.com",
    "phone_number": "+919342807187"
  },
  {
    "name": "Sangeerthana",
    "email": "sangeerthanasangee0@gmail.com",
    "phone_number": "+919677630903"
  },
  {
    "name": "Narmada Murali",
    "email": "narmadakm@yahoo.com",
    "phone_number": "+919840894578"
  },
  {
    "name": "Vaseekaran",
    "email": "",
    "phone_number": "+918939612140"
  },
  {
    "name": "Sanchana R",
    "email": "sanch.ramnan1702@gmail.com",
    "phone_number": "+919962062882"
  },
  {
    "name": "Bavinilasheni",
    "email": "bavinilasheni@gmail.com",
    "phone_number": "+919629497572"
  },
  {
    "name": "Hemapriya ",
    "email": "2912priyahema@gmail.com",
    "phone_number": "+918072231560"
  },
  {
    "name": "Pranav P",
    "email": "pranav23000@gmail.com",
    "phone_number": "+917305448084"
  },
  {
    "name": "DS",
    "email": "imagineiamstillalive@gmail.com",
    "phone_number": "+917599274901"
  },
  {
    "name": "Saif Ali Khan",
    "email": "saifalikhn541@gmail.com",
    "phone_number": "+917010706524"
  },
  {
    "name": "Arulkumar",
    "email": "arulkumarsuji@gmail.com",
    "phone_number": "+919976226363"
  },
  {
    "name": "Mohamad shaikh",
    "email": "",
    "phone_number": "+919445018309"
  },
  {
    "name": "Giridaran S",
    "email": "giridaran25.gd@gmail.com",
    "phone_number": "+917397281595"
  },
  {
    "name": "Kummari vishnu sai",
    "email": "kvishnuvishnu77@gmail.com",
    "phone_number": "+917981778537"
  },
  {
    "name": "Aditya L",
    "email": "aditya21022003@gmail.com",
    "phone_number": "+917299212777"
  },
  {
    "name": "Vigneshvaran",
    "email": "knithyakanagu@gmail.com",
    "phone_number": "+918056171541"
  },
  {
    "name": "AFREEN",
    "email": "afreenpathi@gmail.com",
    "phone_number": "+919150417493"
  },
  {
    "name": "Apinayaa Sivakumar",
    "email": "apinayaasivakumar53@gmail.com",
    "phone_number": "+917639054591"
  },
  {
    "name": "Kalimuthuraja Sureshkumar",
    "email": "krsureshkumar27@yahoo.in",
    "phone_number": "+919962978078"
  },
  {
    "name": "Arunachalam",
    "email": "rockarun1006@gmail.com",
    "phone_number": "+918939662840"
  },
  {
    "name": "SC",
    "email": "gsriramchandrasekar@gmail.com",
    "phone_number": "+919025038804"
  },
  {
    "name": "Jagadeesh",
    "email": "jagadeeshrajkumar13@gmail.com",
    "phone_number": "9585121935"
  },
  {
    "name": "Yashaswini Mudunuri",
    "email": "yashumudunuri123@gmail.com",
    "phone_number": "8575167777"
  },
  {
    "name": "Nandini",
    "email": "nandusri0143@gmail.com",
    "phone_number": "+919676270313"
  },
  {
    "name": "Jothi Ganesh ",
    "email": "V.j.ganeshvdm25@gmail.com",
    "phone_number": "8610210535"
  },
  {
    "name": "Kaviya",
    "email": "kaviyamanivannan1999@gmail.com",
    "phone_number": "+917092504568"
  },
  {
    "name": "Bhargav ",
    "email": "barulucky123@gmail.com",
    "phone_number": "+919059463826"
  },
  {
    "name": "kishor_craze",
    "email": "kishorkishor8290@gmail.com",
    "phone_number": "+919444007576"
  },
  {
    "name": "Arav",
    "email": "",
    "phone_number": "+919150269823"
  },
  {
    "name": "Santraj",
    "email": "",
    "phone_number": "+919787090963"
  },
  {
    "name": "Adhisaya",
    "email": "adhisayaot7@gmail.com",
    "phone_number": "+918122091612"
  },
  {
    "name": "Angavi Balraj",
    "email": "angavib@gmail.com",
    "phone_number": "+919361097883"
  },
  {
    "name": "Arjun",
    "email": "nairarjunp2003@gmail.com",
    "phone_number": "+919037131789"
  },
  {
    "name": "Samreena",
    "email": "",
    "phone_number": "+917358227561"
  },
  {
    "name": "Vignesh",
    "email": "",
    "phone_number": "+919952282083"
  },
  {
    "name": "Vignesh",
    "email": "",
    "phone_number": "+919444109663"
  },
  {
    "name": "Anchal Bhupal",
    "email": "anchalbhupal17092004@gmail.com",
    "phone_number": "+918075922896"
  },
  {
    "name": "ᴍᴜᴋɪʟ",
    "email": "mukilrjpm@gmail.com",
    "phone_number": "+917550184402"
  },
  {
    "name": "Carl Kane",
    "email": "carlkane89@gmail.com",
    "phone_number": "+918015918272"
  },
  {
    "name": "Dashni",
    "email": "",
    "phone_number": "+916382411702"
  },
  {
    "name": "Arvind",
    "email": "",
    "phone_number": "+918428306060"
  },
  {
    "name": "Jerushlin jose JB",
    "email": "josejerushlin7@gmail.com",
    "phone_number": "+916369345332"
  },
  {
    "name": "Riya",
    "email": "riya61662@gmail.com",
    "phone_number": "+917305956822"
  },
  {
    "name": "Mari Vishal K",
    "email": "marivishal011@gmail.com",
    "phone_number": "+919486764559"
  },
  {
    "name": "Varun Kumar v",
    "email": "Varunjaya87@gmail.com",
    "phone_number": "7010157902"
  },
  {
    "name": "Adithya B.C",
    "email": "adithyabharadwaj15@gmail.com",
    "phone_number": "+917892729435"
  },
  {
    "name": "Ragu",
    "email": "sragunaath001@gmail.com",
    "phone_number": "+919941608766"
  },
  {
    "name": "Bhaskar",
    "email": "bhaskar2411@gmail.com",
    "phone_number": "+919841189486"
  },
  {
    "name": "Eniyavan ",
    "email": "iniyavangulsa@gmail.com",
    "phone_number": "+918015126624"
  },
  {
    "name": "Dhiksha",
    "email": "dhiksha1231@gmail.com ",
    "phone_number": "8072591431"
  },
  {
    "name": "Mohamed Riyaif",
    "email": "mdriyaif@gmail.com",
    "phone_number": "+919791638595"
  },
  {
    "name": "KESMAA RAJ",
    "email": "rajkesmaa@gmail.com",
    "phone_number": "+919345986103"
  },
  {
    "name": "SUJISHRI V",
    "email": "vsujishri@gmail.com",
    "phone_number": "+919487756336"
  },
  {
    "name": "Arun Kumar K M",
    "email": "arunkuma@gmail.com",
    "phone_number": "+919008819809"
  },
  {
    "name": "Jayasanthiya Mohan",
    "email": "santhiyamohan07@gmail.com",
    "phone_number": "+916369315497"
  },
  {
    "name": "Portia Joseph ",
    "email": "sanciaportia004@gmail.com",
    "phone_number": "+918754440327"
  },
  {
    "name": "Kishore Kesavan",
    "email": "kishorekesavan3605@gmail.com",
    "phone_number": "+916383887292"
  },
  {
    "name": "Sheela Nagusah",
    "email": "drsheela2020@outlook.com",
    "phone_number": "+919962703342"
  },
  {
    "name": "Imdhadhullah levvau",
    "email": "Imdhadhullahmhd@gmail.com",
    "phone_number": "+916374071737"
  },
  {
    "name": "Sanjith Raman",
    "email": "",
    "phone_number": "+918056182974"
  },
  {
    "name": "Vignesh M",
    "email": "vigneshmrevathi123@gmail.com",
    "phone_number": "+919677443895"
  },
  {
    "name": "Jayinth",
    "email": "jayinthravi007@gmail.com",
    "phone_number": "+919360022875"
  },
  {
    "name": "Yuvaraj Dilly",
    "email": "yuvavictory@gmail.com",
    "phone_number": "+919380167159"
  },
  {
    "name": "Rajpariya",
    "email": "",
    "phone_number": "+917550174511"
  },
  {
    "name": "subash",
    "email": "subashselvan443@gmail.com",
    "phone_number": "+919944809187"
  },
  {
    "name": "suhail",
    "email": "suhailchikku499@gmail.com",
    "phone_number": "+919840195044"
  },
  {
    "name": "Moorthy G",
    "email": "moorjaya1@gmail.com",
    "phone_number": "+919884387081"
  },
  {
    "name": "Mughilan ",
    "email": "mughilang2009@gmail.com",
    "phone_number": "+918523922372"
  },
  {
    "name": "Rohan",
    "email": "ranjankalkiedu@gmail.com",
    "phone_number": "+919392457943"
  },
  {
    "name": "Jyoteshwer",
    "email": "",
    "phone_number": "+919043296453"
  },
  {
    "name": "Aarthi Venkatesh",
    "email": "aarthivnktsh@gmail.com",
    "phone_number": "+919841414154"
  },
  {
    "name": "Pradeep ",
    "email": "www.pradeepkodi@gmail.com",
    "phone_number": "+919047683638"
  },
  {
    "name": "Bharti",
    "email": "",
    "phone_number": "+917200373044"
  },
  {
    "name": "Mahendhiran",
    "email": "mahendhira.oneplus2@gmail.com",
    "phone_number": "+919841603675"
  },
  {
    "name": "",
    "email": "",
    "phone_number": "+919398019415"
  },
  {
    "name": "Hemanth",
    "email": "hemanthsivakumar03@gmail.com",
    "phone_number": "+917358096442"
  },
  {
    "name": "Ashik",
    "email": "Sk.mdazmalashik2@gmail.com",
    "phone_number": "+9193980 19415 "
  },
  {
    "name": "Yuvadhaya",
    "email": "yuvadhayamohan19@gmail.com",
    "phone_number": "+917010468315"
  },
  {
    "name": "PRAJITH",
    "email": "prajith888977@gmail.com",
    "phone_number": "+919043057739"
  },
  {
    "name": "Karthik Mallela",
    "email": "karthikmallela16102003@gmail.com",
    "phone_number": "+917287875454"
  },
  {
    "name": "Babu",
    "email": "",
    "phone_number": "+917338828826"
  },
  {
    "name": "Dhara",
    "email": "tharanitharani963@gmail.com",
    "phone_number": "+918610587925"
  },
  {
    "name": "Suguna",
    "email": "suguna_murali@yahoo.com",
    "phone_number": "+919789980561"
  },
  {
    "name": "stephy",
    "email": "stephyannamaria130904@gmail.com",
    "phone_number": "+916374460742"
  },
  {
    "name": "𝓟𝓻𝓪𝓼𝓪𝓷𝓷𝓪",
    "email": "pradsoprasanna@gmail.com",
    "phone_number": "+916383048475"
  },
  {
    "name": "Thanigavel",
    "email": "tythaniga@gmail.com",
    "phone_number": "+919791111699"
  },
  {
    "name": "N A V E E N ",
    "email": "naveenkarambayam@gmail.com",
    "phone_number": "+919361558858"
  }
]

console.log(NewLeads.length)

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
    "68fc9152992c137019ff739c"
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
  return leads.slice(50);
}

// assignExistingLeads(NewLeads);


async function clearCallLogsByPhones(phones) {
  const phone10List = phones.map(p =>
    String(p.phone).replace(/\D/g, "").slice(-10)
  );

  const regexConditions = phone10List.map(num => ({
    phone: { $regex: `${num}$` } // match last 10 digits
  }));

  const result = await Leadlogs.deleteMany({
    $or: regexConditions
  });

  console.log(`Deleted ${result.deletedCount} call logs`);
  return result.deletedCount;
}

// clearCallLogsByPhones([
//   {
//     "name": "Dinesh S N",
//     "email": "dinesh.n7639@gmail.com",
//     "phone_number": "+916379173860"
//   },
//   {
//     "name": "Satish",
//     "email": "",
//     "phone_number": "+919566877020"
//   },
//   {
//     "name": "David",
//     "email": "",
//     "phone_number": "+918056105824"
//   },
//   {
//     "name": "Harni",
//     "email": "",
//     "phone_number": "+919626818515"
//   },
// ])



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

// insertCallLogs()



export const runManualLeadAssignment = assignOldestLeadsOneToOne;