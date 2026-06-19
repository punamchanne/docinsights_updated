import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, SchemaType } from "@google/generative-ai";
import type { Content } from "@google/generative-ai";
import type { ExtractedTable } from "@shared/mongo-schema";

const API_KEY = process.env.GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;
const MODEL_NAME = "gemini-3.1-flash-lite";

if (API_KEY) {
  genAI = new GoogleGenerativeAI(API_KEY);
} else {
  console.warn("GEMINI_API_KEY is not set. AI features will be limited.");
}

export function isGeminiConfigured(): boolean {
  return !!API_KEY && !!genAI;
}

// Helper for exponential backoff
async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.status === 429 || error.status === 503 || error.message?.includes('429') || error.message?.includes('503'))) {
      let waitTime = delay * 2;

      // Try to parse specific retry delay from Google API error
      if (error.errorDetails) {
        const retryInfo = error.errorDetails.find((d: any) => d['@type']?.includes('RetryInfo'));
        if (retryInfo && retryInfo.retryDelay) {
          // format is usually "47s" or "54.830s"
          const seconds = parseFloat(retryInfo.retryDelay.replace('s', ''));
          if (!isNaN(seconds)) {
            waitTime = (seconds * 1000) + 1000; // Add 1s buffer
          }
        }
      }

      console.log(`Gemini API 429 hit. Retrying in ${waitTime}ms... (${retries} retries left)`);

      // Cap max wait time for a single retry to avoid timing out the HTTP request entirely (e.g. 60s)
      if (waitTime > 60000) {
        console.log("Retry wait time too long, aborting retry.");
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, waitTime));
      return callWithRetry(fn, retries - 1, waitTime);
    }
    throw error;
  }
}

export async function generateChatResponse(
  documentContent: string,
  userQuestion: string,
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {
  if (!genAI) {
    throw new Error("Gemini AI is not configured");
  }

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const formattedHistory: Content[] = chatHistory.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  // Gemini requires the first message to be from the user
  while (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
    formattedHistory.shift();
  }

  const chat = model.startChat({
    history: formattedHistory,
    generationConfig: {
      maxOutputTokens: 1000,
    },
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ],
  });

  const prompt = `You are a professional document analysis assistant. Your goal is to provide high-quality, meaningful, and concise answers based strictly on the provided document.
  
  DOCUMENT CONTEXT:
  ---
  ${documentContent.slice(0, 40000)}
  ---

  INSTRUCTIONS:
  1. Analyze the content deeply and provide a meaningful response, not just a simple summary.
  2. If the user asks for a specific word count (e.g., "50 words abstract"), ensure the response is high-quality, covers the most important points, and stays within the limit.
  3. Use a professional and helpful tone.
  4. If the answer is not in the document, politely state that.

  USER QUESTION: "${userQuestion}"
  `;

  // Use retry wrapper
  const result = await callWithRetry(() => chat.sendMessage(prompt));
  const response = await result.response;
  return response.text();
}

export async function generateDocumentSummary(text: string): Promise<string> {
  if (!genAI) {
    throw new Error("Gemini AI is not configured");
  }

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const prompt = `Summarize the following text, focusing on the main points and key takeaways.:\n\n${text.slice(0, 12000)}`;

  const result = await callWithRetry(() => model.generateContent(prompt));
  const response = await result.response;
  return response.text();
}

export async function extractKeywords(text: string): Promise<string[]> {
  if (!genAI) {
    throw new Error("Gemini AI is not configured");
  }

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const prompt = `Extract the 8-12 most important keywords or key phrases from the following text. Return them as a comma-separated list:\n\n${text.slice(0, 12000)}`;

  const result = await callWithRetry(() => model.generateContent(prompt));
  const response = await result.response;
  const keywords = response.text().split(",").map(kw => kw.trim());
  return keywords;
}

