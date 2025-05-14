"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type FaceStatus = "NO_FACE" | "READY" | "ADJUST";
type Direction = "left" | "right" | "up" | "down" | "closer" | "back";

interface FacePositionResponse {
  status: FaceStatus;
  instructions: Direction[];
}

export default function FacePositioningPage() {
  const router = useRouter();
  const [status, setStatus] = useState<FaceStatus>("NO_FACE");
  const [instructions, setInstructions] = useState<Direction[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [returnApp, setReturnApp] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const returnApp = params.get("returnApp");

    if (returnApp) {
      setReturnApp(returnApp);
    }
  }, []);

  const [lastInstructionTime, setLastInstructionTime] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const speakInstructions = (status: FaceStatus, instructions: Direction[]) => {
    if (!window.speechSynthesis) return;

    const now = Date.now();

    if (status !== "READY" && now - lastInstructionTime < 3000 && isSpeaking) {
      return;
    }

    window.speechSynthesis.cancel();

    let message = "";
    console.log(returnApp);

    switch (status) {
      case "NO_FACE":
        message =
          "Wajah tidak terdeteksi. Mohon posisikan wajah Anda di depan kamera.";
        break;
      // In speakInstructions function, READY case
      case "READY":
        message = "Posisi wajah sudah tepat. Mohon tunggu sebentar.";

        // Cancel speech synthesis
        window.speechSynthesis.cancel();

        // Directly redirect to mobile app like KTP detection
        const urlParams = new URLSearchParams(window.location.search);
        const returnApp = urlParams.get("returnApp");
        if (returnApp) {
          try {
            console.log(
              "Redirecting directly to mobile app with returnApp:",
              returnApp
            );
            const deepLink = new URL(returnApp);
            deepLink.searchParams.set("status", "verified");

            // No need for other data parameters for face detection

            setTimeout(() => {
              console.log("Executing redirect to:", deepLink.toString());
              window.location.href = deepLink.toString();
            }, 1000);
          } catch (error) {
            console.error("Error parsing URL:", error);
            // Fallback for invalid URL format
            const separator = returnApp.includes("?") ? "&" : "?";
            const fallbackUrl = `${returnApp}${separator}status=verified`;

            setTimeout(() => {
              console.log("Executing fallback redirect to:", fallbackUrl);
              window.location.href = fallbackUrl;
            }, 1000);
          }
        } else {
          // If no return app, go to success page
          setTimeout(() => {
            window.location.href = "/verification-success";
          }, 1000);
        }
        break;
      case "ADJUST":
        if (instructions.length > 0) {
          const directionText = instructions
            .map((dir) => {
              switch (dir) {
                case "left":
                  return "ke kiri";
                case "right":
                  return "ke kanan";
                case "up":
                  return "ke atas";
                case "down":
                  return "ke bawah";
                case "closer":
                  return "lebih dekat";
                case "back":
                  return "mundur sedikit";
                default:
                  return "";
              }
            })
            .join(" dan ");

          message = `Arahkan kepala anda ${directionText}`;
        }
        break;
    }

    if (message) {
      setLastInstructionTime(now);
      setIsSpeaking(true);

      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = "id-ID";
      utterance.rate = 1.0;

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const sendFrames = () => {
    if (
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN &&
      videoRef.current &&
      canvasRef.current
    ) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (ctx && video.videoWidth && video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        ctx.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
          if (
            blob &&
            wsRef.current &&
            wsRef.current.readyState === WebSocket.OPEN
          ) {
            wsRef.current.send(blob);
          }
        }, "image/jpeg");
      }
    }

    frameIntervalRef.current = setTimeout(sendFrames, 4500);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ws = new WebSocket(
      `${process.env.NEXT_PUBLIC_WS_URL}/api/v1/face/ws`
    );
    console.log(ws);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setErrorMessage(null);
      console.log("Connected to backend WebSocket");

      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          streamRef.current = stream;

          if (videoRef.current) {
            videoRef.current.srcObject = stream;

            videoRef.current.onloadedmetadata = () => {
              sendFrames();
            };
          }
        })
        .catch((err) => {
          console.error("Error accessing camera:", err);
          setErrorMessage(
            "Tidak dapat mengakses kamera. Pastikan Anda memberikan izin kamera."
          );
        });
    };

    ws.onmessage = (event) => {
      try {
        const result = JSON.parse(event.data) as FacePositionResponse;
        setStatus(result.status);
        setInstructions(result.instructions);

        speakInstructions(result.status, result.instructions);

        if (result.status === "READY") {
          setIsAnalyzing(false);
        } else {
          setIsAnalyzing(true);
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket Error:", error);
      setIsConnected(false);
      setErrorMessage("Koneksi ke server gagal. Silakan coba lagi.");
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
      setIsConnected(false);
      setErrorMessage("Koneksi ke server terputus.");
    };

    return () => {
      if (frameIntervalRef.current) {
        clearTimeout(frameIntervalRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (wsRef.current) {
        wsRef.current.close();
      }

      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
    };
  }, []);

  const getInstructionText = () => {
    if (!isConnected) {
      return errorMessage || "Menghubungkan ke server...";
    }

    if (status === "NO_FACE") {
      return "Wajah tidak terdeteksi";
    } else if (status === "READY") {
      return "Posisi wajah sudah tepat!";
    } else if (instructions.length > 0) {
      const directionText = instructions.map((dir) => {
        switch (dir) {
          case "left":
            return "Kiri";
          case "right":
            return "Kanan";
          case "up":
            return "Atas";
          case "down":
            return "Bawah";
          case "closer":
            return "Mendekat";
          case "back":
            return "Menjauh";
          default:
            return "";
        }
      })[0];

      return `Arahkan kepala anda ke ${directionText}`;
    }

    return "Memposisikan wajah...";
  };

  // Determine the border color based on status
  const circleBorderColor =
    status === "READY" ? "border-green-500" : "border-blue-400";

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="flex items-center p-4 bg-slate-800">
        <button
          className="p-2"
          onClick={() => router.back()}
          aria-label="Kembali">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-6 h-6">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-between py-6 px-4">
        <div className="w-full max-w-md text-center mb-6">
          <h1 className="text-xl font-medium mb-1">
            Ikutin arahan suara untuk letakkan wajah anda tepat di Lingkaran!
          </h1>
        </div>

        {/* Face positioning area */}
        <div className="relative w-full max-w-xs aspect-square mb-8">
          {/* Video element for camera feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover rounded-full ${
              isConnected ? "" : "hidden"
            }`}
          />

          {/* Hidden canvas for processing video frames */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Circle overlay with dynamic border color */}
          <div
            className={`absolute inset-0 rounded-full border-4 ${circleBorderColor} overflow-hidden transition-colors duration-300`}>
            {!isConnected && (
              <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                {errorMessage ? (
                  <p className="text-red-400 text-sm p-4 text-center">
                    {errorMessage}
                  </p>
                ) : (
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status text */}
        <div className="w-full max-w-md text-center mb-10">
          <h2
            className={`text-xl font-medium mb-2 ${
              status === "READY" ? "text-green-400" : ""
            }`}>
            {getInstructionText()}
          </h2>
          <div className="flex items-center justify-center text-sm text-gray-300">
            {isAnalyzing && isConnected && (
              <>
                <span>Analyzing...</span>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              </>
            )}
          </div>
        </div>

        {/* Progress indicator */}
        <div className="w-full max-w-md bg-gray-700 rounded-full h-1">
          <div
            className={`h-1 rounded-full transition-all duration-300 ${
              status === "READY" ? "bg-green-500" : "bg-blue-500"
            }`}
            style={{
              width: !isConnected ? "0%" : status === "READY" ? "100%" : "30%",
            }}
          />
        </div>
      </div>
    </div>
  );
}
