import cron from "node-cron";
import mongoose from "mongoose";
import { TestAttempt } from "../models/GGSschema/attemptSchema.js";
import { Question } from "../models/GGSschema/questionSchema.js";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Exam from "../models/Test series/Exams.js";
import os from "os";
import { promises as fs } from "fs";
import { GoogleGenAI, createUserContent, createPartFromUri, FunctionResponse } from "@google/genai";
import OpenAI from "openai";
import { createReadStream } from "fs";
const openai = new OpenAI({
    apiKey: "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"
});


console.log("🚀 PTE Cron Job Module Loaded");


import fetch from "node-fetch";
import FormData from "form-data";
import { json } from "stream/consumers";

async function transcribeAudio(filePath) {
    const form = new FormData();

    form.append("file", createReadStream(filePath));
    form.append("model", "whisper-large-v3");

    const response = await fetch(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer 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`,
            },
            body: form,
        }
    );

    if (!response.ok) {
        const err = await response.text();
        throw new Error(err);
    }

    const data = await response.json();

    console.log("Transcription result:", data);
    return data.text;
}


export async function analyzePteWithOpenRouter({
    transcript,
    questionText1,
    questionText2,
    questionAudioTranscript,
    correctAnswerText,
    type,
    threshold = 0.6
}) {

    const prompt = `
You are a PTE exam evaluator.

You MUST return a COMPLETE JSON object.
Do NOT return an empty object.
Do NOT explain anything.
If unsure, still estimate accuracy between 0 and 1.


TASK:
1. Evaluate the candidate transcript.
2. Focus on MEANING and KEY CONTENT.
3. Ignore minor grammar and pronunciation issues.

Question Text Part 1:
${questionText1 || "N/A"}

Question Text (if type is describe image then a image in base64 will in this content also there see that and use that) Part 2: 
${questionText2 || "N/A"}

Question Audio Transcript:
${questionAudioTranscript || "N/A"}

Question Type:
${type}

Candidate Transcript:
${transcript}

Correct Answer (if applicable):
${correctAnswerText || "N/A"}

SCORING RULES:
- Accuracy >= ${threshold * 100}% = correct

RETURN STRICT JSON ONLY (NO MARKDOWN):

{
  "accuracy": 0,
  "missingKeywords": [],
  "extraWords": []
}
`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer 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`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://m8j3lq9z-5000.inc1.devtunnels.ms",
            "X-Title": "PTE Evaluation"
        },
        body: JSON.stringify({
            model: "meta-llama/llama-3.1-405b-instruct:free",
            temperature: 0,
            max_tokens: 200,
            messages: [
                { role: "user", content: prompt }
            ]
        })
    });

    if (!response.ok) {
        const err = await response.text();
        return {
            transcript,
            accuracy: 0,
            isCorrect: false,
            missingKeywords: [],
            extraWords: []
        }
    }


    const data = await response.json();
    let text = data.choices?.[0]?.message?.content || "";

    text = text.replace(/^\s*```(?:json)?\s*/i, "");
    text = text.replace(/\s*```\s*$/i, "");

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) {
        throw new Error("Invalid JSON from OpenRouter model");
    }

    const parsed = JSON.parse(text.slice(start, end + 1));

    const accuracy = typeof parsed.accuracy === "number" ? parsed.accuracy : 0;

    return {
        transcript,
        accuracy,
        isCorrect: accuracy >= threshold,
        missingKeywords: parsed.missingKeywords || [],
        extraWords: parsed.extraWords || []
    };
}


// transcribeAudio("uploads\\pteAnswers\\1766821519644-659732839.webm") 

async function sleep() {
    try {
        let result = await evaluatePteListeningWithOpenRouter({
            audioFilePath: "uploads\\pteAnswers\\1766821519644-659732839.webm",
            questionText1: '<div>look at the text below.you must read this text aloud as naturally and clearly as possible. you have 40 seconds to read aloud .</div>\n' +
                '</div>',
            questionText2: '<div>Once most animals reach adulthood, they stop growing. In contrast, even plants that are thousands of years old continue to grow new needles, add new wood, and produce cones and new flowers, almost as if parts of their bodies remained "forever young". The secrets of plant growth are regions of tissue that can produce cells that later develop into specialized tissues.</div>',
            questionAudioTranscript: "",
            correctAnswerText: "",
            type: "read_aloud"
        })
        console.log("Sleep function result:", result);
    } catch (error) {
        console.error("Error during sleep function:", error);
    }
}

