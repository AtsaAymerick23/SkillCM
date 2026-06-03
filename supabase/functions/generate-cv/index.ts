// Generate polished CV summary and cover letter using Lovable AI
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, profile, opportunity } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    const profileBlock = `
Name: ${profile?.full_name ?? ""}
Professional title: ${profile?.headline ?? ""}
Email: ${profile?.email ?? ""}
Phone: ${profile?.phone ?? ""}
Location: ${[profile?.city, profile?.country].filter(Boolean).join(", ")}
Target role: ${profile?.target_role ?? ""}
Bio: ${profile?.bio ?? ""}
Key project summary: ${profile?.key_project_summary ?? ""}
Skills: ${(profile?.skills ?? []).join(", ")}
Education: ${JSON.stringify(profile?.education ?? [])}
Experience: ${JSON.stringify(profile?.experience ?? [])}
Links: ${JSON.stringify(profile?.links ?? [])}
`.trim();

    let system = "";
    let user = "";

    if (mode === "cover_letter") {
      const recipient = opportunity?.organization || profile?.cover_letter_recipient || "Hiring Manager";
      const role = opportunity?.title || profile?.target_role || "the position";
      system = "You are an expert career coach writing concise, professional cover letters for Cameroonian youth seeking jobs, internships and grants. Output plain text only, ready to print. Keep it under 350 words.";
      user = `Write a tailored cover letter addressed to ${recipient} for the role: ${role}.
${opportunity?.description ? `Opportunity description:\n${opportunity.description}\n` : ""}
Use this candidate profile:
${profileBlock}

Structure: greeting, 1 hook paragraph, 1-2 paragraphs of relevance with concrete skills/projects, closing with call to action and signature line "Sincerely, <Name>".`;
    } else {
      // cv summary / bio rewrite
      system = "You are an expert CV writer. Produce a polished CV summary (3-4 sentences) plus a bulleted Key Achievements list (3-5 bullets), based on the candidate's data. Output plain text only.";
      user = `Rewrite this candidate's profile into a strong professional summary and key achievements bullets.

${profileBlock}

Format:
SUMMARY:
<paragraph>

KEY ACHIEVEMENTS:
- bullet
- bullet
- bullet`;
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit reached, please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in workspace settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${resp.status} ${text}`);
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
