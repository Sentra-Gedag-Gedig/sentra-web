"use client";

import { Button } from "@/shared/ui/button";
import { useEffect, useRef } from "react";

export function KtpCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (error) {
        console.error("Error accessing the camera:", error);
      }
    }

    startCamera();
  }, []);

  return (
    <div className="relative w-full max-w-lg mx-auto px-4 py-6 text-white gap-y-4">
      {/* Kamera Video di Background */}
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-cover z-[-1]"
        muted
      />

      <div className="flex items-center justify-center mb-4">
        <h1 className="text-xl md:text-2xl font-bold text-center">
          Ambil foto e-KTP
        </h1>
      </div>

      <p className="text-base md:text-lg text-center mb-6">
        KTP anda terdeteksi di sebelah kiri kamera, arahkan ke kiri dan majukkan
        hp nya sedikit!
      </p>

      <div className="relative w-full aspect-video rounded-lg border-2 border-[#00027d] overflow-hidden">
        <div className="absolute right-12 top-1/2 -translate-y-1/2 w-20 h-28 border-2 border-[#00027d] rounded" />
      </div>

      <div className="mt-6">
        <Button className="w-full h-12 text-base bg-[#00027d] hover:bg-[#1f2ddc] text-white rounded-lg">
          Ambil Foto
        </Button>
      </div>
    </div>
  );
}
