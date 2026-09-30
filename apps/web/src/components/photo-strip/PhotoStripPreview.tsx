import type {
  PhotoShotType,
  PhotoStripRow,
  PhotoStripTheme,
} from "../../types/photo";
import { templateRegistry } from "./templateRegistry";
import "./styles/index.css";

type PhotoStripPreviewProps = {
  photos: PhotoShotType[];
  rows: PhotoStripRow[];
  theme: PhotoStripTheme;
};

export default function PhotoStripPreview({
  photos,
  rows,
  theme,
}: PhotoStripPreviewProps) {
  const Template = templateRegistry[theme].component;

  return <Template photos={photos} rows={rows} />;
}
