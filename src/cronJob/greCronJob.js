import cron from "node-cron";
export async function evaluateGreAnalyticalWriting({
    answerText,
    questionText1,
    questionText2 = "",
    threshold = 0.6
}) {
    const prompt = `
You are a GRE Analytical Writing evaluator.

TASK:
1. Evaluate the essay content.
2. Focus on argument clarity, coherence, and relevance.
3. Ignore minor grammar issues.

Question texts:
${questionText1}

${questionText2}

Candidate Essay:
${answerText}

RETURN STRICT JSON ONLY:

{
  "score": 0,
  "feedback": "short feedback"
}
`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer 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`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "meta-llama/llama-3.1-405b-instruct:free",
            temperature: 0,
            max_tokens: 200,
            messages: [{ role: "user", content: prompt }]
        })
    });

    if (!response.ok) {
        const err = await response.text();
        console.error("GRE Evaluation API Error:", err);
        throw new Error(err);
    }


    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "{}";

    const json = JSON.parse(
        text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "")
    );

    const score = Number(json.score) || 0;

    return {
        score,
        isCorrect: score >= threshold * 6, // GRE writing is usually 0–6
        feedback: json.feedback || ""
    };
}


// cron.schedule("*/60 * * * * *", async () => {
//     console.log("🚀 GRE Writing Cron Started");

//     try {
//         const attempt = await TestAttempt.findOne({
//             status: "completed",
//             analysisStatus: { $ne: true },
//             exam: { $in: ["6926e2a38c40c330202b1305"] } // 🔥 GRE exam id
//         });

//         if (!attempt) {
//             console.log("ℹ️ No GRE attempts pending");
//             return;
//         }

//         let evaluatedOne = false;

//         for (const section of attempt.sections) {
//             for (const aq of section.questions) {
//                 if (evaluatedOne) break;

//                 if (!aq.answerText || !aq.isAnswered) continue;
//                 if (aq.evaluationMeta?.evaluatedAt) continue;

//                 const qDoc = await Question.findById(aq.question).lean();
//                 if (!qDoc) continue;

//                 if (qDoc.questionType !== "gre_analytical_writing") continue;

//                 try {
//                     const result = await evaluateGreAnalyticalWriting({
//                         answerText: aq.answerText,
//                         questionText: qDoc.questionText
//                     });

//                     aq.isCorrect = result.isCorrect;
//                     aq.marksAwarded = result.score;

//                     aq.evaluationMeta = {
//                         score: result.score,
//                         feedback: result.feedback,
//                         evaluatedAt: new Date()
//                     };

//                     evaluatedOne = true;
//                 } catch (err) {
//                     console.error(
//                         `❌ GRE evaluation failed for question ${aq.question}`,
//                         err
//                     );
//                 }
//             }
//             if (evaluatedOne) break;
//         }

//         if (evaluatedOne) {
//             recomputeAttemptStats(attempt);
//             attempt.analysisStatus = true;
//             await attempt.save();
//             console.log(`✅ GRE Attempt ${attempt._id} updated`);
//         }

//         console.log("✅ GRE Writing Cron Finished");

//     } catch (err) {
//         console.error("❌ GRE Cron Error:", err);
//     }
// });
