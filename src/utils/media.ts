/**
 * Media management utilities for WebRTC, camera, microphone, and audio analysis.
 */

export async function requestUserMedia(
  videoEnabled = true,
  audioEnabled = true,
  deviceId?: { video?: string; audio?: string }
): Promise<MediaStream | null> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn("getUserMedia is not supported on this browser/environment.");
      return null;
    }

    const constraints: MediaStreamConstraints = {
      video: videoEnabled
        ? deviceId?.video
          ? { deviceId: { exact: deviceId.video }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
        : false,
      audio: audioEnabled
        ? deviceId?.audio
          ? { deviceId: { exact: deviceId.audio }, echoCancellation: true, noiseSuppression: true }
          : { echoCancellation: true, noiseSuppression: true }
        : false,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  } catch (err) {
    console.warn("User media access error or declined:", err);
    return null;
  }
}

export async function requestDisplayMedia(): Promise<MediaStream | null> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      return null;
    }
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });
    return stream;
  } catch (err) {
    console.warn("Screen share cancelled or failed:", err);
    return null;
  }
}

export async function getConnectedDevices(): Promise<{
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
}> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return { audioInputs: [], videoInputs: [] };
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      audioInputs: devices.filter((d) => d.kind === "audioinput"),
      videoInputs: devices.filter((d) => d.kind === "videoinput"),
    };
  } catch (err) {
    return { audioInputs: [], videoInputs: [] };
  }
}

export function createAudioLevelMeter(
  stream: MediaStream,
  onLevel: (level: number) => void
): () => void {
  try {
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return () => {};

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return () => {};

    const audioCtx = new AudioContextClass();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animationFrameId: number;

    const checkLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength;
      // Normalize to 0-100 scale
      const normalized = Math.min(100, Math.round((avg / 128) * 100));
      onLevel(normalized);
      animationFrameId = requestAnimationFrame(checkLevel);
    };

    checkLevel();

    return () => {
      cancelAnimationFrame(animationFrameId);
      source.disconnect();
      analyser.disconnect();
      if (audioCtx.state !== "closed") {
        audioCtx.close();
      }
    };
  } catch (err) {
    console.warn("Audio meter initialization failed:", err);
    return () => {};
  }
}

export function stopMediaStream(stream: MediaStream | null) {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}
