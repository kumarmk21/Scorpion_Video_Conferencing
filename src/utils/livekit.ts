import { Room, RoomEvent, RemoteParticipant, RemoteTrackPublication, RemoteTrack, VideoPresets } from "livekit-client";
import { Participant } from "../types";

export interface LiveKitConnectionState {
  isConfigured: boolean;
  isConnected: boolean;
  error: string | null;
  serverUrl: string | null;
}

export async function checkLiveKitStatus(): Promise<{
  configured: boolean;
  valid: boolean;
  livekitUrl?: string;
  error?: string;
  hint?: string;
}> {
  try {
    const res = await fetch("/api/livekit/status");
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Failed to check LiveKit status:", e);
  }
  return { configured: false, valid: false };
}

export async function fetchLiveKitToken(
  roomName: string,
  participantName: string,
  participantId: string,
  role: "host" | "speaker" | "attendee" = "attendee"
): Promise<{
  token?: string;
  livekitUrl?: string;
  configured: boolean;
  message?: string;
  error?: string;
  hint?: string;
  role?: string;
  expiresIn?: number;
}> {
  const safeRoom = (roomName && roomName.trim()) || "corp-strategy-room";
  const safeName = (participantName && participantName.trim()) || (participantId ? `User-${participantId.slice(-4)}` : "Guest");
  const safeId = participantId || `u-${Date.now()}`;

  const payload = {
    roomName: safeRoom,
    participantName: safeName,
    participantId: safeId,
    role,
  };

  // Try Express /api/livekit/token first
  try {
    const res = await fetch("/api/livekit/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // Fallback
  }

  try {
    const res = await fetch("/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

// LiveKit Egress - Meeting Recording Controls
export async function startLiveKitRecording(roomName: string): Promise<{
  success: boolean;
  status?: string;
  egressId?: string;
  filepath?: string;
  notice?: string;
  error?: string;
}> {
  try {
    const res = await fetch("/api/livekit/egress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", roomName }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to start LiveKit recording" };
  }
}

export async function stopLiveKitRecording(roomName: string, egressId?: string): Promise<{
  success: boolean;
  status?: string;
  error?: string;
}> {
  try {
    const res = await fetch("/api/livekit/egress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stop", roomName, egressId }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to stop LiveKit recording" };
  }
}

export async function getLiveKitRecordingStatus(roomName: string): Promise<{
  isRecording: boolean;
  session: { egressId: string; roomName: string; startedAt: number; status: string } | null;
}> {
  try {
    const res = await fetch(`/api/livekit/egress?roomName=${encodeURIComponent(roomName)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // Ignore status check errors
  }
  return { isRecording: false, session: null };
}

// LiveKit Moderator Controls (RoomService)
export async function moderateParticipant(
  roomName: string,
  action: "mute" | "mute_all" | "remove",
  participantId?: string,
  trackSid?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/livekit/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomName, action, participantId, trackSid }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to execute moderation action" };
  }
}