export async function extractTablesWithAI(text: string): Promise<ExtractedTable[]> {
  if (!genAI) {
    throw new Error("Gemini AI is not configured");
  }

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            headers: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "The column headers of the table"
            },
            rows: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING }
              },
              description: "The rows of the table, each row being an array of cell values"
            },
            confidence: {
              type: SchemaType.NUMBER,
              description: "Confidence score between 0 and 1"
            }
          },
          required: ["headers", "rows"]
        }
      }
    }
  });

  const prompt = `Extract all tables from the following text accurately.
  
  IMPORTANT RULES:
  1. ONLY extract actual tables (grid-like data). 
  2. DO NOT include surrounding paragraphs, headers, footers, or plain text as rows/cells.
  3. If a single table spans multiple pages, merge them into ONE continuous table.
  4. Ensure every row has the correct number of cells corresponding to the headers.
  5. If the text do not contain a clear table structure, return an empty array [].
  6. Context: Do NOT split a single logical table into multiples unless the headers change.
  
  Text:
  ---
  ${text.slice(0, 30000)}
  ---`;

  try {
    const result = await callWithRetry(() => model.generateContent(prompt));
    const response = await result.response;
    const tables = JSON.parse(response.text());
    return Array.isArray(tables) ? tables : [];
  } catch (error) {
    console.error("Gemini Table Extraction failed:", error);
    return [];
  }
}

export async function analyzeImageWithGemini(imageBuffer: Buffer, mimeType: string): Promise<string> {
  if (!genAI) {
    throw new Error("Gemini AI is not configured");
  }

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const result = await callWithRetry(() => model.generateContent([
    {
      inlineData: {
        data: imageBuffer.toString("base64"),
        mimeType
      }
    },
    {
      text: "Analyze this document. Extract all readable text content exactly as it appears. If it's a form, question paper, marksheet/result, or bill, preserve the structure (e.g. using tables or key-value pairs). Do your best to extract all text as accurately as possible, as this will act as the OCR layer."
    }
  ]));

  const response = await result.response;
  return response.text();
}

export async function analyzeStructuredDataWithGemini(text: string): Promise<any> {
  if (!genAI) {
    throw new Error("Gemini AI is not configured");
  }

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          documentType: { type: SchemaType.STRING },
          summary: { type: SchemaType.STRING },
          fields: {
            type: SchemaType.OBJECT,
            properties: {},
            description: "Extracted key-value pairs specific to the document type (e.g. subjects for marksheets, line items for bills)"
          },
          insights: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING }
          }
        },
        required: ["documentType", "summary", "fields"]
      }
    }
  });

  const prompt = `Analyze the provided text and identify the document type (e.g., Question Paper, Marksheet/Result, Hospital Bill, Hotel Bill, General Invoice).
  Extract key structured data based on the document type.
  
  - For Question Papers: Extract Subject, Subject Code, Date/Year, Total Marks, Time Allowed, and a list of Questions (with marks if available).
  - For Marksheets/Results: Extract Student Name, Roll No/ID, Institution, Subjects, Marks/Grades, Total Marks, Result Status (Pass/Fail), and identify "Strong Areas" and "Weak Areas" based on grades.
  - For Hospital/Medical Bills: Extract Patient Name, Hospital Name, Date, Doctor Name, Diagnosis/Treatment, Line Items, and Total Amount.
  - For Hotel Bills: Extract Guest Name, Hotel Name, Check-in/Check-out dates, Room Number, Line Items (Room rate, Food, etc.), and Total Amount.
  - For General Invoices/Bills: Extract Vendor, Date, Invoice No, Line Items (Description, Price), and Total Amount.
  
  Text:
  ---
  ${text.substring(0, 30000)}
  ---`;

  try {
    const result = await callWithRetry(() => model.generateContent(prompt));
    const response = await result.response;
    return JSON.parse(response.text());
  } catch (error) {
    console.error("Gemini Structured Data Analysis failed:", error);
    return null;
  }
}
