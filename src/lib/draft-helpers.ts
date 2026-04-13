import { convert } from "html-to-text";
import { getAnthropicClient } from "./anthropic";
import { getSupabaseAdmin } from "./supabase";
import { searchDocuments } from "./embeddings";

// --- Tone Profile ---

export async function getOrCreateToneProfile(
  accessToken: string
): Promise<string> {
  const supabase = getSupabaseAdmin();

  // Check for cached non-expired profile
  const { data: cached } = await supabase
    .from("tone_profiles")
    .select("profile_text")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (cached?.profile_text) return cached.profile_text;

  // Fetch 30 sent emails from Graph
  const sentRes = await fetch(
    "https://graph.microsoft.com/v1.0/me/mailFolders/sentItems/messages?$top=30&$select=subject,body,toRecipients&$orderby=sentDateTime desc",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!sentRes.ok) throw new Error("Failed to fetch sent emails");
  const sentData = await sentRes.json();
  const sentEmails = sentData.value || [];

  const samples = sentEmails.map((e: any, i: number) => {
    const body = e.body?.content
      ? convert(e.body.content, { wordwrap: false }).substring(0, 500)
      : "";
    const to = (e.toRecipients || [])
      .map((r: any) => r.emailAddress?.address)
      .join(", ");
    return `[${i + 1}] To: ${to}\nSubject: ${e.subject}\n${body}`;
  });

  const claude = getAnthropicClient();
  const response = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: `You are analyzing a professional's writing style from their sent emails.
Extract a concise tone profile that captures:
1. FORMALITY_LEVEL: How formal/casual
2. GREETING_STYLE: How they open emails
3. SIGN_OFF_STYLE: How they close
4. SENTENCE_STRUCTURE: Short/direct or longer
5. VOCABULARY_PATTERNS: Characteristic phrases
6. TONE_MARKERS: Warm/cold, assertive/deferential
7. RESPONSE_LENGTH: Typically short (1-3 sentences), medium, or long

Output a JSON object with these 7 keys. Be specific, cite examples. Under 400 words.`,
    messages: [
      {
        role: "user",
        content: `Analyze the writing style from these ${samples.length} sent emails:\n\n${samples.join("\n\n---\n\n")}`,
      },
    ],
  });

  const profileText =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Compute hash from subjects for cache busting
  const hash = sentEmails
    .map((e: any) => e.subject || "")
    .join("|")
    .substring(0, 200);

  await supabase.from("tone_profiles").insert({
    profile_text: profileText,
    sample_count: sentEmails.length,
    hash,
  });

  return profileText;
}

// --- Thread Fetching ---

export async function fetchEmailThread(
  accessToken: string,
  conversationId: string
): Promise<string> {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?$filter=conversationId eq '${conversationId}'&$select=subject,from,body,receivedDateTime&$orderby=receivedDateTime desc&$top=10`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) return "(Could not load thread)";
  const data = await res.json();
  const messages = data.value || [];

  return messages
    .map((m: any) => {
      const body = m.body?.content
        ? convert(m.body.content, { wordwrap: false }).substring(0, 600)
        : "";
      const from = m.from?.emailAddress?.address || "unknown";
      const date = m.receivedDateTime || "";
      return `From: ${from}\nDate: ${date}\nSubject: ${m.subject}\n${body}`;
    })
    .join("\n\n---\n\n");
}

// --- Draft Generation ---

export async function generateDraftReply(params: {
  threadText: string;
  toneProfile: string;
  subject: string;
  sender: string;
  documentContext?: string;
}): Promise<string> {
  const claude = getAnthropicClient();

  let contextSection = "";
  if (params.documentContext) {
    contextSection = `\n\nRELEVANT DOCUMENTS FROM ONEDRIVE:\n${params.documentContext}\n\nUse this context if it helps you draft a more accurate reply. Do not mention that you found this in documents.`;
  }

  const response = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 800,
    system: `You are drafting an email reply on behalf of a hospitality executive.
Match the writing tone profile below EXACTLY. Do not add disclaimers.
Do not mention you are an AI. Write as if you ARE this person.

TONE PROFILE:
${params.toneProfile}

RULES:
- Match the greeting and sign-off style from the profile
- Match the typical response length
- Be actionable: if the email asks a question, answer it; if it requests something, confirm or delegate
- If you cannot determine a factual answer, write a plausible placeholder marked with [PLACEHOLDER: what info is needed]
- Do NOT include the quoted original email in your reply
- Output ONLY the reply body text, no subject line
- Keep it concise — most replies should be under 150 words${contextSection}`,
    messages: [
      {
        role: "user",
        content: `FULL EMAIL THREAD (newest first):\n---\n${params.threadText}\n---\n\nDraft a reply to the most recent message from ${params.sender} about "${params.subject}".`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

// --- OneDrive Context via RAG ---

export async function getRelevantDocContext(
  subject: string,
  sender: string
): Promise<string | undefined> {
  try {
    const query = `${subject} ${sender}`;
    const results = await searchDocuments(query, 3, 0.65);

    if (results.length === 0) return undefined;

    return results
      .map(
        (r, i) =>
          `[Doc ${i + 1}: ${r.document_name}]\n${r.content.substring(0, 400)}`
      )
      .join("\n\n");
  } catch {
    // RAG is optional — if index doesn't exist yet, skip silently
    return undefined;
  }
}

// --- Full Pipeline ---

export async function generateDraftForEmail(params: {
  accessToken: string;
  messageId: string;
  subject: string;
  sender: string;
  conversationId: string;
}): Promise<{ draftBody: string; docContext?: string }> {
  // Run tone profile and thread fetch in parallel
  const [toneProfile, threadText] = await Promise.all([
    getOrCreateToneProfile(params.accessToken),
    fetchEmailThread(params.accessToken, params.conversationId),
  ]);

  // RAG lookup for relevant docs
  const docContext = await getRelevantDocContext(params.subject, params.sender);

  // Generate the draft
  const draftBody = await generateDraftReply({
    threadText,
    toneProfile,
    subject: params.subject,
    sender: params.sender,
    documentContext: docContext,
  });

  return { draftBody, docContext };
}
