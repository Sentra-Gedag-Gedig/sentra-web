"use client";

import { Button } from "@/shared/ui/button";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface KtpPositionResponse {
  message: string;
}

export function KtpCapture() {
  const [message, setMessage] = useState<string>("KTP tidak terdeteksi");
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [returnApp, setReturnApp] = useState<string | null>(null);
  const [lastInstructionTime, setLastInstructionTime] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [hasCameraPermission, setHasCameraPermission] =
    useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Set isMounted to true after mounting on client-side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Skip this effect during SSR
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get("returnTo");

    if (returnTo) {
      setReturnApp(returnTo);
    }
  }, []);

  // Function to request camera access specifically
  const requestCameraAccess = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices) {
        // Use exact video constraint for mobile devices
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment", // Prefer back camera on mobile
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        streamRef.current = stream;
        setHasCameraPermission(true);
        setErrorMessage(null);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch((err) => {
              console.error("Error playing the video:", err);
              setErrorMessage("Gagal memutar video. Silakan coba lagi.");
            });

            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              sendFrames();
            }
          };
        }
      } else {
        throw new Error("Media devices not supported on this browser");
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setErrorMessage(
          "Izin kamera ditolak. Silakan berikan izin kamera melalui pengaturan browser Anda."
        );
      } else {
        setErrorMessage(
          "Tidak dapat mengakses kamera. Pastikan perangkat Anda mendukung dan Anda memberikan izin kamera."
        );
      }
    }
  };

  const speakInstructions = (message: string) => {
    // Skip if we're not in browser environment
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const now = Date.now();

    if (now - lastInstructionTime < 3000 && isSpeaking) {
      return;
    }

    window.speechSynthesis.cancel();

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
    // Skip if we're not in browser environment
    if (typeof window === "undefined") return;

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

    frameIntervalRef.current = setTimeout(sendFrames, 3000);
  };

  useEffect(() => {
    // Skip this effect during SSR or if component isn't mounted yet
    if (typeof window === "undefined" || !isMounted) return;

    const connectToWebSocket = () => {
      const ws = new WebSocket(
        "wss://9e8d-125-160-192-29.ngrok-free.app/api/v1/ktp/ws"
      );
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setErrorMessage(null);
        console.log("Connected to backend WebSocket");

        // Only request camera if WebSocket is connected
        requestCameraAccess();
      };

      ws.onmessage = (event) => {
        try {
          const result = JSON.parse(event.data) as KtpPositionResponse;
          setMessage(result.message);

          // Check if KTP is in correct position
          if (result.message === "OK") {
            setIsAnalyzing(false);
          } else {
            setIsAnalyzing(true);
          }

          // Speak the instructions
          speakInstructions(result.message);
        } catch (err) {
          if (typeof window !== "undefined") {
            console.error("Error parsing WebSocket message:", err);
          }
        }
      };

      ws.onerror = (error) => {
        if (typeof window !== "undefined") {
          console.error("WebSocket Error:", error);
        }
        setIsConnected(false);
        setErrorMessage("Koneksi ke server gagal. Silakan coba lagi.");
      };

      ws.onclose = () => {
        if (typeof window !== "undefined") {
          console.log("WebSocket connection closed");
        }
        setIsConnected(false);
        setErrorMessage("Koneksi ke server terputus.");
      };
    };

    // Start connection process
    connectToWebSocket();

    return () => {
      if (frameIntervalRef.current && typeof window !== "undefined") {
        clearTimeout(frameIntervalRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (wsRef.current) {
        wsRef.current.close();
      }

      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
    };
  }, [isMounted]); // Depend on isMounted to ensure this only runs client-side

  const getInstructionText = () => {
    if (!isConnected) {
      return errorMessage || "Menghubungkan ke server...";
    }

    if (!hasCameraPermission && isConnected) {
      return "Menunggu izin kamera...";
    }

    return message;
  };

  const captureKtp = () => {
    // Skip if we're not in browser environment
    if (typeof window === "undefined" || !canvasRef.current) return;

    // Ambil data blob dari canvas
    canvasRef.current.toBlob((blob) => {
      if (!blob) return;

      // Di sini Anda bisa mengirim blob ke server atau melakukan navigasi ke halaman berikutnya
      let successUrl = "http://localhost:3000/ktp-success";
      if (returnApp) {
        successUrl += `?returnTo=${encodeURIComponent(returnApp)}`;
      }

      if (typeof window !== "undefined") {
        console.log("Redirecting to:", successUrl);
      }
      window.location.href = successUrl;
    }, "image/jpeg");
  };

  // Function to manually request camera access if it wasn't granted automatically
  const handleManualCameraRequest = () => {
    requestCameraAccess();
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6 text-white gap-y-4">
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
        playsInline
        muted
        autoPlay
        aria-hidden="true"
      />
      {/* Canvas tersembunyi untuk memproses frame video */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative z-10 flex items-center justify-center mb-4">
        <h1
          className="text-xl md:text-2xl font-bold text-center"
          aria-label="Halaman pengambilan foto e-KTP"
        >
          Ambil foto e-KTP
        </h1>
      </div>

      <div
        className="relative z-10 text-base md:text-lg text-center mb-6 min-h-[4.5rem]"
        aria-live="assertive"
        aria-relevant="all"
      >
        <p>{getInstructionText()}</p>
        {isAnalyzing && isConnected && hasCameraPermission && (
          <div className="flex items-center justify-center mt-2">
            <span>Analyzing...</span>
            <Loader2 className="w-4 h-4 ml-2 animate-spin" />
          </div>
        )}
      </div>

      {!hasCameraPermission && isConnected && (
        <div className="relative z-10 mb-4">
          <Button
            className="w-full h-12 text-base bg-green-600 hover:bg-green-700 text-white rounded-lg"
            onClick={handleManualCameraRequest}
            aria-label="Berikan izin kamera"
          >
            Berikan Izin Kamera
          </Button>
        </div>
      )}

      <div
        className="relative z-10 max-w-sm aspect-[79/50] rounded-lg border-2 border-[#00027d] overflow-hidden mt-20 mx-auto flex items-center justify-center"
        aria-label="Area penempatan KTP, posisikan KTP Anda di dalam kotak ini"
      >
        <div className="absolute right-6 top-1/2 -translate-y-1/2 w-18 h-28 border-2 border-[#00027d] rounded" />
      </div>

      <div className="relative z-10 mt-6 max-w-sm w-full mx-auto">
        <Button
          className="w-full h-12 text-base bg-[#00027d] hover:bg-[#1f2ddc] text-white rounded-lg"
          onClick={captureKtp}
          disabled={(message !== "OK" && isConnected) || !hasCameraPermission}
          aria-label="Tombol untuk mengambil foto KTP ketika posisi sudah tepat"
        >
          {message === "OK" ? "Ambil Foto" : "Tunggu KTP Terdeteksi..."}
        </Button>
      </div>
    </div>
  );
}
