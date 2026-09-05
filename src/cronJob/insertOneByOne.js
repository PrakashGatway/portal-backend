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

export const QuestionsArrayInsert = [
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "The sculptures of ceramic artist Lena Whitfield are now ________ in galleries across Europe and Asia, but the community murals she helped create early in her career were displayed in outdoor plazas throughout her hometown of Portland.",
    "questionText": "Which choice completes the text with the most logical and precise word or phrase?",
    "options": [
      {"text": "fabricated", "isCorrect": false},
      {"text": "revised", "isCorrect": false},
      {"text": "exhibited", "isCorrect": true},
      {"text": "endorsed", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "Correct Answer - C) Exhibition, the sentence says the sculptures are found in galleries across Europe and Asia, so the precise word is “exhibited,” meaning displayed for public viewing.<br>A) Fabricated means made,<br>B) revised means changed or edited,<br>C) endorsed means publicly supported.<br>None of these fits the context of artworks being displayed in galleries.",
    "source": "SAT - Module 1 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "Whether Marisol Peña is composing brief chamber pieces or sprawling orchestral works—such as Marea, a percussion suite performed at the Santiago Cultural Center—she is ________ oral history, weaving in melodies remembered from her grandmother's village or rhythms overheard in her adopted city.",
    "questionText": "Which choice completes the text with the most logical and precise word or phrase?",
    "options": [
      {"text": "skeptical of", "isCorrect": false},
      {"text": "drawing on", "isCorrect": true},
      {"text": "indifferent to", "isCorrect": false},
      {"text": "burdened by", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "Correct Answer - Option B) drawing on is correct. Peña incorporates melodies and rhythms from her grandmother's village and her adopted city, so she is “drawing on” oral history, meaning using it as a source of inspiration. Skeptical of and indifferent to suggest a lack of interest, while burdened by suggests that oral history is a problem or unwanted responsibility.",
    "source": "SAT - Module 1 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "Marine biologist Renata Oduya led a 2019 study documenting an octopus that arranged shells into a makeshift shelter. Colleagues had initially proposed to Oduya that the octopus's shell-stacking behavior might simply be ________, but Oduya and her team demonstrated that the octopus repeated the behavior with clear intent.",
    "questionText": "Which choice completes the text with the most logical and precise word or phrase?",
    "options": [
      {"text": "remarkable", "isCorrect": false},
      {"text": "predictable", "isCorrect": false},
      {"text": "coincidental", "isCorrect": true},
      {"text": "measurable", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "Correct Answer is Option C) Coincidental. Colleagues initially thought the behavior might have happened accidentally, but the researchers found that the octopus repeated it with clear intent. Therefore, “coincidental” is the logical word. Remarkable and measurable don't express the idea of accidental behavior, while predictable is contradicted by the description.",
    "source": "SAT - Module 1 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "The following text is adapted from a 1951 novel. Elena, a young girl, visits her town's print shop often.<br><br>Elena believed that every newspaper ever printed was stored somewhere in that shop, and she had resolved to read a copy from every single year. She started with the oldest editions and moved forward, never skipping the ones that bored her. She recalled that the first year she'd tackled was 1889. She had been reading one paper a week for months now, and she was still only in the 1920s. Already she had read about railroad strikes and county fairs, shipping disasters and silent films. For all her determination, she had to admit that some of the decades had been slow going. But Elena kept at it.",
    "questionText": "Which choice best states the main purpose of the text?",
    "options": [
      {"text": "To illustrate Elena's enjoyment of an unusual hobby", "isCorrect": false},
      {"text": "To explain why Elena prefers reading over other activities", "isCorrect": false},
      {"text": "To portray Elena's determination to meet a goal", "isCorrect": true},
      {"text": "To describe a newspaper that Elena greatly admires", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "Correct Answer is Option C) as the passage repeatedly emphasizes Elena's commitment to reading newspapers from every year. Even though the task is slow and sometimes boring, “Elena kept at it.” This shows her determination.<br>A focuses on enjoyment, but the passage actually mentions that some decades were boring.<br>B isn't discussed.<br>D incorrectly suggests that one particular newspaper is admired.",
    "source": "SAT - Module 1 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "Researchers have long hypothesized that a species of ancient reef fish went extinct due to a sudden drop in ocean oxygen levels. One paleobiologist set out to test this hypothesis. Using a controlled tank system, she exposed living descendants of the fish to gradually lowered oxygen levels similar to those inferred from the fossil record. The fish survived the reduced-oxygen conditions far longer than expected, an outcome inconsistent with the idea that oxygen loss alone caused the extinction. This led the researcher to conclude that declining oxygen likely wasn't the primary driver of the die-off.",
    "questionText": "Which choice best states the main purpose of the text?",
    "options": [
      {"text": "To argue for the significance of new findings amid an ongoing debate among researchers", "isCorrect": false},
      {"text": "To discuss the advantages and disadvantages of the method used in an experiment", "isCorrect": false},
      {"text": "To summarize two competing hypotheses and a major finding associated with each one", "isCorrect": false},
      {"text": "To describe an experiment whose results cast doubt on an established hypothesis", "isCorrect": true}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "Correct Answer is Option D) as researchers hypothesized that low oxygen caused the fish's extinction. The experiment showed that living descendants survived low-oxygen conditions much longer than expected, casting doubt on that explanation.<br>A is too broad.<br>B focuses on the experimental method rather than the passage's main purpose.<br>C is incorrect because the passage doesn't present two competing hypotheses with findings supporting each.",
    "source": "SAT - Module 1 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "Scholarly accounts of the labor movement in the early textile industry—a movement that advocated for safer working conditions and fair wages and reached its height in the 1900s and 1910s—tend to focus on the most confrontational, headline-grabbing strikes, making it seem uniformly combative. Historian Priya Anand has shown, however, that if we look instead at the way the movement developed through quieter mutual-aid societies and local reading rooms, we find participants pursuing a wide range of strategies and goals.",
    "questionText": "Which choice best describes the function of the underlined portion in the text as a whole?",
    "options": [
      {"text": "It presents a trend in scholarship that the text claims has been reevaluated by researchers in light of Anand's work on the movement's participants.", "isCorrect": false},
      {"text": "It identifies an aspect of the labor movement that the text implies was overemphasized by scholars due to their own political orientations.", "isCorrect": false},
      {"text": "It describes a common approach to studying the labor movement that, according to the text, obscures the diversity of the movement's strategies.", "isCorrect": true},
      {"text": "It summarizes the conventional method for analyzing the labor movement, which the text suggests creates a misleading impression of the effectiveness of mutual-aid societies.", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "Correct Answer is Option C). The underlined portion describes scholars' tendency to focus on confrontational strikes, which makes the movement appear “uniformly combative.” The next sentence contrasts this with Anand's examination of quieter organizations and strategies. Thus, the conventional approach hides the movement's diversity.<br>A, B, and D introduce ideas—reevaluation by researchers, political orientations, and the effectiveness of mutual-aid societies—that aren't supported by the passage.",
    "source": "SAT - Module 1 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "Economist Daniel Kowalski has identified a negative correlation between the share of a region's economy derived from single-crop agriculture and that region's access to affordable credit. This may appear counterintuitive—large-scale farming requires substantial upfront investment (in irrigation equipment, for instance) at scales best financed by outside lenders—but Kowalski notes that single-crop economies' vulnerability to price swings can destabilize local incomes and increase lenders' perceived risk, creating conditions to which many creditors are averse.",
    "questionText": "Which choice best states the main idea of the text?",
    "options": [
      {"text": "Although it may seem surprising that credit access declines as single-crop farming makes up a larger share of a region's economy, that decline happens because farming requires investments too large for most lenders to supply.", "isCorrect": false},
      {"text": "Although regions tend to become less dependent on outside credit as single-crop farming grows, this change may not occur if price swings destabilize local incomes or increase lenders' perceived risk.", "isCorrect": false},
      {"text": "Although one might expect that credit access would increase as single-crop farming makes up a larger share of a region's economy, the opposite happens because heavy reliance on one crop can create conditions unattractive to lenders.", "isCorrect": true},
      {"text": "Although lenders tend to avoid financing single-crop agriculture in developing regions, credit access may increase significantly as farming operations stabilize and associated risks decline.", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "Correct Answer is Option C). The passage establishes a surprising negative correlation between single-crop agriculture and affordable credit. Although farming requires substantial investment that might seem to encourage borrowing, price volatility makes lenders perceive greater risk. C captures both the surprising relationship and its explanation.<br>A gives the wrong reason.<br>B reverses the passage's meaning.<br>D contradicts the finding.",
    "source": "SAT - Module 1 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "To understand how soil moisture affects fungal-mediated decomposition in forest ecosystems, Ingrid Solheim et al. collected leaf-litter samples from a lowland forest and transplanted them to a site with soil that was drier by 15 percent. Fungal-mediated decomposition slowed in the transplanted samples; crucially, fungal community composition was unchanged, allowing Solheim et al. to attribute the slowdown to moisture-induced decreases in fungal activity.",
    "questionText": "It can most reasonably be inferred from the text that the finding about the fungal community composition was important for which reason?",
    "options": [
      {"text": "It provided preliminary evidence that decomposition slowed in the transplanted samples.", "isCorrect": false},
      {"text": "It suggested that moisture-induced changes in fungal activity may be occurring in drier forests generally.", "isCorrect": false},
      {"text": "It ruled out a potential alternative explanation for the slowdown in decomposition.", "isCorrect": true},
      {"text": "It clarified that fungal activity levels in the samples varied depending on which fungi comprised the community.", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "Correct Answer is Option C). Decomposition slowed when the samples were moved to drier soil. Because the fungal community composition remained unchanged, researchers could rule out the possibility that a different fungal community caused the slowdown. Instead, they could attribute the effect to reduced fungal activity.<br>A, B, and D don't describe the specific importance of keeping the fungal community unchanged.",
    "source": "SAT - Module 1 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "Some geologists searching for evidence of ancient microbial life have proposed that trace levels of atmospheric CH<sub>4</sub> (methane) on Mars could indicate biological origin. Farah Rahimi, Owen Blake, and colleagues evaluated this possibility, finding that on cold, geologically inactive planets, atmospheric CH<sub>4</sub> likely couldn't persist at detectable levels without ongoing replenishment from some source. But the team also found that on geologically active moons with subsurface oceans, tidal heating and chemical reactions in rock can sustain atmospheric CH<sub>4</sub> without any biological activity.",
    "questionText": "Based on the text, Rahimi, Blake, and colleagues would most likely agree with which statement about atmospheric CH<sub>4</sub>?",
    "options": [
      {"text": "Its presence is more likely to indicate that a body is geologically active than that the body harbors life.", "isCorrect": true},
      {"text": "Its absence from a body that isn't geologically active indicates that the body probably doesn't have life.", "isCorrect": false},
      {"text": "It should be treated as a sign of life if detected on a cold planet but not if detected on an active moon.", "isCorrect": false},
      {"text": "It doesn't reliably persist at detectable concentrations on either cold planets or active moons without a nonbiological source.", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "Correct Answer is Option A). The researchers found that methane can be produced and maintained through nonbiological geological processes, such as tidal heating and chemical reactions. Therefore, methane alone is not reliable evidence of life and may instead indicate geological activity.<br>B makes an unsupported claim about the absence of methane.<br>C incorrectly treats methane as evidence of life.<br>D is wrong because active moons can maintain methane through nonbiological processes.",
    "source": "SAT - Module 1 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "Average Weekly Café Visits by Month at Four Campus Coffee Shops During Fall Term<br><br>In fall term, four campus coffee shops tracked their average weekly visits over three months. A student notes that among the shops shown in the table, the shop with the highest average weekly visits in all three months was ________",
    "questionText": "Which choice most effectively uses data from the table to complete the text?",
    "options": [
      {"text": "Steep & Sip.", "isCorrect": false},
      {"text": "Roast Rebellion.", "isCorrect": false},
      {"text": "The Bean Counter.", "isCorrect": true},
      {"text": "Grounds Zero.", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "Correct answer is Option C). Compare the four shops each month:<br>September: Bean Counter = 410, highest<br>October: Bean Counter = 520, highest<br>November: Bean Counter = 380, highest<br>Therefore, The Bean Counter had the highest average weekly visits in all three months.",
    "source": "SAT - Module 1 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "“An Ode to Autumn Rain” is an 1812 poem by a minor Romantic-era poet. In the poem, the speaker describes having conflicting emotions while walking through a rain-soaked orchard: ________",
    "questionText": "Which quotation from “An Ode to Autumn Rain” most effectively illustrates the claim?",
    "options": [
      {"text": "“The orchard boughs hang low and bright, / Each apple beaded, cool and clean; / I count my blessings in this light, / and know not what despair could mean.”", "isCorrect": false},
      {"text": "“The falling drops make gentle sound, / Upon the leaves both new and old; / And I confess, without a frown, / this quiet chill feels good and bold.”", "isCorrect": false},
      {"text": "“The wet grass bends beneath my feet, / Its damp scent rising, sharp and sweet; / I cannot say if this is loss / or gladness dressed in autumn's moss.”", "isCorrect": true},
      {"text": "“I walked an hour beneath the gray, / And felt the chill drive doubt away; / Each drop a promise, clear and true, / of warmer skies and mornings new.”", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "Correct answer is Option C) as the claim says the speaker has conflicting emotions. Choice C explicitly expresses uncertainty between “loss” and “gladness,” directly demonstrating conflicting feelings.<br>A is entirely positive.<br>B is primarily positive.<br>D is also hopeful and positive rather than conflicted.",
    "source": "SAT - Module 1 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "Mean Ratings for Participants after 14 Days<br><br>To test whether a supplement is effective, researchers compare outcomes for participants taking it and participants taking a placebo (a substance with no active ingredient). Participants normally aren't told which they're receiving, but a research team conducted a study to see if there might be a benefit to telling participants they were receiving the supplement, even when some were not. The team used various measures to evaluate participants, with higher ratings indicating greater well-being in each measure. Compared to the mean ratings after 14 days for participants in the control group, the mean ratings for participants who were told they received a supplement ________",
    "questionText": "Which choice most effectively uses data from the table to complete the statement?",
    "options": [
      {"text": "ranged from 4.1 to 88.00, indicating that well-being varied widely from participant to participant.", "isCorrect": false},
      {"text": "were lower for two measures, with the rating for only one measure indicating greater well-being for these participants.", "isCorrect": false},
      {"text": "ranged from 4.1 to 51.00, with no rating indicating greater well-being in any measure for these participants.", "isCorrect": false},
      {"text": "were higher for all three measures, indicating greater overall well-being for these participants.", "isCorrect": true}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "Correct Answer is Option D. The participants told they received the supplement had higher ratings in every category:<br>Energy: 6.2 vs. 4.1<br>Sleep: 88 vs. 51<br>Mood: 9.7 vs. 6.3<br>Since higher ratings indicate greater well-being, D accurately summarizes the data.<br>A incorrectly compares the overall range and claims variation between individuals.<br>B and C incorrectly state that the ratings were lower or showed no improvement.",
    "source": "SAT - Module 1 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "As grocery shopping has become increasingly app-based and algorithmically curated, deliberate meal planning has diminished in favor of a habit known as “the app decides” (TAD), in which people passively accept recommended products from shopping apps rather than seeking out specific items. Noor Farooqi and Diego Salcedo examined data on a representative group of shoppers to determine participants' strength of TAD habit, nutritional knowledge, and cooking confidence. Although no major dietary intervention took place sufficiently near the study for Farooqi and Salcedo to identify causality between TAD and diet quality, they did posit that TAD may reduce diet quality through an indirect effect.",
    "questionText": "Which finding, if true, would most directly support the idea advanced by Farooqi and Salcedo?",
    "options": [
      {"text": "TAD habit tends to increase in strength as grocery budgets tighten, and people with tighter budgets are more likely to eat lower-quality diets.", "isCorrect": false},
      {"text": "TAD habit has a strong negative effect on nutritional knowledge and cooking confidence, and there is known to be a strong positive correlation between nutritional knowledge and cooking confidence and diet quality.", "isCorrect": true},
      {"text": "Cooking confidence is known to have a strong positive effect on diet quality but shows only a weak positive effect on nutritional knowledge, and TAD habit shows little correlation with either nutritional knowledge or cooking confidence.", "isCorrect": false},
      {"text": "Diet quality increases as nutritional knowledge increases, and the relationship between TAD habit and nutritional knowledge tends to strengthen as the number of apps a person uses increases.", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "Correct Answer is Option B. The researchers propose that TAD may reduce diet quality indirectly. Choice B establishes the necessary chain: TAD → lower nutritional knowledge/cooking confidence → lower diet quality. That directly supports the proposed indirect effect.<br>A only identifies a possible association through income.<br>C actually weakens the proposed relationship.<br>D does not establish that TAD reduces nutritional knowledge.",
    "source": "SAT - Module 1 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "Even with the widespread availability of digital drafting tools, many composers still choose to write and revise their scores by hand and only later input the final version into notation software. It may be tempting to speculate about how a symphony written this way would be affected if it had been composed exclusively on a computer instead, but each piece is a unique product of a specific creative process. Therefore, ________",
    "questionText": "Which choice most logically completes the text?",
    "options": [
      {"text": "in order to increase their efficiency, composers who currently write scores largely by hand should instead work only on a computer.", "isCorrect": false},
      {"text": "composers who do most of their drafting and revising by hand likely have more success than those who work entirely on a computer.", "isCorrect": false},
      {"text": "scores written by hand take less time to produce, on average, than scores written on a computer do.", "isCorrect": false},
      {"text": "there is no way to reasonably evaluate how a piece would be different if it had been composed by other means.", "isCorrect": true}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "Correct Answer is Option D. The passage emphasizes that each composition is a unique product of its specific creative process. Therefore, we cannot reasonably determine what the same piece would have been like if it had been created using a different method.<br>A, B, and C make claims about efficiency, success, or production time that the passage doesn't support.",
    "source": "SAT - Module 1 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "In studying ocean circulation, oceanographers sometimes discuss the role of thermohaline currents. What are thermohaline currents, and how ________ Part of the global ocean conveyor system, thermohaline currents are slow-moving flows driven by differences in water temperature and salinity. In certain regions, these currents can influence regional climate patterns.",
    "questionText": "Which choice completes the text so that it conforms to the conventions of Standard English?",
    "options": [
      {"text": "do they shape our climate.", "isCorrect": false},
      {"text": "they do shape our climate.", "isCorrect": false},
      {"text": "do they shape our climate?", "isCorrect": true},
      {"text": "they do shape our climate?", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "Correct Answer - Option C. The sentence asks two questions: “What are thermohaline currents, and how do they shape our climate?” Because the second part is a direct question, it requires question-word order: “do they shape.”<br>A and B lack the appropriate question structure.<br>D incorrectly places the question mark after a declarative word order.",
    "source": "SAT - Module 1 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "One of the few Indigenous aviators active during the early era of commercial flight, ________",
    "questionText": "Which choice completes the text so that it conforms to the conventions of Standard English?",
    "options": [
      {"text": "Bess Coyle flew several routes across the Canadian Arctic between 1928 and 1934.", "isCorrect": true},
      {"text": "1928 and 1934 were the years between which Bess Coyle flew several routes across the Canadian Arctic.", "isCorrect": false},
      {"text": "the Canadian Arctic was where Bess Coyle flew several routes between 1928 and 1934.", "isCorrect": false},
      {"text": "several routes across the Canadian Arctic were flown by Bess Coyle between 1928 and 1934.", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "Correct Answer - Option A. The introductory phrase “One of the few Indigenous aviators...” must logically modify the person who follows it. In A, that person is Bess Coyle, who is clearly the subject of the main clause.<br>The other options use awkward or passive constructions and do not provide as clear a grammatical connection.",
    "source": "SAT - Module 1 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "Cast from reclaimed bronze and hand-finished using a patina technique passed down by the artist's Japanese mentor, ________ so intricate and luminous that you are tempted to examine them for hours.",
    "questionText": "Which choice completes the text so that it conforms to the conventions of Standard English?",
    "options": [
      {"text": "the miniature sculptures of Brazilian metalworker Iara Nogueira are", "isCorrect": true},
      {"text": "the Brazilian metalworker Iara Nogueira creates miniature sculptures that are", "isCorrect": false},
      {"text": "when she creates her miniature sculptures, Brazilian metalworker Iara Nogueira makes them", "isCorrect": false},
      {"text": "Iara Nogueira is a Brazilian metalworker whose miniature sculptures are", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "Correct Answer - Option A. The introductory phrase “Cast from reclaimed bronze and hand-finished...” describes the sculptures. Therefore, the grammatical subject must be “the miniature sculptures.” Choice A creates the correct structure: “Cast..., the miniature sculptures ... are so intricate...”<br>B, C, and D incorrectly make the artist the thing being cast or create awkward/mismatched constructions.",
    "source": "SAT - Module 1 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "Substances can be classified by how easily they dissolve in water. Table salt, which is classified as highly soluble, dissolves almost completely ________ sand, which is classified as insoluble, does not dissolve at all under normal conditions.",
    "questionText": "Which choice completes the text so that it conforms to the conventions of Standard English?",
    "options": [
      {"text": "in water,", "isCorrect": false},
      {"text": "in water", "isCorrect": false},
      {"text": "in water;", "isCorrect": true},
      {"text": "in water and", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "Correct Answer is Option C. The sentence contains two closely related independent clauses:<br>Table salt dissolves almost completely in water.<br>Sand does not dissolve at all.<br>A semicolon correctly joins these independent clauses.<br>A comma would create a comma splice.<br>B has no punctuation between the clauses.<br>D would require restructuring the sentence because “and” would create a different grammatical relationship.",
    "source": "SAT - Module 1 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "Southeast Asia is known to have dozens, if not hundreds, of regional street food traditions. Only four of these dishes are typically featured on international night-market menus ________ satay, laksa, pad thai, and banh mi—the last of which is often grouped with the others despite having distinctly French colonial roots.",
    "questionText": "Which choice completes the text so that it conforms to the conventions of Standard English?",
    "options": [
      {"text": "abroad, however:", "isCorrect": false},
      {"text": "abroad, however,", "isCorrect": true},
      {"text": "abroad, however;", "isCorrect": false},
      {"text": "abroad; however,", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "Correct Answer - Option B. The word “however” is functioning as a transition within the sentence and must be set off by commas: “menus abroad, however, satay...” The colon or semicolon would incorrectly interrupt the grammatical structure. Therefore, B is correct.",
    "source": "SAT - Module 1 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "For centuries, farmers have used working dogs (Canis familiaris) to manage herds of sheep. When it comes to their instincts, herding dogs are notoriously ________ they will circle and reposition an entire flock with minimal guidance from their handler.",
    "questionText": "Which choice completes the text so that it conforms to the conventions of Standard English?",
    "options": [
      {"text": "persistent and", "isCorrect": false},
      {"text": "persistent,", "isCorrect": false},
      {"text": "persistent", "isCorrect": false},
      {"text": "persistent:", "isCorrect": true}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The colon introduces an explanation or example of why herding dogs are described as persistent: they will circle and reposition a flock with little guidance. A comma would not properly connect the two clauses, and B/C do not provide the necessary punctuation.",
    "source": "SAT - Module 1 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "A species of Lantana shrub produces a bitter compound to deter grazing animals. However, in some cases, the compound the plant uses to protect itself from grazing actually ________ its appeal to certain insects. The monarch caterpillar, for example, not only tolerates Lantana's bitter compound but actually seeks it out for its own defense in the same way the shrub does.",
    "questionText": "Which choice completes the text so that it conforms to the conventions of Standard English?",
    "options": [
      {"text": "is increasing", "isCorrect": false},
      {"text": "increase", "isCorrect": false},
      {"text": "increases", "isCorrect": true},
      {"text": "have increased", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The subject is “the compound”, which is singular, so the verb must be singular: “the compound ... increases its appeal.” The sentence describes a general fact, so the simple present increases is appropriate. Increase does not agree with the singular subject, while A and D use inappropriate tense/construction.",
    "source": "SAT - Module 1 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "After appropriate permits are secured, a typical shipwreck survey begins with a diver making a detailed photographic map of the wreck site. Then, the site is carefully documented, and any artifacts found are logged and marked on the site map. ________ the artifacts are recovered, cleaned, and analyzed in a conservation laboratory.",
    "questionText": "Which choice completes the text with the most logical transition?",
    "options": [
      {"text": "For instance,", "isCorrect": false},
      {"text": "On the contrary,", "isCorrect": false},
      {"text": "Earlier,", "isCorrect": false},
      {"text": "Finally,", "isCorrect": true}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The passage describes a sequence: Photographic map → Documentation and logging → Recovery, cleaning, and analysis. The last step is therefore introduced with “Finally.” The other choices don't express chronological completion.",
    "source": "SAT - Module 1 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "Biographer Naomi Fischer notes that the composer Elsa Brandt “never finished a piece so much as abandoned it,” frequently reworking her compositions long after their premieres. However, the differences between the 1934 premiere version and the 1958 revised version of her symphony Winter Fields are extreme, even by Brandt's standards; ________ some musicologists regard the two versions as two different symphonies altogether.",
    "questionText": "Which choice completes the text with the most logical transition?",
    "options": [
      {"text": "by contrast,", "isCorrect": false},
      {"text": "in fact,", "isCorrect": true},
      {"text": "nevertheless,", "isCorrect": false},
      {"text": "in other words,", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The first sentence says Brandt frequently reworked compositions. The next sentence emphasizes just how extreme the changes to Winter Fields were: some musicologists consider the versions separate symphonies. “In fact” appropriately introduces stronger evidence supporting the preceding idea. By contrast and nevertheless indicate opposition, which isn't present, while in other words would restate rather than strengthen the point.",
    "source": "SAT - Module 1 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "While researching a topic, a student has taken the following notes:<br><br>In the 1930s, engineers in the Netherlands developed extensive polder drainage systems to reclaim land from the sea.<br><br>These systems relied on networks of dikes, canals, and pumping stations.<br><br>In the 1960s, engineers in Japan developed extensive seawall and levee systems to protect coastal farmland from flooding.<br><br>These systems were known as the Ise Bay coastal defenses.",
    "questionText": "The student wants to emphasize a similarity between the Dutch polder systems and the Japanese coastal defenses. Which choice most effectively uses relevant information from the notes to accomplish this goal?",
    "options": [
      {"text": "Engineers in the Netherlands developed polder drainage systems using dikes, canals, and pumping stations.", "isCorrect": false},
      {"text": "In the 1960s, one set of Japanese coastal defenses was known as the Ise Bay coastal defenses.", "isCorrect": false},
      {"text": "Both the Dutch polder systems and the Japanese coastal defenses used engineered infrastructure to manage the threat of water to land.", "isCorrect": true},
      {"text": "The Dutch polder systems, not the Japanese coastal defenses, were developed in the 1930s.", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The question asks for a similarity. Choice C directly compares both systems and identifies their shared purpose: using engineered infrastructure to manage water-related threats. The other choices discuss only one system or emphasize differences.",
    "source": "SAT - Module 1 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "While researching a topic, a student has taken the following notes:<br><br>Comets are divided into two broad categories based on orbital period.<br><br>A comet with an orbital period of less than 200 years is known as a short-period comet.<br><br>All other comets are known as long-period comets.<br><br>There are roughly 400 known short-period comets.<br><br>There are over 4,000 known long-period comets.",
    "questionText": "The student wants to contrast the number of short-period comets with the number of long-period comets. Which choice most effectively uses relevant information from the notes to accomplish this goal?",
    "options": [
      {"text": "A comet with an orbital period of less than 200 years is known as a short-period comet; all others are known as long-period comets.", "isCorrect": false},
      {"text": "Comets are divided into two categories: short-period comets and long-period comets.", "isCorrect": false},
      {"text": "There are roughly 400 known short-period comets, or comets with orbital periods under 200 years.", "isCorrect": false},
      {"text": "While there are only about 400 known short-period comets, there are over 4,000 known long-period comets.", "isCorrect": true}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The goal is specifically to contrast the numbers. Choice D directly compares approximately 400 short-period comets with over 4,000 long-period comets. The other choices define the categories or mention only one number.",
    "source": "SAT - Module 1 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "While researching a topic, a student has taken the following notes:<br><br>Ingrid Bergstrom was a Swedish entomologist.<br><br>Between 1958 and 1976, she collected approximately 1,200 insect specimens.<br><br>She collected a specimen of Carabus violaceus from Smaland Forest in June of 1961.<br><br>She collected a specimen of Lucanus cervus from Dalarna Woods in July of 1961.<br><br>Carabus violaceus and Lucanus cervus are both species of beetle.",
    "questionText": "The student wants to emphasize the specimen collected from Smaland Forest. Which choice most effectively uses relevant information from the notes to accomplish this goal?",
    "options": [
      {"text": "Ingrid Bergstrom was an entomologist notable for collecting approximately 1,200 insect specimens between 1958 and 1976.", "isCorrect": false},
      {"text": "Among the many insect specimens Ingrid Bergstrom collected was Carabus violaceus, a species of beetle she collected from Smaland Forest in 1961.", "isCorrect": true},
      {"text": "Between 1958 and 1976, Ingrid Bergstrom collected many insect specimens, such as Carabus violaceus from Smaland Forest and Lucanus cervus from Dalarna Woods.", "isCorrect": false},
      {"text": "Between 1958 and 1976, Ingrid Bergstrom collected specimens of Carabus violaceus and Lucanus cervus, both species of beetle.", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The question asks specifically for emphasis on the Smaland Forest specimen. Choice B identifies the specimen, its species, where it was collected, and when. A focuses on the total number of specimens, C gives equal attention to both specimens, and D doesn't mention Smaland Forest at all.",
    "source": "SAT - Module 1 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "While researching a topic, a student has taken the following notes:<br><br>A university library classifies archival materials according to how fragile they are.<br><br>Materials that could be damaged by ordinary handling are classified as Restricted.<br><br>Materials that could be severely damaged by ordinary handling are classified as Archival Hold.<br><br>Most routine correspondence in the collection, if handled without gloves, could be damaged but not severely damaged.<br><br>The correspondence in the collection includes letters from both faculty and students.",
    "questionText": "The student wants to indicate which category most routine correspondence belongs in, based on how the library classifies fragile materials. Which choice most effectively uses relevant information from the notes to accomplish this goal?",
    "options": [
      {"text": "According to the library, which classifies such fragile materials as routine correspondence, Restricted materials could be damaged by ordinary handling.", "isCorrect": false},
      {"text": "Most routine correspondence in the collection is classified according to how fragile the materials are.", "isCorrect": false},
      {"text": "Capable of being damaged by ordinary handling, most routine correspondence in the collection is classified as Restricted.", "isCorrect": true},
      {"text": "If handled without gloves, letters from both faculty and students could be damaged.", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The goal is to indicate which category most routine correspondence belongs in. Choice C correctly identifies that routine correspondence is classified as Restricted because it is capable of being damaged by ordinary handling.",
    "source": "SAT - Module 1 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "The invention of the paperback book in the 1930s helped to _______ reading: paperbacks were inexpensive and portable, so more people could enjoy books than ever before.",
    "questionText": "Which choice completes the text with the most logical and precise word or phrase?",
    "options": [
      {"text": "restrict", "isCorrect": false},
      {"text": "praise", "isCorrect": false},
      {"text": "popularize", "isCorrect": true},
      {"text": "isolate", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "Paperbacks were inexpensive and portable, allowing more people to read books. Therefore, they helped popularize reading, meaning they made it more widespread. Restrict and isolate have opposite meanings, while praise doesn't fit the context.",
    "source": "SAT - Module 2 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "Composer Florence Price was captivated by the folk melodies she heard growing up in Arkansas. These melodies _______ her symphonies. For example, Price's use of syncopated rhythms was inspired by dances she remembered from local gatherings.",
    "questionText": "Which choice completes the text with the most logical and precise word or phrase?",
    "options": [
      {"text": "restricted", "isCorrect": false},
      {"text": "announced", "isCorrect": false},
      {"text": "distracted", "isCorrect": false},
      {"text": "influenced", "isCorrect": true}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The folk melodies Price heard while growing up affected the music she later composed. The example of syncopated rhythms inspired by local dances confirms that the melodies influenced her symphonies. The other choices do not express this causal relationship.",
    "source": "SAT - Module 2 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "In the 2000s, engineers began installing wildlife crossings over highways to reduce animal deaths. This approach was apparently _______: roadkill incidents in the study area dropped from over 300 per year in the 1990s to fewer than 40 by 2020.",
    "questionText": "Which choice completes the text with the most logical and precise word or phrase?",
    "options": [
      {"text": "amusing", "isCorrect": false},
      {"text": "costly", "isCorrect": false},
      {"text": "successful", "isCorrect": true},
      {"text": "disastrous", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "Roadkill decreased from more than 300 per year to fewer than 40, demonstrating that the wildlife crossings worked. Therefore, the approach was successful. The other options are inconsistent with the dramatic decrease in animal deaths.",
    "source": "SAT - Module 2 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "In the 1930s, astronomers didn't know much about the far side of the Moon. Many astronomers at the time believed that the far side would look similar to the near side. But engineers analyzing images from the 1959 Luna 3 mission proved that this idea was wrong. The images showed that the far side was covered in craters, with far fewer of the dark, smooth plains found on the near side.",
    "questionText": "Which choice best describes the function of the underlined sentence in the text as a whole?",
    "options": [
      {"text": "It identifies a scientific belief that the Luna 3 images showed to be wrong.", "isCorrect": true},
      {"text": "It describes the design of the Luna 3 mission's cameras.", "isCorrect": false},
      {"text": "It emphasizes a disagreement among astronomers.", "isCorrect": false},
      {"text": "It presents data to support a claim that was later disproved.", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The underlined sentence states that many astronomers believed the Moon's far side would resemble its near side. The following sentence explains that Luna 3 images proved this idea wrong.<br>A accurately describes the sentence's function.<br>B focuses on camera design.<br>C incorrectly suggests an ongoing disagreement.<br>D reverses the sequence because the belief was disproved rather than supported.",
    "source": "SAT - Module 2 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "In the early days of commercial aviation in the 1920s, many people thought that airlines would rely mainly on carrying mail, much like earlier air services did. But investors hesitated to fund new passenger routes, particularly at a time when aircraft manufacturing was limited due to a shortage of trained engineers. Airlines, like Imperial Airways, needed to persuade investors to support new routes despite not knowing whether enough passengers would want to fly.",
    "questionText": "Which choice best describes the function of the underlined phrase in the text as a whole?",
    "options": [
      {"text": "It compares the beginnings of mail service with the beginnings of passenger aviation.", "isCorrect": false},
      {"text": "It identifies a specific reason behind some investors' hesitance to fund aviation.", "isCorrect": true},
      {"text": "It describes how airlines attempted to convince investors to support new routes.", "isCorrect": false},
      {"text": "It explains why a type of aviation service was popular at the time.", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The underlined phrase explains that aircraft manufacturing was limited because there was a shortage of trained engineers. This gives a specific reason investors were hesitant to fund passenger routes. A discusses a comparison that isn't the phrase's function, C describes what airlines did rather than why investors hesitated, and D concerns mail service.",
    "source": "SAT - Module 2 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "The Ghent Altarpiece, from fifteenth-century Belgium, consists of 12 painted panels. It was likely produced by multiple artists working on separate panels before the panels were assembled. It's plausible that the workshop coordinated closely throughout, and some art historians claim that a close comparison of brushwork across panels—particularly in the drapery folds—suggests that the artists' individual styles became more unified as the project progressed. For example, the drapery in the earliest completed panel shows noticeably different shading techniques from panel to panel, whereas the drapery in the final panels is stylistically seamless.",
    "questionText": "Which choice best describes the function of the underlined sentence in the text as a whole?",
    "options": [
      {"text": "It identifies the people and events depicted in the altarpiece.", "isCorrect": false},
      {"text": "It supports an argument about the artists who produced the altarpiece.", "isCorrect": true},
      {"text": "It compares the altarpiece with other artworks from fifteenth-century Belgium.", "isCorrect": false},
      {"text": "It describes how art historians determined where the altarpiece was produced.", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The underlined sentence provides evidence for the claim that the artists' individual styles became more unified as the project progressed. It compares the drapery techniques in early and later panels to support that argument. The other choices concern subjects, other artworks, or the location of production, none of which is the sentence's purpose.",
    "source": "SAT - Module 2 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "Text 1<br><br>Little is known about how the domestication of the horse began. Some researchers contend that domestication began around 5,500 years ago, often noting that skeletal evidence of bit wear on horse teeth from that period indicates that horses were being ridden or driven.<br><br>Text 2<br><br>Ultimately, any plausible claim about the timing of horse domestication must rest on genetic evidence from the animals themselves. Researcher Ludovic Orlando and his team analyzed ancient horse genomes to trace when horses began showing genetic signatures of selective breeding and, based on the data, compellingly argue that domestication may not have occurred until around 4,200 years ago.",
    "questionText": "Based on the texts, how would the author of Text 2 most likely respond to what \"some researchers contend\" as described in Text 1?",
    "options": [
      {"text": "By suggesting that bit wear 5,500 years ago was likely insufficient to indicate riding", "isCorrect": false},
      {"text": "By distinguishing between genetic markers that reliably predict domestication and those that do not", "isCorrect": false},
      {"text": "By indicating that genetic techniques are still being improved such that new methods tend to be more reliable than older ones", "isCorrect": false},
      {"text": "By asserting that a more definitive form of evidence than bit wear suggests a later timeline for domestication", "isCorrect": true}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "Text 1 cites bit wear as evidence that horses were domesticated around 5,500 years ago. Text 2 says that genetic evidence is ultimately necessary and that genetic data indicate domestication may have occurred around 4,200 years ago. Thus, Text 2 would respond by arguing that stronger genetic evidence points to a later date.",
    "source": "SAT - Module 2 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "Agave tequilana, a plant grown in Mexico, is the primary source of tequila. The plant stores a sugary sap called aguamiel that is used to make the spirit. The core of Agave tequilana, called the piña, is helpful for the process of making tequila because it has a dense, fibrous structure that retains sugars well during roasting. Workers cook the piña slowly to convert its stored carbohydrates into fermentable sugars.",
    "questionText": "What feature of Agave tequilana does the text say is helpful for the process of making tequila?",
    "options": [
      {"text": "Its sap ferments especially quickly.", "isCorrect": false},
      {"text": "Its core has a dense structure that retains sugars during roasting.", "isCorrect": true},
      {"text": "It grows in a wide variety of climates around the world.", "isCorrect": false},
      {"text": "It is one of only two plants used to make spirits.", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The passage specifically says that the piña, or core, has a dense, fibrous structure that retains sugars during roasting. This makes it useful for producing tequila. None of the other choices is stated in the text.",
    "source": "SAT - Module 2 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "Urban planners worldwide are working to reduce flooding in cities as storms become more intense, and in many cases, initiatives that rely on natural features can help address such challenges. In response to repeated flash flooding, the city of Rotterdam partnered with local engineers to build \"water squares\"—public plazas that double as temporary reservoirs during heavy rain. The squares hold excess stormwater until it can drain safely, reducing damage to surrounding neighborhoods.",
    "questionText": "Which choice best states the main idea of the text?",
    "options": [
      {"text": "A partnership between Rotterdam and local engineers shows the importance of collaborative urban planning.", "isCorrect": false},
      {"text": "Nature-inspired designs can be effective ways to manage urban flooding.", "isCorrect": true},
      {"text": "As shown by a recent project, water squares protect Rotterdam's neighborhoods from damage.", "isCorrect": false},
      {"text": "Planners now realize that nature-based flood control offers better solutions than any other method.", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The passage begins with the broader idea that initiatives relying on natural features can address flooding and then gives Rotterdam's water squares as an example. Choice B captures the main idea without being too narrow. C focuses only on Rotterdam, while A focuses on collaboration and D makes an unsupported claim that nature-based methods are better than every other method.",
    "source": "SAT - Module 2 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "Percentage of Public Libraries with Free Wifi by Region's Average Household Income<br><br>A researcher is studying library access in a state where household income varies widely by region. The researcher claims that even in the wealthiest regions, wifi access is not universal, noting that the highest percentage of libraries with free wifi for any region is only _______",
    "questionText": "Which choice most effectively uses data from the table to complete the researcher's claim?",
    "options": [
      {"text": "50%.", "isCorrect": false},
      {"text": "62%.", "isCorrect": false},
      {"text": "85%.", "isCorrect": true},
      {"text": "100%.", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The table shows the highest percentage of libraries with free Wi-Fi is 85%, corresponding to regions with an average household income of $82,000. Since 85% is below 100%, Wi-Fi access is not universal even in the wealthiest regions shown.",
    "source": "SAT - Module 2 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "Architect Santiago Calatrava is known for structures that resemble skeletal or organic forms. He often uses white steel and concrete, which evoke bones and wings. However, while his buildings appear delicate and lightweight, they are actually engineered to withstand severe weather.",
    "questionText": "Which quotation from an article about Calatrava's buildings, if true, would most effectively illustrate the underlined claim?",
    "options": [
      {"text": "Calatrava sketches his early concepts using pen and paper before modeling them digitally.", "isCorrect": false},
      {"text": "Early sketches for a new project are typically inspired by natural forms such as birds or trees.", "isCorrect": false},
      {"text": "The steel skeletons Calatrava designs are rated to withstand hurricane-force winds.", "isCorrect": true},
      {"text": "Each structure is designed to reflect the cultural history of the city where it is built.", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The claim says that although the buildings appear delicate and lightweight, they are actually engineered to withstand severe weather. Choice C directly demonstrates this by showing that the structures can withstand hurricane-force winds. The other choices discuss artistic inspiration or design processes rather than structural strength.",
    "source": "SAT - Module 2 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "Early Mars is thought to have had a much thicker atmosphere than it does today. Researchers investigated the timing of the transition from a thick, warm atmosphere to the thin, cold atmosphere present today. Examining isotope ratios in Martian meteorites ranging from 500 million to 4 billion years old, researchers dated the major atmospheric loss to 3.5 billion years ago.",
    "questionText": "Which finding, if true, would most directly support the researchers' conclusion?",
    "options": [
      {"text": "Among meteorites older than 3.5 billion years, significantly more show signs of liquid water interaction than younger ones, but the opposite is true for meteorites younger than 3.5 billion years.", "isCorrect": false},
      {"text": "Meteorites older than 3.5 billion years show significantly more compositional diversity than meteorites younger than 3.5 billion years.", "isCorrect": false},
      {"text": "There is a positive correlation between meteorite age and atmospheric isotope similarity, and that correlation strengthens significantly around 3.5 billion years old.", "isCorrect": true},
      {"text": "Meteorites younger than 3.5 billion years contain minerals not found in older meteorites but found in older, contemporaneous samples.", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The researchers concluded that major atmospheric loss occurred around 3.5 billion years ago based on isotope ratios. Evidence showing a significant change in isotope patterns around that same time would directly support the conclusion. Choice C specifically identifies a strengthened relationship around 3.5 billion years ago. The other options concern water, composition, or minerals and don't directly support the timing of atmospheric loss.",
    "source": "SAT - Module 2 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "The Bantu language family is divided into a western branch, which includes Kikongo of present-day Angola, and an eastern branch, whose best-known representative is Swahili, spoken widely in East Africa. Lexical similarities across the family, including of agricultural terms, confirm descent from a single ancestral language, and the family's geographic distribution suggests an origin in what is now Cameroon and Nigeria. However, vocabulary pertaining to iron-smelting isn't shared between western and eastern branches, despite the technology's widespread use among Bantu-speaking peoples. Given archaeological evidence that ironworking originated in the homeland region and spread outward, some linguists reason that _______",
    "questionText": "Which choice most logically completes the text?",
    "options": [
      {"text": "western Bantu speakers likely obtained ironworking directly from eastern Bantu speakers rather than from a non-Bantu people.", "isCorrect": false},
      {"text": "variation in ironworking vocabulary within each branch likely reflects regionally specific smelting techniques.", "isCorrect": false},
      {"text": "eastern and western Bantu speakers likely acquired ironworking at roughly the same time, though from different sources.", "isCorrect": false},
      {"text": "the family's division into branches likely preceded the spread of ironworking technology among Bantu-speaking peoples.", "isCorrect": true}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The western and eastern branches don't share vocabulary for iron-smelting, even though archaeological evidence indicates that ironworking originated in the homeland and later spread outward. The most logical explanation is that the Bantu-speaking population had already divided into western and eastern branches before ironworking spread, so the terminology developed separately. The other choices contradict or fail to explain the evidence.",
    "source": "SAT - Module 2 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "Data collected by the Perseverance rover at Jezero Crater's delta deposits are suggestive of ancient water activity. To characterize the depositional environment, a research team analyzed the layering of delta sediments, finding that although there are intervals of coarse, angular gravel, most of the sediment consists of fine, well-sorted silt showing rhythmic banding. Researchers concluded that the coarse gravel was deposited by fast-moving floodwaters, whereas the fine silt was slowly deposited by settling in calm water, leading them to posit that _______",
    "questionText": "Which choice most logically completes the text?",
    "options": [
      {"text": "although the crater experienced a prolonged dry period, floodwater from a distant source occasionally reached it.", "isCorrect": false},
      {"text": "a lake existed at the crater for a prolonged period, punctuated by episodic flash floods that deposited gravel.", "isCorrect": true},
      {"text": "fast floods existed at the crater for an extended period until being replaced by a lake that persisted only briefly before drying permanently.", "isCorrect": false},
      {"text": "a flood-fed lake was present at the crater for an extended period, and although the floods were occasional, the lake never dried.", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "Most sediment is fine silt, indicating calm water and supporting the existence of a lake over an extended period. The intervals of coarse gravel indicate occasional fast-moving floodwaters. Therefore, the best conclusion is that a prolonged lake was occasionally interrupted by flash floods. B captures both pieces of evidence.",
    "source": "SAT - Module 2 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "An analysis by researchers of coins minted in Carthage in the third and second centuries BCE reveals a change in their composition over time: while a coin from circa 250 BCE contains about 95% silver and 3% copper, a coin from 149 BCE (the end of the Punic Wars) contains 68.5% silver and 29.1% copper, giving it a duller appearance that traders would have noticed. Because coins with a silver content below 75% were widely considered unsuitable for trade, researchers speculate that a crisis in confidence in the currency occurred in Carthage around 149 BCE, which was likely relieved—despite Carthage's mounting war debts—as a result of the ruling council's decision to _______",
    "questionText": "Which choice most logically completes the text?",
    "options": [
      {"text": "proclaim that the silver threshold for trade-suitable coins would be raised above 75%.", "isCorrect": false},
      {"text": "keep the silver content of Carthaginian coins consistent with 149 BCE levels but reduce coin weight.", "isCorrect": false},
      {"text": "begin minting heavier coins with a silver-to-copper ratio similar to that of the 149 BCE coins.", "isCorrect": true},
      {"text": "fund the mining of new silver deposits that were not available during the Punic Wars.", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "Coins below 75% silver were considered unsuitable for trade. The 149 BCE coin contained only 68.5% silver, so simply maintaining that composition would not restore confidence. A logical solution would be to compensate by making the coins heavier, increasing their total silver content while keeping the same silver-to-copper ratio. C therefore best explains how confidence could have been restored despite reduced silver purity.",
    "source": "SAT - Module 2 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "Nowadays, chess boxing is usually seen as a niche hybrid sport. Surprisingly, a European sports federation once decided _______ chess boxing as an officially sanctioned competitive event! Athletes competed in tournaments across Germany and the UK from 2003 to 2013.",
    "questionText": "Which choice completes the text so that it conforms to the conventions of Standard English?",
    "options": [
      {"text": "recognized", "isCorrect": false},
      {"text": "recognizing", "isCorrect": false},
      {"text": "recognize", "isCorrect": false},
      {"text": "to recognize", "isCorrect": true}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The construction is “decided to recognize”. The verb decide is followed by an infinitive (to + verb). Therefore, D is correct. Recognized, recognizing, and recognize do not fit this grammatical structure.",
    "source": "SAT - Module 2 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "In 1871, a lantern _______ in a barn during a dry autumn and ignited nearby structures. No one was ever proven responsible, but within a day much of the city of Chicago lay in ruins.",
    "questionText": "Which choice completes the text so that it conforms to the conventions of Standard English?",
    "options": [
      {"text": "tips over", "isCorrect": false},
      {"text": "will tip over", "isCorrect": false},
      {"text": "has tipped over", "isCorrect": false},
      {"text": "tipped over", "isCorrect": true}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The passage describes an event in 1871, so the verb needs past tense: “a lantern tipped over.” The other choices use present, future, or present perfect forms and therefore don't fit the historical narrative.",
    "source": "SAT - Module 2 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "As the sixteenth director of the National Gallery, Dr. Amina Patel has many responsibilities. These include overseeing the museum's holdings, which comprise more than 210,000 _______ the museum's conservation lab, which restores damaged artworks and trains new conservators; and curating the annual public exhibition.",
    "questionText": "Which choice completes the text so that it conforms to the conventions of Standard English?",
    "options": [
      {"text": "works overseeing", "isCorrect": false},
      {"text": "works, overseeing", "isCorrect": true},
      {"text": "works; overseeing", "isCorrect": false},
      {"text": "works. Overseeing", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The sentence lists three responsibilities: overseeing the museum's holdings, overseeing the conservation lab, curating the annual exhibition. The comma after “works” separates the first item from the participial phrase “overseeing the museum's conservation lab.” A semicolon would incorrectly divide parts of the same list, while D creates an incomplete sentence.",
    "source": "SAT - Module 2 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "Illustrator Priya Nair primarily uses digital tablets to create covers for graphic novels. To achieve the muted, nostalgic tones that are a hallmark of her _______ she occasionally turns to traditional techniques, such as painting with gouache.",
    "questionText": "Which choice completes the text so that it conforms to the conventions of Standard English?",
    "options": [
      {"text": "covers, though,", "isCorrect": false},
      {"text": "covers, though", "isCorrect": true},
      {"text": "covers; though,", "isCorrect": false},
      {"text": "covers, though;", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The phrase is structured as “the hallmark of her covers, though she occasionally turns...” The word “though” introduces a contrasting dependent clause, and no comma is needed after it. A incorrectly adds a comma after “though,” while C and D use incorrect punctuation.",
    "source": "SAT - Module 2 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "Basalt columns are volcanic rock formations that are highly uniform—that is, their shapes are remarkably consistent in size and angle. They are rarely _______ many basalt columns show irregularities from uneven cooling, fracturing, and later weathering.",
    "questionText": "Which choice completes the text so that it conforms to the conventions of Standard English?",
    "options": [
      {"text": "flawless, though", "isCorrect": false},
      {"text": "flawless, though;", "isCorrect": false},
      {"text": "flawless; though", "isCorrect": false},
      {"text": "flawless, though,", "isCorrect": true}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The sentence is essentially saying: basalt columns are rarely flawless, although many show irregularities. “Though” functions as a parenthetical transition here and is set off with commas: “flawless, though, many...” The other punctuation choices incorrectly use a semicolon or fail to provide the necessary structure.",
    "source": "SAT - Module 2 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "That the geographic center of Europe lay somewhere in Lithuania was accepted by all _______ pinpointing its exact coordinates proved far more contentious.",
    "questionText": "Which choice completes the text so that it conforms to the conventions of Standard English?",
    "options": [
      {"text": "involved:", "isCorrect": false},
      {"text": "involved,", "isCorrect": false},
      {"text": "involved", "isCorrect": false},
      {"text": "involved;", "isCorrect": true}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The sentence contains two independent clauses: The location was accepted by all involved. Pinpointing its exact coordinates proved contentious. A semicolon correctly joins these closely related independent clauses. A comma would create a comma splice, while A introduces an incorrect colon.",
    "source": "SAT - Module 2 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "Renowned for its ornate façade, the Leaning Tower of Pisa is a popular attraction in Tuscany. However, measurements taken in 2020 showed that the tower's tilt was decreasing faster than expected. _______ engineers monitored the structure closely to ensure the correction wasn't happening too quickly.",
    "questionText": "Which choice completes the text with the most logical transition?",
    "options": [
      {"text": "Similarly,", "isCorrect": false},
      {"text": "As a result,", "isCorrect": true},
      {"text": "For example,", "isCorrect": false},
      {"text": "In comparison,", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "Measurements showed that the tower's tilt was decreasing faster than expected. As a result, engineers monitored the structure closely. This is a clear cause-and-effect relationship. The other transitions indicate similarity, example, or comparison rather than consequence.",
    "source": "SAT - Module 2 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "In 2019, a study led by geologist Amrita Rao and her team revealed that the same volcanic eruptions responsible for forming the Deccan Traps in India are likely linked to a mass extinction event. _______ this study detailed how sulfur emissions from the eruptions cooled the global climate over thousands of years.",
    "questionText": "Which choice completes the text with the most logical transition?",
    "options": [
      {"text": "Hence,", "isCorrect": false},
      {"text": "However,", "isCorrect": false},
      {"text": "Admittedly,", "isCorrect": false},
      {"text": "Specifically,", "isCorrect": true}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The first sentence makes a general claim that the volcanic eruptions were linked to a mass extinction. The next sentence gives a specific detail about how sulfur emissions cooled the global climate. Therefore, “Specifically” is the appropriate transition. The other choices don't express this relationship.",
    "source": "SAT - Module 2 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "Following the introduction of the printing press, European book culture underwent a radical transformation, fueled in large part by surging demand for religious texts. The mass production, translation, and distribution of the Bible, _______ reconfigured the continent's existing manuscript culture into a print-based information system.",
    "questionText": "Which choice completes the text with the most logical transition?",
    "options": [
      {"text": "in particular,", "isCorrect": true},
      {"text": "alternatively,", "isCorrect": false},
      {"text": "by comparison,", "isCorrect": false},
      {"text": "second of all,", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The sentence first discusses the broader transformation of European book culture and then singles out the mass production, translation, and distribution of the Bible as an especially important example. “In particular” appropriately narrows the focus. The other transitions don't fit the relationship.",
    "source": "SAT - Module 2 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "When, in 2015, graduate students Mei Lin and Carlos Diaz decided they wanted to design an accessible museum exhibit, one of their goals was for visually impaired visitors to fully experience the artwork. _______ they created a series of tactile replicas that visitors could touch and explore.",
    "questionText": "Which choice completes the text with the most logical transition?",
    "options": [
      {"text": "In other words,", "isCorrect": false},
      {"text": "In summary,", "isCorrect": false},
      {"text": "For example,", "isCorrect": false},
      {"text": "To that end,", "isCorrect": true}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The students wanted visually impaired visitors to experience the artwork fully. To that end means for that purpose, and it logically introduces the action they took to accomplish the goal: creating tactile replicas. The other choices don't establish this purpose-and-action relationship.",
    "source": "SAT - Module 2 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "Urban rooftop gardens that incorporate raised beds and irrigation systems are known as green roofs. As rooftop gardening has shifted from a hobbyist pursuit to a citywide sustainability strategy, modern green roofs are rarely designed solely for food production. _______ new installations favor stormwater management and insulation, aiming to reduce a building's energy costs.",
    "questionText": "Which choice completes the text with the most logical transition?",
    "options": [
      {"text": "Additionally,", "isCorrect": false},
      {"text": "On the other hand,", "isCorrect": false},
      {"text": "More often,", "isCorrect": true},
      {"text": "Nonetheless,", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The passage says modern green roofs are rarely designed solely for food production. The next sentence explains what they more often prioritize: stormwater management and insulation. Thus, C provides the clearest continuation of the idea.",
    "source": "SAT - Module 2 - Section Test 09",
    "tags": ""
  },
  {
    "questionType": "sat_reading_writing",
    "difficulty": "Medium",
    "stimulus": "While researching a topic, a student has taken the following notes:<br><br>Octavia Butler is a US writer known for her science fiction.<br><br>Butler's novel Kindred was published in 1979.<br><br>The novel is frequently taught in university literature courses.<br><br>Butler was the first science fiction writer to receive a MacArthur Fellowship.",
    "questionText": "The student wants to indicate the title of a novel written by Butler. Which choice most effectively uses relevant information from the notes to accomplish this goal?",
    "options": [
      {"text": "Kindred, by Octavia Butler, was published in 1979.", "isCorrect": true},
      {"text": "Octavia Butler published a science fiction novel in 1979.", "isCorrect": false},
      {"text": "Octavia Butler is an award-winning US writer known for her science fiction.", "isCorrect": false},
      {"text": "One of Octavia Butler's novels is frequently taught in university courses.", "isCorrect": false}
    ],
    "correctAnswerText": "",
    "marks": 1,
    "negativeMarks": 0,
    "explanation": "The student specifically wants to identify the title of a novel written by Butler. Choice A directly names the novel, Kindred, and identifies Butler as its author. The other choices describe Butler or her novels without giving the specific title.",
    "source": "SAT - Module 2 - Section Test 09",
    "tags": ""
  }
]

const kjkjk = []

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