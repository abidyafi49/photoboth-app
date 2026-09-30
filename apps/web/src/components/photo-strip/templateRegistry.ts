import type { ComponentType } from "react";
import type { PhotoStripTheme } from "../../types/photo";
import type { PhotoStripTemplateProps } from "./templateType";

import ClassicTemplate from "./templates/ClassicTemplate";
import PinkTemplate from "./templates/PinkTemplate";
import MidnightTemplate from "./templates/MidnightTemplate";
import RetroFilmTemplate from "./templates/RetroFilmTemplate";
import FloralTemplate from "./templates/FloralTemplate";
import NeonTemplate from "./templates/NeonTemplate";
import BeachTemplate from "./templates/BeachTemplate";
import MinimalTemplate from "./templates/MinimalTemplate";
import VintageTemplate from "./templates/VintageTemplate";
import GalaxyTemplate from "./templates/GalaxyTemplate";

export const templateRegistry: Record<
  PhotoStripTheme,
  {
    name: string;
    backgroundColor: string;
    component: ComponentType<PhotoStripTemplateProps>;
  }
> = {
  classic: {
    name: "Classic",
    backgroundColor: "#ffffff",
    component: ClassicTemplate,
  },
  pink: {
    name: "Pink",
    backgroundColor: "#fce7f3",
    component: PinkTemplate,
  },
  midnight: {
    name: "Midnight",
    backgroundColor: "#1e293b",
    component: MidnightTemplate,
  },
  "retro-film": {
    name: "Retro Film",
    backgroundColor: "#f5e6c8",
    component: RetroFilmTemplate,
  },
  floral: {
    name: "Floral",
    backgroundColor: "#fce7f3",
    component: FloralTemplate,
  },
  neon: {
    name: "Neon",
    backgroundColor: "#171717",
    component: NeonTemplate,
  },
  beach: {
    name: "Beach",
    backgroundColor: "#dff5f2",
    component: BeachTemplate,
  },
  minimal: {
    name: "Minimal",
    backgroundColor: "#ffffff",
    component: MinimalTemplate,
  },
  vintage: {
    name: "Vintage",
    backgroundColor: "#ead7b7",
    component: VintageTemplate,
  },
  galaxy: {
    name: "Galaxy",
    backgroundColor: "#111827",
    component: GalaxyTemplate,
  },
};