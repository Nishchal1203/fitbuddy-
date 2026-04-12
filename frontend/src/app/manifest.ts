import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fitbuddy",
    short_name: "Fitbuddy",
    description: "Your personal fitness tracking companion",
    start_url: "/",
    display: "standalone",
    background_color: "#F9F8FC",
    theme_color: "#BE70E7",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
