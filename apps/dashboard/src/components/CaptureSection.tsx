"use client";
import { useState, useRef, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import useSWR from "swr";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://witnesschain-backend.onrender.com";

async function sha256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function CaptureSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<"idle" | "capturing" | "recording" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [location, setLocation] = useState<{ lat: number, lon: number } | null>(null);
  const [mode, setMode] = useState<"image" | "video">("image");
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);

  // Initialize camera
  useEffect(() => {
    async function setupCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: mode === "video"
        });
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setStream(mediaStream);
        setStatus("capturing");
      } catch (err) {
        console.error("Camera access error:", err);
        setStatus("error");
        setMessage("Could not access camera. Please ensure permissions are granted.");
      }
    }

    setupCamera();

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => console.warn("Geolocation error:", err.message)
      );
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mode]);

  const handleCaptureImage = async () => {
    if (!videoRef.current || !canvasRef.current || !location) return;

    setStatus("submitting");
    setMessage("Processing tamper-proof snapshot...");

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context error");

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const blob = await new Promise<Blob>((res, rej) => {
        canvas.toBlob(b => b ? res(b) : rej("Blob failed"), "image/jpeg", 0.9);
      });

      await submitEvidence(blob, "image/jpeg");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Submission failed");
    }
  };

  const startRecording = () => {
    if (!stream) return;
    setRecordedChunks([]);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8,opus" });
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) setRecordedChunks(prev => [...prev, e.data]);
    };

    recorder.onstop = async () => {
      setStatus("submitting");
      setMessage("Finalizing tamper-proof video bundle...");
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setStatus("recording");
    setMessage("Recording live evidence...");
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    if (status === "submitting" && recordedChunks.length > 0 && mode === "video") {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      submitEvidence(blob, "video/webm");
    }
  }, [recordedChunks, status]);

  const { publicKey } = useWallet();
  const { data: profile } = useSWR(
    publicKey ? `${BACKEND}/api/leaderboard/${publicKey.toBase58()}` : null,
    (url: string) => fetch(url).then(res => res.json())
  );

  const submitEvidence = async (blob: Blob, type: string) => {
    if (!publicKey) {
      setStatus("error");
      setMessage("Please connect your Solana wallet to anchor evidence.");
      return;
    }

    try {
      const buffer = await blob.arrayBuffer();
      const hash = await sha256(buffer);
      
      // Convert buffer to base64
      const uint8 = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
      const base64 = btoa(binary);

      const res = await fetch(`${BACKEND}/api/evidence/submit`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer web-session-${hash.slice(0, 16)}`
        },
        body: JSON.stringify({
          sha256Hash: hash,
          mediaBase64: base64,
          mediaType: type,
          latitude: location?.lat,
          longitude: location?.lon,
          witnessWallet: publicKey.toBase58(),
          deviceIdHash: "WEB_BROWSER_" + navigator.userAgent.slice(0, 24),
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Server error");

      setStatus("success");
      setMessage(`Evidence secured! Incident ID: ${data.incidentId.slice(0, 8)}...`);
    } catch (err) {
      console.error("Submit error:", err);
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Submission failed");
    }
  };

  return (
    <section className="card" style={{ maxWidth: "800px", margin: "0 auto", overflow: "hidden" }}>
      <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px" }}>
        <div style={{ display: "flex", gap: "12px" }}>
          <button 
            className={`tab ${mode === "image" ? "active" : ""}`} 
            onClick={() => setMode("image")}
            disabled={status === "recording" || status === "submitting"}
          >
            📸 Photo
          </button>
          <button 
            className={`tab ${mode === "video" ? "active" : ""}`} 
            onClick={() => setMode("video")}
            disabled={status === "recording" || status === "submitting"}
          >
            🎥 Video
          </button>
        </div>

        {publicKey ? (
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Witness Score</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--accent-primary)" }}>
                {profile?.score || 0} pts
              </div>
            </div>
            <div style={{ width: "1px", height: "24px", background: "var(--border-subtle)" }} />
            <div style={{ display: "flex", gap: "4px" }}>
              {profile?.submission_count > 0 && <span title="First Witness" style={{ fontSize: "1.2rem" }}>🥉</span>}
              {profile?.confirmed_count > 0 && <span title="Corroborator" style={{ fontSize: "1.2rem" }}>🥈</span>}
              {profile?.score > 100 && <span title="Civic Guardian" style={{ fontSize: "1.2rem" }}>🥇</span>}
            </div>
          </div>
        ) : (
          <div className="badge badge-pending">Connect Wallet to Start</div>
        )}
      </div>

      <div className="card-body" style={{ padding: "0", position: "relative", background: "#000", minHeight: "450px" }}>
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted={mode === "image"}
          style={{ width: "100%", maxHeight: "70vh", display: "block" }} 
        />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {!publicKey && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 15,
            background: "rgba(6, 6, 25, 0.7)", backdropFilter: "blur(8px)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "32px", textAlign: "center"
          }}>
            <div style={{ fontSize: "3rem", marginBottom: "20px" }}>🔐</div>
            <h3 style={{ color: "#fff", marginBottom: "8px" }}>Identity Required</h3>
            <p style={{ color: "rgba(255,255,255,0.7)", maxWidth: "300px", marginBottom: "24px" }}>
              Connect your Solana wallet to anchor evidence and earn reputation points.
            </p>
          </div>
        )}
        
        {/* ... rest of the existing overlays (status, recording) ... */}

        {status === "recording" && (
          <div style={{ position: "absolute", top: "20px", right: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "red", animation: "pulse 1s infinite" }} />
            <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.9rem", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>REC</span>
          </div>
        )}

        {(status === "submitting" || status === "success" || status === "error") && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 20,
            background: "rgba(6, 6, 25, 0.9)", backdropFilter: "blur(4px)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "32px", textAlign: "center"
          }}>
            <div style={{ fontSize: "3rem", marginBottom: "20px" }}>
              {status === "submitting" ? "⚙️" : status === "success" ? "🛡️" : "⚠️"}
            </div>
            <h4 style={{ color: "var(--text-primary)", marginBottom: "8px" }}>
              {status === "submitting" ? "Securing Evidence" : status === "success" ? "Integrity Verified" : "System Error"}
            </h4>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>{message}</p>
            {status !== "submitting" && (
              <button className="btn btn-secondary" style={{ marginTop: "24px" }} onClick={() => setStatus("capturing")}>
                Return to Viewfinder
              </button>
            )}
          </div>
        )}
      </div>

      <div className="card-footer" style={{ padding: "20px 24px", background: "var(--bg-surface)", borderTop: "1px solid var(--border-subtle)" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: 600 }}>
            {location ? "GPS Lock Active" : "Searching for GPS..."}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
            {location ? `${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}` : "Acquiring coordinates..."}
          </div>
        </div>

        {mode === "image" ? (
          <button 
            className="btn btn-primary" 
            disabled={status !== "capturing" || !location}
            onClick={handleCaptureImage}
          >
            Take Secure Photo
          </button>
        ) : (
          <button 
            className={`btn ${status === "recording" ? "btn-danger" : "btn-primary"}`}
            disabled={(status !== "capturing" && status !== "recording") || !location}
            onClick={status === "recording" ? stopRecording : startRecording}
          >
            {status === "recording" ? "Stop & Submit" : "Start Live Record"}
          </button>
        )}
      </div>
    </section>
  );
}
