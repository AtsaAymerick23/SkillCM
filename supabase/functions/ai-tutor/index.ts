import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { courseId, lang = "en" } = body;
    const incomingMessages: { role: "user" | "assistant"; content: string }[] =
      Array.isArray(body.messages) && body.messages.length
        ? body.messages
        : body.question
        ? [{ role: "user", content: String(body.question) }]
        : [];
    if (!courseId || incomingMessages.length === 0) {
      return new Response(JSON.stringify({ error: "Missing courseId or messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: course } = await supabase
      .from("courses")
      .select("title,title_fr,description,description_fr")
      .eq("id", courseId)
      .maybeSingle();

    const { data: lessons } = await supabase
      .from("lessons")
      .select("id,position,title,title_fr,content,content_fr")
      .eq("course_id", courseId)
      .order("position");

    if (!course || !lessons?.length) {
      return new Response(JSON.stringify({ error: "Course not found or empty" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const courseTitle = lang === "fr" ? course.title_fr ?? course.title : course.title;

    const lessonContext = lessons
      .map((l) => {
        const t = lang === "fr" ? l.title_fr ?? l.title : l.title;
        const c = lang === "fr" ? l.content_fr ?? l.content : l.content;
        return `[Lesson ${l.position}] ${t}\n${c ?? ""}`;
      })
      .join("\n\n");

    const systemPrompt = `You are an AI tutor for the course "${courseTitle}" on Cameroon's National Digital Skills Portal. ${
      lang === "fr" ? "Réponds en français." : "Answer in English."
    }
Use ONLY the lesson materials below to answer. If the answer is not in the materials, say so honestly.
Be concise, friendly and practical.

After your answer, output a CITATIONS block on a new line in this EXACT format (one per line, max 4 citations), with the verbatim short excerpt that supports your answer (no longer than 25 words):
<<CITATIONS>>
- Lesson <N> :: <verbatim excerpt copied from that lesson>
<<END>>

LESSON MATERIALS:
${lessonContext}`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...incomingMessages.slice(-12),
        ],
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded, try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in workspace settings." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, txt);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const raw: string = aiJson.choices?.[0]?.message?.content ?? "";

    // Split out citations block
    const blockMatch = raw.match(/<<CITATIONS>>([\s\S]*?)<<END>>/);
    const answer = (blockMatch ? raw.slice(0, blockMatch.index).trim() : raw).trim();

    const citations: { id: string; position: number; title: string; excerpt: string }[] = [];
    if (blockMatch) {
      const lines = blockMatch[1].split("\n").map((s) => s.trim()).filter(Boolean);
      for (const line of lines) {
        const m = line.match(/Lesson\s+(\d+)\s*::\s*(.+)/i);
        if (!m) continue;
        const pos = Number(m[1]);
        const excerpt = m[2].replace(/^["“]|["”]$/g, "").trim();
        const lesson = lessons.find((l) => l.position === pos);
        if (!lesson) continue;
        citations.push({
          id: lesson.id,
          position: lesson.position,
          title: lang === "fr" ? lesson.title_fr ?? lesson.title : lesson.title,
          excerpt,
        });
      }
    }

    // Fallback: if no citations parsed, infer from "Lesson N" mentions in answer
    if (!citations.length) {
      const cited = [...answer.matchAll(/Lesson\s+(\d+)/gi)].map((m) => Number(m[1]));
      lessons
        .filter((l) => cited.includes(l.position))
        .forEach((l) =>
          citations.push({
            id: l.id,
            position: l.position,
            title: lang === "fr" ? l.title_fr ?? l.title : l.title,
            excerpt: "",
          })
        );
    }

    return new Response(JSON.stringify({ answer, citations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-tutor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
