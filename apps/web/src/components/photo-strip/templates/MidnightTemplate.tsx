import PhotoStripLayout from "../PhotoStripLayout";
import type { PhotoStripTemplateProps } from "../templateType";

export default function MidnightTemplate({
  photos,
  rows,
}: PhotoStripTemplateProps) {
  return (
    <PhotoStripLayout photos={photos} rows={rows} className="theme-midnight" />
  );
}
