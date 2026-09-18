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
      role?: "host" | "speaker" | "attendee";
    };

    const roomName = (body.roomName && body.roomName.trim()) || "corp-strategy-room";
    const participantName = (body.participantName && body.participantName.trim()) || "Guest User";
    const participantId = body.participantId || `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const role = body.role || "attendee";
    const isHost = role === "host";

    const apiKey = env.LIVEKIT_API_KEY;
    const apiSecret = env.LIVEKIT_API_SECRET;
    const livekitUrl = env.LIVEKIT_URL || "wss://omnimeet-gm23xe8u.livekit.cloud";

    if (!apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({
          configured: false,
          message: "LiveKit API Key or Secret not configured in Cloudflare environment variables.",
          livekitUrl,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generate short-lived participant access token (6-hour TTL)
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantId,
      name: participantName,
      ttl: "6h",
      metadata: JSON.stringify({
        role,
        name: participantName,
        joinedAt: Date.now(),
      }),
    });

    // Grant audio, video, screen share, data channel, and host controls
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: isHost,
      roomRecord: isHost,
    });

    const token = await at.toJwt();

    return new Response(
      JSON.stringify({
        configured: true,
        token,
        livekitUrl,
        roomName,
        participantName,
        participantId,
        role,
        expiresIn: 21600, // 6 hours
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

