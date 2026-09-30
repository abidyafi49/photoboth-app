import { useEffect, useRef, useState } from "react";

type CameraPreviewProps = {
  onReady: (stream: MediaStream, video: HTMLVideoElement) => void;
  label?: string;
};

export default function CameraPreview({
  onReady,
  label = "You",
}: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readyRef = useRef(false);

  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        console.log("[Camera] Requesting camera...");

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera API is not available");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
          },
          audio: false,
        });

        if (cancelled) {
          console.log("[Camera] Effect cancelled, stopping stream");

          stream.getTracks().forEach((track) => track.stop());

          return;
        }

        const video = videoRef.current;

        if (!video) {
          console.error("[Camera] Video element not available");

          stream.getTracks().forEach((track) => track.stop());

          return;
        }

        streamRef.current = stream;

        video.srcObject = stream;

        console.log("[Camera] Stream attached to video");

        // Jangan await video.play().
        // autoPlay + playsInline akan menangani playback.
        video
          .play()
          .then(() => {
            if (cancelled) return;

            console.log("[Camera] Video playback started");

            if (!readyRef.current) {
              readyRef.current = true;

              onReady(stream, video);
            }
          })
          .catch((error) => {
            if (cancelled) return;

            console.warn("[Camera] play() interrupted:", error);

            // Beberapa browser sudah menjalankan
            // autoplay walaupun play() reject.
            if (video.readyState >= 2 && !readyRef.current) {
              readyRef.current = true;

              onReady(stream, video);
            }
          });
      } catch (error) {
        if (cancelled) return;

        console.error("[Camera] Camera error:", error);

        if (error instanceof DOMException) {
          console.error("[Camera] Error name:", error.name);

          console.error("[Camera] Error message:", error.message);

          if (error.name === "NotAllowedError") {
            setError(
              "Camera permission was denied. Please allow camera access.",
            );
          } else if (error.name === "NotFoundError") {
            setError("No camera was found on this device.");
          } else if (error.name === "NotReadableError") {
            setError("Camera is already being used by another application.");
          } else {
            setError(`Unable to access camera: ${error.name}`);
          }
        } else {
          setError("Unable to access camera.");
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;

      console.log("[Camera] Cleaning up camera effect");

      const stream = streamRef.current;

      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop();
        });

        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }

      readyRef.current = false;
    };
  }, [onReady]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl">
      <div className="aspect-video">
        {error ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-red-400">
            {error}
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="absolute left-4 top-4">
        <div className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-sm text-white backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-green-400" />
          {label}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
    </div>
  );
}
