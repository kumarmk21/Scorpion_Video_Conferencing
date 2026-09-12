import { Room, RoomEvent, RemoteParticipant, RemoteTrackPublication, RemoteTrack, VideoPresets } from "livekit-client";
import { Participant } from "../types";

export interface LiveKitConnectionState {
  isConfigured: boolean;
  isConnected: boolean;
  error: string | null;
  serverUrl: string | null;
}

export async function fetchLiveKitToken(
  roomName: string,
  participantName: string,
  participantId: string
): Promise<{ token?: string; livekitUrl?: string; configured: boolean; message?: string }> {
  // Try both endpoints (Cloudflare Pages function /api/token and Express /api/livekit/token)
  try {
    const res = await fetch("/api/livekit/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomName, participantName, participantId }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // Fallback to /api/token if on Cloudflare Pages
  }

  try {
    const res = await fetch("/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomName, participantName, participantId }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Failed to reach token endpoint:", e);
  }

  return {
    configured: false,
    message: "Could not connect to LiveKit token generator endpoint.",
  };
}

export function createLiveKitRoom(): Room {
  return new Room({
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: {
      resolution: VideoPresets.h720.resolution,
    },
  });
}
