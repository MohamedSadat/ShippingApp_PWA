import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import "./BarcodeScanner.css";

interface BarcodeScannerProps {
  onDetected: (text: string) => void;
  onClose: () => void;
}

type ScannerError = "permissionDenied" | "noCamera" | "genericError";

export function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;
  const [error, setError] = useState<ScannerError | null>(null);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let rafId: number | null = null;
    let controls: IScannerControls | null = null;

    async function start() {
      const video = videoRef.current;
      if (!video) return;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : "";
        if (name === "NotAllowedError") setError("permissionDenied");
        else if (name === "NotFoundError" || name === "DevicesNotFoundError") setError("noCamera");
        else setError("genericError");
        return;
      }

      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      if (window.BarcodeDetector) {
        video.srcObject = stream;
        await video.play().catch(() => {});
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });

        const tick = async () => {
          if (cancelled) return;
          try {
            const barcodes = await detector.detect(video);
            if (barcodes.length > 0 && !cancelled) {
              onDetectedRef.current(barcodes[0].rawValue);
              return;
            }
          } catch {
            // transient decode errors are expected between frames; keep polling
          }
          rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
        return;
      }

      const reader = new BrowserQRCodeReader();
      try {
        controls = await reader.decodeFromStream(stream, video, (result) => {
          if (result && !cancelled) onDetectedRef.current(result.getText());
        });
      } catch {
        if (!cancelled) setError("genericError");
      }
    }

    void start();

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      controls?.stop();
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="barcode-scanner">
      {error ? (
        <p className="barcode-scanner__error">{t(`barcodeScanner.${error}`)}</p>
      ) : (
        <video ref={videoRef} className="barcode-scanner__video" muted playsInline autoPlay />
      )}
      <button type="button" className="barcode-scanner__cancel" onClick={onClose}>
        {t("barcodeScanner.cancel")}
      </button>
    </div>
  );
}
