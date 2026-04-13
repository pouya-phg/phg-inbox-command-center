import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, isAuthorized } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateEmbeddings } from "@/lib/embeddings";
import { extractText } from "@/lib/extract-text";

export const maxDuration = 300;

const INDEXABLE_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "text/plain",
  "text/csv",
  "text/markdown",
  "text/html",
]);

const INDEXABLE_EXTENSIONS = /\.(pdf|docx?|xlsx?|pptx?|txt|md|csv|html?)$/i;

function chunkText(text: string, chunkSize = 500, overlap = 100): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.trim().length > 20) chunks.push(chunk);
  }
  return chunks;
}

async function getFileContent(
  accessToken: string,
  itemId: string,
  mimeType: string,
  fileName: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}/content`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) return null;

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return await extractText(buffer, mimeType, fileName);
  } catch (err) {
    console.error(`Fetch failed for ${fileName}:`, err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || !isAuthorized(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = session.accessToken;
  if (!accessToken) {
    return NextResponse.json({ error: "No access token" }, { status: 401 });
  }

  const { folder } = await req.json().catch(() => ({ folder: null }));
  const supabase = getSupabaseAdmin();

  // Update status
  await supabase
    .from("index_state")
    .update({ status: "running" })
    .not("id", "is", null);

  const startTime = Date.now();
  let totalDocs = 0;
  let totalChunks = 0;
  let nextLink: string | null = folder
    ? `https://graph.microsoft.com/v1.0/me/drive/root:/${folder}:/children?$top=100&$select=id,name,file,parentReference,size,lastModifiedDateTime`
    : `https://graph.microsoft.com/v1.0/me/drive/root/children?$top=100&$select=id,name,file,parentReference,size,lastModifiedDateTime`;

  // BFS through OneDrive
  const folderQueue: string[] = [];

  while (nextLink && Date.now() - startTime < 260000) {
    const currentUrl: string = nextLink;
    const res: Response = await fetch(currentUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) break;
    const data = await res.json();
    const items = data.value || [];

    for (const item of items) {
      // Queue subfolders
      if (item.folder) {
        folderQueue.push(item.id);
        continue;
      }

      // Skip non-indexable files
      const mime = item.file?.mimeType || "";
      const name = item.name || "";
      if (!INDEXABLE_TYPES.has(mime) && !name.match(INDEXABLE_EXTENSIONS)) continue;
      if (item.size > 50 * 1024 * 1024) continue; // Skip files > 50MB

      const path =
        item.parentReference?.path?.replace("/drive/root:", "") + "/" + name;

      // Check if already indexed
      const { data: existing } = await supabase
        .from("documents")
        .select("id")
        .eq("drive_item_id", item.id)
        .single();

      if (existing) continue;

      // Try to extract text content
      const content = await getFileContent(accessToken, item.id, mime, name);

      if (!content || content.length < 50) {
        // Store metadata only (no chunks)
        await supabase.from("documents").upsert(
          {
            drive_item_id: item.id,
            name,
            path,
            mime_type: mime,
            size: item.size,
            modified_at: item.lastModifiedDateTime,
            chunk_count: 0,
          },
          { onConflict: "drive_item_id" }
        );
        totalDocs++;
        continue;
      }

      // Chunk and embed
      const chunks = chunkText(content);
      if (chunks.length === 0) continue;

      // Insert document
      const { data: doc } = await supabase
        .from("documents")
        .upsert(
          {
            drive_item_id: item.id,
            name,
            path,
            mime_type: mime,
            size: item.size,
            modified_at: item.lastModifiedDateTime,
            chunk_count: chunks.length,
          },
          { onConflict: "drive_item_id" }
        )
        .select("id")
        .single();

      if (!doc) continue;

      // Generate embeddings in batches of 20
      for (let i = 0; i < chunks.length; i += 20) {
        const batch = chunks.slice(i, i + 20);
        try {
          const embeddings = await generateEmbeddings(batch);
          const rows = batch.map((content, j) => ({
            document_id: doc.id,
            chunk_index: i + j,
            content,
            embedding: JSON.stringify(embeddings[j]),
            token_count: content.split(/\s+/).length,
          }));
          await supabase.from("document_chunks").insert(rows);
          totalChunks += batch.length;
        } catch (e) {
          console.error("Embedding error:", e);
        }
      }

      totalDocs++;
    }

    nextLink = data["@odata.nextLink"] || null;

    // If no more items in current folder, process next queued folder
    if (!nextLink && folderQueue.length > 0) {
      const folderId = folderQueue.shift()!;
      nextLink = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children?$top=100&$select=id,name,file,parentReference,size,lastModifiedDateTime`;
    }
  }

  // Update state
  await supabase
    .from("index_state")
    .update({
      last_indexed_at: new Date().toISOString(),
      total_documents: totalDocs,
      total_chunks: totalChunks,
      status: "idle",
    })
    .not("id", "is", null);

  return NextResponse.json({
    status: "complete",
    documents: totalDocs,
    chunks: totalChunks,
    elapsed_ms: Date.now() - startTime,
  });
}
