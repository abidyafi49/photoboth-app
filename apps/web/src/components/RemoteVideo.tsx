import { useEffect, useRef } from "react";

type RemoteVideoProps = {
  stream: MediaStream | null;
};

export default function RemoteVideo({ stream }: RemoteVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl">
      <div className="aspect-video">
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-white/50">
            Waiting for partner camera...
          </div>
        )}
      </div>

      <div className="absolute left-4 top-4">
        <div className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-sm text-white backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-green-400" />
          Partner
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
    </div>
  );
}