// sleep();

async function testGeminiAPI() {

    const response = await openai.responses.create({
        model: "gpt-4o-mini",
        input: "Write a short bedtime story about a unicorn.",
    });

    console.log(response.output_text);
}
// testGeminiAPI();

export async function evaluatePteListeningWithGemini({
    audioFilePath,
    questionText1,
    questionText2,
    questionAudioTranscript,
    correctAnswerText,
    type,
    threshold = 0.6
}) {
    if (!audioFilePath || !type) {
        throw new Error("audioFilePath and correctAnswerText are required");
    }

    const ai = new GoogleGenAI({
        apiKey: "AIzaSyB2I63SukyULf98Rh3SR0IYDcGFaNGBaEY"
    });

    let uploadedFile = null;
    let tmpFilePath = null;

    try {
        const buffer = await fs.readFile(audioFilePath);
        const ext = path.extname(audioFilePath).toLowerCase();
        const mimeType =
            ext === ".mp3"
                ? "audio/mp3"
                : ext === ".wav"
                    ? "audio/wav"
                    : "audio/webm";

        const tmpDir = os.tmpdir();
        const tmpName = `pte-listening-${Date.now()}${ext || ".webm"}`;
        tmpFilePath = path.join(tmpDir, tmpName);
        await fs.writeFile(tmpFilePath, buffer);

        uploadedFile = await ai.files.upload({
            file: tmpFilePath,
            config: { mimeType }
        });

        const fileUri =
            uploadedFile.uri ||
            uploadedFile.name ||
            uploadedFile.fileUri ||
            uploadedFile.path;

        if (!fileUri) {
            throw new Error("Gemini upload failed: missing file URI");
        }

        const prompt = `
You are a PTE exam evaluator.

TASK:
1. Listen carefully to the audio.
2. Transcribe exactly what the candidate said.
3. Evaluate the correctness of the transcript.
4. Evaluate based on MEANING and KEY CONTENT.
5. Ignore minor grammar and pronunciation issues.

Question Text Part 1: ${questionText1}

Question Text Part 2: ${questionText2}

Question Audio Transcript: ${questionAudioTranscript}

Question type : ${type}

User Answer: attached audio file 

if writing question then answer is ${correctAnswerText}

SCORING RULES:
- Accuracy >= ${threshold * 100}% = correct
- Focus on content accuracy, not fluency

RETURN STRICT JSON ONLY (NO MARKDOWN):

{
  "transcript": "",
  "accuracy": 0,
  "isCorrect": true,
  "missingKeywords": [],
  "extraWords": []
}
`;

        const contents = createUserContent([
            createPartFromUri(fileUri, mimeType),
            prompt
        ]);

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents
        });

        let rawText = "";

        if (typeof response?.text === "function") {
            try { rawText = response.text(); } catch { }
        }

        if (!rawText && typeof response?.response?.text === "function") {
            try { rawText = response.response.text(); } catch { }
        }

        if (!rawText && Array.isArray(response?.candidates)) {
            for (const c of response.candidates) {
                const parts = c?.content?.parts;
                if (Array.isArray(parts)) {
                    for (const p of parts) {
                        if (typeof p.text === "string" && p.text.trim()) {
                            rawText = p.text;
                            break;
                        }
                    }
                }
                if (rawText) break;
            }
        }

        if (!rawText && typeof response === "string") {
            rawText = response;
        }

        if (!rawText) {
            throw new Error("Empty or unexpected Gemini response");
        }

        let text = rawText.trim();
        text = text.replace(/^\s*```(?:json)?\s*/i, "");
        text = text.replace(/\s*```\s*$/i, "");

        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start === -1 || end === -1 || end <= start) {
            throw new Error("Gemini response did not contain valid JSON");
        }

        const jsonString = text.slice(start, end + 1);

        let parsed;
        try {
            parsed = JSON.parse(jsonString);
        } catch {
            throw new Error("Failed to parse JSON from Gemini output");
        }

        const accuracy =
            typeof parsed.accuracy === "number" ? parsed.accuracy : 0;

        console.log("PTE Evaluation Result:", {
            transcript: parsed.transcript || "",
            accuracy,
            isCorrect: accuracy >= threshold,
            missingKeywords: parsed.missingKeywords || [],
            extraWords: parsed.extraWords || []
        });

        return {
            transcript: parsed.transcript || "",
            accuracy,
            isCorrect: accuracy >= threshold,
            missingKeywords: parsed.missingKeywords || [],
            extraWords: parsed.extraWords || []
        };

    } finally {
        if (uploadedFile?.name || uploadedFile?.uri) {
            try {
                await ai.files.delete(
                    uploadedFile.name
                        ? { name: uploadedFile.name }
                        : { uri: uploadedFile.uri }
                );
            } catch { }
        }
        if (tmpFilePath) {
            try { await fs.unlink(tmpFilePath); } catch { }
        }
    }
}

