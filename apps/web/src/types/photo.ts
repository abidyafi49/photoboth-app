export type PhotoShotType = {
  shot: number;
  myPhoto: string;
  partnerPhoto: string;
};

export type PhotoStripTheme =
  | "classic"
  | "pink"
  | "midnight"
  | "retro-film"
  | "floral"
  | "neon"
  | "beach"
  | "minimal"
  | "vintage"
  | "galaxy";

export type PhotoStripRow = {
  id: number;
  shot: number | null;
};
