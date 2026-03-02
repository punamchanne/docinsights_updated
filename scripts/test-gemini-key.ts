import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("Error: GEMINI_API_KEY not found in environment variables.");
    process.exit(1);
}

const MODELS_TO_TEST = [
    "gemini-2.0-flash-001",
    "gemini-flash-latest",
    "gemini-1.5-flash",
    "gemini-pro"
];

async function testGeneration() {
    const genAI = new GoogleGenerativeAI(API_KEY!);

    for (const modelName of MODELS_TO_TEST) {
        console.log(`\nTesting model: ${modelName}...`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hello, strictly reply with 'OK'");
            const response = await result.response;
            const text = response.text();

            console.log(`>>> SUCCESS with ${modelName}! Response: ${text}`);
            return; // Stop after first success
        } catch (error: any) {
            console.error(`X Failed with ${modelName}:`);
            console.error(error.message);
            if (error.response) {
                console.error("Response:", JSON.stringify(error.response, null, 2));
            }
        }
    }
    console.error("\n>>> ALL MODELS FAILED.");
}

testGeneration();
