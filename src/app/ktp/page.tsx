import Header from "@/features/ktp/components/header";
import { KtpCapture } from "@/features/ktp/components/ktp-capture";
import React from "react";

export default function KTP() {
  return (
    <main className="min-h-screen w-screen bg-[#252525]/100">
      <Header />
      <KtpCapture />
    </main>
  );
}
