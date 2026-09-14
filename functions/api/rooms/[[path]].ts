// Cloudflare Pages Function fallback for room state & chat
export const onRequest: PagesFunction = async (context) => {
  const { request } = context;
  const method = request.method;

  if (method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // Return a friendly 200 JSON acknowledging the room action
  return new Response(
    JSON.stringify({
      success: true,
      status: "ok",
      timestamp: Date.now(),
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
};
