import React, { useState } from "react";
import {
  Server,
  Cpu,
  Zap,
  Globe,
  ShieldCheck,
  CheckCircle2,
  X,
  ArrowRight,
  Calculator,
  Layers,
  Network,
  Download,
  AlertTriangle
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ServerArchitectureModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<"architecture" | "specs" | "calculator" | "recommendation">("architecture");
  const [participantsCount, setParticipantsCount] = useState<number>(25);
  const [simulcastEnabled, setSimulcastEnabled] = useState<boolean>(true);
  const [resolution, setResolution] = useState<"720p" | "1080p" | "480p">("720p");

  if (!isOpen) return null;

  // Bandwidth calculator logic:
  // For SFU: Each user publishes 1 stream (e.g., 1.5 Mbps for 720p), and receives (N - 1) streams.
  // With Simulcast & active speaker grid, only ~4-6 streams are high/mid quality while inactive are low quality (150kbps) or audio only.
  const bitratePerPublisher = resolution === "1080p" ? 2.5 : resolution === "720p" ? 1.5 : 0.6; // Mbps
  const incomingServerTraffic = participantsCount * bitratePerPublisher;
  const outgoingServerTraffic = simulcastEnabled
    ? Math.min(participantsCount * 4, participantsCount * (participantsCount - 1)) * 0.4
    : participantsCount * (participantsCount - 1) * bitratePerPublisher;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                Video Conferencing Server Architecture Guide
                <span className="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full font-mono font-medium">
                  Enterprise Blueprint
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Recommended cloud server specs, routing topology (SFU vs MCU vs Mesh), and bandwidth sizing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900/50">
          {[
            { id: "architecture", label: "Media Server Topology (SFU)", icon: Layers },
            { id: "specs", label: "Server Sizing & Specs", icon: Cpu },
            { id: "calculator", label: "Bandwidth Calculator", icon: Calculator },
            { id: "recommendation", label: "Turnkey Stack Choices", icon: Zap },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                  activeTab === tab.id
                    ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-300">
          {activeTab === "architecture" && (
            <div className="space-y-6">
              <div className="p-4 bg-indigo-950/30 border border-indigo-800/40 rounded-xl">
                <h3 className="font-semibold text-white text-base mb-1 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Primary Verdict: Choose an SFU (Selective Forwarding Unit)
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  For an enterprise video conferencing application, you should **almost always deploy an SFU (Selective Forwarding Unit)**. 
                  Industry leaders like Zoom, Google Meet, Microsoft Teams, and Discord all rely on SFU architectures.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Mesh */}
                <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-200">1. P2P Mesh</h4>
                    <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-mono">2-4 Users</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Direct peer-to-peer connections without a media server.
                  </p>
                  <div className="text-xs text-rose-400 space-y-1 pt-2 border-t border-slate-700/50">
                    <p>❌ Upload bandwidth scales quadratically: N * (N - 1).</p>
                    <p>❌ Degrades rapidly with 5+ participants.</p>
                  </div>
                </div>

                {/* SFU */}
                <div className="p-4 bg-indigo-950/40 border-2 border-indigo-500/60 rounded-xl space-y-2 shadow-lg shadow-indigo-950/40">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-white flex items-center gap-1.5">
                      2. SFU (Recommended)
                    </h4>
                    <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-mono font-medium">Industry Gold</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Client sends 1 stream up. Server routes/duplicates packets to other participants without re-encoding.
                  </p>
                  <div className="text-xs text-emerald-400 space-y-1 pt-2 border-t border-indigo-800/50">
                    <p>✅ Very low server CPU (no heavy video transcoding).</p>
                    <p>✅ Scales to 100s of participants with simulcast.</p>
                    <p>✅ Sub-200ms ultra-low latency.</p>
                  </div>
                </div>

                {/* MCU */}
                <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-200">3. MCU (Composite)</h4>
                    <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded font-mono">Legacy/Telehealth</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Server decodes all streams, mixes them into a single video composite grid, and re-encodes.
                  </p>
                  <div className="text-xs text-slate-400 space-y-1 pt-2 border-t border-slate-700/50">
                    <p>❌ Massive server CPU/GPU cost (expensive!).</p>
                    <p>❌ Adds 200-500ms video decoding/encoding latency.</p>
                  </div>
                </div>
              </div>

              {/* Crucial Network Requirement: STUN & TURN */}
              <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  Crucial Enterprise Requirement: Coturn STUN/TURN Relay Server
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  In enterprise networks, **15% to 25% of employees** work behind strict symmetric corporate NATs or strict firewalls that block direct UDP. 
                  You must deploy a **TURN server (Coturn)** on port 443 (TLS/TCP fallback) to guarantee 100% call connection success rate regardless of corporate VPNs or firewall policies.
                </p>
              </div>
            </div>
          )}

          {activeTab === "specs" && (
            <div className="space-y-6">
              <h3 className="font-semibold text-white text-base">
                Cloud Server Sizing Tiers (Compute & Bandwidth)
              </h3>

              <div className="space-y-4">
                {/* Tier 1 */}
                <div className="p-4 bg-slate-800/40 border border-slate-700/80 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">Startup / Team Tier</span>
                      <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded font-mono">Up to 50 Concurrent Users</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Ideal for internal standups, 1:1 calls, and small department meetings.
                    </p>
                    <div className="text-xs text-indigo-300 font-mono pt-1">
                      Specs: 2 to 4 vCPUs • 4 GB RAM • 1 Gbps NIC • Estimated Cost: ~$25 - $40 / month
                    </div>
                  </div>
                  <div className="text-xs text-right text-slate-300 shrink-0 font-mono bg-slate-900/60 px-3 py-2 rounded-lg border border-slate-700">
                    <div>AWS: <span className="text-emerald-400">c6i.large</span></div>
                    <div>GCP: <span className="text-emerald-400">c2-standard-4</span></div>
                  </div>
                </div>

                {/* Tier 2 */}
                <div className="p-4 bg-indigo-950/30 border border-indigo-500/40 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">Mid-Market Organisation</span>
                      <span className="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded font-mono">50 - 300 Concurrent Users</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Simultaneous meetings with screen sharing and active speaker switching across multiple rooms.
                    </p>
                    <div className="text-xs text-indigo-300 font-mono pt-1">
                      Specs: 8 vCPUs • 16 GB RAM • 5-10 Gbps Enhanced Networking • Estimated Cost: ~$120 - $180 / month
                    </div>
                  </div>
                  <div className="text-xs text-right text-slate-300 shrink-0 font-mono bg-slate-900/60 px-3 py-2 rounded-lg border border-slate-700">
                    <div>AWS: <span className="text-emerald-400">c6i.2xlarge</span></div>
                    <div>GCP: <span className="text-emerald-400">c3-standard-8</span></div>
                  </div>
                </div>

                {/* Tier 3 */}
                <div className="p-4 bg-slate-800/40 border border-slate-700/80 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">Enterprise High-Availability Cluster</span>
                      <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded font-mono">500 - 5,000+ Concurrent Users</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Multi-node cluster fronted by Envoy load balancer, Redis room coordinator, and global Geo-DNS edge relays.
                    </p>
                    <div className="text-xs text-indigo-300 font-mono pt-1">
                      Specs: 3x c6i.2xlarge nodes + Redis + Coturn cluster • 10-25 Gbps NICs
                    </div>
                  </div>
                  <div className="text-xs text-right text-slate-300 shrink-0 font-mono bg-slate-900/60 px-3 py-2 rounded-lg border border-slate-700">
                    <div>Auto-scaled Kubernetes (EKS / GKE)</div>
                    <div className="text-emerald-400">Multi-region live forwarding</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "calculator" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white text-base">Interactive Bandwidth & Server Throughput Sizing</h3>
                  <p className="text-xs text-slate-400">Estimate real-time network egress and compute requirements for your meetings.</p>
                </div>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="space-y-2">
                  <label className="text-xs text-slate-300 font-medium">Meeting Participants ({participantsCount})</label>
                  <input
                    type="range"
                    min="2"
                    max="100"
                    value={participantsCount}
                    onChange={(e) => setParticipantsCount(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>2 users</span>
                    <span>50 users</span>
                    <span>100 users</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-slate-300 font-medium">Stream Resolution</label>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="480p">480p SD (~600 Kbps)</option>
                    <option value="720p">720p HD (~1.5 Mbps - Recommended)</option>
                    <option value="1080p">1080p FHD (~2.5 Mbps)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-slate-300 font-medium">Simulcast & Speaker Adaptation</label>
                  <button
                    onClick={() => setSimulcastEnabled(!simulcastEnabled)}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 transition-all ${
                      simulcastEnabled
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                        : "bg-slate-800 border-slate-700 text-slate-400"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {simulcastEnabled ? "Simulcast Enabled (Standard)" : "Raw Mesh Egress"}
                  </button>
                </div>
              </div>

              {/* Sizing Output Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-800/40 border border-slate-700 rounded-xl space-y-1">
                  <span className="text-xs text-slate-400">Inbound Media Ingress (Server)</span>
                  <div className="text-2xl font-bold text-white font-mono">
                    {incomingServerTraffic.toFixed(1)} <span className="text-sm font-normal text-slate-400">Mbps</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Total streams uploaded to SFU from {participantsCount} cameras.</p>
                </div>

                <div className="p-4 bg-indigo-950/30 border border-indigo-500/40 rounded-xl space-y-1">
                  <span className="text-xs text-indigo-300">Outbound Media Egress (Server)</span>
                  <div className="text-2xl font-bold text-indigo-400 font-mono">
                    {outgoingServerTraffic.toFixed(1)} <span className="text-sm font-normal text-indigo-300">Mbps</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {simulcastEnabled ? "Optimized with thumbnail layer switching" : "Full uncompressed multi-stream forwarding"}
                  </p>
                </div>

                <div className="p-4 bg-slate-800/40 border border-slate-700 rounded-xl space-y-1">
                  <span className="text-xs text-slate-400">Minimum Server NIC Capacity</span>
                  <div className="text-2xl font-bold text-emerald-400 font-mono">
                    {outgoingServerTraffic > 800 ? "10 Gbps" : outgoingServerTraffic > 250 ? "2.5 Gbps" : "1 Gbps"}
                  </div>
                  <p className="text-[11px] text-slate-400">Guarantees zero packet drops and jitter spikes.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "recommendation" && (
            <div className="space-y-6">
              <h3 className="font-semibold text-white text-base">Top 3 Production Solutions for Video Conferencing</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* LiveKit */}
                <div className="p-4 bg-indigo-950/40 border-2 border-indigo-500 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-base">LiveKit</h4>
                    <span className="text-xs px-2 py-0.5 bg-indigo-500/30 text-indigo-300 rounded font-medium">#1 Choice</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Open-source WebRTC SFU built in Go. Ultra fast, supports WebRTC, Simulcast, E2EE, screen sharing, and turnkey client SDKs for React, Flutter, iOS, and Android.
                  </p>
                  <div className="pt-2 border-t border-indigo-800/50 text-xs text-slate-300 space-y-1 font-mono">
                    <div>• Self-hostable on Docker/K8s</div>
                    <div>• Built-in TURN & telemetry</div>
                    <div>• First-class AI audio plugin support</div>
                  </div>
                </div>

                {/* Mediasoup */}
                <div className="p-4 bg-slate-800/40 border border-slate-700 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-base">Mediasoup</h4>
                    <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded font-medium">Node.js + C++</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Low-level, ultra-high-performance SFU library that runs C++ worker threads inside your Node.js server. Maximum customization and lowest memory footprint.
                  </p>
                  <div className="pt-2 border-t border-slate-700/50 text-xs text-slate-400 space-y-1 font-mono">
                    <div>• Direct control of SDP & pipelines</div>
                    <div>• Multi-core worker balancing</div>
                    <div>• Requires custom signaling logic</div>
                  </div>
                </div>

                {/* Agora / Daily */}
                <div className="p-4 bg-slate-800/40 border border-slate-700 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-base">Managed CPaaS (Agora/Daily)</h4>
                    <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded font-medium">Zero DevOps</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Fully managed cloud media routing infrastructure. Zero servers to manage or patch, global edge relay network, pay-per-minute pricing model.
                  </p>
                  <div className="pt-2 border-t border-slate-700/50 text-xs text-slate-400 space-y-1 font-mono">
                    <div>• 99.99% SLA</div>
                    <div>• ~$0.0039 per participant-minute</div>
                    <div>• Proprietary vendor lock-in</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Designed for high concurrency, low latency (&lt;150ms), and enterprise compliance.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-lg shadow-indigo-600/30"
          >
            Got it, Return to App
          </button>
        </div>
      </div>
    </div>
  );
};
