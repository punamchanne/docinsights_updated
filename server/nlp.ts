import type { ExtractedEntity, ExtractedTable } from "@shared/mongo-schema";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const nlp = require("compromise");

export function extractEntities(text: string): ExtractedEntity[] {
  const doc = nlp(text);
  const entities: ExtractedEntity[] = [];
  const seen = new Set<string>();

  try {
    // Extract people
    doc.people().forEach((person: any) => {
      const text = person.text().trim();
      if (text && text.length > 2 && !seen.has(text.toLowerCase())) {
        seen.add(text.toLowerCase());
        entities.push({
          type: "person",
          text,
          confidence: 0.8,
        });
      }
    });
  } catch (e) {
    console.warn("Failed to extract people:", e);
  }

  try {
    // Extract organizations
    doc.organizations().forEach((org: any) => {
      const text = org.text().trim();
      if (text && text.length > 2 && !seen.has(text.toLowerCase())) {
        seen.add(text.toLowerCase());
        entities.push({
          type: "organization",
          text,
          confidence: 0.75,
        });
      }
    });
  } catch (e) {
    console.warn("Failed to extract organizations:", e);
  }

  try {
    // Extract places/locations
    doc.places().forEach((place: any) => {
      const text = place.text().trim();
      if (text && text.length > 2 && !seen.has(text.toLowerCase())) {
        seen.add(text.toLowerCase());
        entities.push({
          type: "location",
          text,
          confidence: 0.7,
        });
      }
    });
  } catch (e) {
    console.warn("Failed to extract places:", e);
  }

  try {
    // Extract dates - check if dates() method exists
    if (typeof (doc as any).dates === 'function') {
      (doc as any).dates().forEach((date: any) => {
        const text = date.text().trim();
        if (text && !seen.has(text.toLowerCase())) {
          seen.add(text.toLowerCase());
          entities.push({
            type: "date",
            text,
            confidence: 0.85,
          });
        }
      });
    }
  } catch (e) {
    console.warn("Failed to extract dates:", e);
  }

  try {
    // Extract money/values - check if money() method exists
    if (typeof (doc as any).money === 'function') {
      (doc as any).money().forEach((money: any) => {
        const text = money.text().trim();
        if (text && !seen.has(text.toLowerCase())) {
          seen.add(text.toLowerCase());
          entities.push({
            type: "money",
            text,
            confidence: 0.9,
          });
        }
      });
    }
  } catch (e) {
    console.warn("Failed to extract money:", e);
  }

  try {
    // Extract email addresses using regex
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailRegex) || [];
    emails.forEach((email) => {
      if (!seen.has(email.toLowerCase())) {
        seen.add(email.toLowerCase());
        entities.push({
          type: "email",
          text: email,
          confidence: 0.95,
        });
      }
    });
  } catch (e) {
    console.warn("Failed to extract emails:", e);
  }

  try {
    // Extract phone numbers using regex
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const phones = text.match(phoneRegex) || [];
    phones.forEach((phone) => {
      if (!seen.has(phone.toLowerCase())) {
        seen.add(phone.toLowerCase());
        entities.push({
          type: "phone",
          text: phone,
          confidence: 0.85,
        });
      }
    });
  } catch (e) {
    console.warn("Failed to extract phones:", e);
  }

  return entities;
}

export function extractKeywordsFromText(text: string): string[] {
  const doc = nlp(text);
  const keywords: string[] = [];
  const seen = new Set<string>();

  // Get nouns and noun phrases
  doc.nouns().forEach((noun: any) => {
    const word = noun.text().toLowerCase().trim();
    if (word && word.length > 3 && !seen.has(word)) {
      seen.add(word);
      keywords.push(word);
    }
  });

  // Get topics/subjects
  doc.topics().forEach((topic: any) => {
    const word = topic.text().toLowerCase().trim();
    if (word && word.length > 3 && !seen.has(word)) {
      seen.add(word);
      keywords.push(word);
    }
  });

  // Sort by frequency in text and return top keywords
  const wordCounts = new Map<string, number>();
  keywords.forEach((word) => {
    // Escape special regex characters to avoid regex syntax errors
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
      const count = (text.match(new RegExp(escapedWord, "gi")) || []).length;
      wordCounts.set(word, count);
    } catch (e) {
      // If regex fails, just set count to 1
      wordCounts.set(word, 1);
    }
  });

  return keywords
    .sort((a, b) => (wordCounts.get(b) || 0) - (wordCounts.get(a) || 0))
    .slice(0, 15);
}

export function extractTablesFromText(text: string): ExtractedTable[] {
  const tables: ExtractedTable[] = [];

  // Look for simple table-like patterns in text
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);

  // console.log('[Table Extraction] Processing lines:', lines);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line looks like a table row
    const hasTabs = (line.match(/\t/g) || []).length >= 1;
    const hasPipes = (line.match(/\|/g) || []).length >= 2;
    const hasMultipleSpaces = /\s{2,}/.test(line);

    // Split by appropriate delimiter
    let cells: string[] = [];
    if (hasPipes) {
      cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    } else if (hasTabs) {
      cells = line.split("\t").map((c) => c.trim()).filter(Boolean);
    } else if (hasMultipleSpaces) {
      cells = line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
    } else {
      // Don't split by single spaces as it creates too many false positives
      continue;
    }

    // console.log(`[Table Extraction] Line ${i}: "${line}" -> ${cells.length} cells:`, cells);

    // If this line has multiple cells (4+ for header to be safe), check if next lines also have cells
    if (cells.length >= 4 && i + 1 < lines.length) {
      // console.log(`[Table Extraction] Potential table header found at line ${i}`);
      const table: ExtractedTable = {
        headers: cells,
        rows: [],
        confidence: 0.7,
      };

      // Look for data rows after the header
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j];

        // Try all delimiters for row
        let rowCells: string[] = [];
        if (hasPipes) {
          rowCells = nextLine.split("|").map((c) => c.trim()).filter(Boolean);
        } else if (hasTabs) {
          rowCells = nextLine.split("\t").map((c) => c.trim()).filter(Boolean);
        } else if (hasMultipleSpaces) {
          rowCells = nextLine.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
        } else {
          // For rows, if it doesn't have multiple spaces, it's likely not part of the table anymore
          break;
        }

        // console.log(`[Table Extraction] Checking row ${j}: "${nextLine}" -> ${rowCells.length} cells:`, rowCells);

        // Add row if it has at least 3 cells (to match table structure and avoid regular text)
        if (rowCells.length >= 3) {
          table.rows.push(rowCells);
          // console.log(`[Table Extraction] Added row ${j} to table`);
        } else {
          // No more rows - end of table
          // console.log(`[Table Extraction] End of table at line ${j}`);
          break;
        }
      }

      // Only add table if it has at least 1 data row
      if (table.rows.length > 0) {
        // console.log(`[Table Extraction] Table found with ${table.rows.length} rows`);
        tables.push(table);
        i += table.rows.length; // Skip processed lines
      } else {
        // console.log(`[Table Extraction] No data rows found, skipping table`);
      }
    }
  }

  // console.log(`[Table Extraction] Total tables found: ${tables.length}`);
  return tables;
}

export function getTextStatistics(text: string): { wordCount: number; characterCount: number } {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return {
    wordCount: words.length,
    characterCount: text.length,
  };
}
