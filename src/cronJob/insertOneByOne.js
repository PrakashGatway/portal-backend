import mongoose from "mongoose";
import { Lead } from "../models/Leads.js";
import cron from "node-cron";

const insertSingleLead = async (lead, counselorId) => {

    if (!counselorId) {
        console.log("⚠️ No counselor ID provided");
        return
    }

    try {
        const formattedLead = {
            fullName: lead.full_name,
            phone: lead.phone_number,
            email: lead.email,
            city: lead.city,
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
            console.log(`⚠️ Lead already exists for counselor ${isExisting._id}`);
            return;
        }

        const inserted = await Lead.create(formattedLead);

        console.log(`✅ Lead inserted for counselor ${counselorId}`);
        return inserted;

    } catch (error) {
        console.error("❌ Error inserting lead:", error.message);
    }
};

let asmita = [
    // {
    //     "course": "bachelors",
    //     "full_name": "𝔸𝔼𝕊ℍ𝕋ℍ𝔼𝕋𝕀ℂ 𝐚𝐫𝐭𝐢𝐬𝐭♡",
    //     "phone_number": "+919415617203",
    //     "email": "radharajbhar1107@gmail.com",
    //     "city": "Ghosi"
    // },
    // {
    //     "course": "masters",
    //     "full_name": "Lakshay",
    //     "phone_number": "+917982998430",
    //     "email": "lakshay.9910359899@gmail.com",
    //     "city": "Ghaziabad"
    // },
    {
        "course": "bachelors",
        "full_name": "Mehar Rai",
        "phone_number": "+918354065610",
        "email": "singhrai6055@gmail.com",
        "city": "Lakhimpur"
    },
    {
        "course": "bachelors",
        "full_name": "c.koushik reddy",
        "phone_number": "+917842774612",
        "email": "reddykoushik722@gmail.com",
        "city": "Kurnool"
    },
    {
        "course": "bachelors",
        "full_name": "Nidhu�",
        "phone_number": "+918360154377",
        "email": "nanditam669@gmail.com",
        "city": "Tanda"
    },
    {
        "course": "bachelors",
        "full_name": "Suraj Maurya",
        "phone_number": "+917839608652",
        "email": "honey783960@gmail.com",
        "city": "Kanpur"
    },
    {
        "course": "bachelors",
        "full_name": "Akul Bhatnagar",
        "phone_number": "+919696094796",
        "email": "bhatnagarakul8@gmail.com",
        "city": "Lucknow"
    },
    {
        "course": "bachelors",
        "full_name": "Rakesh Tamang",
        "phone_number": "+917630940566",
        "email": "rakeshtmng45@gmail.com",
        "city": "Leimakhong"
    },
    {
        "course": "masters",
        "full_name": "Mukesh patel",
        "phone_number": "+918115600470",
        "email": "mukeshpatel757666@gmail.com",
        "city": "Sonbhadra"
    },
    {
        "course": "bachelors",
        "full_name": "Anshika",
        "phone_number": "+919528057264",
        "email": "anshikachaudhary2249@gmail.com",
        "city": "Meerut"
    },
    {
        "course": "bachelors",
        "full_name": "Manmeet Singh",
        "phone_number": "+917017715144",
        "email": "manmeetbhaskar7860@gmail.com",
        "city": "Saharanpur"
    },
    {
        "course": "bachelors",
        "full_name": "Sayaan",
        "phone_number": "+918899968091",
        "email": "Darsayaan81@gmail.com",
        "city": "Srinagar"
    },
    {
        "course": "masters",
        "full_name": "Aditya",
        "phone_number": "+919713523311",
        "email": "adityasbs415@gmail.com",
        "city": "Indore"
    },
    {
        "course": "masters",
        "full_name": "Waseem Khan",
        "phone_number": "+919819408183",
        "email": "wk706119@gmail.com",
        "city": "Mumbai"
    },
    {
        "course": "bachelors",
        "full_name": "Manohar Chauhan",
        "phone_number": "+918433664201",
        "email": "chm69130@gmail.com",
        "city": "uttar Pradesh"
    },
    {
        "course": "bachelors",
        "full_name": "Kashif Khan",
        "phone_number": "+918318443441",
        "email": "mohdkashif936932@gmail.com",
        "city": "Gola Gokarannath"
    },
    {
        "course": "bachelors",
        "full_name": "Prince vishwakarma",
        "phone_number": "+918795172546",
        "email": "princekumarking9@gmial.com",
        "city": "Kanpur"
    },
    {
        "course": "bachelors",
        "full_name": "krishna",
        "phone_number": "+919519827118",
        "email": "ashutoshkotarya77@gmail.com",
        "city": "Uttar Pradesh"
    },
    {
        "course": "masters",
        "full_name": "Sameer",
        "phone_number": "+918360855650",
        "email": "sameer836085@gmail.com",
        "city": "Ldh"
    },
    {
        "course": "masters",
        "full_name": "MS KHAN",
        "phone_number": "+918687825764",
        "email": "mohd.sirajkhan121412@gmail.com",
        "city": "Lucknow"
    },
    {
        "course": "bachelors",
        "full_name": "shaz",
        "phone_number": "+919596373200",
        "email": "shaz44707@gmail.com",
        "city": "Kishtwar"
    },
    {
        "course": "bachelors",
        "full_name": "kshitij",
        "phone_number": "+917887233941",
        "email": "kjpandey77@gmail.com",
        "city": "Gkp"
    },
    {
        "course": "bachelors",
        "full_name": "Anjali Singh",
        "phone_number": "+919235931130",
        "email": "anjali1323s@gmail.com",
        "city": "Gorakhpur"
    },
    {
        "course": "bachelors",
        "full_name": "Himanshu Roy",
        "phone_number": "+919369450130",
        "email": "himanshuroy936945@gmail.com",
        "city": "Mahoba"
    },
    {
        "course": "masters",
        "full_name": "Susanto baidya",
        "phone_number": "+919332928020",
        "email": "sunitabaidya128@gmail.com",
        "city": "Ssgd"
    },
    {
        "course": "bachelors",
        "full_name": "Sam",
        "phone_number": "+916306400194",
        "email": "hp504520@gmail.com",
        "city": "Kanpur"
    },
    {
        "course": "bachelors",
        "full_name": "Yash Thakur",
        "phone_number": "+919205433018",
        "email": "yr9811539@gmail.com",
        "city": "Delhi"
    },
    {
        "course": "bachelors",
        "full_name": "pawan KUMAR",
        "phone_number": "+919622379011",
        "email": "pawan3470@gmail.com",
        "city": "delhi"
    },
    {
        "course": "masters",
        "full_name": "Punit Yadav",
        "phone_number": "+916388078609",
        "email": "2puneetyadav@gmail.com",
        "city": "Kanpur, Uttar Pradesh"
    },
    {
        "course": "bachelors",
        "full_name": "sumit verma",
        "phone_number": "+918471004324",
        "email": "sumit561688@gmail.com",
        "city": "Jhansi"
    },
    {
        "course": "bachelors",
        "full_name": "Abhishek Kumar",
        "phone_number": "+918873151325",
        "email": "abhishekkumar801103a@gmail.com",
        "city": "Bihta"
    },
    {
        "course": "bachelors",
        "full_name": "Nikunj Khandelwal",
        "phone_number": "+916388468871",
        "email": "nikunjkhandelwal08@gmail.com",
        "city": "Shahjahanpur"
    },
    {
        "course": "masters",
        "full_name": "Nitesh Kumar",
        "phone_number": "+919540615031",
        "email": "mechniks@gmail.com",
        "city": "Agra"
    },
    {
        "course": "masters",
        "full_name": "SHARAN",
        "phone_number": "+918054655942",
        "email": "sharandeeprai5911@gmail.com",
        "city": "Makhu"
    },
    {
        "course": "bachelors",
        "full_name": "Sourav Das",
        "phone_number": "+918981138115",
        "email": "dassourav309@gmail.com",
        "city": "Kolkata"
    },
    {
        "course": "bachelors",
        "full_name": "Mudassir khan",
        "phone_number": "+919669972992",
        "email": "mudassirkhan13536@gmail.com",
        "city": "Vadodara"
    },
    {
        "course": "masters",
        "full_name": "Savitas Gautam",
        "phone_number": "+919140983513",
        "email": "savitagautamlko914@gmail.com",
        "city": "Lucknow"
    },
    {
        "course": "masters",
        "full_name": "Vishal",
        "phone_number": "+919554880113",
        "email": "vishalsaini955488@gmail.com",
        "city": "Tarya sujan"
    },
    {
        "course": "masters",
        "full_name": "Sandeep Thakur",
        "phone_number": "+919473027473",
        "email": "sandeepthakur1616@gmail.com",
        "city": "Patna"
    },
    {
        "course": "bachelors",
        "full_name": "Sakshi nim",
        "phone_number": "+917355325183",
        "email": "sakshinim434@gmail.com",
        "city": "Lakimpur Kheri"
    },
    {
        "course": "bachelors",
        "full_name": "Kshitiz Sahu",
        "phone_number": "+919235204461",
        "email": "kshitijsahu214@gmail.com",
        "city": "Lucknow"
    },
    {
        "course": "masters",
        "full_name": "Aman",
        "phone_number": "+916394255636",
        "email": "journalaman662003@gmail.com",
        "city": "Delhi"
    },
    {
        "course": "bachelors",
        "full_name": "Rikshab ramdayal sindhighansur",
        "phone_number": "+918010038461",
        "email": "daharawalrishab@gmail.com",
        "city": "Nagpur"
    },
    {
        "course": "masters",
        "full_name": "VIRAT पर्‌धान",
        "phone_number": "+917607428154",
        "email": "viratpradhan66@gmail.com",
        "city": "PRAYAGRAJ"
    },
    {
        "course": "masters",
        "full_name": "Sugumaran Ramasamy",
        "phone_number": "+919845108879",
        "email": "nitinsuku@yahoo.co.in",
        "city": "Bangalore"
    },
    {
        "course": "masters",
        "full_name": "Rahul Saxena",
        "phone_number": "+918853108676",
        "email": "8853108676@lenskartomni.com",
        "city": "Lucknow"
    },
    {
        "course": "masters",
        "full_name": "miss_queen06",
        "phone_number": "+918573086033",
        "email": "sheetalverma8573@gmail.com",
        "city": "Lucknow"
    },
    {
        "course": "masters",
        "full_name": "Anuj",
        "phone_number": "+918840847717",
        "email": "anujverma2024av@gmail.com",
        "city": "Kanpur"
    },
    {
        "course": "bachelors",
        "full_name": "Amit kumar Jaiswal",
        "phone_number": "+918934963138",
        "email": "pooja21022016@gmail.com",
        "city": "Gorakhpur"
    },
    {
        "course": "bachelors",
        "full_name": "Vansh Rathore",
        "phone_number": "+919198170043",
        "email": "2008vanshthakur@gmail.com",
        "city": "Farrukhabad"
    },
    {
        "course": "bachelors",
        "full_name": "Abhishek Bhatt",
        "phone_number": "+917982905355",
        "email": "abhishekbhatt032@gmail.com",
        "city": "Delhi"
    },
    {
        "course": "bachelors",
        "full_name": "Nanduu",
        "phone_number": "+919209641146",
        "email": "garudrajnandini915@gmail.com",
        "city": "Latur"
    },
    {
        "course": "bachelors",
        "full_name": "Sumit Virodhiya",
        "phone_number": "+919215000798",
        "email": "virodhiyasumit081@gmail.com",
        "city": "Sonipat"
    },
    {
        "course": "bachelors",
        "full_name": "Komal sharma",
        "phone_number": "+919919903557",
        "email": "komalsh13edr2ms8w@gmail.com",
        "city": "Kanpur"
    },
    {
        "course": "bachelors",
        "full_name": "Dhivya Dharshini.S",
        "phone_number": "+919498898278",
        "email": "dhivyadharshini6707@gmail.com",
        "city": "Tamilnadu coimbatore"
    },
    {
        "course": "bachelors",
        "full_name": "Mohd akhter",
        "phone_number": "+917905188581",
        "email": "akhter470@gmail.com",
        "city": "Prayagraj"
    },
    {
        "course": "bachelors",
        "full_name": "Ayush Pal",
        "phone_number": "+916393415058",
        "email": "pal604846@gmail.com",
        "city": "Jhansi"
    },
    {
        "course": "bachelors",
        "full_name": "Md Amir",
        "phone_number": "+917317546474",
        "email": "mdamirnasim1296@gmail.com",
        "city": "Azamgarh"
    },
    {
        "course": "bachelors",
        "full_name": "विवेक  गुर्जर",
        "phone_number": "+919111675975",
        "email": "gurjarvivek813@gmail.com",
        "city": "Dabra, gwalior"
    }
]

