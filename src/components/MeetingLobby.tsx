import React, { useState, useEffect, useRef } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Server,
  Sparkles,
  ShieldCheck,
  Zap,
  Check,
  ChevronRight,
  Settings2,
  Users
} from "lucide-react";
import { VirtualBackground } from "../types";
import { ScopMeetLogo } from "./ScopMeetLogo";

interface Props {
  localStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  audioLevel: number;
  virtualBg: VirtualBackground;
  availableDevices: {
    audioInputs: MediaDeviceInfo[];
    videoInputs: MediaDeviceInfo[];
  };
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onChangeVirtualBg: (bg: VirtualBackground) => void;
  onJoinMeeting: (name: string, roomId: string, role: "host" | "speaker" | "attendee") => void;
  onOpenServerGuide: () => void;
}

export const MeetingLobby: React.FC<Props> = ({
  localStream,
  isMuted,
  isVideoOff,
  audioLevel,
  virtualBg,
  availableDevices,
  onToggleMic,
  onToggleVideo,
  onChangeVirtualBg,
  onJoinMeeting,
  onOpenServerGuide,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [name, setName] = useState(() => {
    return localStorage.getItem("scopmeet_username") || localStorage.getItem("omnimeet_username") || "";
  });
  const [roomId, setRoomId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get("room");
    return r ? r.trim().toLowerCase().replace(/\s+/g, "-") : "corp-strategy-room";
  });
  const [role, setRole] = useState<"host" | "speaker" | "attendee">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlRole = params.get("role");
      if (urlRole && ["host", "speaker", "attendee"].includes(urlRole)) {
        return urlRole as "host" | "speaker" | "attendee";
      }
      if (params.get("room")) {
        return "attendee";
      }
    }
    return "host";
  });

  const isInAppBrowser = typeof navigator !== "undefined" && /WhatsApp|FBAN|FBAV|Instagram|Line/i.test(navigator.userAgent || "");

  useEffect(() => {
    if (name) {
      localStorage.setItem("scopmeet_username", name);
      localStorage.setItem("omnimeet_username", name);
    }
  }, [name]);

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !roomId.trim()) return;
    onJoinMeeting(name.trim(), roomId.trim().toLowerCase().replace(/\s+/g, "-"), role);
  };

  const getFilterStyle = () => {
    switch (virtualBg) {
      case "blur":
        return { backdropFilter: "blur(12px)" };
      case "warm":
      case "studio":
        return { filter: "contrast(1.08) brightness(1.04) saturate(1.1)" };
      case "office":
        return { filter: "contrast(1.05) brightness(1.02)" };
      default:
        return {};
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-[#E10600] selection:text-white">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ScopMeetLogo size="md" />
          <div className="hidden sm:block border-l border-slate-800 pl-3">
            <span className="text-xs px-2 py-0.5 bg-red-600/20 text-red-300 border border-red-500/30 rounded-full font-mono font-medium">
              Enterprise
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">WebRTC Multi-stream & Gemini AI Intelligence</p>
          </div>
        </div>

        {/* Server Guide Trigger Button */}
        <button
          onClick={onOpenServerGuide}
          className="flex items-center gap-2 px-3.5 py-2 bg-red-950/40 hover:bg-red-900/50 border border-red-700/50 rounded-xl text-xs font-semibold text-red-300 hover:text-red-200 transition-all shadow-md"
        >
          <Server className="w-4 h-4 text-red-400" />
          <span className="hidden sm:inline">Server & SFU Architecture Guide</span>
          <span className="sm:hidden">Server Guide</span>
        </button>
      </header>

      {/* Main Center Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12">
        {/* Left Column: Device Check & Camera Preview */}
        <div className="w-full lg:w-1/2 flex flex-col items-center">
          <div className="relative w-full max-w-md aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl flex items-center justify-center">
            {!isVideoOff && localStream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
                style={getFilterStyle()}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                  <VideoOff className="w-7 h-7" />
                </div>
                <p className="text-xs font-medium">Camera is turned off</p>
              </div>
            )}

            {/* Mic Level indicator bar */}
            {!isMuted && (
              <div className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800">
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-75"
                    style={{ width: `${Math.min(100, audioLevel * 1.5)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Floating Quick Controls on Preview */}
            <div className="absolute bottom-4 right-4 flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleMic}
                className={`p-2.5 rounded-xl backdrop-blur-md transition-all ${
                  isMuted
                    ? "bg-rose-500/80 text-white"
                    : "bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700"
                }`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={onToggleVideo}
                className={`p-2.5 rounded-xl backdrop-blur-md transition-all ${
                  isVideoOff
                    ? "bg-rose-500/80 text-white"
                    : "bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700"
                }`}
                title={isVideoOff ? "Start Camera" : "Stop Camera"}
              >
                {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Virtual Background Selector */}
          <div className="mt-4 w-full max-w-md p-3 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Virtual Backdrop Effect</span>
              <span className="text-slate-400 capitalize font-mono">{virtualBg}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {[
                { id: "none", label: "None" },
                { id: "blur", label: "Soft Blur" },
                { id: "office", label: "Office" },
                { id: "studio", label: "Studio" },
              ].map((bg) => (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => onChangeVirtualBg(bg.id as VirtualBackground)}
                  className={`py-1.5 px-2 rounded-lg border font-medium text-center transition-all ${
                    virtualBg === bg.id
                      ? "bg-[#E10600] border-red-500 text-white shadow-md shadow-red-950/40"
                      : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {bg.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Join Form & Organisation Room Info */}
        <div className="w-full lg:w-1/2 max-w-md">
          <div className="p-6 md:p-8 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl space-y-5">
            {/* Prominent Scorpion / ScopMeet Brand Card */}
            <div className="flex justify-center">
              <ScopMeetLogo variant="badge" className="w-full max-w-[280px]" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">Join Meeting Session</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure your display identity and jump straight into the conference.
              </p>
            </div>

            {isInAppBrowser && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-xs flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-300">In-App Browser (WhatsApp)</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                    }}
                    className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded text-[11px] border border-amber-500/40"
                  >
                    Copy Link
                  </button>
                </div>
                <span>For best mobile camera and microphone support, tap <strong>(⋮ or Share)</strong> and select <strong>"Open in Chrome"</strong> or <strong>"Open in Safari"</strong>.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Name Input */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Your Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah Connor"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/40 transition-colors"
                />
              </div>

              {/* Room ID Input */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Meeting Room Code / Topic</label>
                <input
                  type="text"
                  required
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="e.g. q3-architecture-review"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/40 transition-colors"
                />
              </div>

              {/* Role Select */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Meeting Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "host", label: "Host" },
                    { id: "speaker", label: "Speaker" },
                    { id: "attendee", label: "Attendee" },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id as any)}
                      className={`py-2 px-3 rounded-xl border text-center font-medium capitalize transition-all ${
                        role === r.id
                          ? "bg-red-600/20 border-red-500 text-red-200 shadow-sm"
                          : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {role === "host"
                    ? "Host: Room creator with full control"
                    : role === "speaker"
                    ? "Speaker: Presenter with camera, mic & screen share"
                    : "Attendee: Active participant with full camera, mic & chat"}
                </p>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                className="w-full mt-2 py-3 px-4 bg-[#E10600] hover:bg-red-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/30 active:scale-[0.99]"
              >
                <span>Enter Conference Room</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>

            {/* AI Capabilities Notice */}
            <div className="pt-3 border-t border-slate-800/80 flex items-start gap-2.5 text-[11px] text-slate-400">
              <Sparkles className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>
                Equipped with <strong>Gemini 3.8 Flash</strong> for automated meeting minutes, live action items, and in-call intelligence.
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-slate-900 bg-slate-950 text-center text-xs text-slate-500">
        ScopMeet Video Conferencing • WebRTC Multi-stream • Gemini AI Assistant
      </footer>
    </div>
  );
};
