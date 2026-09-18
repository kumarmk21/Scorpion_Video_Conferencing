import { RoomServiceClient } from "livekit-server-sdk";

interface Env {
  LIVEKIT_API_KEY?: string;
  LIVEKIT_API_SECRET?: string;
  LIVEKIT_URL?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    const body = (await request.json()) as {
      roomName: string;
      action: "mute" | "mute_all" | "remove" | "update_permissions";
      participantId?: string;
      trackSid?: string;
      permissions?: {
        canPublish?: boolean;
        canSubscribe?: boolean;
        canPublishData?: boolean;
      };
    };

    const { roomName, action, participantId, trackSid, permissions } = body;

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
          success: false,
          error: "LiveKit API Key or Secret not configured in environment.",
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const httpUrl = livekitUrl.replace("wss://", "https://").replace("ws://", "http://");
    const svc = new RoomServiceClient(httpUrl, apiKey, apiSecret);

    if (action === "mute" && participantId) {
      if (trackSid) {
        await svc.mutePublishedTrack(roomName, participantId, trackSid, true);
      } else {
        // Find audio tracks for this participant
        const participants = await svc.listParticipants(roomName);
        const target = participants.find((p) => p.identity === participantId);
        if (target) {
          for (const track of target.tracks) {
            if (track.type === 0 /* AUDIO */) {
              await svc.mutePublishedTrack(roomName, participantId, track.sid, true).catch(console.warn);
            }
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: "mute",
          participantId,
          roomName,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } else if (action === "mute_all") {
      const participants = await svc.listParticipants(roomName);
      let mutedCount = 0;

      for (const p of participants) {
        // Skip host if known or check role
        for (const track of p.tracks) {
          if (track.type === 0 /* AUDIO */ && !track.muted) {
            await svc.mutePublishedTrack(roomName, p.identity, track.sid, true).catch(console.warn);
            mutedCount++;
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: "mute_all",
          mutedTracks: mutedCount,
          roomName,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } else if (action === "remove" && participantId) {
      await svc.removeParticipant(roomName, participantId);
      return new Response(
        JSON.stringify({
          success: true,
          action: "remove",
          participantId,
          roomName,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } else if (action === "update_permissions" && participantId && permissions) {
      await svc.updateParticipant(roomName, participantId, {
        permission: permissions,
      });

      return new Response(
        JSON.stringify({
          success: true,
          action: "update_permissions",
          participantId,
          permissions,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action or missing required participantId" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Internal LiveKit moderation error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
