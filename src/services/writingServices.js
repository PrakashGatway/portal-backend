import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI('AIzaSyB2I63SukyULf98Rh3SR0IYDcGFaNGBaEY');

// gptkey// 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

class WritingEvaluationService {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  }

  async evaluateWriting(question, response, questionType) {
    try {
      if (!response) {
        throw new Error("Missing writing response.");
      }

      const prompt = this.buildEvaluationPrompt(question, response, questionType);
      
      const result = await this.model.generateContent(prompt);
      const rawText = result.response.text();

      console.log("rawText", rawText);

      if (!rawText) {
        throw new Error("No response from AI model.");
      }

      const evaluation = this.parseEvaluationResponse(rawText);
      return evaluation;
    } catch (error) {
      console.error("Writing evaluation error:", error);
      throw error;
    }
  }

  buildEvaluationPrompt(question, response, questionType) {
    let criteriaDescription = "";
    let taskDescription = "";

    if (questionType === "writing_task_1_academic") {
      criteriaDescription = `
      Evaluate based on IELTS Academic Writing Task 1 criteria:
      - Task Achievement: How well the response addresses the task requirements, covers key features, and presents accurate information
      - Coherence and Cohesion: Logical organization, appropriate paragraphing, and effective use of cohesive devices
      - Lexical Resource: Range and accuracy of vocabulary, appropriate word choice, and flexibility in expression
      - Grammatical Range and Accuracy: Range of structures, accuracy of grammar, and punctuation
      `;
      taskDescription = "Academic Writing Task 1 - Describe visual information (graph/chart/table/diagram)";
    } else if (questionType === "writing_task_1_general") {
      criteriaDescription = `
      Evaluate based on IELTS General Training Writing Task 1 criteria:
      - Task Achievement: How well the response addresses the task requirements and communicates the purpose effectively
      - Coherence and Cohesion: Logical organization, appropriate paragraphing, and effective use of cohesive devices
      - Lexical Resource: Range and accuracy of vocabulary, appropriate word choice, and flexibility in expression
      - Grammatical Range and Accuracy: Range of structures, accuracy of grammar, and punctuation
      `;
      taskDescription = "General Training Writing Task 1 - Write a letter for a given situation";
    } else if (questionType === "writing_task_2") {
      criteriaDescription = `
      Evaluate based on IELTS Writing Task 2 criteria:
      - Task Response: How fully the response addresses all parts of the task and presents a relevant position
      - Coherence and Cohesion: Logical organization, appropriate paragraphing, and effective use of cohesive devices
      - Lexical Resource: Range and accuracy of vocabulary, appropriate word choice, and flexibility in expression
      - Grammatical Range and Accuracy: Range of structures, accuracy of grammar, and punctuation
      `;
      taskDescription = "Writing Task 2 - Write an essay in response to a point of view, argument or problem";
    }

    return `
You are an IELTS examiner. Evaluate the candidate's ${taskDescription} response below according to IELTS band descriptors.
Give results in this exact JSON format only:
{
  "bandScore": <0-9>,
  "taskAchievement": "text",
  "coherenceAndCohesion": "text", 
  "lexicalResource": "text",
  "grammaticalRangeAndAccuracy": "text",
  "overallComment": "text"
}

${criteriaDescription}

Question: ${question || "N/A"}
Response: ${response}
`;
  }

  parseEvaluationResponse(rawText) {
    const jsonStart = rawText.indexOf("{");
    const jsonEnd = rawText.lastIndexOf("}") + 1;

    if (jsonStart === -1 || jsonEnd <= 0) {
      console.error("No JSON found in response:", rawText);
      throw new Error("Invalid response format from AI.");
    }

    const jsonString = rawText.slice(jsonStart, jsonEnd);

    try {
      return JSON.parse(jsonString);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Raw response:", rawText);
      console.error("Extracted JSON string:", jsonString);
      throw new Error("Failed to parse AI response as JSON.");
    }
  }

  async evaluateWritingTask(question, answer) {
    try {
      const questionText = question?.content?.instruction || question.title || question.cueCard?.topic || '';
     
      console.log("questionText", questionText);
      const evaluation = await this.evaluateWriting(questionText, answer, question.questionType);
      
      const marksObtained = evaluation.bandScore
      const isCorrect = evaluation.bandScore >= 6; // Adjust threshold as needed

      return {
        evaluation,
        marksObtained,
        isCorrect
      };
    } catch (error) {
      console.error("Error evaluating writing task:", error);
      return {
        evaluation: null,
        marksObtained: 0,
        isCorrect: false,
        error: error.message
      };
    }
  }
}

export const writingEvaluationService = new WritingEvaluationService();