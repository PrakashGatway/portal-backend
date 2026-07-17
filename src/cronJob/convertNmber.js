import cron from "node-cron";
import { Lead } from "../models/Leads.js";
import mongoose from "mongoose";
import { Leadlogs } from "../models/leadLogs.js";
import PagesContent from "../models/PagesContent.js";

const CRON_SCHEDULE = "*/60 * * * * *";
const TIMEZONE = "Asia/Kolkata";


/**
 * Helper function to build the sections array matching the Jaipur page structure
 */
function buildPageSections(aiData, cityName, pageType) {
    const sections = [];

    // 0. StudyDestinations
    sections.push({
        type: "StudyDestinations",
        order: 0,
        content: {
            title: aiData.destinationsTitle || `Global Study Destinations Choose Your Perfect Study Abroad Destination`,
            subTittle: aiData.destinationsSubTittle || `Study in Germany | Italy | USA | UK | Canada | Australia | Europe | New Zealand | Singapore – admissions open for 2025–2026`,
            subTitle: aiData.destinationsSubTitle || `<p>Gateway Abroad ${cityName} is an institution that helps students find the best universities around the globe. We provide complete assistance to students from career guidance, admissions, scholarship help, visa help, to pre departure services.</p>`,
            destinations: [
                {
                    "name": "United Kingdom",
                    "subtitle": "<p>Russell Group &middot; 1-Year Master's &middot; 2-Year Graduate Route Visa &middot; 95,000+ Indian students in 2025</p>",
                    "slug": "study-in-uk",
                    "image": "1782816097530-868799677.webp"
                },
                {
                    "name": "Canada",
                    "subtitle": "<p>&nbsp;PR Pathway &middot; 3-Year PGWP &middot; Top Universities</p>",
                    "slug": "study-in-canada",
                    "image": "1782816111446-121252169.webp"
                },
                {
                    "name": "Australia",
                    "subtitle": "<div class=\"dest-name\">&nbsp;</div>\n<div class=\"dest-sub\">Group of Eight &middot; 4-Year Work Visa &middot; Indian Community</div>",
                    "slug": "study-in-australia",
                    "image": "1782816122508-126626596.webp"
                },
                {
                    "name": "USA",
                    "subtitle": "<div class=\"dest-sub\">Ivy League &middot; State Universities &middot; 3-Year STEM OPT</div>",
                    "slug": "study-in-usa",
                    "image": "1782816136234-465652261.webp"
                },
                {
                    "name": "Germany",
                    "subtitle": "<div class=\"dest-name\">&nbsp;</div>\n<div class=\"dest-sub\">FREE Public Tuition &middot; TU Munich &middot; DAAD Scholarship</div>",
                    "slug": "study-in-germany",
                    "image": "1782816147083-751576256.webp"
                },
                {
                    "name": "Dubai",
                    "subtitle": "<p>Dubai Universities &middot; KHDA-Approved Institutions &middot; Industry-Focused Programs &middot; Global Campuses</p>",
                    "slug": "study-in-dubai",
                    "image": "1782816158049-907315418.webp"
                },
                {
                    "name": "Italy",
                    "subtitle": "<p>Public Universities &middot; Tuition-Free Options &middot; English-Taught Programs &middot; EU Degrees</p>",
                    "slug": "study-in-italy",
                    "image": "1782816167874-80118446.webp"
                },
                {
                    "name": "France",
                    "subtitle": "",
                    "slug": "study-in-france",
                    "image": "1782816206177-496179761.webp"
                }
            ]
        }
    });

    // 1. AcademicPrograms
    sections.push({
        type: "AcademicPrograms",
        order: 1,
        content: {
            title: aiData.academicProgramsTitle || `Top Overseas Academic Programs for ${cityName} Students`,
            subTittle: aiData.academicProgramsSubTittle || `Gateway Abroad ${cityName} provides many different pathways to academic success for international students. With our best overseas education consultants in ${cityName}, we assist in selecting suitable undergraduate, postgraduate, and pathway courses.`
        }
    });

    // 2. WhyChooseUs (Cards)
    sections.push({
        type: "WhyChooseUs",
        order: 2,
        content: {
            title: aiData.whyChooseUsTitle || `Why Choose Gateway Abroad ${cityName}`,
            subTittle: aiData.whyChooseUsSubTittle || `We are your reliable partner for studying abroad, offering expert advice, global university connections, and end-to-end support for a successful journey`,
            Cards: aiData.whyChooseUsCards || [
                { name: "Expert Instructors", icon: "CircleUserRound", content: "Learn directly from seasoned professionals who bring real-world experience into the classroom." },
                { name: "Industry Certification", icon: "ShieldCheck", content: "Receive globally recognized certificates that boost your career opportunities." },
                { name: "100+ Career-Boosting Courses", icon: "BriefcaseBusiness", content: "Access our growing library of over 100 courses across web development, data science, design, and business." },
                { name: "Flexible Learning Schedules", icon: "Book", content: "Whether you prefer to study in the early mornings or late nights, our flexible online platform allows you to learn at your own pace." }
            ]
        }
    });

    // 3. Main Content (HTML)
    sections.push({
        type: "content",
        order: 3,
        content: {
            title: aiData.mainContentTitle || `Best Study Abroad Consultants In ${cityName}`,
            content: `<p class="MsoNormal"><span lang="EN-US" style="font-family: georgia, palatino, serif;">To get a top-notch education, many students want to study abroad to explore the global education system and grasp career growth opportunities. However, now Jaipur, known as the city of lakes, is becoming popular among students who want to study abroad. Although there is one crucial point that needs to be considered, which is to find reliable&nbsp;<strong>study abroad consultants in Jaipur,</strong>&nbsp;considering the demand for foreign education.</span></p>
<p class="MsoNormal"><span style="font-family: georgia, palatino, serif;"><span lang="EN-US">So, there is no need to worry. We at Gateway Abroad are popular for providing top<strong>&nbsp;study abroad institutes in Jaipur</strong>,</span><span lang="EN-US">&nbsp;</span><span lang="EN-US">assisting students in achieving their goals of receiving a global education.</span></span></p>
<h3 class="MsoNormal"><span style="font-family: georgia, palatino, serif;"><strong><span lang="EN-US">Why Pick Jaipur's Overseas Education Consultants?</span></strong></span></h3>
<p class="MsoNormal"><span style="font-family: georgia, palatino, serif;"><span lang="EN-US">Selecting the right university, understanding the requirements, preparing for exams, and applying for visas may all be rather challenging.</span><span lang="EN-US">&nbsp;Furthermore, related to all these things, like choosing a university, exams, and visa-related issues,&nbsp;</span><span lang="EN-US">overseas<strong>&nbsp;education consultants&nbsp;</strong>in Jaipur might be helpful for you. This consultant has years of experience in providing expert advice related to studying abroad. Here you can take advantage of many of the services to make your future bright, such as career counselling, university shortlisting, exam preparation, visa aid, and pre-departure workshops, etc. Consultants' main service is to offer familiar assistance to every student, which helps students to boost their confidence to enter the international academic community, in addition to receiving knowledgeable guidance.</span></span></p>
<h3 class="MsoNormal"><span style="font-family: georgia, palatino, serif;"><strong><span lang="EN-US">Gateway Abroad &ndash; Your Trusted Partner in Overseas Education</span></strong></span></h3>
<p class="MsoNormal"><span lang="EN-US" style="font-family: georgia, palatino, serif;">Gateway Abroad, one of the&nbsp;<strong>top study abroad consultants near me</strong>. Even though it is the most prestigious study abroad consultant in Jaipur, it offers personal guidance to each student, and the faculty is very cooperative and knowledgeable. Whether you want to study in the UK, USA, Canada, Australia, Ireland, or New Zealand, we offer an in-depth strategy for success.</span></p>
<p class="MsoNormal"><span style="font-family: georgia, palatino, serif;"><strong><span lang="EN-US">Among our offerings are</span></strong><span lang="EN-US">-</span></span></p>
<p class="MsoListParagraphCxSpFirst"><span style="font-family: georgia, palatino, serif;"><span lang="EN-US">&middot;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><strong><span lang="EN-US">Career counselling-</span></strong><span lang="EN-US">&nbsp;Assisting students in selecting the best nation, school, and program.</span></span></p>
<p class="MsoListParagraphCxSpMiddle"><span style="font-family: georgia, palatino, serif;"><span lang="EN-US">&middot;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><strong><span lang="EN-US">Test Preparation-&nbsp;</span></strong><span lang="EN-US">Professional tutoring for the&nbsp;<strong><a href="https://www.gatewayabroadeducations.com/course/IELTS">IELTS</a>,&nbsp;<a href="https://www.gatewayabroadeducations.com/course/TOEFL">TOEFL</a>,&nbsp;<a href="https://www.gatewayabroadeducations.com/course/GRE">GRE</a>,&nbsp;<a href="https://www.gatewayabroadeducations.com/course/GMAT">GMAT</a>,&nbsp;<a href="https://www.gatewayabroadeducations.com/course/SAT">SAT</a>,</strong>&nbsp;and&nbsp;<a href="https://www.gatewayabroadeducations.com/course/PTE"><strong>PTE&nbsp;</strong></a></span></span></p>
<p class="MsoListParagraphCxSpMiddle"><span style="font-family: georgia, palatino, serif;"><span lang="EN-US">&middot;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><strong><span lang="EN-US">Application Assistance-</span></strong><span lang="EN-US">&nbsp;Complete help with document preparation and applying to prestigious colleges.</span></span></p>
<p class="MsoListParagraphCxSpMiddle"><span style="font-family: georgia, palatino, serif;"><span lang="EN-US">&middot;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><strong><span lang="EN-US">Visa Guidance-</span></strong><span lang="EN-US">&nbsp;Making sure the visa application procedure is easy and hassle-free.</span></span></p>
<p class="MsoListParagraphCxSpMiddle"><span style="font-family: georgia, palatino, serif;"><span lang="EN-US">&middot;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><strong><span lang="EN-US">Scholarship Support-</span></strong><span lang="EN-US">&nbsp;Assisting students in looking into financial assistance and scholarship options.</span></span></p>
<p class="MsoListParagraphCxSpLast"><span style="font-family: georgia, palatino, serif;"><span lang="EN-US">&middot;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><strong><span lang="EN-US">Pre-Departure Sessions-</span></strong><span lang="EN-US">&nbsp;These help students get ready for life overseas.</span></span></p>
<h3 class="MsoNormal"><span style="font-family: georgia, palatino, serif;"><strong><span lang="EN-US">Why Are We Jaipur's Top Study Abroad Consultants?</span></strong></span></h3>
<p class="MsoListParagraphCxSpFirst"><span style="font-family: georgia, palatino, serif;"><strong><span lang="EN-US">1.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></strong><span lang="EN-US"><strong>Expert Team:</strong> Our licensed trainers and counsellors have years of experience in international education.</span></span></p>
<p class="MsoListParagraphCxSpMiddle"><span style="font-family: georgia, palatino, serif;"><strong><span lang="EN-US">2.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></strong><span lang="EN-US"><strong>Demonstrated Success</strong>: Hundreds of Jaipur students have been accepted into prominent colleges throughout the globe.</span></span></p>
<p class="MsoListParagraphCxSpMiddle"><span style="font-family: georgia, palatino, serif;"><strong><span lang="EN-US">3.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></strong><span lang="EN-US"><strong>Tailored Guidance:</strong> Since each student's path is different, we develop roadmaps just for them.</span></span></p>
<p class="MsoListParagraphCxSpLast"><span style="font-family: georgia, palatino, serif;"><strong><span lang="EN-US">4.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></strong><span lang="EN-US"><strong>Local Presence, Global Reach:</strong> As one of Jaipur's&nbsp;<strong>top study abroad</strong>&nbsp;advisors, we combine local credibility with global norms.</span></span></p>
<p class="MsoNormal"><span style="font-family: georgia, palatino, serif;"><strong><span lang="EN-US">Top Study Abroad Destinations</span></strong></span></p>
<p class="MsoNormal"><span lang="EN-US" style="font-family: georgia, palatino, serif;">We assist students in exploring some of the most popular destinations for international education:</span></p>
<ul type="disc">
<li class="MsoNormal" style="font-family: georgia, palatino, serif;"><span lang="EN-US" style="font-family: georgia, palatino, serif;"><a href="https://web.archive.org/web/20251205083100mp_/https://www.gatewayabroadeducations.com/study-in-uk">United Kingdom</a>&nbsp;(UK)</span></li>
<li class="MsoNormal" style="font-family: georgia, palatino, serif;"><span lang="EN-US" style="font-family: georgia, palatino, serif;"><a href="https://web.archive.org/web/20251205083100mp_/https://www.gatewayabroadeducations.com/study-in-usa">United States of America</a> (USA)</span></li>
<li class="MsoNormal" style="font-family: georgia, palatino, serif;"><span style="font-family: georgia, palatino, serif;"><a href="https://web.archive.org/web/20251205083100mp_/https://www.gatewayabroadeducations.com/study-in-canada"><span lang="EN-US">Canada</span></a></span></li>
<li class="MsoNormal" style="font-family: georgia, palatino, serif;"><span style="font-family: georgia, palatino, serif;"><a href="https://web.archive.org/web/20251205083100mp_/https://www.gatewayabroadeducations.com/study-in-australia"><span lang="EN-US">Australia</span></a></span></li>
<li class="MsoNormal" style="font-family: georgia, palatino, serif;"><span style="font-family: georgia, palatino, serif;"><a href="https://web.archive.org/web/20251205083100mp_/https://www.gatewayabroadeducations.com/study-in-ireland"><span lang="EN-US">Ireland</span></a></span></li>
<li class="MsoNormal" style="font-family: georgia, palatino, serif;"><span style="font-family: georgia, palatino, serif;"><a href="https://web.archive.org/web/20251205083100mp_/https://www.gatewayabroadeducations.com/study-in-new-zealand"><span lang="EN-US">New Zealand</span></a></span></li>
</ul>
<h3><span lang="EN-US" style="font-family: georgia, palatino, serif;">Top Areas in Jaipur for Students &amp; Study Abroad Guidance</span></h3>
<table style="border-collapse: collapse; border-style: solid;" border="1">
<thead>
<tr>
<th><span style="font-family: georgia, palatino, serif;">Cluster</span></th>
<th><span style="font-family: georgia, palatino, serif;">Key Areas</span></th>
</tr>
</thead>
<tbody>
<tr>
<td><span style="font-family: georgia, palatino, serif;"><strong>Central Premium</strong></span></td>
<td><span style="font-family: georgia, palatino, serif;">Civil Lines, C-Scheme, Ashok Nagar, Bani Park, Gopalbari, Sindhi Camp</span></td>
</tr>
<tr>
<td><span style="font-family: georgia, palatino, serif;"><strong>Western Residential</strong></span></td>
<td><span style="font-family: georgia, palatino, serif;">Vaishali Nagar, Shyam Nagar, Sodala, Nirman Nagar, Kalwar Road, Ajmer Road</span></td>
</tr>
<tr>
<td><span style="font-family: georgia, palatino, serif;"><strong>Southern Growth</strong></span></td>
<td><span style="font-family: georgia, palatino, serif;">Tonk Road, Lalkothi, Durgapura, Sitapura, Sanganer, Jagatpura</span></td>
</tr>
<tr>
<td><span style="font-family: georgia, palatino, serif;"><strong>Eastern Student Hubs</strong></span></td>
<td><span style="font-family: georgia, palatino, serif;">Raja Park, Tilak Nagar, Bapu Nagar, Adarsh Nagar, Jawahar Nagar, Chandpole</span></td>
</tr>
<tr>
<td><span style="font-family: georgia, palatino, serif;"><strong>Northern Expansion</strong></span></td>
<td><span style="font-family: georgia, palatino, serif;">Mansarovar, Vidyadhar Nagar, Muralipura, Subhash Nagar, Shastri Nagar, Jhotwara</span></td>
</tr>
<tr>
<td><span style="font-family: georgia, palatino, serif;"><strong>University &amp; Coaching Belt</strong></span></td>
<td><span style="font-family: georgia, palatino, serif;">Malviya Nagar, Pratap Nagar, Gopalpura, Triveni Nagar, Ram Nagar</span></td>
</tr>
</tbody>
</table>
<p class="MsoNormal"><span style="font-family: georgia, palatino, serif;"><span lang="EN-US">Students from Jaipur can achieve their global study dreams with an expertly crafted</span><strong><span lang="EN-US">&nbsp;<a href="https://www.gatewayabroadeducations.com/article/statement-of-purpose-importance-tips-example">Statement of Purpose (SOP)</a>&nbsp;and&nbsp;<a href="https://www.gatewayabroadeducations.com/blog-description/letter-of-recommendation-to-student">Letters of Recommendation</a> </span></strong><span lang="EN-US">(LOR). Our guidance ensures your SOP and LOR highlight your achievements, goals, and potential to top universities worldwide.</span></span></p>
<p><span style="font-family: georgia, palatino, serif;"><strong><span lang="EN-US">Final Thoughts</span></strong><span lang="EN-US"><br>Gateway Abroad is your one-stop shop if you're looking for trustworthy&nbsp;<strong>study abroad consultants in Jaipur.</strong>&nbsp;We assist students in realizing their aspirations of studying abroad thanks to our knowledgeable staff, extensive worldwide network, and successful track record.<br>Visit&nbsp;<a href="https://web.archive.org/web/20251205083100mp_/https://www.gatewayabroadeducations.com">Gateway Abroad Education</a>, the<strong>&nbsp;best overseas education consultants in Jaipur</strong>, if you're prepared to take the next step towards your future, and allow us to help you succeed.</span></span></p>
<p>&nbsp;</p>
<section style="background: #fff1f2; padding: 60px 20px; text-align: center;">
<div style="max-width: 800px; margin: auto;"><span style="font-family: georgia, palatino, serif;"><!-- Heading --></span>
<h2 style="font-size: 32px; font-weight: bold; color: #dc2626; margin-bottom: 15px;"><span style="font-family: georgia, palatino, serif;">Study Abroad in Jaipur &ndash; Visit Gateway Abroad Today!</span></h2>
<span style="font-family: georgia, palatino, serif;"><!-- Subtext --></span>
<p style="font-size: 18px; color: #374151; margin-bottom: 15px;"><span style="font-family: georgia, palatino, serif;">Get expert guidance for <strong>Study Abroad Admissions, Student Visa, IELTS/PTE Coaching,</strong> and top universities worldwide.</span></p>
<span style="font-family: georgia, palatino, serif;"><!-- Keywords --></span>
<p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;"><span style="font-family: georgia, palatino, serif;">UK &bull; Canada &bull; Australia &bull; USA &bull; Germany | IELTS &bull; PTE &bull; TOEFL | Scholarships &amp; Visa Assistance in Jaipur</span></p>
<span style="font-family: georgia, palatino, serif;"><!-- Address --></span>
<p style="font-size: 14px; color: #4b5563; margin-bottom: 30px;"><span style="font-family: georgia, palatino, serif;">105, First Floor, Geetanjali Towers,</span><br><span style="font-family: georgia, palatino, serif;">Ajmer Rd, Jai Ambey Colony, Civil Lines,</span><br><span style="font-family: georgia, palatino, serif;">Jaipur, Rajasthan &ndash; 302006</span></p>
<span style="font-family: georgia, palatino, serif;"><!-- CTA Buttons --></span>
<div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;"><span style="font-family: georgia, palatino, serif;"><!-- Visit Button --> <a style="display: inline-block; background-color: #ef4444; color: #ffffff; padding: 14px 30px; font-size: 16px; font-weight: 600; border-radius: 50px; text-decoration: none; box-shadow: 0 6px 15px rgba(0,0,0,0.15);" href="https://maps.google.com/?q=Geetanjali+Towers+Ajmer+Road+Jaipur" target="_blank" rel="noopener"> Visit Our Jaipur Office </a> <!-- Call Button --> <a style="display: inline-block; background-color: #e6e6fa; color: #000000; padding: 14px 30px; font-size: 16px; font-weight: 600; border-radius: 50px; text-decoration: none; box-shadow: 0 6px 15px rgba(0,0,0,0.15);" href="tel:+918302092630">&nbsp;📞 Connect With an Expert </a></span></div>
</div>
</section>`
        }
    });

    // 4. whychooseus (Detailed Cards)
    sections.push({
        type: "whychooseus",
        order: 4,
        content: {
            label: aiData.whyChooseUsLabel || `Why Choose Gateway Abroad ${cityName}`,
            title: "The Right Partner for Your Study Abroad Journey",
            subTitle: aiData.whyChooseUsDetailedSubTitle || `<p>Gateway Abroad ${cityName} is recognized by students as being the most trustworthy top study abroad consultants in ${cityName} who help them through all aspects related to studying abroad.</p>`,
            cards: aiData.whyChooseUsDetailedCards || [
                { icon: "ContactRound", title: "Free Profile Evaluation", description: "<p>Your first counselling is 100% free. We assess your profile, goals, budget, and IELTS status.</p>" },
                { icon: "SquareCheck", title: "Data-Driven University Shortlisting", description: "<p>We use real admission data by profile and course to shortlist universities where you have the highest chances.</p>" },
                { icon: "School", title: "2000+ University Partnerships", description: "<p>From Oxford and Harvard to TU Munich and the University of Melbourne — our global network gives you unmatched access.</p>" },
                { icon: "BookOpenText", title: "Test Prep Without Stress", description: "<p>Certified trainers, personalised study plans, daily practice sessions and weekly mock tests.</p>" }
            ]
        }
    });

    // 5. servicesection
    sections.push({
        type: "servicesection",
        order: 5,
        content: {
            label: "Services",
            title: aiData.servicesTitle || `Gateway Abroad ${cityName} Services`,
            subtitle: `<p>Complete study abroad helps to support students at every stage of their international education journey.</p>`,
            Cards: aiData.servicesCards || [
                { icon: "CircleUserRound", title: "Career Counseling", subtitle: "<p>Get personalized guidance to choose the right course, university, and country.</p>", btn: "book your fee session" },
                { icon: "House", title: "University Admissions", subtitle: "<p>Receive complete support with university selection, application processing, SOPs, LORs.</p>", btn: "book your fee session" },
                { icon: "NotebookPen", title: "IELTS & Test Preparation", subtitle: "<p>Expert coaching for IELTS, TOEFL, PTE, GRE, GMAT, and SAT.</p>", btn: "book your fee session" },
                { icon: "IdCard", title: "Visa Assistance", subtitle: "<p>Professional visa guidance with documentation support and mock interview preparation.</p>", btn: "book your fee session" }
            ]
        }
    });

    // 6. citysection (Other Branches)
    sections.push({
        type: "citysection",
        order: 6,
        content: {
            label: "Our Other Branches",
            title: "Study Abroad Consultants & IELTS Coaching Across India",
            subTitle: `<p>Whether you visit our centre in person or connect online from anywhere in India, expert guidance is always within reach.</p>`,
            cities: aiData.otherCities || [
                { icon: "", name: "Udaipur", slug: "study-abroad/udaipur", description: "" },
                { icon: "", name: "Delhi", slug: "study-abroad/delhi", description: "" },
                { icon: "", name: "Bangalore", slug: "study-abroad/bangalore", description: "" },
                { icon: "", name: "Chennai", slug: "study-abroad/chennai", description: "" }
            ],
            sectiondescription: `<p>Gateway Abroad ${cityName} is considered as one of the most trustworthy study abroad consultancy companies, helping students find the best universities in the world.</p>`
        }
    });

    // 7. ctasection
    sections.push({
        type: "ctasection",
        order: 7,
        content: {
            title: aiData.ctaTitle || `Start Your Study Abroad Journey With Gateway Abroad ${cityName}`,
            subTitle: `<p>Take the first step toward your international education goals with expert guidance, university admissions support, visa assistance, and personalized counseling.</p>`,
            features: [
                { featuretitle: "Expert university and course guidance" },
                { featuretitle: "Complete application and visa support" },
                { featuretitle: "IELTS & test preparation coaching" }
            ]
        }
    });

    // 8. BestUniversities
    sections.push({
        type: "BestUniversities",
        order: 8,
        content: {
            title: aiData.bestUniversitiesTitle || `Top Universities to Study Abroad from ${cityName}`,
            subTittle: "Explore globally recognized universities preferred by students for world-class education, research opportunities, and strong career outcomes.",
            Cards: [
                {
                    "name": "University of Oxford",
                    "qsRank": "QS Rank #4",
                    "description": "University of Oxford is the very best university for study abroad. A world-leading institution with centuries of academic excellence.",
                    "location": "Oxford, England",
                    "Courses": [],
                    "year": "1096",
                    "icon": "School",
                    "slug": "blog-description/oxford-university"
                },
                {
                    "name": "University of Manchester ",
                    "qsRank": "QS Rank #35",
                    "description": "Known for pioneering work including splitting the atom, building the first modern computer, and isolating graphene.  ",
                    "location": "Manchester, England",
                    "Courses": [],
                    "year": "1824",
                    "icon": "School",
                    "slug": "article/university-of-manchester"
                },
                {
                    "name": "MIT",
                    "qsRank": "QS Rank #1",
                    "description": "Massachusetts Institute of Technology is a world leader in science, engineering, and technology education and research.",
                    "location": "Cambridge, Massachusetts",
                    "Courses": [],
                    "year": "1861",
                    "icon": "School",
                    "slug": "blog-description/massachusetts-institute-of-technology-us"
                },
                {
                    "name": "University of Melbourne",
                    "qsRank": "QS Rank #14",
                    "description": "Australia’s #1 university, known for research excellence and strong global reputation.  ",
                    "location": "Melbourne, Australia",
                    "Courses": [],
                    "year": "1853",
                    "icon": "School",
                    "slug": "/blog-description/melbourne-university-australia"
                }
            ]
        }
    });

    return sections;
}

