import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://ensaiopro.site";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/cadastro", "/login", "/termos", "/privacidade"],
        disallow: ["/dashboard", "/ensaios", "/historico", "/planos", "/admin", "/api"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
