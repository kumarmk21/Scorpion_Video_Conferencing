import { Peer, MediaConnection, DataConnection } from "peerjs";
import { ChatMessage, FloatingReaction } from "../types";

export interface P2PCallbacks {
  onRemoteStream: (peerId: string, name: string, role: "host" | "speaker" | "attendee", stream: MediaStream) => void;
  onRemoteLeave: (peerId: string) => void;
  onRemoteStateChange: (peerId: string, isMuted: boolean, isVideoOff: boolean, isHandRaised: boolean) => void;
  onChatMessage: (msg: ChatMessage) => void;
  onReaction: (rx: FloatingReaction) => void;
  onStatusChange: (status: "connecting" | "connected" | "disconnected") => void;
}

// Reliable STUN servers (Google + Cloudflare) with dynamic TURN relay configuration
let cachedIceServers: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

// Fetch updated backend ICE configuration (e.g. configured TURN relays)
async function getEffectiveIceServers(): Promise<RTCIceServer[]> {
  try {
    const res = await fetch("/api/webrtc/ice-servers");
    if (res.ok) {
      const data = (await res.json()) as { iceServers?: RTCIceServer[] };
      if (Array.isArray(data.iceServers) && data.iceServers.length > 0) {
        cachedIceServers = data.iceServers;
      }
    }
  } catch (e) {
    // Keep default Google / Cloudflare STUN servers
  }
  return cachedIceServers;
}

const MAX_SLOTS = 8;

export class P2PConferenceManager {
  private peer: Peer | null = null;
  private roomId: string;
  private userId: string;
  private userName: string;
  private userRole: "host" | "speaker" | "attendee";
  private localStream: MediaStream | null;
  private callbacks: P2PCallbacks;
  private calls = new Map<string, MediaConnection>();
  private dataConns = new Map<string, DataConnection>();
  private peerProfiles = new Map<string, { name: string; role: "host" | "speaker" | "attendee" }>();
  private currentSlot = 1;
  private isDestroyed = false;
  private scanTimer: any = null;

  constructor(
    roomId: string,
    userId: string,
    userName: string,
    userRole: "host" | "speaker" | "attendee",
    localStream: MediaStream | null,
    callbacks: P2PCallbacks
  ) {
    this.roomId = roomId.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    this.userId = userId;
    this.userName = userName;
    this.userRole = userRole;
    this.localStream = localStream;
    this.callbacks = callbacks;
  }

  private getSlotId(slot: number): string {
    return `scop-${this.roomId}-slot-${slot}`;
  }

  public async start() {
    this.callbacks.onStatusChange("connecting");
    await getEffectiveIceServers();
    this.tryClaimSlot(1);
  }

  private tryClaimSlot(slot: number) {
    if (this.isDestroyed) return;
    if (slot > MAX_SLOTS) {
      // If all standard slots are in use, use random hash slot
      this.initPeer(`scop-${this.roomId}-${this.userId.slice(-6)}`, -1);
      return;
    }

    this.currentSlot = slot;
    const targetId = this.getSlotId(slot);
    this.initPeer(targetId, slot);
  }

  private initPeer(myId: string, slotIndex: number) {
    if (this.isDestroyed) return;

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {}
      this.peer = null;
    }

    const peer = new Peer(myId, {
      config: {
        iceServers: cachedIceServers,
        iceTransportPolicy: "all",
      },
    });

    this.peer = peer;

    peer.on("open", (id) => {
      if (this.isDestroyed || this.peer !== peer) return;
      console.log(`[P2P] Claimed slot ${slotIndex} as ID: ${id}`);
      this.callbacks.onStatusChange("connected");

      // Scan and connect to all other slots
      this.scanOtherSlots();

      // Maintain active mesh connections via heartbeat
      this.scanTimer = setInterval(() => {
        if (!this.isDestroyed) {
          this.scanOtherSlots();
        }
      }, 4000);
    });

    // Handle incoming calls (video + audio)
    peer.on("call", (call) => {
      if (this.isDestroyed || this.peer !== peer) return;
      console.log("[P2P] Incoming call from peer:", call.peer);

      // Answer with our localStream
      if (this.localStream) {
        call.answer(this.localStream);
      } else {
        // @ts-ignore
        call.answer();
      }

      this.setupCallHandlers(call);
    });

    // Handle incoming data channel (presence, chat, reactions)
    peer.on("connection", (conn) => {
      if (this.isDestroyed || this.peer !== peer) return;
      console.log("[P2P] Incoming data connection from:", conn.peer);
      this.setupDataHandlers(conn);
    });