export async function evaluatePteListeningWithOpenAI({
    audioFilePath,
    questionText1,
    questionText2,
    questionAudioTranscript,
    correctAnswerText,
    type,
    threshold = 0.6
}) {
    if (!audioFilePath || !type) {
        throw new Error("audioFilePath and type are required");
    }

    /* -------------------------------------------------
       STEP 1: TRANSCRIPTION (Whisper)
    -------------------------------------------------- */
    const transcription = await openai.audio.transcriptions.create({
        file: await fs.open(audioFilePath).then(f => f.createReadStream()),
        model: "whisper-1"
    });

    const userTranscript = transcription.text?.trim() || "";
    console.log(userTranscript)
    return userTranscript;
    if (!userTranscript) {
        throw new Error("Empty transcription from Whisper");
    }

    /* -------------------------------------------------
       STEP 2: ANALYSIS (GPT-4o-mini)
    -------------------------------------------------- */
    const prompt = `
You are a PTE exam evaluator.

TASK:
1. Analyze the candidate transcript.
2. Compare with question context.
3. Evaluate based on MEANING and KEY CONTENT.
4. Ignore minor grammar and pronunciation issues.

Question Text Part 1:
${questionText1}

Question Text Part 2:
${questionText2}

Question Audio Transcript:
${questionAudioTranscript}

Question Type:
${type}

Candidate Transcript:
${userTranscript}

Correct Answer (if applicable):
${correctAnswerText || "N/A"}

SCORING RULES:
- Accuracy >= ${threshold * 100}% = correct
- Focus on semantic correctness

RETURN STRICT JSON ONLY (NO MARKDOWN):

{
  "accuracy": 0,
  "missingKeywords": [],
  "extraWords": []
}
`;

    const response = await openai.responses.create({
        model: "gpt-4o-mini",
        input: prompt,
        temperature: 0
    });

    let rawText = response.output_text?.trim();
    if (!rawText) {
        throw new Error("Empty response from GPT-4o-mini");
    }

    // Cleanup accidental formatting
    rawText = rawText.replace(/^\s*```(?:json)?\s*/i, "");
    rawText = rawText.replace(/\s*```\s*$/i, "");

    const start = rawText.indexOf("{");
    const end = rawText.lastIndexOf("}");
    if (start === -1 || end === -1) {
        throw new Error("Invalid JSON from GPT-4o-mini");
    }

    const parsed = JSON.parse(rawText.slice(start, end + 1));
    const accuracy =
        typeof parsed.accuracy === "number" ? parsed.accuracy : 0;

    return {
        transcript: userTranscript,
        accuracy,
        isCorrect: accuracy >= threshold,
        missingKeywords: parsed.missingKeywords || [],
        extraWords: parsed.extraWords || []
    };
}

export async function evaluatePteListeningWithOpenRouter({
    audioFilePath,
    questionText1,
    questionText2,
    questionAudioTranscript,
    correctAnswerText,
    type,
    threshold = 0.6
}) {
    if (!type) {
        throw new Error("type are required");
    }

    try {

        let isQuestionAsWriting = ["pte_writing", "pte_writing_listening", "pte_summarize_listening", "pte_summarize_writing", "pte_summarize_spoken"].includes(type);

        const transcript = isQuestionAsWriting ? audioFilePath : await transcribeAudio(audioFilePath);

        if (!transcript || !transcript.trim()) {
            return {
                transcript: audioFilePath,
                accuracy: 0,
                isCorrect: false,
                missingKeywords: [],
                extraWords: []
            }
        }
        const analysis = await analyzePteWithOpenRouter({
            transcript,
            questionText1,
            questionText2,
            questionAudioTranscript,
            correctAnswerText,
            type,
            threshold
        });

        return {
            transcript,
            accuracy: analysis.accuracy,
            isCorrect: analysis.isCorrect,
            missingKeywords: analysis.missingKeywords || [],
            extraWords: analysis.extraWords || []
        };

    } catch (err) {
        console.error("PTE Evaluation Failed:", err.message);
        throw err;
    }
}

