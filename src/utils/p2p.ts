import { Peer, MediaConnection, DataConnection } from "peerjs";
import { Participant, ChatMessage, FloatingReaction } from "../types";

export interface P2PCallbacks {
  onRemoteStream: (peerId: string, name: string, role: "host" | "speaker" | "attendee", stream: MediaStream) => void;
  onRemoteLeave: (peerId: string) => void;
  onRemoteStateChange: (peerId: string, isMuted: boolean, isVideoOff: boolean, isHandRaised: boolean) => void;
  onChatMessage: (msg: ChatMessage) => void;
  onReaction: (rx: FloatingReaction) => void;
  onStatusChange: (status: "connecting" | "connected" | "disconnected") => void;
}

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
  private isDestroyed = false;
  private retryTimer: any = null;

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

  public async start() {
    this.callbacks.onStatusChange("connecting");

    const hostPeerId = `omni-${this.roomId}-host`;
    const attendeePeerId = `omni-${this.roomId}-${this.userId.slice(-6)}`;

    // If joining as host, try host ID first
    const primaryId = this.userRole === "host" ? hostPeerId : attendeePeerId;

    this.initPeer(primaryId, hostPeerId);
  }

  private initPeer(myId: string, hostPeerId: string) {
    if (this.isDestroyed) return;

    // Use Google free public STUN servers for highest global connectivity & NAT traversal
    this.peer = new Peer(myId, {
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
          { urls: "stun:stun.services.mozilla.com" },
        ],
      },
    });

    this.peer.on("open", (id) => {
      console.log("[P2P] Peer open with ID:", id);
      this.callbacks.onStatusChange("connected");

      // If we are an attendee, call the host
      if (id !== hostPeerId) {
        this.connectToPeer(hostPeerId);
        // Start retry timer in case host joins a few seconds after attendee
        this.retryTimer = setInterval(() => {
          if (!this.calls.has(hostPeerId) && !this.isDestroyed) {
            console.log("[P2P] Retrying connection to host...", hostPeerId);
            this.connectToPeer(hostPeerId);
          } else if (this.calls.has(hostPeerId)) {
            clearInterval(this.retryTimer);
          }
        }, 3000);
      }
    });

    // Handle incoming calls
    this.peer.on("call", (call) => {
      console.log("[P2P] Received incoming call from:", call.peer);
      const callOptions = this.localStream ? { stream: this.localStream } : undefined;
      // @ts-ignore
      call.answer(this.localStream || undefined);

      this.setupCallHandlers(call);
    });

    // Handle incoming data connections (chat, emojis, hand-raises)
    this.peer.on("connection", (conn) => {
      console.log("[P2P] Received data connection from:", conn.peer);
      this.setupDataHandlers(conn);
    });

    this.peer.on("error", (err: any) => {
      console.warn("[P2P] Peer notice:", err?.type || err);

      // If host ID is already taken and we tried host ID, fallback to attendee ID
      if (err?.type === "unavailable-id" && myId === hostPeerId) {
        const fallbackId = `omni-${this.roomId}-${this.userId.slice(-6)}`;
        console.log("[P2P] Host ID in use, joining as peer:", fallbackId);
        this.peer?.destroy();
        this.initPeer(fallbackId, hostPeerId);
      }
    });

    this.peer.on("disconnected", () => {
      console.log("[P2P] Peer disconnected, attempting reconnect...");
      if (!this.isDestroyed) {
        this.peer?.reconnect();
      }
    });
  }

  private connectToPeer(remotePeerId: string) {
    if (!this.peer || this.isDestroyed || this.calls.has(remotePeerId)) return;

    console.log("[P2P] Calling remote peer:", remotePeerId);

    // 1. Establish Media Call (Audio & Video)
    if (this.localStream) {
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
    }

    // 2. Establish Data Channel (Chat & Reactions)
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
  }

  private setupCallHandlers(call: MediaConnection) {
    this.calls.set(call.peer, call);

    call.on("stream", (remoteStream) => {
      console.log("[P2P] Received remote stream from:", call.peer);
      const meta = (call.metadata as any) || {};
      const remoteName = meta.name || (call.peer.includes("host") ? "Host" : "Attendee");
      const remoteRole = meta.role || "speaker";

      this.callbacks.onRemoteStream(call.peer, remoteName, remoteRole, remoteStream);
    });

    call.on("close", () => {
      console.log("[P2P] Call closed for:", call.peer);
      this.calls.delete(call.peer);
      this.callbacks.onRemoteLeave(call.peer);
    });

    call.on("error", (err) => {
      console.warn("[P2P] Call error for:", call.peer, err);
      this.calls.delete(call.peer);
    });
  }

  private setupDataHandlers(conn: DataConnection) {
    this.dataConns.set(conn.peer, conn);

    conn.on("open", () => {
      console.log("[P2P] Data connection open with:", conn.peer);
      // Announce our presence & name
      conn.send({
        type: "presence",
        userId: this.userId,
        name: this.userName,
        role: this.userRole,
      });
    });

    conn.on("data", (data: any) => {
      try {
        if (data.type === "chat" && data.message) {
          this.callbacks.onChatMessage(data.message);
        } else if (data.type === "reaction" && data.reaction) {
          this.callbacks.onReaction(data.reaction);
        } else if (data.type === "state_change") {
          this.callbacks.onRemoteStateChange(
            conn.peer,
            data.isMuted,
            data.isVideoOff,
            data.isHandRaised
          );
        }
      } catch (err) {
        console.warn("[P2P] Data receive notice:", err);
      }
    });

    conn.on("close", () => {
      this.dataConns.delete(conn.peer);
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
    // Update active calls with new stream tracks
    this.calls.forEach((call) => {
      // @ts-ignore
      if (call.peerConnection) {
        // @ts-ignore
        const senders = call.peerConnection.getSenders();
        newStream.getTracks().forEach((track) => {
          const sender = senders.find((s: any) => s.track?.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track);
          }
        });
      }
    });
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.retryTimer) clearInterval(this.retryTimer);
    this.calls.forEach((call) => call.close());
    this.calls.clear();
    this.dataConns.forEach((conn) => conn.close());
    this.dataConns.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}
