import PhotoStripLayout from "../PhotoStripLayout";
import type { PhotoStripTemplateProps } from "../templateType";

export default function ClassicTemplate({
  photos,
  rows,
}: PhotoStripTemplateProps) {
  return (
    <PhotoStripLayout photos={photos} rows={rows} className="theme-classic" />
  );
}