function recomputeAttemptStats(attempt) {
    let totalQuestions = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalSkipped = 0;
    let totalAttempted = 0;
    let totalRawScore = 0;

    for (const sec of attempt.sections) {
        let secCorrect = 0;
        let secIncorrect = 0;
        let secSkipped = 0;
        let secRawScore = 0;

        for (const aq of sec.questions) {
            totalQuestions++;

            const answered =
                (aq.answerOptionIndexes && aq.answerOptionIndexes.length > 0) ||
                (typeof aq.answerText === "string" && aq.answerText.trim().length > 0);

            if (!answered) {
                secSkipped++;
                totalSkipped++;
                continue;
            }

            totalAttempted++;

            if (aq.isCorrect) {
                secCorrect++;
                totalCorrect++;
                secRawScore += aq.marksAwarded || 0;
                totalRawScore += aq.marksAwarded || 0;
            } else {
                secIncorrect++;
                totalIncorrect++;
                secRawScore += aq.marksAwarded || 0; // may be 0 or negative
                totalRawScore += aq.marksAwarded || 0;
            }
        }

        sec.stats = {
            correct: secCorrect,
            incorrect: secIncorrect,
            skipped: secSkipped,
            rawScore: secRawScore,
        };
    }

    attempt.overallStats = {
        totalQuestions,
        totalAttempted,
        totalCorrect,
        totalIncorrect,
        totalSkipped,
        rawScore: totalRawScore,
    };
}


cron.schedule("*/60 * * * * *", async () => {
    console.log("🚀 PTE Listening Cron Started");
    try {

        const attempts = await TestAttempt.find({
            status: "completed",
            // analysisStatus: false,
            exam: { $in: ["69410ab31f72080b90c700f7"] }
        }).limit(2);

        for (const attempt of attempts) {
            let updated = false;

            for (const section of attempt.sections) {
                for (const aq of section.questions) {
                    if ((!aq.answerText || !aq.isAnswered)) continue;
                    if (aq.evaluationMeta && aq.evaluationMeta.evaluatedAt) continue;
                    const qDoc = await Question.findById(aq.question).lean();
                    if (!qDoc) continue;

                    if (!["read_aloud", "repeat_sentence", "describe_image", "retell_lesson", "short_answer", "pte_situational", "pte_summarize_writing", "pte_summarize_listening", "pte_writing_listening", "pte_writing", "gre_analytical_writing", "summarize_group_discussions", "pte_summarize_spoken"].includes(qDoc.questionType)) continue;

                    let isQuestionAsListening = ["read_aloud", "pte_writing_listening", "pte_writing", "pte_summarize_listening", "repeat_sentence", "retell_lesson", "short_answer", "summarize_group_discussions", "pte_summarize_spoken"].includes(qDoc.questionType);

                    let isNotListeningText = ["short_answer", "retell_lesson", "pte_situational", "summarize_group_discussions", "pte_summarize_writing"].includes(qDoc.questionType);

                    try {
                        const result = await evaluatePteListeningWithOpenRouter({
                            audioFilePath: aq.answerText || "",
                            questionText1: qDoc.stimulus || "",
                            questionText2: isQuestionAsListening ? "" : qDoc.questionText,
                            questionAudioTranscript: isNotListeningText ? qDoc.typeSpecific?.listeningText || qDoc.questionText : "",
                            correctAnswerText: qDoc.correctAnswerText || "",
                            type: qDoc.questionType
                        });

                        aq.isCorrect = result.isCorrect;

                        aq.marksAwarded = result.isCorrect ? (qDoc.marks ?? 1) : 0;
                        aq.evaluationMeta = {
                            transcript: result.transcript,
                            accuracy: result.accuracy,
                            missingKeywords: result.missingKeywords,
                            extraWords: result.extraWords,
                            evaluatedAt: new Date()
                        };
                        updated = true;
                    } catch (err) {
                        console.error(
                            `❌ Evaluation failed for question ${aq.question}:`,
                            err
                        );
                    }
                }
            }
            if (updated) {
                recomputeAttemptStats(attempt);
                attempt.analysisStatus = true;
                await attempt.save();
                console.log(`✅ Attempt ${attempt._id} updated`);
            }
        }
        console.log("✅ PTE Listening Cron Finished");
    } catch (err) {
        console.error("❌ PTE Listening Cron Error:", err);
    }
});