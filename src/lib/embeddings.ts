import OpenAI from "openai";
import { getSupabaseAdmin } from "./supabase";

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAI();
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.substring(0, 8000),
  });
  return res.data[0].embedding;
}

export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const openai = getOpenAI();
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts.map((t) => t.substring(0, 8000)),
  });
  return res.data.map((d) => d.embedding);
}

export async function searchDocuments(
  query: string,
  matchCount = 5,
  matchThreshold = 0.7
): Promise<
  {
    id: string;
    content: string;
    document_name: string;
    document_path: string;
    similarity: number;
  }[]
> {
  const embedding = await generateEmbedding(query);
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: embedding,
    match_count: matchCount,
    match_threshold: matchThreshold,
  });

  if (error) {
    console.error("Vector search error:", error);
    return [];
  }

  return data || [];
}
