import PhotoStripLayout from "../PhotoStripLayout";
import type { PhotoStripTemplateProps } from "../templateType";

export default function RetroFilmTemplate({
  photos,
  rows,
}: PhotoStripTemplateProps) {
  return (
    <PhotoStripLayout
      photos={photos}
      rows={rows}
      className="theme-retro-film"
    />
  );
}
