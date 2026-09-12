import React, { useState } from "react";
import {
  Sparkles,
  FileText,
  ListTodo,
  CheckCircle,
  Clock,
  Send,
  Bot,
  Copy,
  Check,
  RefreshCw,
  PlusCircle,
  TrendingUp,
  Tag,
  AlertCircle
} from "lucide-react";
import { TranscriptEntry, AISummaryData } from "../types";

interface Props {
  transcript: TranscriptEntry[];
  meetingTopic: string;
  onAddSimulatedTranscript: () => void;
  onClose: () => void;
}

export const AICopilotPanel: React.FC<Props> = ({
  transcript,
  meetingTopic,
  onAddSimulatedTranscript,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"summary" | "actions" | "copilot" | "mom">("summary");
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<AISummaryData | null>(null);
  const [momMarkdown, setMomMarkdown] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [question, setQuestion] = useState("");
  const [copilotHistory, setCopilotHistory] = useState<Array<{ role: "user" | "ai"; text: string }>>([
    {
      role: "ai",
      text: "Hello! I am your in-meeting Gemini AI Copilot. I listen to the conversation in real-time, can summarize points, extract action items, and answer questions about the discussion.",
    },
  ]);

  // Request AI Summary
  const handleGenerateSummary = async () => {
    if (transcript.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/gemini/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, meetingTopic }),
      });
      const data = await res.json();
      setSummaryData(data);
    } catch (err) {
      console.error("Summary error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Request AI MOM
  const handleGenerateMOM = async () => {
    if (transcript.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/gemini/mom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          meetingTopic,
          date: new Date().toLocaleDateString(),
          attendees: Array.from(new Set(transcript.map((t) => t.speaker))),
        }),
      });
      const data = (await res.json()) as any;
      setMomMarkdown(data.markdown || "");
    } catch (err) {
      console.error("MOM error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Send question to Copilot
  const handleAskCopilot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || loading) return;

    const userQ = question.trim();
    setQuestion("");
    setCopilotHistory((prev) => [...prev, { role: "user", text: userQ }]);
    setLoading(true);

    try {
      const res = await fetch("/api/gemini/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userQ,
          transcript,
          roomContext: `Meeting on ${meetingTopic}`,
        }),
      });
      const data = (await res.json()) as any;
      setCopilotHistory((prev) => [
        ...prev,
        { role: "ai", text: data.answer || "No response received from AI." },
      ]);
    } catch (err) {
      setCopilotHistory((prev) => [
        ...prev,
        { role: "ai", text: "Error communicating with AI Copilot service." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-80 md:w-96 h-full flex flex-col bg-slate-900 border-l border-slate-800 text-slate-100 shadow-2xl overflow-hidden select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
              Gemini Meeting Copilot
              <span className="text-[10px] px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded font-mono font-medium">
                Live AI
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Real-time meeting notes & summaries</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-900/80 text-xs">
        {[
          { id: "summary", label: "Summary", icon: FileText },
          { id: "actions", label: "Actions", icon: ListTodo },
          { id: "copilot", label: "Q&A", icon: Bot },
          { id: "mom", label: "MOM", icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center gap-1 py-2.5 transition-colors border-b-2 font-medium ${
                activeTab === tab.id
                  ? "border-purple-500 text-purple-400 bg-purple-500/5"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Panel Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
        {/* Transcript count notice */}
        <div className="flex items-center justify-between p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60 text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Transcript: <strong className="text-white">{transcript.length}</strong> utterances
            </span>
          </div>
          <button
            onClick={onAddSimulatedTranscript}
            className="flex items-center gap-1 px-2 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 rounded-lg text-[11px] font-medium transition-colors"
            title="Simulate conversation utterances for AI demo"
          >
            <PlusCircle className="w-3 h-3" />
            <span>Simulate Speech</span>
          </button>
        </div>

        {/* Tab 1: Executive Summary */}
        {activeTab === "summary" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">Executive Summary</span>
              <button
                onClick={handleGenerateSummary}
                disabled={loading || transcript.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg font-medium shadow-md transition-all disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{summaryData ? "Regenerate" : "Synthesize with Gemini"}</span>
              </button>
            </div>

            {summaryData ? (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="p-3 bg-purple-950/20 border border-purple-800/40 rounded-xl space-y-2">
                  <p className="text-slate-200 leading-relaxed">{summaryData.summary}</p>

                  <div className="flex items-center gap-3 pt-2 border-t border-purple-900/30 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      {summaryData.sentiment}
                    </span>
                  </div>
                </div>

                {/* Key Decisions */}
                <div className="space-y-1.5">
                  <span className="font-semibold text-slate-300">Key Decisions Made:</span>
                  <div className="space-y-1">
                    {summaryData.keyDecisions.map((dec, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 p-2 bg-slate-800/40 border border-slate-700/50 rounded-lg text-slate-300"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{dec}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Topics */}
                {summaryData.topics && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {summaryData.topics.map((tag, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1 px-2 py-0.5 bg-slate-800 text-purple-300 border border-purple-500/20 rounded-full text-[11px]"
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl space-y-2">
                <Sparkles className="w-6 h-6 text-purple-400 mx-auto opacity-80" />
                <p>Click "Synthesize with Gemini" to extract key outcomes and insights from this call.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Action Items */}
        {activeTab === "actions" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">Action Items & Owners</span>
              <button
                onClick={handleGenerateSummary}
                disabled={loading || transcript.length === 0}
                className="flex items-center gap-1 px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 rounded-lg font-medium"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                <span>Extract</span>
              </button>
            </div>

            {summaryData?.actionItems && summaryData.actionItems.length > 0 ? (
              <div className="space-y-2 animate-in fade-in">
                {summaryData.actionItems.map((item, i) => (
                  <div
                    key={i}
                    className="p-3 bg-slate-800/50 border border-slate-700 rounded-xl space-y-1.5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-slate-200">{item.task}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 shrink-0 font-medium">
                        {item.status || "Assigned"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="text-purple-400 font-semibold">Assignee:</span>
                      <span>{item.assignee}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl">
                <ListTodo className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                <p>No action items extracted yet. Generate a summary to automatically assign commitments.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Copilot Interactive Q&A */}
        {activeTab === "copilot" && (
          <div className="flex flex-col h-[360px]">
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {copilotHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl leading-relaxed ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white ml-6"
                      : "bg-slate-800/80 border border-slate-700/60 text-slate-200 mr-4"
                  }`}
                >
                  <div className="text-[10px] font-semibold text-slate-400 mb-1">
                    {msg.role === "user" ? "You" : "OmniMeet AI"}
                  </div>
                  <p>{msg.text}</p>
                </div>
              ))}
              {loading && (
                <div className="p-3 bg-slate-800/40 rounded-xl text-slate-400 italic flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                  <span>Gemini is thinking...</span>
                </div>
              )}
            </div>

            {/* Input form */}
            <form onSubmit={handleAskCopilot} className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about the meeting..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={!question.trim() || loading}
                className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl disabled:opacity-50 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* Tab 4: Minutes of Meeting (MOM) Export */}
        {activeTab === "mom" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">Formal Meeting Minutes</span>
              <button
                onClick={handleGenerateMOM}
                disabled={loading || transcript.length === 0}
                className="flex items-center gap-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium shadow-md transition-all disabled:opacity-50"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Generate MOM</span>
              </button>
            </div>

            {momMarkdown ? (
              <div className="space-y-2">
                <div className="flex justify-end">
                  <button
                    onClick={() => copyToClipboard(momMarkdown)}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? "Copied!" : "Copy Markdown"}</span>
                  </button>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-72 whitespace-pre-wrap leading-relaxed">
                  {momMarkdown}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl">
                <FileText className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                <p>Generate a structured Minutes of Meeting (MOM) report ready for distribution across your organisation.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
