import type { MetadataRoute } from "next";

import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} · Finanzas personales`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    lang: "es-PE",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#0f1117",
    theme_color: "#7c3aed",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
