interface Env {
  GEMINI_API_KEY?: string;
  LIVEKIT_API_KEY?: string;
  LIVEKIT_API_SECRET?: string;
  LIVEKIT_URL?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  return new Response(
    JSON.stringify({
      status: "ok",
      platform: "cloudflare-pages",
      aiConfigured: Boolean(env.GEMINI_API_KEY),
      livekitConfigured: Boolean(env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET),
      livekitUrl: env.LIVEKIT_URL || "wss://omnimeet-gm23xe8u.livekit.cloud",
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
};