async function generatePagebyAI(cityName, pageType) {
    try {
        console.log(`🤖 Generating AI content for page: ${cityName}...`);

        // Pre-calculate slug to inject into the prompt
        const prompt = `
      You are an expert SEO content writer and data generator for "Gateway Abroad", a premier study abroad consultancy.
      Your task is to generate comprehensive, highly engaging, and SEO-optimized page content for a new page for the city: "${cityName}".
      and also focus on the keywords for study aboad consultants, overseas education, IELTS coaching, and related services and make sure to include them naturally in the content.
      and also make the content unique and plagiarism free with a human-like tone, and also make sure to include the city name "${cityName}" in the content multiple times naturally.
      also make the heavy content in title , subtitle of sections
      
      You must return ONLY a valid JSON object with the exact structure below. 
      Ensure all HTML content is properly formatted with tags like <p>, <h3>, <strong>, <ul>, <li>, etc.
      
      {
        "title": "Study Abroad Consultants in ${cityName} | Overseas Education & Visa Guidance",
        "subTitle": "A compelling 2-3 sentence subtitle about Gateway Abroad helping students from ${cityName} study in the UK, USA, Canada, Australia, Germany, etc.",
        "metaTitle": "Best Study Abroad Consultants in ${cityName} – Gateway Abroad",
        "metaDescription": "SEO meta description (max 160 chars) for Gateway Abroad ${cityName}.",
        "keywords": ["Study abroad consultants in ${cityName}", "overseas education in ${cityName}", "IELTS coaching ${cityName}"],
        "tags": ["Study abroad consultants in ${cityName}"],
        "isFeatured": false,
        
        "destinationsTitle": "Global Study Destinations Choose Your Perfect Study Abroad Destination",
        "destinationsSubTittle": "Study in Germany | Italy | USA | UK | Canada | Australia | Europe | New Zealand | Singapore – admissions open for 2025–2026",
        "destinationsSubTitle": "<p>Gateway Abroad ${cityName} is an institution that helps students find the best universities around the globe. We provide complete assistance to students from career guidance, admissions, scholarship help, visa help, to pre departure services.</p>",
        
        "academicProgramsTitle": "Top Overseas Academic Programs for ${cityName} Students",
        "academicProgramsSubTittle": "A paragraph about Gateway Abroad ${cityName} providing pathways to academic success for international students with personalized advice on countries and universities.",
        
        "whyChooseUsTitle": "Why Choose Gateway Abroad ${cityName}",
        "whyChooseUsSubTittle": "We are your reliable partner for studying abroad, offering expert advice, global university connections, and end-to-end support for a successful journey.",
        "whyChooseUsCards": [
          {"name": "Expert Instructors", "icon": "CircleUserRound", "content": "Learn directly from seasoned professionals who bring real-world experience into the classroom."},
          {"name": "Industry Certification", "icon": "ShieldCheck", "content": "Receive globally recognized certificates that boost your career opportunities."},
          {"name": "100+ Career-Boosting Courses", "icon": "BriefcaseBusiness", "content": "Access our growing library of over 100 courses across web development, data science, design, and business."},
          {"name": "Flexible Learning Schedules", "icon": "Book", "content": "Whether you prefer to study in the early mornings or late nights, our flexible online platform allows you to learn at your own pace."}
        ],
        
        "mainContentTitle": "Best Study Abroad Consultants In ${cityName}",
        "mainContent": "<p>Write a comprehensive, SEO-optimized HTML article (at least 400 words) about studying abroad from ${cityName}. Include sections on 'Why Pick ${cityName}'s Overseas Education Consultants', 'Gateway Abroad as a trusted partner', 'Services Offered' (Career counselling, Test Preparation, Application Assistance, Visa Guidance, Scholarship Support), and 'Top Study Abroad Destinations'. Use <h3>, <p>, <ul>, <li>, and <strong> tags. Do not include markdown code blocks inside the HTML string.</p>",
        
        "whyChooseUsLabel": "Why Choose Gateway Abroad ${cityName}",
        "whyChooseUsDetailedSubTitle": "<p>Gateway Abroad ${cityName} is recognized by students as being the most trustworthy top study abroad consultants in ${cityName} who help them through all aspects related to studying abroad.</p>",
        "whyChooseUsDetailedCards": [
          {"icon": "ContactRound", "title": "Free Profile Evaluation", "description": "<p>Your first counselling is 100% free. We assess your profile, goals, budget, and IELTS status.</p>"},
          {"icon": "SquareCheck", "title": "Data-Driven University Shortlisting", "description": "<p>We use real admission data by profile and course to shortlist universities where you have the highest chances.</p>"},
          {"icon": "School", "title": "2000+ University Partnerships", "description": "<p>From Oxford and Harvard to TU Munich and the University of Melbourne — our global network gives you unmatched access.</p>"},
          {"icon": "BookOpenText", "title": "Test Prep Without Stress", "description": "<p>Certified trainers, personalised study plans, daily practice sessions and weekly mock tests.</p>"},
          {"icon": "BookOpenCheck", "title": "SOPs That Win Admissions", "description": "<p>Our professional SOP writers don't use templates — every statement of purpose is crafted from scratch.</p>"},
          {"icon": "IdCard", "title": "Near 96% Visa Success Rate", "description": "<p>Our visa specialists prepare bulletproof documentation for UK, USA, Canada, Australia and Germany student visas.</p>"},
          {"icon": "BadgeDollarSign", "title": "Scholarships + Loans", "description": "<p>We identify every scholarship you qualify for and guide your education loan application with top banks.</p>"},
          {"icon": "BadgeDollarSign", "title": "Zero Hidden Charges", "description": "<p>Completely transparent pricing, stated upfront with no surprises. Your first counselling session is always 100% free.</p>"}
        ],
        
        "servicesTitle": "Gateway Abroad ${cityName} Services",
        "servicesCards": [
          {"icon": "CircleUserRound", "title": "Career Counseling", "subtitle": "<p>Get personalized guidance to choose the right course, university, and country.</p>", "btn": "book your fee session"},
          {"icon": "House", "title": "University Admissions", "subtitle": "<p>Receive complete support with university selection, application processing, SOPs, LORs.</p>", "btn": "book your fee session"},
          {"icon": "NotebookPen", "title": "IELTS & Test Preparation", "subtitle": "<p>Expert coaching for IELTS, TOEFL, PTE, GRE, GMAT, and SAT.</p>", "btn": "book your fee session"},
          {"icon": "IdCard", "title": "Visa Assistance", "subtitle": "<p>Professional visa guidance with documentation support and mock interview preparation.</p>", "btn": "book your fee session"},
          {"icon": "HandCoins", "title": "Scholarship Guidance", "subtitle": "<p>Explore scholarship opportunities and financial aid options to make studying abroad more affordable.</p>", "btn": "book your fee session"},
          {"icon": "Settings", "title": "Education Loan Support", "subtitle": "<p>Get assistance in securing education loans with trusted banking and financial partners.</p>", "btn": "book your fee session"},
          {"icon": "PlaneTakeoff", "title": "Pre-Departure Support", "subtitle": "<p>Prepare for your international journey with accommodation guidance and travel support.</p>", "btn": "book your fee session"},
          {"icon": "UserRoundPen", "title": "Study Abroad Counseling", "subtitle": "<p>One-on-one counseling sessions to help students understand global education opportunities.</p>", "btn": "book your fee session"}
        ],
        
        "otherCities": [
          {"icon": "", "name": "Udaipur", "slug": "study-abroad/udaipur", "description": ""},
          {"icon": "", "name": "Delhi", "slug": "study-abroad/delhi", "description": ""},
          {"icon": "", "name": "Bangalore", "slug": "study-abroad/bangalore", "description": ""},
          {"icon": "", "name": "Chennai", "slug": "study-abroad/chennai", "description": ""},
          {"icon": "", "name": "Hyderabad", "slug": "study-abroad/hyderabad", "description": ""},
          {"icon": "", "name": "Chandigarh", "slug": "study-abroad/chandigarh", "description": ""}
        ],
        
        "ctaTitle": "Start Your Study Abroad Journey With Gateway Abroad ${cityName}",
        
        "bestUniversitiesTitle": "Top Universities to Study Abroad from ${cityName}",
      }
      
      IMPORTANT: 
      1. Return ONLY raw JSON. Do not wrap it in \`\`\`json or \`\`\`markdown.
      2. Ensure all strings are properly escaped.
      3. The "mainContent" must be a long, detailed HTML string.
    `;

        const response = await fetch(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    // Authorization: `Bearer ${apiKey}`,
                    Authorization: `Bearer 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`,
                    // Authorization: `Bearer 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`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "openai/gpt-oss-120b",
                    messages: [
                        {
                            role: "system",
                            content:
                                "You are a JSON generator. Always return valid JSON only. Never use markdown or explanations.",
                        },
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                    temperature: 0.2,
                    max_tokens: 4096,
                }),
            }
        );

        if (!response.ok) {
            const error = await response.text();
            console.error("NVIDIA API Error:", error);
            return [];
        }

        const result = await response.json();

        console.log("✅ AI content generated successfully for", result);

        let content = result?.choices?.[0]?.message?.content || "[]";

        console.log("Raw AI content:", content);

        content = content
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        return JSON.parse(content);

    } catch (error) {
        console.error("❌ Error calling OpenAI for page generation:", error.message);
        return null;
    }
}

