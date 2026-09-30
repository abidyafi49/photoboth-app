type CaptureButtonProps = {
  onClick: () => void;
  disabled?: boolean;
};

export default function CaptureButton({
  onClick,
  disabled = false,
}: CaptureButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="
        group
        relative
        flex
        h-20
        w-20
        items-center
        justify-center
        rounded-full
        border-4
        border-white
        bg-white
        shadow-[0_0_0_8px_rgba(255,255,255,0.15)]
        transition
        duration-200
        hover:scale-105
        active:scale-95
        disabled:cursor-not-allowed
        disabled:opacity-40
      "
    >
      <div
        className="
          h-14
          w-14
          rounded-full
          border-2
          border-black/10
          bg-white
          transition
          group-hover:bg-gray-100
        "
      />
    </button>
  );
}
