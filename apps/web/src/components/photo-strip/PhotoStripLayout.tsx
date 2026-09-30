import type { PhotoShotType, PhotoStripRow } from "../../types/photo";
import PhotoFrame from "./PhotoFrame";

type PhotoStripLayoutProps = {
  photos: PhotoShotType[];
  rows: PhotoStripRow[];
  className: string;
};

export default function PhotoStripLayout({
  photos,
  rows,
  className,
}: PhotoStripLayoutProps) {
  const getPhoto = (shot: number | null) =>
    photos.find((photo) => photo.shot === shot);

  return (
    <div id="printable-strip" className={`photo-strip ${className}`}>
      <header className="strip-header">
        <h2 className="strip-title">OUR MEMORIES ♥</h2>
        <p className="strip-subtitle">little moments, big memories</p>
      </header>

      <div className="strip-grid">
        {rows.map((row) => {
          const pair = getPhoto(row.shot);

          return (
            <div className="strip-row" key={row.id}>
              <PhotoFrame
                src={pair?.myPhoto ?? null}
                label={`Your photo, row ${row.id}`}
              />

              <PhotoFrame
                src={pair?.partnerPhoto ?? null}
                label={`Partner photo, row ${row.id}`}
              />
            </div>
          );
        })}
      </div>

      <footer className="strip-footer">MADE WITH LOVE ♥</footer>
    </div>
  );
}
