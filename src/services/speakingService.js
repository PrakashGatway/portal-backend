// routes/evaluateSpeaking.genai.js
import express from "express";
import multer from "multer";
import os from "os";
import path from "path";
import { promises as fs } from "fs";
import { GoogleGenAI, createUserContent, createPartFromUri } from "@google/genai";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const ai = new GoogleGenAI({ apiKey: "AIzaSyB2I63SukyULf98Rh3SR0IYDcGFaNGBaEY" });

router.post("/evaluate", upload.single("file"), async (req, res) => {
    let tmpFilePath = null;
    let uploadedFile = null;

    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded. Use form-data key 'file'." });

        const { buffer, mimetype, originalname } = req.file;
        const mimeType = mimetype || "audio/mpeg";
        const baseName = originalname || `upload-${Date.now()}.bin`;

        // write temp file so SDK uploader can stat
        const tmpDir = os.tmpdir();
        const tmpFilename = `genai-upload-${Date.now()}-${baseName.replace(/\s+/g, "_")}`;
        tmpFilePath = path.join(tmpDir, tmpFilename);
        await fs.writeFile(tmpFilePath, buffer);
        console.log("Wrote temp file:", tmpFilePath);

        // upload using SDK with explicit mimeType
        uploadedFile = await ai.files.upload({
            file: tmpFilePath,
            config: { mimeType }
        });

        console.log("Uploaded file metadata:", uploadedFile);

        // determine a URI/name the SDK returned to reference the file
        const fileUri = uploadedFile.uri ?? uploadedFile.name ?? uploadedFile.fileUri ?? uploadedFile.path;
        const fileMime = uploadedFile.mimeType ?? mimeType;
        if (!fileUri) throw new Error("Upload response missing URI/name — cannot reference uploaded file.");

        // prepare prompt (strict JSON output)
        const prompt = `
You are an IELTS speaking examiner. Analyze the provided audio and return EXACT JSON only in this format:

{
  "bandScore": <number 0-9>,
  "pronunciation": "text",
  "fluencyAndCoherence": "text",
  "lexicalResource": "text",
  "grammaticalRangeAndAccuracy": "text",
  "overallComment": "text",
  "recommendations": ["one line tip", "one line tip", "one line tip"]
}

STRICT RULES:
- Output only valid JSON.
- Do not output any other text, explanation, or markdown.
`;

        // create contents referencing uploaded file
        const contents = createUserContent([
            createPartFromUri(fileUri, fileMime),
            prompt
        ]);

        // call the model
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents
        });
        let rawText = "";
        if (!rawText && typeof response?.text === "function") {
            try { rawText = response.text(); } catch (e) { /* ignore */ }
        }

        // 2) response.response.text()
        if (!rawText && typeof response?.response?.text === "function") {
            try { rawText = response.response.text(); } catch (e) { /* ignore */ }
        }

        // 3) candidates[].content.parts[].text (your earlier payload)
        if (!rawText && Array.isArray(response?.candidates)) {
            for (const c of response.candidates) {
                const content = c.content ?? c;
                if (content?.parts && Array.isArray(content.parts)) {
                    for (const p of content.parts) {
                        if (typeof p.text === "string" && p.text.trim()) {
                            rawText = p.text;
                            break;
                        }
                    }
                }
                if (rawText) break;
                if (typeof content?.text === "string" && content.text.trim()) {
                    rawText = content.text;
                    break;
                }
            }
        }

        // 4) older shapes
        if (!rawText && Array.isArray(response?.output) && response.output.length) {
            if (typeof response.output[0].content === "string") rawText = response.output[0].content;
        }
        if (!rawText && typeof response?.result?.output_text === "string") rawText = response.result.output_text;
        if (!rawText && typeof response === "string") rawText = response;

        // If still empty, return debug payload
        if (!rawText) {
            console.warn("Could not find text in model response, full response:", JSON.stringify(response));
            return res.status(500).json({ error: "Empty or unexpected response from model", rawResponse: response });
        }

        // Strip code fences like ```json ... ``` or ``` ... ```
        let text = rawText.trim();
        text = text.replace(/^\s*```(?:json)?\s*/i, "");
        text = text.replace(/\s*```\s*$/i, "");

        // extract first {...} JSON block
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start === -1 || end === -1 || end <= start) {
            return res.status(500).json({ error: "Model did not return JSON or returned malformed output", rawText });
        }

        const jsonString = text.slice(start, end + 1);

        let evaluation;
        try {
            evaluation = JSON.parse(jsonString);
        } catch (parseErr) {
            return res.status(500).json({ error: "Failed to parse JSON from model output", rawText, parseError: String(parseErr) });
        }

        // success
        return res.json({ success: true, evaluation, rawText });

    } catch (err) {
        console.error("evaluate error:", err);
        return res.status(500).json({ error: err.message || "Server error", details: String(err) });

    } finally {
        // cleanup remote file
        if (uploadedFile?.name || uploadedFile?.uri) {
            try {
                const deleteArg = uploadedFile.name ? { name: uploadedFile.name } : { uri: uploadedFile.uri };
                await ai.files.delete(deleteArg).catch(e => console.warn("remote delete failed:", e?.message || e));
                console.log("Tried to delete remote file:", uploadedFile.name ?? uploadedFile.uri);
            } catch (e) {
                console.warn("Error deleting remote file:", e?.message || e);
            }
        }

        // cleanup tmp file
        if (tmpFilePath) {
            try {
                await fs.unlink(tmpFilePath);
                console.log("Deleted tmp file:", tmpFilePath);
            } catch (e) {
                console.warn("Failed to delete tmp file:", e?.message || e);
            }
        }
    }
});

export default router;
