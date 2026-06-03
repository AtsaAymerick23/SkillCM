const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Mode = "business_plan" | "roadmap" | "profit_planner";

const SCHEMAS: Record<Mode, unknown> = {
  business_plan: {
    type: "object",
    properties: {
      summary: { type: "string" },
      problem: { type: "string" },
      solution: { type: "string" },
      target_market: { type: "string" },
      value_proposition: { type: "string" },
      revenue_model: { type: "string" },
      go_to_market: { type: "string" },
      competition: { type: "string" },
      key_risks: { type: "array", items: { type: "string" } },
      next_steps: { type: "array", items: { type: "string" } },
    },
    required: [
      "summary", "problem", "solution", "target_market",
      "value_proposition", "revenue_model", "go_to_market",
      "competition", "key_risks", "next_steps",
    ],
    additionalProperties: false,
  },
  roadmap: {
    type: "object",
    properties: {
      vision: { type: "string" },
      phases: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            timeframe: { type: "string" },
            goals: { type: "array", items: { type: "string" } },
            milestones: { type: "array", items: { type: "string" } },
          },
          required: ["name", "timeframe", "goals", "milestones"],
          additionalProperties: false,
        },
      },
    },
    required: ["vision", "phases"],
    additionalProperties: false,
  },
  profit_planner: {
    type: "object",
    properties: {
      currency: { type: "string" },
      monthly_revenue_estimate: { type: "number" },
      monthly_costs: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            amount: { type: "number" },
          },
          required: ["label", "amount"],
          additionalProperties: false,
        },
      },
      total_monthly_costs: { type: "number" },
      monthly_profit: { type: "number" },
      break_even_units: { type: "number" },
      assumptions: { type: "array", items: { type: "string" } },
      advice: { type: "array", items: { type: "string" } },
    },
    required: [
      "currency", "monthly_revenue_estimate", "monthly_costs",
      "total_monthly_costs", "monthly_profit", "break_even_units",
      "assumptions", "advice",
    ],
    additionalProperties: false,
  },
};

const SYSTEM: Record<Mode, (lang: string) => string> = {
  business_plan: (lang) =>
    `You are a startup advisor for Cameroonian youth entrepreneurs. Produce a concise, realistic business plan adapted to the Cameroon market (FCFA currency, mobile-money, local distribution). Respond in ${lang === "fr" ? "French" : "English"}.`,
  roadmap: (lang) =>
    `You are a product strategist for a young Cameroonian founder. Produce a 12-month execution roadmap broken into 3-4 phases. Be specific and achievable. Respond in ${lang === "fr" ? "French" : "English"}.`,
  profit_planner: (lang) =>
    `You are a financial coach for Cameroonian micro-entrepreneurs. Estimate monthly costs, revenue and break-even in FCFA. Be realistic and conservative. Respond in ${lang === "fr" ? "French" : "English"}.`,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, inputs, lang = "en" } = await req.json();
    if (!mode || !SCHEMAS[mode as Mode]) {
      return new Response(JSON.stringify({ error: "Invalid mode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const userPrompt = `Inputs from the entrepreneur:\n${JSON.stringify(inputs, null, 2)}\n\nReturn ONLY the structured result.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM[mode as Mode](lang) },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_result",
            description: "Submit the structured result",
            parameters: SCHEMAS[mode as Mode],
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_result" } },
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded, try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in workspace settings." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, txt);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;
    let output: unknown = null;
    if (args) {
      try { output = typeof args === "string" ? JSON.parse(args) : args; }
      catch { output = null; }
    }
    if (!output) {
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ output }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("startup-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