const sid = [
    {
        "course": "bachelors",
        "full_name": "Ansh",
        "phone_number": "+919555491526",
        "email": "triansh28@gmail.com",
        "city": "Lucknow"
    },
    {
        "course": "bachelors",
        "full_name": "Adarsh Mishra",
        "phone_number": "+918887668733",
        "email": "adarsh836@gmail.com",
        "city": "Pratapgarh Uttar Pradesh"
    },
    {
        "course": "bachelors",
        "full_name": "Bijendra Kumar",
        "phone_number": "+918828064499",
        "email": "bijendrakumarele@gmail.com",
        "city": "Ghazipur"
    },
    {
        "course": "bachelors",
        "full_name": "Nitish",
        "phone_number": "+919060391390",
        "email": "nk2350889@gmail.com",
        "city": "Patna Bihar"
    },
    {
        "course": "bachelors",
        "full_name": "Sandeep Choudhary",
        "phone_number": "+919893705871",
        "email": "sanepch@gmail.com",
        "city": "Nagda"
    },
    {
        "course": "masters",
        "full_name": "______ THAKUR ? -__- …",
        "phone_number": "+918852905380",
        "email": "virendrat737@gmail.com",
        "city": 302029
    },
    {
        "course": "bachelors",
        "full_name": "Hari Nagda",
        "phone_number": "+919981112629",
        "email": "nagdahari9@gmail.com",
        "city": "Neemuch"
    },
    {
        "course": "bachelors",
        "full_name": "BIJOY",
        "phone_number": "+917029354416",
        "email": "bs6949435@gmail.com",
        "city": "Kolkata"
    },
    {
        "course": "masters",
        "full_name": "Sumit kumar",
        "phone_number": "+917973207958",
        "email": "Raj547169@gmail.com",
        "city": "Ludhiana"
    },
    {
        "course": "bachelors",
        "full_name": "_callmevik",
        "phone_number": "+919336267245",
        "email": "adhviksrivastava5547stella@gmail.com",
        "city": "Lucknow"
    },
    {
        "course": "bachelors",
        "full_name": "Shivam patel",
        "phone_number": "+917800058686",
        "email": "shivamspatel113920@gmail.com",
        "city": "Paratawal"
    },
    {
        "course": "bachelors",
        "full_name": "Abhishekh patel",
        "phone_number": "+918303690399",
        "email": "abhishek8303690399@gmail.com",
        "city": "Banaras"
    },
    {
        "course": "bachelors",
        "full_name": "Sandeep Kumar",
        "phone_number": "+918948972955",
        "email": "sandeepsh7081@gmail.com",
        "city": "Gorakhpur"
    },
    {
        "course": "bachelors",
        "full_name": "𝓐𝓫𝓱𝓲𝓼𝓱𝓮𝓴_𝓡𝓪𝓳𝓹𝓾𝓽.0_",
        "phone_number": "+919798622510",
        "email": "abhishekrajput53950@gmail.com",
        "city": "Patna"
    },
    {
        "course": "bachelors",
        "full_name": "Ajay Modanwal",
        "phone_number": "+917028877688",
        "email": "ajaymodanwalajaymodanwal16@gmail.com",
        "city": "Sultanpur"
    },
    {
        "course": "masters",
        "full_name": "Shashank  Kumar",
        "phone_number": "+916394512996",
        "email": "skr.shashank900@gmail.com",
        "city": "Lucknow"
    },
    {
        "course": "masters",
        "full_name": "Aditya Kumar Chaudhary",
        "phone_number": "+917786863030",
        "email": "n1998chaudhary@gmail.com",
        "city": "Lucknow"
    },
    {
        "course": "masters",
        "full_name": "Gaffar Ansari",
        "phone_number": "+919838671570",
        "email": "gaffaransari6@gmail.com",
        "city": "Gorakhpur"
    },
    {
        "course": "masters",
        "full_name": "Suyash Gupta",
        "phone_number": "+917060282332",
        "email": "suyashgupta.321@gmail.com",
        "city": "city"
    },
    {
        "course": "bachelors",
        "full_name": "Jayant Prakash",
        "phone_number": "+918887795489",
        "email": "prakashjayant2007@gmail.com",
        "city": "Varanasi"
    },
    {
        "course": "bachelors",
        "full_name": "Rehan Ahmad",
        "phone_number": "+917992069740",
        "email": "rehanahmad62734@gmail.com",
        "city": "Raebareli"
    },
    {
        "course": "bachelors",
        "full_name": "Content Grow mosaya",
        "phone_number": "+919140265530",
        "email": "mirzakhan3363@gmail.com",
        "city": "Allahabad"
    },
    {
        "course": "masters",
        "full_name": "Sheetal Soni",
        "phone_number": "+919651978061",
        "email": "sonishetal245@gmail.con",
        "city": "Siddharthnagar"
    },
    {
        "course": "bachelors",
        "full_name": "अमन सिंह",
        "phone_number": "+918173034562",
        "email": "rockstar06082025@gmail.com",
        "city": "Raebareli"
    },
    {
        "course": "bachelors",
        "full_name": "स्मिता",
        "phone_number": "+919304312142",
        "email": "itsthenova51@gmail.com",
        "city": "Patna"
    },
    {
        "course": "bachelors",
        "full_name": "यश ठाकुर",
        "phone_number": "+919341709667",
        "email": "yash336699@gmail.com",
        "city": "Ghaziabad"
    },
    {
        "course": "bachelors",
        "full_name": "Abhigyan Paul",
        "phone_number": "+919831536571",
        "email": "paulabhigyan5@gmail.com",
        "city": "West Bengal"
    },
    {
        "course": "masters",
        "full_name": "Shobha Jaria",
        "phone_number": "+919669588818",
        "email": "shobhajaria@hotmail.com",
        "city": "Indore"
    },
    {
        "course": "bachelors",
        "full_name": "Raja Kumar",
        "phone_number": "+919117751404",
        "email": "mantusharma5072@gmail.com",
        "city": "Patna"
    },
    {
        "course": "masters",
        "full_name": "Manika",
        "phone_number": "+917009308992",
        "email": "manika.kaur004@gmail.com",
        "city": "Amritsar"
    },
    {
        "course": "bachelors",
        "full_name": "ARYAN SAH",
        "phone_number": "+918840520433",
        "email": "rishusah123@gmail.com",
        "city": "kanpur"
    },
    {
        "course": "bachelors",
        "full_name": "Shreesh Bharadwaj",
        "phone_number": "+919785197852",
        "email": "Aadhyaenergy21@gmail.com",
        "city": "Ajmer Rajasthan"
    },
    {
        "course": "masters",
        "full_name": "Ayushmaan Tilwaliya",
        "phone_number": "+919149307229",
        "email": "ayushmantilwaliya@gmail.com",
        "city": "Meerut Cantt"
    },
    {
        "course": "bachelors",
        "full_name": "bibhas",
        "phone_number": "+918135010748",
        "email": "bibhassinha12@gmail.com",
        "city": "assam"
    },
    {
        "course": "bachelors",
        "full_name": "Aditya Kumar",
        "phone_number": "+919935039947",
        "email": "adityakuswaha790@gmail.com",
        "city": "Bilgram ( Hardoi )"
    },
    {
        "course": "bachelors",
        "full_name": "𝑮𝑶𝑱𝑶 𝑺𝑨𝑻𝑶𝑹𝑼",
        "phone_number": "+918004729357",
        "email": "hcohhiti@gmail.com",
        "city": "Farrukhabad"
    },
    {
        "course": "bachelors",
        "full_name": "Shreyansh Kumar",
        "phone_number": "+916388144107",
        "email": "shreyansh8224@gmail.com",
        "city": "Lucknow"
    },
    {
        "course": "bachelors",
        "full_name": "Mohd Anas",
        "phone_number": "+918218627620",
        "email": "anassaifi1543@gmail.com",
        "city": "Kiwar"
    },
    {
        "course": "bachelors",
        "full_name": "شان انصاری",
        "phone_number": "+916395298526",
        "email": "shaanansari51115@gmail.com",
        "city": "najibabad"
    },
    {
        "course": "bachelors",
        "full_name": "Vivek Rao",
        "phone_number": "+919599601096",
        "email": "raovn11123@gmail.con",
        "city": "utter Pradesh"
    },
    {
        "course": "masters",
        "full_name": "Jk",
        "phone_number": "+919580406430",
        "email": "iajkapoor@gmail.com",
        "city": "Gurugram"
    },
    {
        "course": "bachelors",
        "full_name": "Nitesh Paswan",
        "phone_number": "+917011588502",
        "email": "nk8753123@gmail.com",
        "city": "Kishanganj"
    },
    {
        "course": "bachelors",
        "full_name": "edit.fxbae",
        "phone_number": "+919336906112",
        "email": "sbahhsha71@gmail.com",
        "city": "Ambedkar Nagar"
    },
    {
        "course": "masters",
        "full_name": "Ankit kumar",
        "phone_number": "+919569732239",
        "email": "ankitsushant9415@gmail.com",
        "city": "city"
    },
    {
        "course": "bachelors",
        "full_name": "Nill Saha",
        "phone_number": "+919836928348",
        "email": "proferplayz@gmail.com",
        "city": "Howrah"
    },
    {
        "course": "bachelors",
        "full_name": "Dr. Ashish Kumar",
        "phone_number": "+919478478088",
        "email": "drashishchemlpu@gmail.com",
        "city": "patna"
    },
    {
        "course": "bachelors",
        "full_name": "Shreyansh Jaiswal",
        "phone_number": "+919696860928",
        "email": "jshreyansh555@gmail.com",
        "city": "Ballia"
    },
    {
        "course": "masters",
        "full_name": "Muskan Aggarwal",
        "phone_number": "+919818573111",
        "email": "Akagg154@gmail.con",
        "city": "vaishali, UP"
    },
    {
        "course": "masters",
        "full_name": "Siddharth roy",
        "phone_number": "+917439307627",
        "email": "siddharthaworkspace1@gmail.com",
        "city": "Bandel"
    },
    {
        "course": "bachelors",
        "full_name": "sanchit...",
        "phone_number": "+919454025128",
        "email": "ashu8130954@gmail.com",
        "city": "Prayagraj"
    },
    {
        "course": "bachelors",
        "full_name": "Shailesh Kumar",
        "phone_number": "+919696090456",
        "email": "kshailesh09117@gmail.com",
        "city": "Basti"
    },
    {
        "course": "bachelors",
        "full_name": "Arin neeraj Sonwani",
        "phone_number": "+919026831353",
        "email": "arinsonwani@gmail.com",
        "city": "Lucknow"
    },
    {
        "course": "masters",
        "full_name": "Taufeeq Ahmad",
        "phone_number": "+918470896905",
        "email": "taufeeqahmad86768@gmail.com",
        "city": "Unnao"
    },
    {
        "course": "bachelors",
        "full_name": "एथेना मसीह",
        "phone_number": "+918527427618",
        "email": "athenamasih@gmail.com",
        "city": "Delhi"
    },
    {
        "course": "bachelors",
        "full_name": "V",
        "phone_number": "+916392049730",
        "email": "vaishalikanaujia45@gmail.com",
        "city": "Uttar Pradesh"
    },
    {
        "course": "masters",
        "full_name": "Z  Usmani",
        "phone_number": "+919935542666",
        "email": "zusmani27@gmail.com",
        "city": "city"
    },
    {
        "course": "masters",
        "full_name": "Muralidharreddy",
        "phone_number": "+919951742604",
        "email": "eppamuralidhar15@gmail.com",
        "city": "Hyderabad lb nagar"
    },
    {
        "course": "bachelors",
        "full_name": "𝐃𝐜 𝐓𝐮𝐬𝐚𝐫♡",
        "phone_number": "+918276039622",
        "email": "stusar092@gmail.com",
        "city": "Kolkata"
    },
    {
        "course": "bachelors",
        "full_name": "देवांश सिंह गौर",
        "phone_number": "+916388852429",
        "email": "devanshthakur698@gmail.com",
        "city": "city"
    },
    {
        "course": "bachelors",
        "full_name": "Akshat agnihotri",
        "phone_number": "+917703820725",
        "email": "akshatagnihotri7703@gmail.com",
        "city": "Shajahanpur"
    },
    {
        "course": "bachelors",
        "full_name": "Abhishek Sharma",
        "phone_number": "+919506185147",
        "email": "as1044@srmist.edu.in",
        "city": "Ayodhya"
    },
    {
        "course": "bachelors",
        "full_name": "khushi",
        "phone_number": "+919372002441",
        "email": "brijeshsaroj050@gmail.com",
        "city": "Mumbai"
    },
    {
        "course": "bachelors",
        "full_name": "Aryan Srivastava",
        "phone_number": "+916387348437",
        "email": "aryansrivastava100001@gmail.com",
        "city": "Lucknow"
    },
    {
        "course": "bachelors",
        "full_name": "علی",
        "phone_number": "+918879351606",
        "email": "aliahmed14645@gmail.com",
        "city": "Mumbai"
    },
    {
        "course": "masters",
        "full_name": "Mirza Hamdan مرزا حمدان",
        "phone_number": "+919119728579",
        "email": "mirzahamdan9319@gmail.com",
        "city": "Aligarh"
    },
    {
        "course": "masters",
        "full_name": "Bhanu Pratap Singh",
        "phone_number": "+919369626633",
        "email": "bhanu626633@gmail.com",
        "city": "Gorakhpur"
    },
    {
        "course": "bachelors",
        "full_name": "Faize Aqdas",
        "phone_number": "+917268045787",
        "email": "faiznaseem18@gmail.com",
        "city": "Kuala Lumpur"
    },
    {
        "course": "bachelors",
        "full_name": "Abhinav",
        "phone_number": "+917080101707",
        "email": "abhinav021pathak@gmail.com",
        "city": "Varanasi"
    },
    {
        "course": "bachelors",
        "full_name": "Amrish Gour",
        "phone_number": "+917703993780",
        "email": "aamburishkumar@gmail.com",
        "city": "Gorakhpur"
    },
    {
        "course": "masters",
        "full_name": "Riverine",
        "phone_number": "+918382863713",
        "email": "shiprachaudhery123@gmail.com",
        "city": "Lucknow"
    },
    {
        "course": "bachelors",
        "full_name": "Kunal",
        "phone_number": "+919198605599",
        "email": "pagalagarwal1981@gmail.com",
        "city": "Renukoot"
    },
    {
        "course": "masters",
        "full_name": "Abhishek Tripathi",
        "phone_number": "+918081952475",
        "email": "abhishekawsome@gmail.com",
        "city": "Mughalsarai"
    },
    {
        "course": "bachelors",
        "full_name": "Alishba",
        "phone_number": "+918470868572",
        "email": "alishbaasif2711@gmail.com",
        "city": "Prayagraj"
    },
    {
        "course": "masters",
        "full_name": "Ravi Kushwaha",
        "phone_number": "+919981935027",
        "email": "ravi.kushwaha414@gmail.com",
        "city": "orchha"
    },
    {
        "course": "bachelors",
        "full_name": "AMOGH CHANDRA MANI",
        "phone_number": "+917080809895",
        "email": "amoghcmani@gmail.com",
        "city": "city, Uttar Pradesh"
    },
    {
        "course": "bachelors",
        "full_name": "dramit56695@gmail.com",
        "phone_number": "+918601145744",
        "email": "dramit56695@gmail.com",
        "city": "Deoria  (U P)"
    },
    {
        "course": "bachelors",
        "full_name": "Vishal Verma",
        "phone_number": "+919519156341",
        "email": "visco3107@mail.com",
        "city": "maharajganj"
    },
    {
        "course": "bachelors",
        "full_name": "Nik tiwari",
        "phone_number": "+918317793411",
        "email": "nikhiltiwaribth305@gmail.com",
        "city": "Bettiah"
    },
    {
        "course": "bachelors",
        "full_name": "Jayant prakash",
        "phone_number": "+918887795489",
        "email": "prakashjayant2007@gmail.com",
        "city": "Varansi"
    },
    {
        "course": "bachelors",
        "full_name": "Falak Sheikh",
        "phone_number": "+918604655674",
        "email": "falaksheikh539@gmail.com",
        "city": "Faizabad"
    },
    {
        "course": "bachelors",
        "full_name": "‌‌‌‌‌‌‌partha Sarathi abinash pradhan",
        "phone_number": "+918260103426",
        "email": "pradhanbijaya134@gimel.com",
        "city": "Puri"
    },
    {
        "course": "bachelors",
        "full_name": "Nurani",
        "phone_number": "+919554404976",
        "email": "nuraniansari31230@gmail.com",
        "city": "Gorakhpur"
    },
    {
        "course": "bachelors",
        "full_name": "Praveen sacgan",
        "phone_number": "+919696824998",
        "email": "praveensachan9@gmail.com",
        "city": "city utter pradesh"
    },
    {
        "course": "bachelors",
        "full_name": "ARPIT",
        "phone_number": "+919598778635",
        "email": "arpitpal0018@gmail.com",
        "city": "city"
    },
    {
        "course": "bachelors",
        "full_name": "Aparajita Singh Raghuvanshi",
        "phone_number": "+918707408082",
        "email": "singhraghuvanshiaparajita@gmail.com",
        "city": "Lucknow"
    },
    {
        "course": "bachelors",
        "full_name": "Aditya",
        "phone_number": "+918527587365",
        "email": "kalmotia.211@gmail.com",
        "city": "Delhi"
    },
    {
        "course": "bachelors",
        "full_name": "Pawan Deep Singh",
        "phone_number": "+919103228184",
        "email": "Pawankapoor2006@gmail.com",
        "city": "Kathua"
    },
    {
        "course": "masters",
        "full_name": "Ayushi",
        "phone_number": "+916392004661",
        "email": "ranjanasony48@gmail.com",
        "city": "Canada"
    },
    {
        "course": "bachelors",
        "full_name": "Kashif Khan",
        "phone_number": "+916306392201",
        "email": "khankashif34813@gmail.com",
        "city": "Lucknow"
    },
    {
        "course": "bachelors",
        "full_name": "Srijan Srivastava",
        "phone_number": "+917905095362",
        "email": "srijansrivastava92740@gmail.com",
        "city": "Lucknow"
    },
    {
        "course": "masters",
        "full_name": "Vineela Puppala",
        "phone_number": "+919346535402",
        "email": "vineelapuppala9@gmail.com",
        "city": "Kothagude, Telangana"
    },
    {
        "course": "masters",
        "full_name": "Lavkush Singh",
        "phone_number": "+919129013236",
        "email": "raghvendrasingh28290@gmail.com",
        "city": "Allahabad"
    },
    {
        "course": "bachelors",
        "full_name": "ANMOL",
        "phone_number": "+917355226774",
        "email": "anmolchaturvedi889@gmail.com",
        "city": "Varanasi"
    }
]

const leadQueues = {
    one: [...asmita],
    sid: [...sid]
};

export const startLeadCron = (queueName, counselorId) => {
    cron.schedule("*/60 * * * * *", async () => {

        const queue = leadQueues[queueName];

        if (!queue || queue.length === 0) {
            console.log(`⚠️ No leads left for ${queueName}`);
            return;
        }

        const nextLead = queue.shift();

        await insertSingleLead(nextLead, counselorId);

    });
};