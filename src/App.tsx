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
  Monitor
} from "lucide-react";

export default function App() {
  // Navigation & Meeting State
  const [inMeeting, setInMeeting] = useState(false);
  const [currentUserId] = useState(() => `user-${Date.now().toString(36)}`);
  const [userName, setUserName] = useState("Alex Morgan");
  const [roomId, setRoomId] = useState("enterprise-architecture-sync");
  const [userRole, setUserRole] = useState<"host" | "speaker" | "attendee">("host");

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
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([
    {
      id: "tr-1",
      speaker: "Sarah Chen (VP Eng)",
      text: "Welcome everyone. Today our priority is deciding on the media server architecture for our organisation's video conferencing rollout.",
      timestamp: Date.now() - 180000,
    },
    {
      id: "tr-2",
      speaker: "Marcus Vance (Principal Architect)",
      text: "Right. P2P Mesh breaks down past 4 participants due to N-squared upload requirements. We definitely need an SFU like LiveKit or Mediasoup.",
      timestamp: Date.now() - 120000,
    },
    {
      id: "tr-3",
      speaker: "Elena Rostova (Infrastructure)",
      text: "Agreed. An SFU only requires each participant to upload one stream. We must also run Coturn for STUN/TURN on port 443 to bypass corporate firewalls.",
      timestamp: Date.now() - 60000,
    },
    {
      id: "tr-4",
      speaker: "Alex Morgan",
      text: "And with Gemini AI integrated, we can transcribe, generate live action items, and automatically output meeting minutes.",
      timestamp: Date.now() - 30000,
    },
  ]);

  // Remote participants list
  const [remoteParticipants, setRemoteParticipants] = useState<Participant[]>([
    {
      id: "peer-sarah",
      name: "Sarah Chen",
      role: "speaker",
      avatarColor: "#4f46e5",
      isMuted: false,
      isVideoOff: false,
      isHandRaised: false,
      isScreenSharing: false,
      isSpeaking: true,
      audioLevel: 65,
      connectionQuality: "excellent",
      joinedAt: Date.now() - 600000,
    },
    {
      id: "peer-marcus",
      name: "Marcus Vance",
      role: "speaker",
      avatarColor: "#059669",
      isMuted: false,
      isVideoOff: false,
      isHandRaised: false,
      isScreenSharing: false,
      isSpeaking: false,
      audioLevel: 10,
      connectionQuality: "excellent",
      joinedAt: Date.now() - 500000,
    },
    {
      id: "peer-elena",
      name: "Elena Rostova",
      role: "attendee",
      avatarColor: "#d97706",
      isMuted: true,
      isVideoOff: true,
      isHandRaised: true,
      isScreenSharing: false,
      isSpeaking: false,
      audioLevel: 0,
      connectionQuality: "good",
      joinedAt: Date.now() - 400000,
    },
  ]);

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

  // Periodic simulated speaking indicator for remote peers to make meeting feel alive
  useEffect(() => {
    if (!inMeeting) return;
    const interval = setInterval(() => {
      setRemoteParticipants((prev) =>
        prev.map((p) => {
          if (p.isMuted) return p;
          const randomSpeaking = Math.random() > 0.6;
          return {
            ...p,
            isSpeaking: randomSpeaking,
            audioLevel: randomSpeaking ? Math.floor(Math.random() * 60) + 30 : 5,
          };
        })
      );
    }, 4000);

    return () => clearInterval(interval);
  }, [inMeeting]);

  // Sync with backend room state
  useEffect(() => {
    if (!inMeeting) return;

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
      .then((data) => {
        if (data.room?.messages) {
          setChatMessages(data.room.messages);
        }
      })
      .catch(console.warn);

    return () => {
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
  };

  const handleToggleVideo = async () => {
    const next = !isVideoOff;
    setIsVideoOff(next);
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !next;
      });
    }
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      stopMediaStream(screenStream);
      setScreenStream(null);
      setIsScreenSharing(false);
    } else {
      const display = await requestDisplayMedia();
      if (display) {
        setScreenStream(display);
        setIsScreenSharing(true);
        display.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
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

  // Add simulated conversation utterance
  const handleAddSimulatedTranscript = () => {
    const quotes = [
      { speaker: "Marcus Vance", text: "We should benchmark Opus audio at 32kbps to ensure crystal clear voice quality even over spotty 4G connections." },
      { speaker: "Sarah Chen", text: "I approve deploying the LiveKit SFU cluster to AWS us-east-1 and eu-central-1 for our team." },
      { speaker: "Elena Rostova", text: "I will document the STUN/TURN port mapping guidelines and share them on our engineering wiki by Friday." },
      { speaker: "Marcus Vance", text: "Don't forget to configure end-to-end encryption (E2EE) with insertable streams for HIPAA and SOC2 compliance." },
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
            <div
              className={`w-full h-full grid gap-3 ${
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
