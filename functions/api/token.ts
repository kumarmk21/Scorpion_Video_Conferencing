import { AccessToken } from "livekit-server-sdk";

interface Env {
  LIVEKIT_API_KEY?: string;
  LIVEKIT_API_SECRET?: string;
  LIVEKIT_URL?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    const body = (await request.json()) as {
      roomName?: string;
      participantName?: string;
      participantId?: string;
    };

    const roomName = body.roomName;
    const participantName = body.participantName || "Guest User";
    const participantId = body.participantId || participantName;

    if (!roomName) {
      return new Response(JSON.stringify({ error: "roomName is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = env.LIVEKIT_API_KEY;
    const apiSecret = env.LIVEKIT_API_SECRET;
    const livekitUrl = env.LIVEKIT_URL || "wss://omnimeet-gm23xe8u.livekit.cloud";

    if (!apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({
          configured: false,
          message: "LiveKit API Key or Secret not configured in Cloudflare Pages environment variables.",
          livekitUrl,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantId,
      name: participantName,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return new Response(
      JSON.stringify({
        configured: true,
        token,
        livekitUrl,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Internal token generation error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
