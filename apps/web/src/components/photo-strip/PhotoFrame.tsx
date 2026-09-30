type PhotoFrameProps = {
  src: string | null;
  label: string;
};

export default function PhotoFrame({ src, label }: PhotoFrameProps) {
  return (
    <div className="strip-photo-frame">
      {src ? (
        <img src={src} alt={label} className="strip-photo" />
      ) : (
        <div className="strip-empty">Empty frame</div>
      )}
    </div>
  );
}
