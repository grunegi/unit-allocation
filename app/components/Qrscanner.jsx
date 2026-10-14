"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export default function QrScanner({
  onScan,
  onError,
  autoStart = false,
  stopOnScan = true,
  elementId = "qr-reader",
}) {
  const scannerRef = useRef(null);
  const busyRef = useRef(false);
  const aliveRef = useRef(true);
  const lastScanRef = useRef({ code: "", time: 0 });
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onScanRef.current = onScan;
    onErrorRef.current = onError;
  });

  const stop = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try { await scanner.stop(); } catch {}
      try { scanner.clear(); } catch {}
    }
    if (aliveRef.current) setIsScanning(false);
  }, []);

  const start = useCallback(async () => {
    if (busyRef.current || scannerRef.current) return;
    busyRef.current = true;
    setLoading(true);
    setErrorText("");

    try {
      console.log("[QrScanner] start clicked");

      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw Object.assign(new Error("insecure"), { name: "InsecureContext" });
      }
      if (!document.getElementById(elementId)) {
        throw new Error(`المنت با id=${elementId} پیدا نشد`);
      }

      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(elementId, false);

      const config = {
        fps: 10,
        qrbox: (viewW) => {
          const size = Math.max(150, Math.floor(Math.min(viewW, 500) * 0.7));
          return { width: size, height: size };
        },
      };

      const handleDecoded = (text) => {
        const code = text.trim().toUpperCase();
        const now = Date.now();
        if (code === lastScanRef.current.code && now - lastScanRef.current.time < 2000) return;
        lastScanRef.current = { code, time: now };
        onScanRef.current?.(code);
        if (stopOnScan) stop();
      };

      // ترتیب تلاش: دوربین پشت، دوربین جلو، اولین دوربین موجود
      const attempts = [
        { facingMode: "environment" },
        { facingMode: "user" },
        async () => {
          const cams = await Html5Qrcode.getCameras();
          if (!cams?.length) throw Object.assign(new Error("no camera"), { name: "NotFoundError" });
          return cams[0].id;
        },
      ];

      let lastErr;
      let started = false;
      for (const attempt of attempts) {
        try {
          const cameraConfig = typeof attempt === "function" ? await attempt() : attempt;
          await scanner.start(cameraConfig, config, handleDecoded, () => {});
          started = true;
          break;
        } catch (err) {
          console.warn("[QrScanner] attempt failed:", err);
          lastErr = err;
          // اگر کاربر اجازه نداد، تلاش دوباره فایده ندارد
          if (err?.name === "NotAllowedError" || /permission/i.test(String(err))) break;
        }
      }

      if (!started) throw lastErr || new Error("start failed");

      scannerRef.current = scanner;
      if (!aliveRef.current) { await stop(); return; }
      setIsScanning(true);
    } catch (err) {
      console.error("[QrScanner] error:", err);
      scannerRef.current = null;

      let message = "اسکنر شروع نشد.";
      const raw = String(err?.message || err);
      if (err?.name === "InsecureContext") message = "دوربین فقط روی HTTPS یا localhost کار می‌کند.";
      else if (err?.name === "NotAllowedError" || /permission|denied/i.test(raw)) message = "اجازه‌ی دوربین داده نشده. از آیکون قفل کنار آدرس مرورگر، دوربین را Allow کنید.";
      else if (err?.name === "NotFoundError" || /no camera|not found/i.test(raw)) message = "دوربینی روی این دستگاه پیدا نشد.";
      else if (err?.name === "NotReadableError") message = "دوربین توسط برنامه یا تب دیگری در حال استفاده است.";

      const full = `${message} (${err?.name || "Error"}: ${raw})`;
      setErrorText(full);
      onErrorRef.current?.(message);
    } finally {
      busyRef.current = false;
      if (aliveRef.current) setLoading(false);
    }
  }, [elementId, stopOnScan, stop]);

  useEffect(() => {
    aliveRef.current = true;
    if (autoStart) start();
    return () => {
      aliveRef.current = false;
      stop();
    };
  }, [autoStart, start, stop]);

  return (
    <div className="scanner">
      <div id={elementId} className="qr-reader" />
      <div className="actions">
        {isScanning ? (
          <button type="button" className="gray scanner-btn" onClick={stop}>توقف اسکن</button>
        ) : (
          <button type="button" className="scanner-btn" onClick={start} disabled={loading}>
            {loading ? "در حال روشن شدن دوربین..." : "شروع اسکن"}
          </button>
        )}
      </div>
      {errorText && (
        <p role="alert" style={{ color: "#dc2626", marginTop: 8, fontSize: "0.9rem", direction: "ltr", textAlign: "left", wordBreak: "break-word" }}>
          {errorText}
        </p>
      )}
    </div>
  );
}