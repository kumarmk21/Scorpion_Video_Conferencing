export interface Participant {
  id: string;
  name: string;
  role: "host" | "speaker" | "attendee";
  avatarColor: string;
  avatarUrl?: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isHandRaised: boolean;
  isScreenSharing: boolean;
  isSpeaking?: boolean;
  audioLevel?: number; // 0 to 100
  stream?: MediaStream | null;
  connectionQuality?: "excellent" | "good" | "poor";
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
  highlight?: boolean;
}

export interface ActionItem {
  task: string;
  assignee: string;
  status: string;
}

export interface AISummaryData {
  summary: string;
  keyDecisions: string[];
  actionItems: ActionItem[];
  sentiment: string;
  topics: string[];
  note?: string;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  x: number;
  senderName: string;
}

export type ViewMode = "grid" | "spotlight" | "presentation";

export type VirtualBackground = "none" | "blur" | "office" | "minimal" | "studio";

export interface NetworkStatPoint {
  time: string;
  bitrate: number; // in kbps
  rtt: number; // in ms
  fps?: number;
  packetsLost?: number;
}

export interface LiveKitStats {
  currentBitrate: number; // kbps
  currentRtt: number; // ms
  currentFps?: number;
  packetsLost?: number;
  connectionType?: string;
  quality: "excellent" | "good" | "poor";
  history: NetworkStatPoint[];
}
