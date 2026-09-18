import React, { useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Hand,
  Smile,
  Sparkles,
  MessageSquare,
  Users,
  PhoneOff,
  ChevronUp,
  Settings2,
  Server,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Check,
  Disc
} from "lucide-react";
import { VirtualBackground, ViewMode } from "../types";

interface Props {
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  viewMode: ViewMode;
  virtualBg: VirtualBackground;
  activePanel: "ai" | "chat" | "participants" | null;
  unreadChatCount: number;
  participantCount: number;
  isRecording?: boolean;
  isHost?: boolean;
  availableDevices: {
    audioInputs: MediaDeviceInfo[];
    videoInputs: MediaDeviceInfo[];
  };
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleHandRaise: () => void;
  onToggleRecording?: () => void;
  onTogglePanel: (panel: "ai" | "chat" | "participants") => void;
  onToggleViewMode: () => void;
  onSendReaction: (emoji: string) => void;
  onChangeVirtualBg: (bg: VirtualBackground) => void;
  onOpenServerGuide: () => void;
  onLeaveMeeting: () => void;
}

export const MeetingControls: React.FC<Props> = ({
  isMuted,
  isVideoOff,
  isScreenSharing,
  isHandRaised,
  viewMode,
  virtualBg,
  activePanel,
  unreadChatCount,
  participantCount,
  isRecording = false,
  isHost = false,
  onToggleMic,
  onToggleVideo,
  onToggleScreenShare,
  onToggleHandRaise,
  onToggleRecording,
  onTogglePanel,
  onToggleViewMode,
  onSendReaction,
  onChangeVirtualBg,
  onOpenServerGuide,
  onLeaveMeeting,
}) => {
  const [showReactions, setShowReactions] = useState(false);
  const [showBgMenu, setShowBgMenu] = useState(false);

  const reactionEmojis = ["👏", "👍", "❤️", "🎉", "🔥", "🚀", "💡"];

  return (
    <div className="relative z-30 px-4 py-3 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/80 flex items-center justify-between gap-2 shadow-2xl">
      {/* Left side: View layout & Server info */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleViewMode}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium transition-all"
          title={`Switch to ${viewMode === "grid" ? "Spotlight View" : "Grid View"}`}
        >
          <LayoutGrid className="w-4 h-4 text-red-400" />
          <span className="hidden sm:inline capitalize">{viewMode} View</span>
        </button>

        <button
          onClick={onOpenServerGuide}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-300 hover:text-red-200 border border-red-800/50 text-xs font-medium transition-all"
          title="Open Video Server Architecture Blueprint"
        >
          <Server className="w-4 h-4 text-red-400" />
          <span className="hidden md:inline">Server Guide</span>
        </button>

        {/* LiveKit Cloud Egress Recording Button */}
        {onToggleRecording && (
          <button
            onClick={onToggleRecording}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
              isRecording
                ? "bg-rose-600/30 text-rose-200 border-rose-500/60 ring-2 ring-rose-500/30"
                : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800"
            }`}
            title={isRecording ? "Stop LiveKit Cloud Recording" : "Start LiveKit Cloud Egress Recording"}
          >
            <Disc className={`w-4 h-4 ${isRecording ? "text-rose-400 animate-spin" : "text-slate-400"}`} />
            <span className="hidden lg:inline">
              {isRecording ? "REC (LiveKit Egress)" : "Record"}
            </span>
            {isRecording && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
          </button>
        )}
      </div>

      {/* Center: Primary Call Controls */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Mic toggle */}
        <div className="relative flex items-center">
          <button
            onClick={onToggleMic}
            className={`p-3 md:px-4 rounded-xl flex items-center gap-2 font-medium text-xs transition-all shadow-md ${
              isMuted
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30"
                : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
            }`}
            title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {isMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
            <span className="hidden sm:inline">{isMuted ? "Unmute" : "Mute"}</span>
          </button>
        </div>

        {/* Video Camera toggle */}
        <div className="relative flex items-center">
          <button
            onClick={onToggleVideo}
            className={`p-3 md:px-4 rounded-xl flex items-center gap-2 font-medium text-xs transition-all shadow-md ${
              isVideoOff
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30"
                : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
            }`}
            title={isVideoOff ? "Start Camera" : "Stop Camera"}
          >
            {isVideoOff ? <VideoOff className="w-4 h-4 text-rose-400" /> : <Video className="w-4 h-4 text-red-400" />}
            <span className="hidden sm:inline">{isVideoOff ? "Start Video" : "Stop Video"}</span>
          </button>

          {/* Virtual Background Options dropdown trigger */}
          <button
            onClick={() => setShowBgMenu(!showBgMenu)}
            className="p-1.5 ml-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Virtual Background & Video Effects"
          >
            <ChevronUp className={`w-3.5 h-3.5 transition-transform ${showBgMenu ? "rotate-180" : ""}`} />
          </button>

          {/* Virtual background menu popover */}
          {showBgMenu && (
            <div className="absolute bottom-14 left-0 w-52 p-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl space-y-1 text-xs">
              <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Video Backdrop
              </div>
              {[
                { id: "none", label: "None / Default" },
                { id: "blur", label: "Soft Studio Blur" },
                { id: "office", label: "Executive Office Filter" },
                { id: "studio", label: "Warm Studio Lighting" },
              ].map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => {
                    onChangeVirtualBg(bg.id as VirtualBackground);
                    setShowBgMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    virtualBg === bg.id ? "bg-[#E10600] text-white font-medium" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <span>{bg.label}</span>
                  {virtualBg === bg.id && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Screen Share toggle */}
        <button
          onClick={onToggleScreenShare}
          className={`p-3 md:px-4 rounded-xl flex items-center gap-2 font-medium text-xs transition-all shadow-md ${
            isScreenSharing
              ? "bg-[#E10600] text-white ring-2 ring-red-400/50"
              : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          }`}
          title={isScreenSharing ? "Stop Presenting" : "Share Screen"}
        >
          {isScreenSharing ? <MonitorOff className="w-4 h-4 text-white" /> : <Monitor className="w-4 h-4 text-red-400" />}
          <span className="hidden md:inline">{isScreenSharing ? "Stop Sharing" : "Share Screen"}</span>
        </button>

        {/* Raise Hand toggle */}
        <button
          onClick={onToggleHandRaise}
          className={`p-3 rounded-xl flex items-center gap-1.5 font-medium text-xs transition-all shadow-md ${
            isHandRaised
              ? "bg-amber-500 text-slate-950 font-bold ring-2 ring-amber-300"
              : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          }`}
          title={isHandRaised ? "Lower Hand" : "Raise Hand"}
        >
          <Hand className="w-4 h-4" />
          <span className="hidden lg:inline">{isHandRaised ? "Hand Raised" : "Raise Hand"}</span>
        </button>

        {/* Floating Reactions Trigger */}
        <div className="relative">
          <button
            onClick={() => setShowReactions(!showReactions)}
            className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-md"
            title="Send Reaction"
          >
            <Smile className="w-4 h-4 text-amber-400" />
          </button>

          {showReactions && (
            <div className="absolute bottom-14 -left-12 flex items-center gap-1 p-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-2">
              {reactionEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onSendReaction(emoji);
                    setShowReactions(false);
                  }}
                  className="w-9 h-9 flex items-center justify-center text-lg hover:scale-125 transition-transform hover:bg-slate-800 rounded-xl"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* End / Leave Meeting Button */}
        <button
          onClick={onLeaveMeeting}
          className="p-3 md:px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-lg shadow-rose-600/30"
          title="Leave Meeting"
        >
          <PhoneOff className="w-4 h-4" />
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>

      {/* Right side: Panels toggle (Gemini AI, Chat, Participants) */}
      <div className="flex items-center gap-2">
        {/* Gemini AI Copilot button */}
        <button
          onClick={() => onTogglePanel("ai")}
          className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all shadow-md ${
            activePanel === "ai"
              ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-red-600/25 ring-2 ring-red-400/40"
              : "bg-slate-900/80 hover:bg-slate-800 text-red-300 border border-red-500/30 hover:border-red-500/60"
          }`}
          title="Gemini AI Meeting Copilot & Minutes"
        >
          <Sparkles className="w-4 h-4 text-red-400 animate-pulse" />
          <span className="hidden sm:inline">AI Copilot</span>
          <span className="w-2 h-2 rounded-full bg-red-400 ring-2 ring-red-300/50 animate-ping" />
        </button>

        {/* In-call Chat toggle */}
        <button
          onClick={() => onTogglePanel("chat")}
          className={`relative p-2.5 rounded-xl text-xs font-medium transition-all ${
            activePanel === "chat"
              ? "bg-[#E10600] text-white shadow-md shadow-red-600/30"
              : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800"
          }`}
          title="In-call Chat"
        >
          <MessageSquare className="w-4 h-4" />
          {unreadChatCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-bold rounded-full animate-bounce">
              {unreadChatCount}
            </span>
          )}
        </button>

        {/* Participants roster toggle */}
        <button
          onClick={() => onTogglePanel("participants")}
          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
            activePanel === "participants"
              ? "bg-[#E10600] text-white shadow-md shadow-red-600/30"
              : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800"
          }`}
          title="Participants Roster"
        >
          <Users className="w-4 h-4" />
          <span className="text-xs font-semibold">{participantCount}</span>
        </button>
      </div>
    </div>
  );
};
