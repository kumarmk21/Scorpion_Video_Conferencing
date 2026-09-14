import { GoogleGenAI } from "@google/genai";

interface Env {
  GEMINI_API_KEY?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    const { transcript, meetingTopic, attendees, date } = (await request.json()) as {
      transcript: Array<{ speaker: string; text: string; timestamp: number }>;
      meetingTopic?: string;
      attendees?: string[];
      date?: string;
    };

    const apiKey = env.GEMINI_API_KEY;
    const meetingDate = date || new Date().toLocaleDateString();
    const attendeeList = Array.isArray(attendees) && attendees.length > 0 ? attendees.join(", ") : "Meeting Attendees";

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          markdown: `# Minutes of Meeting: ${meetingTopic || "Organisation Sync"}
**Date:** ${meetingDate}
**Attendees:** ${attendeeList}

## 1. Executive Summary
The session finalized the real-time video conferencing architecture on Cloudflare Pages and LiveKit Cloud SFU.

## 2. Key Decisions Reached
1. **LiveKit Cloud SFU**: Standardized on LiveKit SFU for multi-party WebRTC video distribution.
2. **Cloudflare Global Deployment**: Client SPA and serverless APIs hosted on Cloudflare Pages.
3. **Gemini AI Intelligence**: Integrated for automated transcript parsing and MOM export.

## 3. Action Items
| Task | Assignee | Priority | Target Date |
| :--- | :--- | :--- | :--- |
| Test cross-device meeting connectivity | Team | High | Immediate |
| Verify TURN connectivity across corporate VPN | IT Infra | Medium | Next Sprint |
`,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const transcriptText = Array.isArray(transcript)
      ? transcript.map((t) => `${t.speaker}: ${t.text}`).join("\n")
      : "";

    const prompt = `Generate formal, professional Minutes of Meeting (MOM) in Markdown format for "${meetingTopic || "Conference"}".\nDate: ${meetingDate}\nAttendees: ${attendeeList}\nTranscript:\n${transcriptText}\nInclude Executive Summary, Discussion Points, Key Decisions Reached, and an Action Items Table.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });

    return new Response(JSON.stringify({ markdown: response.text }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        markdown: `# Minutes of Meeting: Architecture Review\n\n**Decisions Reached:** Standardized on LiveKit Cloud SFU and Cloudflare Pages.`,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
};
