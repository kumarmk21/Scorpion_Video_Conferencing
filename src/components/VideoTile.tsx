import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, VideoOff, Hand, Pin, Shield, Wifi, Monitor } from "lucide-react";
import { Participant, VirtualBackground, LiveKitStats } from "../types";
import { NetworkSparkline } from "./NetworkSparkline";

interface Props {
  participant: Participant;
  isLocal?: boolean;
  isSpotlight?: boolean;
  virtualBg?: VirtualBackground;
  networkStats?: LiveKitStats;
  onPin?: () => void;
  onToggleSpotlight?: () => void;
}

export const VideoTile: React.FC<Props> = ({
  participant,
  isLocal,
  isSpotlight,
  virtualBg = "none",
  networkStats,
  onPin,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [audioBlocked, setAudioBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !participant.stream) return;

    if (video.srcObject !== participant.stream) {
      video.srcObject = participant.stream;
    }

    const startPlayback = () => {
      video
        .play()
        .then(() => {
          if (!isLocal) {
            setAudioBlocked(false);
          }
        })
        .catch((err) => {
          console.warn("[VideoTile] Play error notice:", err);
          if (!isLocal) {
            // Autoplay policy restriction (user interaction required for unmuted media)
            setAudioBlocked(true);
          }
        });
    };

    startPlayback();
    video.addEventListener("loadedmetadata", startPlayback);
    participant.stream.addEventListener("addtrack", startPlayback);

    return () => {
      video.removeEventListener("loadedmetadata", startPlayback);
      participant.stream?.removeEventListener("addtrack", startPlayback);
    };
  }, [participant.stream, isLocal]);

  const handleManualAudioPlay = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current
        .play()
        .then(() => setAudioBlocked(false))
        .catch(console.warn);
    }
    if (audioRef.current) {
      audioRef.current
        .play()
        .then(() => setAudioBlocked(false))
        .catch(console.warn);
    }
  };

  // Virtual background styling filter
  const getFilterStyle = () => {
    if (!isLocal) return {};
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
    <div
      className={`group relative w-full h-full min-h-[160px] sm:min-h-[220px] rounded-2xl overflow-hidden bg-slate-900 border transition-all duration-300 flex items-center justify-center select-none shadow-lg ${
        participant.isSpeaking
          ? "border-emerald-500 shadow-emerald-500/20 shadow-xl ring-2 ring-emerald-500/40"
          : isSpotlight
          ? "border-red-500/80 shadow-red-500/20"
          : "border-slate-800/80 hover:border-slate-700"
      }`}
    >
      {/* Hidden audio element for remote participants as secondary audio backup */}
      {!isLocal && participant.stream && (
        <audio
          ref={(el) => {
            audioRef.current = el;
            if (el && participant.stream && el.srcObject !== participant.stream) {
              el.srcObject = participant.stream;
              el.play().catch((e) => {
                console.warn("Autoplay audio notice:", e);
                setAudioBlocked(true);
              });
            }
          }}
          autoPlay
          playsInline
        />
      )}

      {/* Audio blocked unlock banner for iOS / mobile browsers */}
      {audioBlocked && !isLocal && (
        <button
          onClick={handleManualAudioPlay}
          className="absolute z-30 top-3 left-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg animate-pulse cursor-pointer"
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Tap to Enable Audio</span>
        </button>
      )}

      {/* Video Stream or Avatar fallback */}
      {!participant.isVideoOff && participant.stream ? (
        <div className="relative w-full h-full overflow-hidden bg-black flex items-center justify-center">
          <video
            ref={(el) => {
              videoRef.current = el;
              if (el && participant.stream && el.srcObject !== participant.stream) {
                el.srcObject = participant.stream;
                el.play().catch(() => {});
              }
            }}
            autoPlay
            playsInline
            muted={Boolean(isLocal)}
            className={`w-full h-full object-cover ${isLocal && !participant.isScreenSharing ? "scale-x-[-1]" : ""}`}
            style={getFilterStyle()}
          />
          {isLocal && virtualBg === "blur" && (
            <div className="absolute inset-0 pointer-events-none backdrop-blur-md opacity-30 bg-red-950/20" />
          )}
        </div>
      ) : (
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-800 to-slate-900">
          {/* Animated speaking pulse rings */}
          {participant.isSpeaking && (
            <div className="absolute w-28 h-28 rounded-full border-2 border-emerald-400/40 animate-ping pointer-events-none" />
          )}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-xl border-2 border-slate-700/60"
            style={{ backgroundColor: participant.avatarColor }}
          >
            {participant.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <VideoOff className="w-3.5 h-3.5 text-slate-500" />
            <span>Camera Off</span>
          </div>
        </div>
      )}

      {/* LiveKit Real-Time Bitrate & Latency Sparkline for Local Participant */}
      {isLocal && networkStats && (
        <div
          className={`absolute z-30 top-3 ${
            participant.isScreenSharing ? "left-28" : "left-3"
          }`}
        >
          <NetworkSparkline stats={networkStats} />
        </div>
      )}

      {/* Screen share indicator */}
      {participant.isScreenSharing && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-[#E10600]/90 backdrop-blur-md rounded-lg text-[11px] font-semibold text-white shadow-md shadow-red-950/40">
          <Monitor className="w-3.5 h-3.5 animate-pulse" />
          <span>Presenting</span>
        </div>
      )}

      {/* Raised hand badge */}
      {participant.isHandRaised && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-amber-500/90 text-slate-950 font-bold rounded-lg text-xs shadow-lg animate-bounce">
          <Hand className="w-3.5 h-3.5 fill-current" />
          <span>Raised Hand</span>
        </div>
      )}

      {/* Pin button on hover */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        {onPin && (
          <button
            onClick={onPin}
            className="p-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg backdrop-blur-md border border-slate-700 transition-colors"
            title="Spotlight participant"
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Bottom participant info bar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-950/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800/80 text-white shadow-md">
          {/* Audio status */}
          {participant.isMuted ? (
            <div className="p-0.5 text-rose-400">
              <MicOff className="w-3.5 h-3.5" />
            </div>
          ) : (
            <div className="flex items-center gap-0.5">
              <Mic className="w-3.5 h-3.5 text-emerald-400" />
              {/* Dynamic waveform levels */}
              <div className="flex items-end gap-0.5 h-3 px-1">
                <span
                  className="w-0.5 bg-emerald-400 rounded-full transition-all duration-75"
                  style={{
                    height: participant.isSpeaking ? `${Math.max(4, ((participant.audioLevel || 20) * 12) / 100)}px` : "3px",
                  }}
                />
                <span
                  className="w-0.5 bg-emerald-400 rounded-full transition-all duration-75"
                  style={{
                    height: participant.isSpeaking ? `${Math.max(4, ((participant.audioLevel || 35) * 12) / 100)}px` : "4px",
                  }}
                />
                <span
                  className="w-0.5 bg-emerald-400 rounded-full transition-all duration-75"
                  style={{
                    height: participant.isSpeaking ? `${Math.max(4, ((participant.audioLevel || 15) * 12) / 100)}px` : "2px",
                  }}
                />
              </div>
            </div>
          )}

          {/* Name & Host badge */}
          <span className="text-xs font-medium truncate max-w-[130px]">
            {participant.name} {isLocal && "(You)"}
          </span>
          {participant.role === "host" && (
            <span className="flex items-center gap-0.5 text-[10px] bg-red-500/30 text-red-300 font-semibold px-1.5 py-0.2 rounded">
              <Shield className="w-2.5 h-2.5" />
              Host
            </span>
          )}
        </div>

        {/* Network & resolution badge */}
        <div className="hidden sm:flex items-center gap-1.5 bg-slate-950/75 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-800/80 text-[10px] text-slate-300 shadow-md font-mono">
          <Wifi className="w-3 h-3 text-emerald-400" />
          {isLocal && networkStats ? (
            <>
              <span>{networkStats.currentRtt}ms</span>
              <span className="text-slate-600">·</span>
              <span>
                {networkStats.currentBitrate >= 1000
                  ? `${(networkStats.currentBitrate / 1000).toFixed(1)}M`
                  : `${networkStats.currentBitrate}k`}
              </span>
            </>
          ) : (
            <span>HD</span>
          )}
        </div>
      </div>
    </div>
  );
};
