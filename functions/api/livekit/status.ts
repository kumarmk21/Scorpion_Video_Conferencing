import { RoomServiceClient } from "livekit-server-sdk";

interface Env {
  LIVEKIT_API_KEY?: string;
  LIVEKIT_API_SECRET?: string;
  LIVEKIT_URL?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const apiKey = env.LIVEKIT_API_KEY;
  const apiSecret = env.LIVEKIT_API_SECRET;
  const livekitUrl = env.LIVEKIT_URL || "wss://omnimeet-gm23xe8u.livekit.cloud";

  if (!apiKey || !apiSecret) {
    return new Response(
      JSON.stringify({
        configured: false,
        valid: false,
        livekitUrl,
        error: "LIVEKIT_API_KEY or LIVEKIT_API_SECRET missing in Cloudflare environment.",
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const httpUrl = livekitUrl.replace("wss://", "https://").replace("ws://", "http://");
    const svc = new RoomServiceClient(httpUrl, apiKey, apiSecret);
    const probePromise = svc.listRooms();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("LiveKit Cloud probe timed out (3.5s)")), 3500)
    );
    await Promise.race([probePromise, timeoutPromise]);

    return new Response(
      JSON.stringify({
        configured: true,
        valid: true,
        livekitUrl,
        status: "connected",
        managedInfrastructure: "LiveKit Cloud (cloud.livekit.io)",
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        configured: true,
        valid: false,
        livekitUrl,
        error: err?.message || "Failed to authenticate with LiveKit Cloud SFU",
        hint: err?.message?.includes("invalid API key")
          ? "The configured LIVEKIT_API_KEY or LIVEKIT_API_SECRET does not match your LiveKit Cloud project."
          : undefined,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
