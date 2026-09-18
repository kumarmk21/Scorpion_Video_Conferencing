import React, { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowUpRight,
  Clock,
  ChevronDown,
  ChevronUp,
  Radio,
  Zap,
  Maximize2,
  X,
} from "lucide-react";
import { LiveKitStats } from "../types";

interface Props {
  stats: LiveKitStats;
  compact?: boolean;
}

export const NetworkSparkline: React.FC<Props> = ({ stats }) => {
  const [activeMetric, setActiveMetric] = useState<"bitrate" | "rtt">("bitrate");
  const [isExpanded, setIsExpanded] = useState(false);

  const { currentBitrate, currentRtt, currentFps, packetsLost, quality, history } = stats;

  const qualityColor =
    quality === "excellent"
      ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
      : quality === "good"
      ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
      : "text-rose-400 border-rose-500/30 bg-rose-500/10";

  const dotColor =
    quality === "excellent"
      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
      : quality === "good"
      ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
      : "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]";

  // Min and max for scaling
  const bitrates = history.map((h) => h.bitrate);
  const rtts = history.map((h) => h.rtt);
  const maxBitrate = Math.max(...bitrates, 100);
  const minBitrate = Math.min(...bitrates, 0);
  const avgBitrate = Math.round(bitrates.reduce((a, b) => a + b, 0) / (bitrates.length || 1));
  const avgRtt = Math.round(rtts.reduce((a, b) => a + b, 0) / (rtts.length || 1));

  const formatBitrate = (kbps: number) => {
    if (kbps >= 1000) {
      return `${(kbps / 1000).toFixed(1)} Mbps`;
    }
    return `${kbps} kbps`;
  };

  return (
    <div className="relative pointer-events-auto select-none font-sans">
      {/* Mini HUD Pill in Local Tile */}
      <div
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-950/95 backdrop-blur-md border border-slate-700/60 shadow-lg text-white transition-all cursor-pointer group"
        onClick={() => setIsExpanded(!isExpanded)}
        title="LiveKit Real-Time WebRTC Statistics (Click to inspect)"
      >
        {/* Quality status dot */}
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${dotColor} animate-pulse`} />
          <span className="text-[10px] font-semibold text-slate-300 hidden sm:inline">
            LiveKit
          </span>
        </div>

        {/* Metric Switcher / Quick readout */}
        <div className="flex items-center gap-2 border-l border-slate-800 pl-2 text-[11px] font-mono">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveMetric("bitrate");
            }}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
              activeMetric === "bitrate"
                ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
            <span>{formatBitrate(currentBitrate)}</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveMetric("rtt");
            }}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
              activeMetric === "rtt"
                ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>{currentRtt}ms</span>
          </button>
        </div>

        {/* Recharts Mini Sparkline Graph */}
        <div className="w-24 sm:w-28 h-6 relative overflow-hidden flex items-center">
          <ResponsiveContainer width="100%" height={24}>
            <AreaChart data={history} margin={{ top: 2, right: 1, bottom: 0, left: 1 }}>
              <defs>
                <linearGradient id="bitrateGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="rttGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <YAxis
                domain={activeMetric === "bitrate" ? [0, "auto"] : [0, "auto"]}
                hide
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 border border-slate-700 px-2 py-1 rounded shadow-md text-[10px] text-white">
                        <div className="text-slate-400">{data.time}</div>
                        <div className="font-mono text-emerald-400">
                          {activeMetric === "bitrate"
                            ? `${data.bitrate} kbps`
                            : `${data.rtt} ms RTT`}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {activeMetric === "bitrate" ? (
                <Area
                  type="monotone"
                  dataKey="bitrate"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  fill="url(#bitrateGradient)"
                  isAnimationActive={false}
                />
              ) : (
                <Area
                  type="monotone"
                  dataKey="rtt"
                  stroke="#06b6d4"
                  strokeWidth={1.5}
                  fill="url(#rttGradient)"
                  isAnimationActive={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Expand indicator icon */}
        <div className="text-slate-400 group-hover:text-white transition-colors pl-1">
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </div>

      {/* Detailed Diagnostics Popover */}
      {isExpanded && (
        <div
          className="absolute z-50 top-full mt-2 left-0 w-72 sm:w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-4 shadow-2xl text-white text-xs font-sans animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-red-400 animate-pulse" />
              <div>
                <h4 className="font-semibold text-slate-100 text-xs">LiveKit WebRTC Telemetry</h4>
                <p className="text-[10px] text-slate-400">Real-time local media metrics</p>
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 gap-2 my-3">
            {/* Bitrate Card */}
            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span className="flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                  Outbound
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">avg {formatBitrate(avgBitrate)}</span>
              </div>
              <div className="text-base font-bold font-mono text-emerald-400">
                {formatBitrate(currentBitrate)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                peak: {formatBitrate(maxBitrate)}
              </div>
            </div>

            {/* RTT Card */}
            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  Latency (RTT)
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">avg {avgRtt}ms</span>
              </div>
              <div className="text-base font-bold font-mono text-cyan-400">
                {currentRtt} ms
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                jitter: ~2ms
              </div>
            </div>
          </div>

          {/* Dual Sparkline Visualizer */}
          <div className="mb-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2">
              <span className="font-semibold text-slate-300">Bitrate & Latency Trend</span>
              <span className="font-mono">Last 20s</span>
            </div>
            <div className="w-full h-20">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="popoverBitrate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <YAxis hide domain={[0, "auto"]} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-1.5 rounded text-[10px] text-white shadow-lg font-mono">
                            <div>Time: {d.time}</div>
                            <div className="text-emerald-400">Bitrate: {d.bitrate} kbps</div>
                            <div className="text-cyan-400">RTT: {d.rtt} ms</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="bitrate"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#popoverBitrate)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Connection Details Footer */}
          <div className="space-y-1.5 text-[11px] pt-2 border-t border-slate-800 text-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Connection:</span>
              <span className="font-medium text-slate-200">{stats.connectionType || "LiveKit Cloud SFU"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Capture / Encode:</span>
              <span className="font-mono text-slate-200">720p @ {currentFps || 30} FPS</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Packet Loss:</span>
              <span className="font-mono text-emerald-400">
                {packetsLost === 0 ? "0.0% (0 packets)" : `${packetsLost} lost`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Health State:</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${qualityColor}`}>
                {quality.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
