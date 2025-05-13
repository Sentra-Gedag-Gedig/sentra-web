"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import Image from "next/image";
import ekyc from "../../../public/ekyc.svg";

export default function VerificationSuccessPage() {
  const router = useRouter();
  const [returnApp, setReturnApp] = useState<string | null>(null);

  useEffect(() => {
    // Get URL parameters
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get("returnTo");
    ``;
    if (returnTo) {
      setReturnApp(returnTo);
    }
  }, []);

  const handleReturnClick = () => {
    if (returnApp) {
      // Redirect back to the mobile app using the deep link
      window.location.href = returnApp;
    } else {
      // Fallback to home page if no return URL is specified
      router.push("/");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Status bar mockup */}
      <div className="bg-gray-100 py-2 px-4 flex justify-between items-center">
        <div className="text-sm font-medium">9:09</div>
        <div className="flex items-center space-x-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4">
            <path
              fillRule="evenodd"
              d="M1.371 8.143c5.858-5.857 15.356-5.857 21.213 0a.75.75 0 0 1 0 1.061l-.53.53a.75.75 0 0 1-1.06 0c-4.95-4.95-12.99-4.95-17.94 0a.75.75 0 0 1-1.06 0l-.53-.53a.75.75 0 0 1 0-1.06zm3.182 3.182a9 9 0 0 1 12.728 0 .75.75 0 0 1 0 1.06l-.53.53a.75.75 0 0 1-1.06 0 6 6 0 0 0-8.486 0 .75.75 0 0 1-1.06 0l-.53-.53a.75.75 0 0 1 0-1.06zm3.182 3.182a3 3 0 0 1 4.243 0 .75.75 0 0 1 0 1.06l-.53.53a.75.75 0 0 1-1.06 0 .75.75 0 0 0-1.06 0 .75.75 0 0 1-1.06 0l-.53-.53a.75.75 0 0 1 0-1.06z"
              clipRule="evenodd"
            />
          </svg>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4">
            <path d="M4 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4zm16 8.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z" />
          </svg>
        </div>
      </div>

      {/* Back button */}
      <div className="px-4 py-2">
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
            className="w-5 h-5">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Illustration */}
        <div className="w-full max-w-xs mb-4">
          <div className="relative w-full aspect-video">
            {/* Placeholder for the KYC illustration */}
            <Image src={ekyc} alt="e-kyc" />
          </div>
        </div>

        {/* Success message */}
        <h1 className="text-2xl font-bold text-[#1E1699] text-center mb-3">
          Verifikasi telah sukses
        </h1>

        <p className="text-center text-gray-700 mb-8 max-w-xs">
          Kamu telah berhasil memverifikasi diri kamu! Selamat datang dan segera
          lihat apa yang bisa kamu lakukan di Sentra!
        </p>

        {/* Return button */}
        <Button
          onClick={handleReturnClick}
          className="w-full max-w-xs bg-[#1E1699] hover:bg-[#161271] text-white font-medium py-3 px-4 rounded-lg">
          Kembali ke Beranda
        </Button>
      </div>
    </div>
  );
}
