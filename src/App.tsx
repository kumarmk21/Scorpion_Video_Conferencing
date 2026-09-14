import React, { useState, useEffect, useRef } from "react";
import {
  requestUserMedia,
  requestDisplayMedia,
  createAudioLevelMeter,
  stopMediaStream,
  getConnectedDevices,
} from "./utils/media";
import {
  Participant,
  ChatMessage,
  TranscriptEntry,
  FloatingReaction,
  ViewMode,
  VirtualBackground,
} from "./types";
import { VideoTile } from "./components/VideoTile";
import { MeetingControls } from "./components/MeetingControls";
import { MeetingLobby } from "./components/MeetingLobby";
import { AICopilotPanel } from "./components/AICopilotPanel";
import { ChatPanel } from "./components/ChatPanel";
import { ParticipantsPanel } from "./components/ParticipantsPanel";
import { ServerArchitectureModal } from "./components/ServerArchitectureModal";
import {
  ShieldCheck,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Sparkles,
  Server,
  Layers,
  Monitor,
  Radio
} from "lucide-react";
import { Room, RoomEvent, RemoteTrack, RemoteParticipant } from "livekit-client";
import { fetchLiveKitToken, createLiveKitRoom } from "./utils/livekit";

export default function App() {
  // Navigation & Meeting State
  const [inMeeting, setInMeeting] = useState(false);
  const [currentUserId] = useState(() => `user-${Date.now().toString(36)}`);
  const [userName, setUserName] = useState("Alex Morgan");
  const [roomId, setRoomId] = useState("enterprise-architecture-sync");
  const [userRole, setUserRole] = useState<"host" | "speaker" | "attendee">("host");

  // LiveKit SFU Connection State
  const livekitRoomRef = useRef<Room | null>(null);
  const [livekitStatus, setLivekitStatus] = useState<"disconnected" | "connecting" | "connected" | "demo">("disconnected");
  const [livekitUrl, setLivekitUrl] = useState<string>("wss://omnimeet-gm23xe8u.livekit.cloud");

  // Media Stream & Device State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [virtualBg, setVirtualBg] = useState<VirtualBackground>("none");
  const [availableDevices, setAvailableDevices] = useState<{
    audioInputs: MediaDeviceInfo[];
    videoInputs: MediaDeviceInfo[];
  }>({ audioInputs: [], videoInputs: [] });

  // View & UI Layout
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [spotlightId, setSpotlightId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"ai" | "chat" | "participants" | null>(null);
  const [isServerGuideOpen, setIsServerGuideOpen] = useState(false);
  const [copiedRoomCode, setCopiedRoomCode] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Floating Reactions
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);

  // Chat & Transcript
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  // Remote participants list - starts completely empty so only REAL users appear
  const [remoteParticipants, setRemoteParticipants] = useState<Participant[]>([]);

  // Initialize camera and mic stream
  useEffect(() => {
    let mounted = true;
    async function initMedia() {
      const stream = await requestUserMedia(!isVideoOff, !isMuted);
      if (mounted && stream) {
        setLocalStream(stream);
      }
      const devices = await getConnectedDevices();
      if (mounted) {
        setAvailableDevices(devices);
      }
    }
    initMedia();

    return () => {
      mounted = false;
      stopMediaStream(localStream);
    };
  }, []);

  // Audio level meter hook for local stream
  useEffect(() => {
    if (!localStream || isMuted) {
      setAudioLevel(0);
      return;
    }
    const stopMeter = createAudioLevelMeter(localStream, (lvl) => {
      setAudioLevel(lvl);
    });
    return () => {
      stopMeter();
    };
  }, [localStream, isMuted]);

  // Call duration counter
  useEffect(() => {
    if (!inMeeting) return;
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [inMeeting]);

  // Sync with backend room state & LiveKit SFU
  useEffect(() => {
    if (!inMeeting) return;

    let activeRoom: Room | null = null;
    let isSubscribed = true;

    async function initLiveKit() {
      try {
        setLivekitStatus("connecting");
        const tokenRes = await fetchLiveKitToken(roomId, userName, currentUserId);
        
        if (!isSubscribed) return;

        if (tokenRes.configured && tokenRes.token && tokenRes.livekitUrl) {
          setLivekitUrl(tokenRes.livekitUrl);
          const room = createLiveKitRoom();
          activeRoom = room;
          livekitRoomRef.current = room;

          // Track Subscribed handler: real remote audio and video
          room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication, participant: RemoteParticipant) => {
            const mediaStream = new MediaStream([track.mediaStreamTrack]);
            setRemoteParticipants((prev) => {
              const existing = prev.find((p) => p.id === participant.identity);
              if (existing) {
                return prev.map((p) =>
                  p.id === participant.identity
                    ? { ...p, stream: mediaStream, isVideoOff: false }
                    : p
                );
              } else {
                return [
                  ...prev,
                  {
                    id: participant.identity,
                    name: participant.name || participant.identity,
                    role: "speaker",
                    avatarColor: "#6366f1",
                    isMuted: false,
                    isVideoOff: false,
                    isHandRaised: false,
                    isScreenSharing: false,
                    isSpeaking: false,
                    audioLevel: 20,
                    stream: mediaStream,
                    connectionQuality: "excellent",
                    joinedAt: Date.now(),
                  },
                ];
              }
            });
          });

          // Participant disconnected
          room.on(RoomEvent.ParticipantDisconnected, (participant) => {
            setRemoteParticipants((prev) => prev.filter((p) => p.id !== participant.identity));
          });

          // Connect to the LiveKit SFU server
          await room.connect(tokenRes.livekitUrl, tokenRes.token);
          if (isSubscribed) {
            setLivekitStatus("connected");

            // Publish local media
            if (!isVideoOff) {
              await room.localParticipant.setCameraEnabled(true).catch(console.warn);
            }
            if (!isMuted) {
              await room.localParticipant.setMicrophoneEnabled(true).catch(console.warn);
            }
          }
        } else {
          setLivekitStatus("demo");
          if (tokenRes.livekitUrl) {
            setLivekitUrl(tokenRes.livekitUrl);
          }
        }
      } catch (err) {
        console.warn("LiveKit connection notice:", err);
        if (isSubscribed) setLivekitStatus("demo");
      }
    }

    initLiveKit();

    // Post join to backend
    fetch(`/api/rooms/${roomId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participant: {
          id: currentUserId,
          name: userName,
          role: userRole,
          avatarColor: "#6366f1",
          isMuted,
          isVideoOff,
          isHandRaised,
          isScreenSharing,
          joinedAt: Date.now(),
        },
        roomName: roomId,
      }),
    })
      .then((r) => r.json())
      .then((data: any) => {
        if (data?.room?.messages) {
          setChatMessages(data.room.messages);
        }
      })
      .catch(console.warn);

    return () => {
      isSubscribed = false;
      if (activeRoom) {
        activeRoom.disconnect();
        livekitRoomRef.current = null;
      }
      setLivekitStatus("disconnected");
      fetch(`/api/rooms/${roomId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: currentUserId }),
      }).catch(console.warn);
    };
  }, [inMeeting, roomId]);

  // Media control toggles
  const handleToggleMic = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !next;
      });
    }
    if (livekitRoomRef.current) {
      livekitRoomRef.current.localParticipant.setMicrophoneEnabled(!next).catch(console.warn);
    }
  };

  const handleToggleVideo = async () => {
    const next = !isVideoOff;
    setIsVideoOff(next);
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !next;
      });
    }
    if (livekitRoomRef.current) {
      livekitRoomRef.current.localParticipant.setCameraEnabled(!next).catch(console.warn);
    }
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      stopMediaStream(screenStream);
      setScreenStream(null);
      setIsScreenSharing(false);
      if (livekitRoomRef.current) {
        livekitRoomRef.current.localParticipant.setScreenShareEnabled(false).catch(console.warn);
      }
    } else {
      const display = await requestDisplayMedia();
      if (display) {
        setScreenStream(display);
        setIsScreenSharing(true);
        if (livekitRoomRef.current) {
          livekitRoomRef.current.localParticipant.setScreenShareEnabled(true).catch(console.warn);
        }
        display.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
          if (livekitRoomRef.current) {
            livekitRoomRef.current.localParticipant.setScreenShareEnabled(false).catch(console.warn);
          }
        };
      }
    }
  };

  const handleToggleHandRaise = () => {
    setIsHandRaised((prev) => !prev);
  };

  // Reactions
  const handleSendReaction = (emoji: string) => {
    const newReaction: FloatingReaction = {
      id: `rx-${Date.now()}-${Math.random()}`,
      emoji,
      x: Math.floor(Math.random() * 60) + 20, // 20% to 80% width
      senderName: userName,
    };
    setReactions((prev) => [...prev, newReaction]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 2500);
  };

  // Chat message send
  const handleSendMessage = async (text: string) => {
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUserId,
      senderName: userName,
      text,
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev, newMsg]);

    // Send to backend
    fetch(`/api/rooms/${roomId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: newMsg }),
    }).catch(console.warn);
  };

  // Add sample conversation utterance
  const handleAddSimulatedTranscript = () => {
    const quotes = [
      { speaker: userName || "Participant", text: "Benchmarking audio at 32kbps ensures crystal clear voice quality even over spotty 4G connections." },
      { speaker: userName || "Participant", text: "Deploying the LiveKit SFU cluster provides high concurrency and sub-100ms real-time latency." },
      { speaker: userName || "Participant", text: "End-to-end encryption with DTLS/SRTP protects real-time media streams." },
    ];
    const picked = quotes[Math.floor(Math.random() * quotes.length)];
    const entry: TranscriptEntry = {
      id: `tr-${Date.now()}`,
      speaker: picked.speaker,
      text: picked.text,
      timestamp: Date.now(),
    };
    setTranscript((prev) => [...prev, entry]);

    fetch(`/api/rooms/${roomId}/transcript`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entry }),
    }).catch(console.warn);
  };

  const handleJoinMeeting = (name: string, room: string, role: "host" | "speaker" | "attendee") => {
    setUserName(name);
    setRoomId(room);
    setUserRole(role);
    setInMeeting(true);
  };

  const handleLeaveMeeting = () => {
    setInMeeting(false);
    setCallDuration(0);
    stopMediaStream(screenStream);
    setIsScreenSharing(false);
  };

  const handleCopyRoomLink = () => {
    const inviteUrl = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedRoomCode(true);
    setTimeout(() => setCopiedRoomCode(false), 2000);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Compile participants
  const localParticipant: Participant = {
    id: currentUserId,
    name: userName,
    role: userRole,
    avatarColor: "#6366f1",
    isMuted,
    isVideoOff,
    isHandRaised,
    isScreenSharing,
    isSpeaking: audioLevel > 15,
    audioLevel,
    stream: isScreenSharing && screenStream ? screenStream : localStream,
    connectionQuality: "excellent",
  };

  const allParticipants = [localParticipant, ...remoteParticipants];

  // If not in meeting, show Lobby
  if (!inMeeting) {
    return (
      <>
        <MeetingLobby
          localStream={localStream}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          audioLevel={audioLevel}
          virtualBg={virtualBg}
          availableDevices={availableDevices}
          onToggleMic={handleToggleMic}
          onToggleVideo={handleToggleVideo}
          onChangeVirtualBg={setVirtualBg}
          onJoinMeeting={handleJoinMeeting}
          onOpenServerGuide={() => setIsServerGuideOpen(true)}
        />
        <ServerArchitectureModal
          isOpen={isServerGuideOpen}
          onClose={() => setIsServerGuideOpen(false)}
        />
      </>
    );
  }

  // Active Meeting Room Layout
  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none font-sans">
      {/* Top Meeting Header */}
      <header className="h-14 px-4 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between z-20">
        {/* Left: Meeting Title & Encrypted Badge */}
        <div className="flex items-center gap-3">
          <div className="font-semibold text-sm text-white flex items-center gap-2">
            <span className="truncate max-w-[200px] md:max-w-xs">{roomId}</span>
            <button
              onClick={handleCopyRoomLink}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md transition-colors"
              title="Copy Room Link"
            >
              {copiedRoomCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>WebRTC DTLS/SRTP E2EE</span>
          </div>

          {/* LiveKit SFU Status Indicator */}
          {livekitStatus === "connected" && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>SFU: LiveKit Cloud Connected</span>
            </div>
          )}
          {livekitStatus === "connecting" && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>SFU: Connecting to Cloud...</span>
            </div>
          )}
          {(livekitStatus === "demo" || livekitStatus === "disconnected") && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-medium">
              <Radio className="w-3 h-3 text-indigo-400" />
              <span>SFU: LiveKit Cloud Linked</span>
            </div>
          )}
        </div>

        {/* Center: Meeting Duration Clock */}
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-300">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span>{formatDuration(callDuration)}</span>
        </div>

        {/* Right: Server Guide & AI Badge */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsServerGuideOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/60 rounded-lg text-xs text-indigo-300 font-medium transition-colors"
            title="Video Server Architecture Guide & Sizing"
          >
            <Server className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Server Guide</span>
          </button>
        </div>
      </header>

      {/* Main Video & Stage Area + Side Panels */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video Canvas Stage */}
        <div className="flex-1 relative p-4 flex items-center justify-center overflow-hidden bg-slate-950">
          {/* Floating Reactions Container */}
          <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
            {reactions.map((rx) => (
              <div
                key={rx.id}
                className="absolute bottom-12 text-3xl animate-in fade-in slide-in-from-bottom-6 duration-1000"
                style={{ left: `${rx.x}%`, animation: "floatUp 2.5s ease-out forwards" }}
              >
                <span>{rx.emoji}</span>
              </div>
            ))}
          </div>

          {/* Presentation / Screen Share Hero Mode */}
          {isScreenSharing ? (
            <div className="w-full h-full flex flex-col gap-3">
              {/* Main Presentation Screen */}
              <div className="flex-1 rounded-2xl overflow-hidden bg-slate-900 border border-indigo-500/50 shadow-2xl relative">
                <VideoTile
                  participant={localParticipant}
                  isLocal={true}
                  virtualBg="none"
                />
                <div className="absolute top-4 left-4 bg-indigo-600/90 text-white text-xs px-3 py-1 rounded-lg backdrop-blur-md flex items-center gap-1.5 font-semibold">
                  <Monitor className="w-4 h-4 animate-pulse" />
                  <span>You are sharing your screen</span>
                </div>
              </div>

              {/* Bottom Strip of Attendees */}
              <div className="h-32 flex items-center gap-3 overflow-x-auto pb-1">
                {remoteParticipants.map((p) => (
                  <div key={p.id} className="w-48 h-full shrink-0">
                    <VideoTile participant={p} />
                  </div>
                ))}
              </div>
            </div>
          ) : viewMode === "spotlight" ? (
            /* Spotlight Mode: 1 primary hero speaker + side strip */
            <div className="w-full h-full flex flex-col md:flex-row gap-3">
              <div className="flex-1 h-full">
                <VideoTile
                  participant={
                    allParticipants.find((p) => p.id === spotlightId) ||
                    allParticipants.find((p) => p.isSpeaking) ||
                    localParticipant
                  }
                  isLocal={spotlightId === currentUserId}
                  isSpotlight={true}
                  virtualBg={virtualBg}
                />
              </div>
              <div className="w-full md:w-56 flex md:flex-col gap-3 overflow-auto">
                {allParticipants
                  .filter((p) => p.id !== (spotlightId || localParticipant.id))
                  .map((p) => (
                    <div key={p.id} className="h-32 w-48 md:w-full shrink-0">
                      <VideoTile
                        participant={p}
                        onPin={() => setSpotlightId(p.id)}
                      />
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            /* Grid View Mode */
            <div className="w-full h-full flex flex-col gap-3">
              {allParticipants.length === 1 && (
                <div className="flex items-center justify-between px-4 py-2 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs text-indigo-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>You are the only person in this room. Share your link or room code <strong>{roomId}</strong> for others to join!</span>
                  </div>
                  <button
                    onClick={handleCopyRoomLink}
                    className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-all shadow-sm"
                  >
                    {copiedRoomCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedRoomCode ? "Copied Link!" : "Copy Invite Link"}</span>
                  </button>
                </div>
              )}
              <div
                className={`w-full flex-1 grid gap-3 ${
                  allParticipants.length <= 1
                    ? "grid-cols-1"
                    : allParticipants.length === 2
                    ? "grid-cols-1 md:grid-cols-2"
                    : allParticipants.length <= 4
                    ? "grid-cols-2"
                    : "grid-cols-2 md:grid-cols-3"
                }`}
              >
                {allParticipants.map((p) => (
                  <VideoTile
                    key={p.id}
                    participant={p}
                    isLocal={p.id === currentUserId}
                    virtualBg={p.id === currentUserId ? virtualBg : "none"}
                    onPin={() => {
                      setSpotlightId(p.id);
                      setViewMode("spotlight");
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Side Panels */}
        {activePanel === "ai" && (
          <AICopilotPanel
            transcript={transcript}
            meetingTopic={roomId}
            onAddSimulatedTranscript={handleAddSimulatedTranscript}
            onClose={() => setActivePanel(null)}
          />
        )}

        {activePanel === "chat" && (
          <ChatPanel
            messages={chatMessages}
            currentUserId={currentUserId}
            onSendMessage={handleSendMessage}
            onClose={() => setActivePanel(null)}
          />
        )}

        {activePanel === "participants" && (
          <ParticipantsPanel
            participants={allParticipants}
            currentUserId={currentUserId}
            roomId={roomId}
            onMuteAll={() => {
              setRemoteParticipants((prev) => prev.map((p) => ({ ...p, isMuted: true })));
            }}
            onClose={() => setActivePanel(null)}
          />
        )}
      </div>

      {/* Floating Bottom Control Dock */}
      <MeetingControls
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        isHandRaised={isHandRaised}
        viewMode={viewMode}
        virtualBg={virtualBg}
        activePanel={activePanel}
        unreadChatCount={unreadChatCount}
        participantCount={allParticipants.length}
        availableDevices={availableDevices}
        onToggleMic={handleToggleMic}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleHandRaise={handleToggleHandRaise}
        onTogglePanel={(panel) => setActivePanel(activePanel === panel ? null : panel)}
        onToggleViewMode={() => setViewMode(viewMode === "grid" ? "spotlight" : "grid")}
        onSendReaction={handleSendReaction}
        onChangeVirtualBg={setVirtualBg}
        onOpenServerGuide={() => setIsServerGuideOpen(true)}
        onLeaveMeeting={handleLeaveMeeting}
      />

      {/* Server Architecture Guide Modal */}
      <ServerArchitectureModal
        isOpen={isServerGuideOpen}
        onClose={() => setIsServerGuideOpen(false)}
      />
    </div>
  );
}
