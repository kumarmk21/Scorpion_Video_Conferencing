import React, { useState } from "react";
import { Users, Mic, MicOff, Video, VideoOff, Hand, Shield, Copy, Check, UserPlus } from "lucide-react";
import { Participant } from "../types";

interface Props {
  participants: Participant[];
  currentUserId: string;
  roomId: string;
  onMuteAll?: () => void;
  onClose: () => void;
}

export const ParticipantsPanel: React.FC<Props> = ({
  participants,
  currentUserId,
  roomId,
  onMuteAll,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-80 md:w-96 h-full flex flex-col bg-slate-900 border-l border-slate-800 text-slate-100 shadow-2xl select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
              Participants
              <span className="text-xs px-2 py-0.5 bg-slate-800 text-indigo-300 rounded-full font-semibold">
                {participants.length}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">People in this call</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800"
        >
          ✕
        </button>
      </div>

      {/* Invite Link Action */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-900/50 flex items-center justify-between gap-2">
        <div className="text-xs text-slate-400 truncate">
          Room Code: <strong className="text-white font-mono">{roomId}</strong>
        </div>
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-lg border border-indigo-500/30 transition-colors font-medium"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Link Copied" : "Copy Link"}</span>
        </button>
      </div>

      {/* Participant List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
        {participants.map((p) => {
          const isMe = p.id === currentUserId;
          return (
            <div
              key={p.id}
              className="flex items-center justify-between p-2.5 bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/60 rounded-xl transition-colors"
            >
              {/* Left info */}
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs border border-slate-700"
                  style={{ backgroundColor: p.avatarColor }}
                >
                  {p.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-slate-200 flex items-center gap-1.5">
                    <span className="truncate max-w-[120px]">{p.name}</span>
                    {isMe && <span className="text-[10px] text-slate-400">(You)</span>}
                    {p.role === "host" && (
                      <span className="flex items-center gap-0.5 px-1 py-0.2 bg-indigo-500/20 text-indigo-300 text-[10px] font-medium rounded">
                        <Shield className="w-2.5 h-2.5" />
                        Host
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 capitalize">{p.role}</div>
                </div>
              </div>

              {/* Status Icons */}
              <div className="flex items-center gap-2">
                {p.isHandRaised && (
                  <span className="p-1 bg-amber-500/20 text-amber-300 rounded" title="Hand Raised">
                    <Hand className="w-3.5 h-3.5" />
                  </span>
                )}
                {p.isVideoOff ? (
                  <span className="text-slate-500" title="Camera Off">
                    <VideoOff className="w-3.5 h-3.5" />
                  </span>
                ) : (
                  <span className="text-slate-400" title="Camera On">
                    <Video className="w-3.5 h-3.5" />
                  </span>
                )}
                {p.isMuted ? (
                  <span className="text-rose-400" title="Microphone Muted">
                    <MicOff className="w-3.5 h-3.5" />
                  </span>
                ) : (
                  <span className="text-emerald-400" title="Microphone Active">
                    <Mic className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Host Controls Footer */}
      {onMuteAll && (
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">Host Controls</span>
          <button
            onClick={onMuteAll}
            className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-medium transition-colors"
          >
            Mute All Attendees
          </button>
        </div>
      )}
    </div>
  );
};
