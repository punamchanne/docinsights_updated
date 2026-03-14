import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { createRequire } from "module";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import {
  generateDocumentSummary,
  extractKeywords,
  isGeminiConfigured,
  extractTablesWithAI,
  analyzeImageWithGemini,
  analyzeStructuredDataWithGemini,
  generateChatResponse as generateGeminiChatResponse,
} from "./gemini";
import {
  extractEntities,
  extractTablesFromText,
  getTextStatistics,
  extractKeywordsFromText,
} from "./nlp";
import { analyzeImage, isOpenAIConfigured, analyzeStructuredData, generateChatResponse as generateOpenAIChatResponse } from "./openai";
import type { DocumentAnalysis } from "@shared/mongo-schema";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
const multer = require("multer");

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    cb(null, uploadDir);
  },
  filename: (_req: any, file: any, cb: any) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and Image files (JPEG, PNG, WEBP) are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  // Health check endpoint for database connection
  app.get("/api/health", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      await db.admin().ping();
      const stats = await db.stats();
      res.json({
        status: "healthy",
        database: {
          connected: true,
          name: db.databaseName,
          collections: stats.collections,
          dataSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
          indexSize: `${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        status: "unhealthy",
        database: { connected: false },
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.get("/api/auth/user", isAuthenticated, (req: any, res: Response) => {
    res.json(req.user);
  });

  app.get(
    "/api/dashboard/stats",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const userId = req.user._id;
        const stats = await storage.getDashboardStats(userId);
        res.json(stats);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({ message: "Failed to fetch dashboard stats" });
      }
    }
  );

  app.get("/api/documents", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user._id;
      const query = req.query.q as string | undefined;

      const docs =
        query ?
          await storage.searchDocuments(userId, query) :
          await storage.getDocuments(userId);

      res.json(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get(
    "/api/documents/:id",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const doc = await storage.getDocumentWithExtractions(req.params.id);
        if (!doc) {
          return res.status(404).json({ message: "Document not found" });
        }

        if (doc.userId !== req.user._id) {
          return res.status(403).json({ message: "Access denied" });
        }

        res.json(doc);
      } catch (error) {
        console.error("Error fetching document:", error);
        res.status(500).json({ message: "Failed to fetch document" });
      }
    }
  );

  app.post(
    "/api/documents/upload",
    isAuthenticated,
    upload.single("file"),
    async (req: any, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const userId = req.user._id;
        const file = req.file;

        const doc = await storage.createDocument({
          userId,
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          status: "processing",
        });

        // Validate PDF before processing (check for password/corruption)
        const isImageFile = [".jpg", ".jpeg", ".png", ".webp"].some(ext =>
          file.originalname.toLowerCase().endsWith(ext)
        );

        if (file.mimetype === "application/pdf" && !isImageFile) {
          try {
            const dataBuffer = fs.readFileSync(file.path);
            await pdf(dataBuffer);
          } catch (error: any) {
            // Delete file if invalid
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }

            await storage.deleteDocument((doc as any)._id);

            const isPasswordError = error?.message?.toLowerCase().includes("password") ||
              error?.name === "PasswordException";

            return res.status(400).json({
              message: isPasswordError
                ? "This PDF is password protected. Please remove the password and try again."
                : "Invalid or corrupted PDF file.",
              code: isPasswordError ? "PASSWORD_PROTECTED" : "INVALID_PDF"
            });
          }
        }

        processDocument((doc as any)._id, file.path).catch((error) => {
          console.error(`Error processing document ${(doc as any)._id}:`, error);
          storage.updateDocument((doc as any)._id, { status: "error" });
        });

        res.json(doc);
      } catch (error) {
        console.error("Error uploading document:", error);
        res.status(500).json({ message: "Failed to upload document" });
      }
    }
  );

  app.post(
    "/api/documents/:id/reprocess",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const doc = await storage.getDocument(req.params.id);
        if (!doc) {
          return res.status(404).json({ message: "Document not found" });
        }

        if (doc.userId !== req.user._id) {
          return res.status(403).json({ message: "Access denied" });
        }

        const filePath = path.join(uploadDir, doc.filename);
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ message: "Document file not found" });
        }

        // Delete existing extractions
        const extractions = await storage.getExtractions(req.params.id);
        for (const extraction of extractions) {
          await storage.deleteExtraction((extraction as any)._id);
        }

        // Restart processing
        processDocument(req.params.id, filePath).catch((error) => {
          console.error(`Error reprocessing document ${req.params.id}:`, error);
          storage.updateDocument(req.params.id, { status: "error" });
        });

        res.json({ message: "Document reprocessing started" });
      } catch (error) {
        console.error("Error reprocessing document:", error);
        res.status(500).json({ message: "Failed to reprocess document" });
      }
    }
  );

  app.delete(
    "/api/documents/:id",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const doc = await storage.getDocument(req.params.id);
        if (!doc) {
          return res.status(404).json({ message: "Document not found" });
        }

        if (doc.userId !== req.user._id) {
          return res.status(403).json({ message: "Access denied" });
        }

        const filePath = path.join(uploadDir, doc.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        await storage.deleteDocument(req.params.id);
        res.json({ message: "Document deleted" });
      } catch (error) {
        console.error("Error deleting document:", error);
        res.status(500).json({ message: "Failed to delete document" });
      }
    }
  );

  app.get(
    "/api/chat/:documentId",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const doc = await storage.getDocument(req.params.documentId);
        if (!doc) {
          return res.status(404).json({ message: "Document not found" });
        }

        if (doc.userId !== req.user._id) {
          return res.status(403).json({ message: "Access denied" });
        }

        const messages = await storage.getChatMessages(req.params.documentId);
        res.json(messages);
      } catch (error) {
        console.error("Error fetching chat messages:", error);
        res.status(500).json({ message: "Failed to fetch chat messages" });
      }
    }
  );

  app.post("/api/chat", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { documentId, content } = req.body;
      const userId = req.user._id;

      if (!documentId || !content) {
        return res.status(400).json({ message: "Missing documentId or content" });
      }

      const doc = await storage.getDocumentWithExtractions(documentId);
      if (!doc) {
        return res.status(404).json({ message: "Document not found" });
      }

      if (doc.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.createChatMessage({
        documentId,
        userId,
        role: "user",
        content,
      });

      const chatHistory = await storage.getChatMessages(documentId);
      const historyForAI = chatHistory.slice(-10).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      let aiResponse: string;
      let citations: string[] = [];

      try {
        if (isOpenAIConfigured()) {
          aiResponse = await generateOpenAIChatResponse(
            doc.extractedText || "No text extracted from document.",
            content,
            historyForAI
          );
        } else if (isGeminiConfigured()) {
          aiResponse = await generateGeminiChatResponse(
            doc.extractedText || "No text extracted from document.",
            content,
            historyForAI
          );
        } else {
          aiResponse = "AI chat is not configured. Please set up OPENAI_API_KEY or GEMINI_API_KEY.";
        }
      } catch (aiError: any) {
        console.error("AI error:", aiError);

        // Check for rate limit error specifically
        if (aiError.status === 429 || aiError.message?.includes('429')) {
          aiResponse = "I'm currently receiving too many requests (Rate Limit Exceeded). Please wait a minute and try again.";
        }
        // Provide a more helpful fallback response with citations
        else if (doc.extractedText && doc.extractedText.length > 0) {
          // Simple keyword-based response with relevant document sections
          const searchTerm = content.toLowerCase();
          const textLower = doc.extractedText.toLowerCase();

          if (textLower.includes(searchTerm)) {
            const sentences = doc.extractedText.split(/[.!?]+/).filter((s: string) =>
              s.toLowerCase().includes(searchTerm) && s.trim().length > 20
            );

            if (sentences.length > 0) {
              const relevantSentences = sentences.slice(0, 3);
              citations = relevantSentences.map((s: string) => s.trim());

              aiResponse = `Based on the document, here's what I found:\n\n${relevantSentences.join('. ')}.\n\n**Sources**\n${citations.map((c, i) => `[${i + 1}] ${c}`).join('\n')}`;
            } else {
              aiResponse = "I found your search term in the document, but couldn't extract a clear answer. Please try rephrasing your question.";
            }
          } else {
            aiResponse = "I couldn't find relevant information about that in the document. Try asking about the main topics or specific terms from the document.";
          }
        } else {
          aiResponse = "I'm sorry, I couldn't process your question. The document text may not have been extracted properly.";
        }
      }

      const assistantMessage = await storage.createChatMessage({
        documentId,
        userId,
        role: "assistant",
        content: aiResponse,
        citations: citations.length > 0 ? citations : undefined,
      });

      res.json(assistantMessage);
    } catch (error) {
      console.error("Error sending chat message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.get("/api/reports", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user._id;
      const reports = await storage.getReportsData(userId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.get("/api/test-debug", (req, res) => {
    console.log("[DEBUG] /api/test-debug hit");
    res.json({ status: "ok", message: "Routing is working" });
  });

  app.get("/api/debug/extractions/:id", async (req, res) => {
    try {
      const extractions = await storage.getExtractions(req.params.id);
      res.json(extractions);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.delete("/api/documents/:id", isAuthenticated, async (req: any, res: Response) => {
    console.log(`[DELETE] Request for document ID: ${req.params.id}`);
    try {
      const documentId = req.params.id;
      const userId = req.user._id;

      const doc = await storage.getDocument(documentId);
      if (!doc) {
        console.log(`[DELETE] Document ${documentId} not found in DB`);
        return res.status(404).json({ message: "Document not found" });
      }

      if (doc.userId !== userId) {
        console.log(`[DELETE] Access denied for user ${userId} on doc ${documentId}`);
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteDocument(documentId);
      console.log(`[DELETE] Document ${documentId} deleted successfully`);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  app.get("/api/documents/:id/analysis", isAuthenticated, async (req: any, res: Response) => {
    try {
      const documentId = req.params.id;
      const userId = req.user._id;

      const doc = await storage.getDocumentWithExtractions(documentId);
      if (!doc) {
        return res.status(404).json({ message: "Document not found" });
      }

      console.log(`[DEBUG] Fetching analysis for ${documentId}`);
      console.log(`[DEBUG] Extractions found: ${doc.extractions?.length || 0}`);
      if (doc.extractions?.length) {
        console.log(`[DEBUG] Extraction types: ${doc.extractions.map(e => e.extractionType).join(', ')}`);
      }

      if (doc.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(doc);
    } catch (error) {
      console.error("Error fetching document analysis:", error);
      res.status(500).json({ message: "Failed to fetch document analysis" });
    }
  });

  (async () => {
    try {
      console.log("Checking for documents stuck in 'processing' state...");
      // Get all documents and filter stuck ones (processing for more than 10 minutes)
      const allDocs = await storage.getDocuments("mock-user-id-123");
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const stuckDocuments = allDocs.filter(
        (doc) => doc.status === "processing" && new Date(doc.uploadDate) < tenMinutesAgo
      );

      if (stuckDocuments.length > 0) {
        console.log(
          `Found ${stuckDocuments.length} stuck document(s). Restarting processing...`
        );

        for (const doc of stuckDocuments) {
          try {
            const docId = (doc as any)._id?.toString();

            if (!docId) {
              console.error(
                `- Reprocessing failed: Document with original name '${doc.originalName}' has no ID.`
              );
              continue;
            }

            const filePath = path.join(uploadDir, doc.filename);
            if (fs.existsSync(filePath)) {
              console.log(`- Reprocessing: ${doc.originalName} (ID: ${docId})`);
              await processDocument(docId, filePath);
            } else {
              console.warn(
                `- File not found for document ${docId}. Marking as error.`
              );
              await storage.updateDocument(docId, { status: "error" });
            }
          } catch (error) {
            console.error(
              `Error reprocessing document ${(doc as any).id}:`, error
            );
          }
        }

        console.log("Finished reprocessing stuck documents.");
      } else {
        console.log("No stuck documents found. System is clean.");
      }
    } catch (error) {
      console.error(
        "Error during startup reprocessing of stuck documents:",
        error
      );
    }
  })();

  const httpServer = createServer(app);
  return httpServer;
}

async function processDocument(
  documentId: string,
  filePath: string
): Promise<void> {
  console.log(`Starting to process document ${documentId} at path ${filePath}`);
  try {
    await storage.updateDocument(documentId, {
      status: "processing",
      processingProgress: 10,
      statusMessage: "Starting processing...",
    });

    const ext = path.extname(filePath).toLowerCase();
    const isImage = [".jpg", ".jpeg", ".png", ".webp"].includes(ext);
    let text = "";
    let pageCount = 1;

    const dataBuffer = fs.readFileSync(filePath);

    if (isImage) {
      console.log(`[${documentId}] Analyzing image with AI...`);
      await storage.updateDocument(documentId, { statusMessage: "Analyzing image with AI..." });

      if (isOpenAIConfigured()) {
        text = await analyzeImage(dataBuffer);
      } else if (isGeminiConfigured()) {
        const mimeType = isImage ? `image/${ext.replace(".", "") || "jpeg"}` : "application/pdf";
        text = await analyzeImageWithGemini(dataBuffer, mimeType);
      } else {
        throw new Error("No AI service (OpenAI or Gemini) is configured for image processing.");
      }
      console.log(`[${documentId}] Image analysis complete.`);
      pageCount = 1;
    } else {
      console.log(`[${documentId}] Parsing PDF...`);
      await storage.updateDocument(documentId, { statusMessage: "Parsing PDF..." });
      const pdfData = await pdf(dataBuffer);
      await storage.updateDocument(documentId, { processingProgress: 25, statusMessage: "PDF parsed successfully." });
      console.log(`[${documentId}] PDF parsed successfully.`);

      text = pdfData.text || "";
      pageCount = pdfData.numpages || 1;

      // If PDF contains very little text, it might be a scanned document. Fallback to Gemini OCR.
      if (text.trim().length < 50 && isGeminiConfigured()) {
        console.log(`[${documentId}] PDF appears to be scanned. Performing OCR with Gemini...`);
        await storage.updateDocument(documentId, { statusMessage: "Performing OCR with Gemini..." });
        try {
          text = await analyzeImageWithGemini(dataBuffer, "application/pdf");
          console.log(`[${documentId}] Gemini OCR extraction complete. Length: ${text.length}`);
        } catch (error) {
          console.error(`[${documentId}] Gemini OCR failed, proceeding with empty text:`, error);
        }
      } else {
        console.log(`[${documentId}] Text extraction complete. Length: ${text.length}`);
      }
      
      console.log(`[${documentId}] First 100 chars: ${text.substring(0, 100).replace(/\n/g, ' ')}...`);
    }

    console.log(`[${documentId}] Saving extracted text...`);
    await storage.updateDocument(documentId, { statusMessage: "Saving extracted text..." });
    await storage.createPage({
      documentId,
      pageNumber: 1,
      extractedText: text,
      ocrConfidence: 1.0,
    });
    await storage.updateDocument(documentId, { processingProgress: 40 });
    console.log(`[${documentId}] Extracted text saved.`);

    console.log(`[${documentId}] Running NLP tasks...`);
    await storage.updateDocument(documentId, { statusMessage: "Running NLP analysis..." });
    const [entities, nlpKeywords, tables, stats] = await Promise.all([
      Promise.resolve(extractEntities(text)).catch((e) => {
        console.error(`[${documentId}] Error in extractEntities`, e);
        return [];
      }),
      Promise.resolve(extractKeywordsFromText(text)).catch((e) => {
        console.error(`[${documentId}] Error in extractKeywordsFromText`, e);
        return [];
      }),
      Promise.resolve(extractTablesFromText(text)).catch((e) => {
        console.error(`[${documentId}] Error in extractTablesFromText`, e);
        return [];
      }),
      Promise.resolve(getTextStatistics(text)).catch((e) => {
        console.error(`[${documentId}] Error in getTextStatistics`, e);
        return { wordCount: 0, characterCount: 0 };
      }),
    ]);
    await storage.updateDocument(documentId, { processingProgress: 60, statusMessage: "NLP tasks completed." });
    console.log(`[${documentId}] NLP tasks completed.`);

    const sentences = text
      .split(/[.!?]+/)
      .filter((s: string) => s.trim().length > 20)
      .slice(0, 3);
    const summary =
      sentences.join(". ") + (sentences.length > 0 ? "." : "No summary available.");

    // Group entities by type
    const groupedEntities = {
      persons: Array.isArray(entities) ? entities.filter(e => e.type === 'person').map(e => e.text) : [],
      organizations: Array.isArray(entities) ? entities.filter(e => e.type === 'organization').map(e => e.text) : [],
      locations: Array.isArray(entities) ? entities.filter(e => e.type === 'location').map(e => e.text) : [],
      dates: Array.isArray(entities) ? entities.filter(e => e.type === 'date').map(e => e.text) : [],
      money: Array.isArray(entities) ? entities.filter(e => e.type === 'money').map(e => e.text) : [],
      emails: Array.isArray(entities) ? entities.filter(e => e.type === 'email').map(e => e.text) : [],
      phones: Array.isArray(entities) ? entities.filter(e => e.type === 'phone').map(e => e.text) : [],
    };

    const analysis: DocumentAnalysis = {
      summary,
      keywords: nlpKeywords.slice(0, 15),
      entities: groupedEntities,
      tables,
      statistics: {
        wordCount: stats.wordCount,
        charCount: stats.characterCount,
        sentenceCount: (stats as any).sentenceCount || 0,
        paragraphCount: (stats as any).paragraphCount || 0,
        avgWordsPerSentence: (stats as any).avgWordsPerSentence || 0,
        readingTime: Math.ceil(stats.wordCount / 200) || 1,
      },
    };

    console.log(`[${documentId}] Saving analysis...`);
    console.log(`[${documentId}] Summary length: ${summary.length}`);
    console.log(`[${documentId}] Entities found: ${entities.length}`);
    console.log(`[${documentId}] Tables found: ${tables.length}`);
    console.log(`[${documentId}] Keywords found: ${nlpKeywords.length}`);

    // Save Summary
    await storage.createExtraction({
      documentId,
      extractionType: "summary",
      data: summary,
    });

    // Save Entities
    // Flatten grouped entities into a single list for the frontend
    const flatEntities = [
      ...groupedEntities.persons.map(t => ({ type: 'person', text: t })),
      ...groupedEntities.organizations.map(t => ({ type: 'organization', text: t })),
      ...groupedEntities.locations.map(t => ({ type: 'location', text: t })),
      ...groupedEntities.dates.map(t => ({ type: 'date', text: t })),
      ...groupedEntities.money.map(t => ({ type: 'money', text: t })),
      ...groupedEntities.emails.map(t => ({ type: 'email', text: t })),
      ...groupedEntities.phones.map(t => ({ type: 'phone', text: t })),
    ];

    await storage.createExtraction({
      documentId,
      extractionType: "entities",
      data: flatEntities,
    });

    // Save Tables
    await storage.createExtraction({
      documentId,
      extractionType: "tables",
      data: tables,
    });

    // Save full analysis object for completeness/backup
    await storage.createExtraction({
      documentId,
      extractionType: "analysis",
      data: analysis,
    });
    await storage.updateDocument(documentId, { processingProgress: 80, statusMessage: "Analysis saved." });
    console.log(`[${documentId}] Analysis saved.`);

    if (isGeminiConfigured()) {
      console.log(`[${documentId}] Enhancing with AI (non-blocking)...`);
      await storage.updateDocument(documentId, { statusMessage: "Enhancing with AI..." });

      enhanceAnalysisWithAI(documentId, text).catch((error) => {
        console.error(`[${documentId}] AI enhancement failed:`, error);
      });
      await storage.updateDocument(documentId, { processingProgress: 90 });
    } else {
      await storage.updateDocument(documentId, { processingProgress: 100 });
    }

    await storage.updateDocument(documentId, {
      status: "completed",
      processedAt: new Date(),
      pageCount,
      processingProgress: 100,
      extractedText: text.slice(0, 50000),
      statusMessage: "Processing complete.",
    });
    console.log(`[${documentId}] Processing complete.`);
  } catch (error: any) {
    console.error(`[${documentId}] Error processing document:`, error);
    await storage.updateDocument(documentId, {
      status: "error",
      processingProgress: -1,
      statusMessage: `Error: ${error.message || "Unknown error"}`,
    });
    throw error;
  }
}

async function enhanceAnalysisWithAI(
  documentId: string,
  text: string
): Promise<void> {
  try {
    let summary = "";
    let aiKeywords: string[] = [];
    let aiTables: any[] = [];
    let structuredData = null;

    if (isOpenAIConfigured()) {
      console.log(`[${documentId}] Using OpenAI for enhanced analysis...`);
      structuredData = await analyzeStructuredData(text);
      if (structuredData) {
        summary = structuredData.summary || "";
        // OpenAI doesn't return keywords in this specific call, but we can rely on NLP keywords or add it to prompt.
        // For now, we use local NLP keywords unless we change prompt.
      }
    } else if (isGeminiConfigured()) {
      console.log(`[${documentId}] Using Gemini for enhanced analysis...`);
      [summary, aiKeywords, aiTables, structuredData] = await Promise.all([
        generateDocumentSummary(text),
        extractKeywords(text),
        extractTablesWithAI(text),
        analyzeStructuredDataWithGemini(text)
      ]);
    }

    const existingExtraction = await storage.getExtraction(
      documentId,
      "analysis"
    );

    if (existingExtraction) {
      const analysis = existingExtraction.data as DocumentAnalysis;

      if (summary) {
        analysis.summary = summary;
      }

      if (aiKeywords.length > 0) {
        analysis.keywords = Array.from(
          new Set([...aiKeywords, ...analysis.keywords])
        ).slice(0, 15);
      }

      if (structuredData) {
        analysis.structuredData = structuredData;
      }

      if (aiTables.length > 0) {
        analysis.tables = aiTables;

        // Update the specific "tables" extraction record as well
        const tablesExtraction = await storage.getExtraction(documentId, "tables");
        if (tablesExtraction) {
          await storage.updateExtraction((tablesExtraction as any)._id, aiTables);
        }
      }

      await storage.updateExtraction((existingExtraction as any)._id, analysis);
      console.log(`[${documentId}] Enhanced analysis saved.`);
    }
  } catch (error) {
    console.error(`[${documentId}] AI enhancement failed:`, error);
  }
}
