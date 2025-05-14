"use client";

import { Button } from "@/shared/ui/button";
import { useEffect, useRef, useState } from "react";
import { Loader2, Image } from "lucide-react";

interface QrisPositionResponse {
  message: string;
}

export default function QrisCapture() {
  const [message, setMessage] = useState<string>("QRIS tidak terdeteksi");
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // const [returnApp, setReturnApp] = useState<string | null>(null);
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
      // setReturnApp(returnTo);
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

  // const toggleFlashlight = async () => {
  //   if (!streamRef.current) return;

  //   try {
  //     const track = streamRef.current.getVideoTracks()[0];
  //     if (!track) return;

  //     const capabilities = track.getCapabilities();
  //     if (!(capabilities as any).torch) {
  //       setErrorMessage("Flashlight tidak didukung pada perangkat ini");
  //       return;
  //     }
  //   } catch (err) {
  //     console.error("Error toggling flashlight:", err);
  //     setErrorMessage("Tidak dapat mengaktifkan flashlight");
  //   }
  // };

  const openGallery = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        const selectedFile = files[0];
        console.log("File selected:", selectedFile.name);
        // TODO: Handle send image to server or smth
        processImageFromGallery(selectedFile);
      }
    };
    input.click();
  };

  const processImageFromGallery = (file: File) => {
    // Proses file gambar dari galeri
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement("img");
      img.onload = () => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Kirim gambar ke server untuk diproses
        canvas.toBlob((blob) => {
          if (
            blob &&
            wsRef.current &&
            wsRef.current.readyState === WebSocket.OPEN
          ) {
            wsRef.current.send(blob);
          }
        }, "image/jpeg");
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
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
        `${process.env.NEXT_PUBLIC_WS_URL}/api/v1/qris/ws`
      );
      console.log(ws);
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
          const result = JSON.parse(event.data) as QrisPositionResponse;
          setMessage(result.message);

          // Check if QRIS is in correct position
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

  // const captureQris = () => {
  //   // Skip if we're not in browser environment
  //   if (typeof window === "undefined" || !canvasRef.current) return;

  //   // Ambil data blob dari canvas
  //   canvasRef.current.toBlob((blob) => {
  //     if (!blob) return;

  //     // Di sini Anda bisa mengirim blob ke server atau melakukan navigasi ke halaman berikutnya
  //     let successUrl = "http://localhost:3000/qris-success";
  //     if (returnApp) {
  //       successUrl += `?returnTo=${encodeURIComponent(returnApp)}`;
  //     }

  //     if (typeof window !== "undefined") {
  //       console.log("Redirecting to:", successUrl);
  //     }
  //     window.location.href = successUrl;
  //   }, "image/jpeg");
  // };

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
      <canvas ref={canvasRef} className="hidden" />
      <div className="relative z-10 flex items-center justify-center mb-4">
        <h1
          className="text-xl md:text-2xl font-bold text-center"
          aria-label="Halaman pemindaian kode QRIS">
          Scan QR
        </h1>
      </div>
      <div
        className="relative z-10 h-16 flex flex-col items-center justify-center mb-6"
        aria-live="assertive"
        aria-relevant="all">
        <p className="text-base md:text-lg text-center">
          {getInstructionText()}
        </p>
        {isAnalyzing && isConnected && hasCameraPermission && (
          <span className="flex items-center justify-center mt-2">
            <span>Analyzing...</span>
            <Loader2 className="w-4 h-4 ml-2 animate-spin" />
          </span>
        )}
      </div>
      {!hasCameraPermission && isConnected && (
        <div className="relative z-10 mb-4">
          <Button
            className="w-full h-12 text-base bg-green-600 hover:bg-green-700 text-white rounded-lg"
            onClick={handleManualCameraRequest}
            aria-label="Berikan izin kamera">
            Berikan Izin Kamera
          </Button>
        </div>
      )}

      {/* QR Scanner Frame */}
      <div
        className="relative z-10 w-full mx-auto flex items-center justify-center"
        aria-label="Area pemindaian QRIS, posisikan kode QR di dalam kotak ini">
        <div className="relative w-64 h-64">
          {/* Corner Elements */}
          <div className="absolute top-0 left-0 h-6 w-6 border-t-2 border-l-2 border-white"></div>
          <div className="absolute top-0 right-0 h-6 w-6 border-t-2 border-r-2 border-white"></div>
          <div className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-white"></div>
          <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-white"></div>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 pb-16 pt-4 z-20 bg-gradient-to-t from-black to-transparent">
        <div className="flex justify-center mb-6">
          <button
            className="w-16 h-16 bg-white rounded-full flex items-center justify-center"
            aria-label="Buka galeri"
            onClick={openGallery}>
            <Image className="w-6 h-6 text-black" />
          </button>
        </div>

        {/* Progress bar that changes based on detection */}
        <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden px-4 max-w-sm mx-auto">
          <div
            className={`h-full bg-blue-600 transition-all duration-300 ${
              message === "OK" ? "w-full" : "w-1/3"
            }`}></div>
        </div>

        {/* Tab indicators */}
        <div className="flex justify-center gap-4 mt-6">
          <div className="flex items-center justify-center flex-col">
            <div className="w-8 h-8 flex items-center justify-center">
              <div className="w-6 h-6 bg-blue-600 flex items-center justify-center rounded">
                <span className="text-white text-xs">QR</span>
              </div>
            </div>
            <span className="text-xs text-white mt-1">Scan QR</span>
          </div>
          <div className="flex items-center justify-center flex-col opacity-50">
            <div className="w-8 h-8 flex items-center justify-center">
              <div className="w-6 h-6 border border-white flex items-center justify-center rounded">
                <span className="text-white text-xs">QR</span>
              </div>
            </div>
            <span className="text-xs text-white mt-1">Tampilkan QR</span>
          </div>
        </div>
      </div>
    </div>
  );
}
