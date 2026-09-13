import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://ensaiopro.site";
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/cadastro`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/termos`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacidade`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
