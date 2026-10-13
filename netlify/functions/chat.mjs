const allowedOrigins = new Set([
  "https://hyterion.xyz",
  "https://www.hyterion.xyz"
]);

export default async (request) => {
  const origin = request.headers.get("origin") || "";
  const headers = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };

  if (!allowedOrigins.has(origin)) {
    return Response.json({ error: "Origin not allowed." }, { status: 403 });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed." }, { status: 405, headers });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "AI service is not configured." }, { status: 500, headers });
  }

  try {
    const body = await request.json();
    if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 10) {
      return Response.json({ error: "Invalid chat messages." }, { status: 400, headers });
    }

    const valid = body.messages.every(message =>
      message &&
      ["user", "assistant"].includes(message.role) &&
      typeof message.content === "string" &&
      message.content.trim().length > 0 &&
      message.content.length <= 2000
    );
    if (!valid) {
      return Response.json({ error: "Invalid message format." }, { status: 400, headers });
    }

    const apiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        instructions: "You are Neo AI on the Hyterion portfolio website. Be friendly, helpful, concise, and honest. Do not invent facts about the website owner.",
        input: body.messages.map(message => ({ role: message.role, content: message.content })),
        max_output_tokens: 600
      })
    });

    const result = await apiResponse.json();
    if (!apiResponse.ok) {
      console.error("OpenAI API error status:", apiResponse.status);
      return Response.json({ error: "Neo AI is temporarily unavailable." }, { status: 502, headers });
    }

    const reply = (result.output || [])
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text)
      .join("\n")
      .trim();

    if (!reply) {
      return Response.json({ error: "Neo AI returned an empty response." }, { status: 502, headers });
    }

    return Response.json({ reply }, { headers });
  } catch (error) {
    console.error("Neo AI function error:", error.message);
    return Response.json({ error: "Unable to process your message right now." }, { status: 500, headers });
  }
};
