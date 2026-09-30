type CountdownOverlayProps = {
  count: number | null;
};

export default function CountdownOverlay({ count }: CountdownOverlayProps) {
  if (count === null) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="text-center">
        <div
          key={count}
          className="animate-pulse text-[12rem] font-black leading-none text-white drop-shadow-2xl"
        >
          {count}
        </div>

        <p className="mt-6 text-xl font-medium text-white/80">Get ready! 📸</p>
      </div>
    </div>
  );
}
