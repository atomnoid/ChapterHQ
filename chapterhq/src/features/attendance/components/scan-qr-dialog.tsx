"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Force html5-qrcode's injected video to fill the container without breaking scan logic
const qrStyles = `
  #qr-reader-target {
    width: 100% !important;
    height: 100% !important;
    border: none !important;
    padding: 0 !important;
    position: relative !important;
  }
  #qr-reader-target video {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
    display: block !important;
  }
  #qr-reader-target canvas {
    position: absolute !important;
    opacity: 0 !important;
    pointer-events: none !important;
    top: 0 !important;
    left: 0 !important;
    width: 1px !important;
    height: 1px !important;
  }
  #qr-reader-target__dashboard {
    display: none !important;
  }
  #qr-reader-target__header_message {
    display: none !important;
  }
`;

interface ScanQrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  onSuccess: () => void;
}

export function ScanQrDialog({ open, onOpenChange, eventId, onSuccess }: ScanQrDialogProps) {
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    name?: string;
    customAnswers?: any;
    phone?: string | null;
    usn?: string | null;
  } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [submittingManual, setSubmittingManual] = useState(false);
  const [customForm, setCustomForm] = useState<any | null>(null);

  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  // Guard to prevent duplicate scan callbacks firing before stop() completes
  const processingRef = useRef(false);
  const scannerId = "qr-reader-target";

  useEffect(() => {
    if (open) {
      setScanResult(null);
      setProcessing(false);
      processingRef.current = false;
      setManualToken("");
      // Fetch custom form structure
      fetch(`/api/events/${eventId}/form`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => setCustomForm(data))
        .catch(() => setCustomForm(null));

      // Delay initialization slightly to let Dialog render the target element
      const timer = setTimeout(() => {
        startScanner();
      }, 500);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
      setCustomForm(null);
    }
  }, [open, eventId]);

  async function startScanner() {
    // Reset guard before each new scan session
    processingRef.current = false;
    try {
      setScanning(true);
      const html5QrCode = new Html5Qrcode(scannerId);
      qrScannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText: string) => {
          // Guard: ignore if already processing a scan
          if (processingRef.current) return;
          processingRef.current = true;
          await handleScannedToken(decodedText);
        },
        () => {
          // Ignore failures to decode on individual frames
        }
      );
    } catch {
      setScanning(false);
    }
  }

  async function stopScanner() {
    if (qrScannerRef.current && qrScannerRef.current.isScanning) {
      try {
        await qrScannerRef.current.stop();
      } catch {
        // Safe ignore
      }
      qrScannerRef.current = null;
    }
    setScanning(false);
  }

  async function handleScannedToken(token: string) {
    // Show processing state immediately so the "Camera Access Required"
    // overlay never flashes between scan detection and result display
    setProcessing(true);
    // Stop scanner to prevent further callbacks
    await stopScanner();

    try {
      const res = await fetch(`/api/events/${eventId}/attendance/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const json = await res.json();

      if (res.ok) {
        setScanResult({
          success: true,
          message: json.message ?? "Attendance marked successfully.",
          name: json.data?.participantName,
          customAnswers: json.data?.customAnswers,
          phone: json.data?.phone,
          usn: json.data?.usn,
        });
        onSuccess();
      } else {
        setScanResult({
          success: false,
          message: json.message ?? "Failed to mark attendance.",
        });
      }
    } catch {
      setScanResult({
        success: false,
        message: "A network error occurred. Please try again.",
      });
    } finally {
      setProcessing(false);
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualToken.trim()) return;

    setSubmittingManual(true);
    setScanResult(null);

    try {
      const res = await fetch(`/api/events/${eventId}/attendance/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: manualToken.trim() }),
      });

      const json = await res.json();

      if (res.ok) {
        setScanResult({
          success: true,
          message: json.message ?? "Attendance marked successfully.",
          name: json.data?.participantName,
          customAnswers: json.data?.customAnswers,
          phone: json.data?.phone,
          usn: json.data?.usn,
        });
        setManualToken("");
        onSuccess();
      } else {
        setScanResult({
          success: false,
          message: json.message ?? "Failed to mark attendance.",
        });
      }
    } catch {
      setScanResult({
        success: false,
        message: "A network error occurred. Please try again.",
      });
    } finally {
      setSubmittingManual(false);
    }
  }

  // Show overlay when we have a result OR when actively processing (prevents flicker)
  const showResultOverlay = scanResult !== null || processing;

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) {
        stopScanner();
      }
      onOpenChange(v);
    }}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle>Scan Participant QR Code</DialogTitle>
          <DialogDescription>
            Point the camera at the participant&apos;s check-in QR code.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Inject CSS to override html5-qrcode internal element sizing */}
          <style dangerouslySetInnerHTML={{ __html: qrStyles }} />

          {/* Scanner frame — fixed height so html5-qrcode video renders fully */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-black" style={{ height: "320px" }}>
            <div id={scannerId} className="absolute inset-0" />

            {/* Camera access required — only shown when not scanning and no result/processing */}
            {!scanning && !showResultOverlay && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white bg-black/60 p-4 text-center">
                <svg
                  className="h-10 w-10 animate-pulse text-primary"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
                <p className="text-sm font-semibold">Camera Access Required</p>
                <p className="text-xs opacity-75">Make sure you have granted camera permissions.</p>
                <Button size="sm" onClick={startScanner} className="mt-2 rounded-full">
                  Retry Camera
                </Button>
              </div>
            )}

            {/* Processing spinner — shown while awaiting API response */}
            {processing && !scanResult && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white bg-black/70">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-semibold">Processing…</p>
              </div>
            )}

            {/* Scan Overlay Result */}
            {scanResult && (
              <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white ${
                scanResult.success ? "bg-emerald-600/95" : "bg-destructive/95"
              }`}>
                {scanResult.success ? (
                  <CheckCircle className="h-14 w-14 mb-3 text-white" />
                ) : (
                  <AlertCircle className="h-14 w-14 mb-3 text-white" />
                )}
                <h3 className="text-lg font-bold">
                  {scanResult.success ? "Check-in Successful" : "Check-in Failed"}
                </h3>
                {scanResult.name && (
                  <p className="text-xl font-extrabold mt-1 tracking-tight">{scanResult.name}</p>
                )}
                <p className="text-sm mt-1 max-w-[280px] leading-relaxed opacity-95">
                  {scanResult.message}
                </p>

                {scanResult.success && customForm && customForm.fields && scanResult.customAnswers && (
                  <div className="mt-3 bg-white/15 rounded-xl p-3 text-left w-full text-xs max-h-[140px] overflow-y-auto space-y-1.5 scrollbar-thin">
                    <p className="font-bold border-b border-white/20 pb-1 mb-1 opacity-90 uppercase tracking-wider text-[10px]">Registration Info</p>
                    {customForm.fields.map((field: any) => {
                      const answer = scanResult.customAnswers?.[field.key];
                      if (answer === undefined || answer === null || answer === "") return null;
                      let displayVal = "";
                      if (Array.isArray(answer)) displayVal = answer.join(", ");
                      else if (typeof answer === "boolean") displayVal = answer ? "Yes" : "No";
                      else displayVal = String(answer);
                      return (
                        <div key={field.id} className="grid grid-cols-3 gap-1">
                          <span className="font-semibold opacity-80 truncate">{field.label}:</span>
                          <span className="col-span-2 font-bold break-words">{displayVal}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {scanResult.success && !customForm && (scanResult.phone || scanResult.usn) && (
                  <div className="mt-3 bg-white/15 rounded-xl p-3 text-left w-full text-xs space-y-1">
                    <p className="font-bold border-b border-white/20 pb-1 mb-1 opacity-90 uppercase tracking-wider text-[10px]">Registration Info</p>
                    {scanResult.phone && (
                      <div className="grid grid-cols-3 gap-1">
                        <span className="font-semibold opacity-80">Phone:</span>
                        <span className="col-span-2 font-bold">{scanResult.phone}</span>
                      </div>
                    )}
                    {scanResult.usn && (
                      <div className="grid grid-cols-3 gap-1">
                        <span className="font-semibold opacity-80">USN/ID:</span>
                        <span className="col-span-2 font-bold">{scanResult.usn}</span>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  variant="outline"
                  className="mt-4 rounded-full bg-white/20 text-white border-white/40 hover:bg-white/30 hover:text-white"
                  onClick={() => {
                    setScanResult(null);
                    processingRef.current = false;
                    startScanner();
                  }}
                >
                  Scan Next Code
                </Button>
              </div>
            )}
          </div>

          {/* Manual Input Fallback */}
          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-secondary-foreground mb-2">
              Or enter check-in token manually:
            </p>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. reg_xxxx..."
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                disabled={submittingManual}
                className="flex-1 h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button type="submit" disabled={submittingManual || !manualToken.trim()} className="rounded-xl">
                {submittingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
