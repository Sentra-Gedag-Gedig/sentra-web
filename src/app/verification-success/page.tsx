"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import Image from "next/image";
import ekyc from "../../../public/ekyc.svg";

export default function VerificationSuccessPage() {
  const router = useRouter();
  const [returnApp, setReturnApp] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState<boolean>(false);

  useEffect(() => {
    // Get URL parameters
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get("returnTo");

    if (returnTo) {
      setReturnApp(returnTo);

      // Set a brief delay to show the success page before redirecting
      const timer = setTimeout(() => {
        setRedirecting(true);
        window.location.href = returnTo;
      }, 2000); // 2 second delay before automatically redirecting

      return () => clearTimeout(timer);
    }
  }, []);

  const handleReturnClick = () => {
    if (returnApp) {
      // Redirect back to the mobile app using the deep link
      setRedirecting(true);
      window.location.href = returnApp;
    } else {
      // Fallback to home page if no return URL is specified
      router.push("/");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
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

        {/* Redirect message */}
        {redirecting && returnApp && (
          <p className="text-center text-gray-500 mb-4">
            Mengarahkan kembali ke aplikasi...
          </p>
        )}

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
