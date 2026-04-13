import { convert } from "html-to-text";

/**
 * Extract plain text from a file buffer based on its mime type / extension.
 * Returns null if the file type isn't supported or extraction fails.
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<string | null> {
  const name = fileName.toLowerCase();

  try {
    // Plain text formats
    if (
      mimeType === "text/plain" ||
      mimeType === "text/csv" ||
      mimeType === "text/markdown" ||
      name.endsWith(".txt") ||
      name.endsWith(".md") ||
      name.endsWith(".csv")
    ) {
      return buffer.toString("utf-8");
    }

    // HTML
    if (mimeType === "text/html" || name.endsWith(".html") || name.endsWith(".htm")) {
      return convert(buffer.toString("utf-8"), { wordwrap: false });
    }

    // PDF — import the library implementation file directly to avoid
    // pdf-parse's index.js test-file bug that breaks serverless bundling
    if (mimeType === "application/pdf" || name.endsWith(".pdf")) {
      const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
      const data = await pdfParse(buffer);
      return data.text;
    }

    // DOCX (Word)
    if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      name.endsWith(".docx")
    ) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    // XLSX / XLS (Excel)
    if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimeType === "application/vnd.ms-excel" ||
      name.endsWith(".xlsx") ||
      name.endsWith(".xls")
    ) {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const texts: string[] = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        if (csv.trim()) {
          texts.push(`[Sheet: ${sheetName}]\n${csv}`);
        }
      }
      return texts.join("\n\n");
    }

    // PPTX (PowerPoint) — extract text from the XML structure
    if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      name.endsWith(".pptx")
    ) {
      // PPTX is a zip with XML files — use JSZip which is small
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(buffer);
      const slideFiles = Object.keys(zip.files).filter(
        (f) => f.startsWith("ppt/slides/slide") && f.endsWith(".xml")
      );
      const texts: string[] = [];
      for (const file of slideFiles) {
        const xml = await zip.files[file].async("string");
        // Extract text between <a:t> tags
        const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
        const slideText = matches
          .map((m) => m.replace(/<[^>]+>/g, ""))
          .join(" ");
        if (slideText.trim()) texts.push(slideText);
      }
      return texts.join("\n\n");
    }

    // DOC (legacy Word) — not supported without heavy dependencies
    if (mimeType === "application/msword" || name.endsWith(".doc")) {
      return null;
    }

    return null;
  } catch (err) {
    console.error(`Extract failed for ${fileName}:`, err);
    return null;
  }
}