    peer.on("error", (err: any) => {
      if (this.isDestroyed || this.peer !== peer) return;
      console.warn("[P2P] Notice on slot attempt:", err?.type || err);

      // If slot ID is already taken, try next slot
      if (err?.type === "unavailable-id" && slotIndex > 0) {
        console.log(`[P2P] Slot ${slotIndex} busy, trying slot ${slotIndex + 1}...`);
        this.tryClaimSlot(slotIndex + 1);
      }
    });

    peer.on("disconnected", () => {
      if (!this.isDestroyed && this.peer === peer) {
        try {
          this.peer.reconnect();
        } catch (e) {}
      }
    });
  }

  private scanOtherSlots() {
    if (!this.peer || this.peer.destroyed || this.isDestroyed) return;

    for (let s = 1; s <= MAX_SLOTS; s++) {
      if (s === this.currentSlot) continue;
      const targetPeerId = this.getSlotId(s);

      // Connect if data connection or media call is not yet established
      const needsData = !this.dataConns.has(targetPeerId);
      const needsMedia = !this.calls.has(targetPeerId);

      if (needsData || needsMedia) {
        // Deterministic connection: higher slot or -1 calls lower slot, or slot 1 retries if needed
        if (this.currentSlot > s || this.currentSlot === -1 || (this.currentSlot === 1 && !this.calls.has(targetPeerId) && this.dataConns.has(targetPeerId))) {
          this.connectToPeer(targetPeerId);
        }
      }
    }
  }

  private connectToPeer(remotePeerId: string) {
    if (!this.peer || this.peer.destroyed || this.isDestroyed) return;

    // 1. Initiate Data Channel if not already open
    if (!this.dataConns.has(remotePeerId)) {
      try {
        const conn = this.peer.connect(remotePeerId, {
          reliable: true,
          metadata: {
            name: this.userName,
            role: this.userRole,
            userId: this.userId,
          },
        });
        if (conn) {
          this.setupDataHandlers(conn);
        }
      } catch (e) {
        console.warn("[P2P] Data connect error:", e);
      }
    }

    // 2. Initiate Media Call if localStream is available and not already calling
    if (this.localStream && !this.calls.has(remotePeerId)) {
      try {
        console.log("[P2P] Initiating media call with stream tracks:", this.localStream.getTracks().map(t => t.kind), "to", remotePeerId);
        const call = this.peer.call(remotePeerId, this.localStream, {
          metadata: {
            name: this.userName,
            role: this.userRole,
            userId: this.userId,
          },
        });
        if (call) {
          this.setupCallHandlers(call);
        }
      } catch (e) {
        console.warn("[P2P] Call error:", e);
      }
    }
  }

  private setupCallHandlers(call: MediaConnection) {
    this.calls.set(call.peer, call);

    const handleRemoteStream = (remoteStream: MediaStream) => {
      console.log("[P2P] Active remote media stream from:", call.peer, "tracks:", remoteStream.getTracks().map(t => `${t.kind}:${t.readyState}`));
      const meta = (call.metadata as any) || {};
      const profile = this.peerProfiles.get(call.peer) || {
        name: meta.name || (call.peer.includes("-1") ? "Host" : "Participant"),
        role: meta.role || "attendee",
      };

      this.callbacks.onRemoteStream(call.peer, profile.name, profile.role, remoteStream);
    };

    call.on("stream", (remoteStream) => {
      handleRemoteStream(remoteStream);
    });

    // Also attach directly to RTCPeerConnection ontrack for sub-track resilience
    // @ts-ignore
    const pc: RTCPeerConnection | undefined = call.peerConnection;
    if (pc) {
      pc.ontrack = (event) => {
        console.log("[P2P] RTCPeerConnection ontrack event:", event.track.kind, "from peer:", call.peer);
        const stream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
        handleRemoteStream(stream);
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`[P2P] ICE state with ${call.peer}:`, pc.iceConnectionState);
        if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
          console.warn(`[P2P] ICE state '${pc.iceConnectionState}' with ${call.peer}, attempting ICE restart...`);
          try {
            // @ts-ignore
            if (typeof pc.restartIce === "function") {
              pc.restartIce();
            }
          } catch (e) {}
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(`[P2P] Connection state with ${call.peer}:`, pc.connectionState);
        if (pc.connectionState === "failed") {
          console.warn(`[P2P] Connection failed with ${call.peer}`);
        }
      };
    }

    call.on("close", () => {
      console.log("[P2P] Call disconnected:", call.peer);
      this.calls.delete(call.peer);
      this.callbacks.onRemoteLeave(call.peer);
    });

    call.on("error", (err) => {
      console.warn("[P2P] Call error:", call.peer, err);
      this.calls.delete(call.peer);
    });
  }

  private setupDataHandlers(conn: DataConnection) {
    this.dataConns.set(conn.peer, conn);

    conn.on("open", () => {
      console.log("[P2P] Data channel open with:", conn.peer);
      // Announce profile immediately
      conn.send({
        type: "presence",
        userId: this.userId,
        name: this.userName,
        role: this.userRole,
      });

      // If we have a localStream and haven't called this peer yet, call them
      if (this.localStream && !this.calls.has(conn.peer) && this.peer) {
        try {
          const call = this.peer.call(conn.peer, this.localStream, {
            metadata: {
              name: this.userName,
              role: this.userRole,
              userId: this.userId,
            },
          });
          if (call) {
            this.setupCallHandlers(call);
          }
        } catch (e) {}
      }
    });

    conn.on("data", (data: any) => {
      try {
        if (!data || typeof data !== "object") return;

        if (data.type === "presence") {
          this.peerProfiles.set(conn.peer, {
            name: data.name || "Participant",
            role: data.role || "attendee",
          });
          // Update active call metadata if stream already connected
          const activeCall = this.calls.get(conn.peer);
          if (activeCall) {
            const remoteStream = (activeCall as any).remoteStream;
            if (remoteStream) {
              this.callbacks.onRemoteStream(conn.peer, data.name, data.role, remoteStream);
            }
          }
        } else if (data.type === "chat" && data.message) {
          this.callbacks.onChatMessage(data.message);
        } else if (data.type === "reaction" && data.reaction) {
          this.callbacks.onReaction(data.reaction);
        } else if (data.type === "state_change") {
          this.callbacks.onRemoteStateChange(
            conn.peer,
            Boolean(data.isMuted),
            Boolean(data.isVideoOff),
            Boolean(data.isHandRaised)
          );
        }
      } catch (err) {
        console.warn("[P2P] Data handle notice:", err);
      }
    });

    conn.on("close", () => {
      this.dataConns.delete(conn.peer);
      this.peerProfiles.delete(conn.peer);
    });
  }

  public broadcastChat(msg: ChatMessage) {
    this.dataConns.forEach((conn) => {
      if (conn.open) {
        conn.send({ type: "chat", message: msg });
      }
    });
  }

  public broadcastReaction(rx: FloatingReaction) {
    this.dataConns.forEach((conn) => {
      if (conn.open) {
        conn.send({ type: "reaction", reaction: rx });
      }
    });
  }

  public broadcastState(isMuted: boolean, isVideoOff: boolean, isHandRaised: boolean) {
    this.dataConns.forEach((conn) => {
      if (conn.open) {
        conn.send({
          type: "state_change",
          isMuted,
          isVideoOff,
          isHandRaised,
        });
      }
    });
  }

  public updateLocalStream(newStream: MediaStream) {
    this.localStream = newStream;

    // Update tracks on all active peer connections
    this.calls.forEach((call) => {
      // @ts-ignore
      const pc: RTCPeerConnection | undefined = call.peerConnection;
      if (pc) {
        try {
          const senders = pc.getSenders();
          newStream.getTracks().forEach((track) => {
            const sender = senders.find((s) => s.track?.kind === track.kind);
            if (sender) {
              sender.replaceTrack(track).catch(() => {});
            } else {
              try {
                pc.addTrack(track, newStream);
              } catch (e) {}
            }
          });
        } catch (e) {}
      }
    });

    // Call any connected data peers who don't have an active media call yet
    this.dataConns.forEach((conn, peerId) => {
      if (!this.calls.has(peerId) && this.peer && !this.isDestroyed) {
        try {
          const call = this.peer.call(peerId, newStream, {
            metadata: {
              name: this.userName,
              role: this.userRole,
              userId: this.userId,
            },
          });
          if (call) {
            this.setupCallHandlers(call);
          }
        } catch (e) {}
      }
    });
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    this.calls.forEach((call) => {
      try {
        call.close();
      } catch (e) {}
    });
    this.calls.clear();
    this.dataConns.forEach((conn) => {
      try {
        conn.close();
      } catch (e) {}
    });
    this.dataConns.clear();
    this.peerProfiles.clear();

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {}
      this.peer = null;
    }
  }
}
