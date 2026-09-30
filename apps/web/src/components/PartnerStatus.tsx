type PartnerStatusProps = {
  partnerConnected: boolean;
  partnerCameraReady: boolean;
  partnerWebRTCReady: boolean;
};

export default function PartnerStatus({
  partnerConnected,
  partnerCameraReady,
  partnerWebRTCReady,
}: PartnerStatusProps) {
  if (!partnerConnected) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
        <span className="h-3 w-3 shrink-0 rounded-full bg-red-400" />

        <div>
          <p className="font-semibold text-red-400">Partner disconnected</p>
          <p className="text-sm text-white/60">
            Waiting for your partner to reconnect...
          </p>
        </div>
      </div>
    );
  }

  const bothReady = partnerCameraReady && partnerWebRTCReady;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
      <span
        className={`h-3 w-3 shrink-0 rounded-full ${
          bothReady ? "bg-green-400" : "bg-yellow-400"
        }`}
      />

      <div>
        <p className="font-semibold text-white">
          {bothReady ? "Partner connected" : "Connecting to partner"}
        </p>
        <p className="text-sm text-white/60">
          {!partnerCameraReady
            ? "Waiting for partner's camera..."
            : !partnerWebRTCReady
              ? "Establishing video connection..."
              : "Both of you are ready!"}
        </p>
      </div>
    </div>
  );
}
