import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { CATEGORY_IDS, isCategory } from "../lib/categories";
import type { Category } from "../types/category";
import type { ColumnMapping, MappingField } from "../types/mapping";

const MODEL = "claude-sonnet-4-6";
const MAPPING_FIELDS: MappingField[] = ["date", "merchant", "amount", "ignore"];

const columnMappingSchema = {
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,
    required: ["source", "sample", "field", "confidence"],
    properties: {
      source: { type: "string" },
      sample: { type: "string" },
      field: { type: "string", enum: MAPPING_FIELDS },
      // The structured-output API rejects minimum/maximum on number types;
      // confidence is clamped to [0,1] in mapColumns() instead.
      confidence: { type: "number" },
    },
  },
} as const;

const classificationSchema = {
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,
    required: ["category"],
    properties: {
      category: { type: "string", enum: CATEGORY_IDS },
    },
  },
} as const;

interface ParsedMessage<T> {
  parsed_output?: T;
  content?: Array<{ type: string; text?: string }>;
}

type RawColumnMapping = Partial<ColumnMapping>;
type RawClassification = { category?: string };

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required.");
  }

  return new Anthropic({ apiKey });
}

export async function mapColumns(headers: string[], sampleRows: string[][]): Promise<ColumnMapping[]> {
  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 1024,
    system:
      "Map card statement CSV columns. Return one item per input header in the same order. Use field date, merchant, amount, or ignore only.",
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          headers,
          sampleRows,
        }),
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: columnMappingSchema,
      },
    },
  });

  const parsed = readStructuredOutput<RawColumnMapping[]>(response);

  return headers.map((header, index) => {
    const candidate = parsed[index] ?? {};
    const field = isMappingField(candidate.field) ? candidate.field : "ignore";
    const confidence = typeof candidate.confidence === "number" ? clamp(candidate.confidence, 0, 1) : 0;
    const sample = typeof candidate.sample === "string" ? candidate.sample : firstSample(sampleRows, index);

    return {
      source: header,
      sample,
      field,
      confidence,
    };
  });
}

export async function classifyTransactions(
  txs: { date: string; merchant: string; amount: number }[],
): Promise<{ category: Category }[]> {
  if (txs.length === 0) {
    return [];
  }

  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: Math.max(512, txs.length * 16),
    system:
      "Classify each transaction into the provided fixed category enum only. Return one item per transaction in the same order.",
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          categories: CATEGORY_IDS,
          transactions: txs,
        }),
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: classificationSchema,
      },
    },
  });

  const parsed = readStructuredOutput<RawClassification[]>(response);

  return txs.map((_, index) => {
    const category = parsed[index]?.category;

    return {
      category: typeof category === "string" && isCategory(category) ? category : "etc",
    };
  });
}

function readStructuredOutput<T>(response: unknown): T {
  const message = response as ParsedMessage<T>;

  if (message.parsed_output !== undefined) {
    return message.parsed_output;
  }

  const text = message.content?.find((block) => block.type === "text" && typeof block.text === "string")?.text;

  if (!text) {
    throw new Error("Claude response did not include structured output.");
  }

  return JSON.parse(text) as T;
}

function isMappingField(value: unknown): value is MappingField {
  return typeof value === "string" && MAPPING_FIELDS.includes(value as MappingField);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function firstSample(rows: string[][], index: number): string {
  return rows.find((row) => typeof row[index] === "string" && row[index].trim() !== "")?.[index]?.trim() ?? "";
}
