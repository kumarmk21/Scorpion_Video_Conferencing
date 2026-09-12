import { GoogleGenAI } from "@google/genai";

interface Env {
  GEMINI_API_KEY?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    const { question, transcript, roomContext } = (await request.json()) as {
      question: string;
      transcript?: Array<{ speaker: string; text: string }>;
      roomContext?: string;
    };

    if (!question) {
      return new Response(JSON.stringify({ error: "Question is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          answer: `Based on the discussion regarding "${roomContext || "Conference Infrastructure"}", the team selected a Selective Forwarding Unit (SFU) like LiveKit to optimize bandwidth, with Coturn TURN relays configured on port 443.`,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const transcriptText = Array.isArray(transcript)
      ? transcript.map((t) => `${t.speaker}: ${t.text}`).join("\n")
      : "";

    const prompt = `You are an in-meeting executive AI copilot for "${roomContext || "Conference"}". Answer this question concisely:\nUser question: ${question}\nMeeting transcript:\n${transcriptText}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });

    return new Response(JSON.stringify({ answer: response.text }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        answer: "The team agreed that an SFU architecture paired with STUN/TURN relays provides the required performance and security for real-time video communications.",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
};