// console.log("Starting AI page generation for Udaipur...");
// generatePagebyAI("Udaipur", "city_page").then((data) => {
//     console.log("Generated AI Data:", data);
// });

const pagesToProcess = [
    { cityName: "Shrinagar", slug: "shrinagar" }]

async function processPage(pageData) {
    console.log("=================================");
    try {
        // Extract basic info from pageData
        const cityName = pageData.cityName || pageData.Name || pageData.title;
        const pageType = "city_page";
        const slug = pageData.slug || cityName.replace(/\s+/g, "-").toLowerCase();

        console.log(`📄 Processing page: ${cityName} (${pageType})`);

        // Check if page already exists in DB
        let page = await PagesContent.findOne({ slug: slug, pageType: pageType });

        if (page) {
            console.log(`⚠️ Page already exists: ${slug}. Updating...`);

            // Generate AI content for update
            let aiData;
            aiData = await generatePagebyAI(cityName, pageType); // Assuming you have this AI function
            if (!aiData || Object.keys(aiData).length === 0) {
                aiData = await generatePagebyAI(cityName, pageType); // Retry once
            }

            if (!aiData || Object.keys(aiData).length === 0) {
                console.log(`❌ AI generation failed for ${cityName}`);
                return;
            }

            // Update existing page fields
            page.title = aiData.title || page.title;
            page.subTitle = aiData.subTitle || page.subTitle;
            page.metaTitle = aiData.metaTitle || page.metaTitle;
            page.metaDescription = aiData.metaDescription || page.metaDescription;
            page.keywords = aiData.keywords || page.keywords;
            page.tags = aiData.tags || page.tags;

            // Rebuild sections with new AI data
            page.sections = buildPageSections(aiData, cityName, pageType);

            await page.save();
            console.log(`✅ Updated page: ${slug}`);
            return;
        }

        // If not exists, create new page
        console.log(`🆕 Creating new page: ${slug}`);

        let aiData;
        aiData = await generatePagebyAI(cityName, pageType);
        if (!aiData || Object.keys(aiData).length === 0) {
            aiData = await generatePagebyAI(cityName, pageType); // Retry once
        }

        if (!aiData || Object.keys(aiData).length === 0) {
            console.log(`❌ AI generation failed for ${cityName}`);
            return;
        }

        // Build sections based on AI data and Jaipur structure
        const sections = buildPageSections(aiData, cityName, pageType);

        // Create the new page document
        const newPage = new PagesContent({
            title: aiData.title || `Study Abroad Consultants in ${cityName} | Overseas Education & Visa Guidance`,
            subTitle: aiData.subTitle || `Gateway Abroad ${cityName} helps students from ${cityName} study in the UK, USA, Canada, Australia, Germany, and Ireland. We offer expert help with university applications, scholarships, and visa applications.`,
            slug: slug,
            pageType: pageType,
            metaTitle: aiData.metaTitle || `Best Study Abroad Consultants in ${cityName} – Gateway Abroad`,
            metaDescription: aiData.metaDescription || `Gateway Abroad Education – Top study abroad consultants in ${cityName}. Expert overseas education guidance, visa support & counseling for your global study dreams`,
            keywords: aiData.keywords || [`Study abroad consultants in ${cityName}`],
            canonicalUrl: `https://www.gatewayabroadeducations.com/study-abroad/${slug}`,
            isFeatured: aiData.isFeatured || false,
            status: "published",
            tags: aiData.tags || [`Study abroad consultants in ${cityName}`],
            pageContent: {},
            sections: sections
        });

        await newPage.save();
        console.log(`📊 Inserted page: ${newPage.title} (${slug})`);

    } catch (err) {
        console.error("❌ Fatal error in processPage:", err);
    }
}

const citiesToProcess = [
    { cityName: "Ajmer", slug: "ajmer" }]

async function runSeed() {
    try {
        let count = 0;
        for (const cityData of citiesToProcess) {
            count++;
            console.log(`\n--- Processing ${count}/${citiesToProcess.length}: ${cityData.cityName} ---`);
            await processPage(cityData);
        }
        console.log("\n🎉 Finished processing all pages successfully!");
    } catch (err) {
        console.error("❌ Fatal script error:", err);
    } finally {
        console.log("🔌 Disconnected from Database");
    }
}

runSeed();

// cron.schedule(
//     CRON_SCHEDULE,
//     async () => {
//         console.log("cron running:", new Date().toISOString());
//         // try {
//         //     console.log(`✅ Assigned ${assigned} leads this run`);
//         // } catch (err) {
//         //     console.error("❌ Cron error:", err.message);
//         // }
//     },
//     { scheduled: true, timezone: TIMEZONE }
// );