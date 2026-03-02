import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import type { Content } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;

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
    if (retries > 0 && (error.status === 429 || error.message?.includes('429'))) {
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

  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

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

  const prompt = `Based on the following document content, answer the user's question.
  
  Document Content:
  ---
  ${documentContent.slice(0, 8000)}
  ---

  User Question: "${userQuestion}"
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

  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
  const prompt = `Summarize the following text, focusing on the main points and key takeaways.:\n\n${text.slice(0, 12000)}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

export async function extractKeywords(text: string): Promise<string[]> {
  if (!genAI) {
    throw new Error("Gemini AI is not configured");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
  const prompt = `Extract the 8-12 most important keywords or key phrases from the following text. Return them as a comma-separated list:\n\n${text.slice(0, 12000)}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const keywords = response.text().split(",").map(kw => kw.trim());
  return keywords;
}
