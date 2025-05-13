"use client";

import { useEffect } from "react";

// Komponen untuk menangani alur navigasi antara mobile app dan web
export default function MobileAppRedirector({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Deteksi apakah halaman ini dibuka dari aplikasi mobile atau web browser
    const isMobileApp = () => {
      // Ada beberapa cara untuk mendeteksi apakah dibuka dari aplikasi mobile
      // 1. Check User-Agent (tidak 100% reliable)
      // 2. URL Parameter (lebih disarankan)
      // 3. Custom scheme atau deep link

      // Berikut contoh implementasi sederhana menggunakan URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      return (
        urlParams.has("source") && urlParams.get("source") === "mobile_app"
      );
    };

    // Jika ini adalah redirect dari mobile app
    if (isMobileApp()) {
      console.log("Halaman diakses dari aplikasi mobile");

      // Simpan informasi bahwa ini adalah sesi yang berasal dari mobile app
      localStorage.setItem("fromMobileApp", "true");

      // Tambahkan event listener untuk menangkap saat verifikasi selesai
      const handleVerificationComplete = () => {
        // Pada aplikasi nyata, ini akan membuka deeplink kembali ke aplikasi mobile
        // Contoh: window.location.href = 'sentra://verification-success'

        console.log("Verifikasi selesai, kembali ke aplikasi mobile");
        alert(
          "Verifikasi selesai! Pada implementasi nyata, pengguna akan diarahkan kembali ke aplikasi mobile."
        );
      };

      // Register event listener global untuk komunikasi antar komponen
      window.addEventListener(
        "verification-complete",
        handleVerificationComplete
      );

      return () => {
        window.removeEventListener(
          "verification-complete",
          handleVerificationComplete
        );
      };
    } else {
      // Jika diakses langsung dari web browser
      console.log("Halaman diakses dari web browser");
    }
  }, []);

  return <>{children}</>;
}
