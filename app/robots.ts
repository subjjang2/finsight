import type { MetadataRoute } from "next";
import { absoluteUrl, siteUrl } from "../lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 인증 게이트 뒤 앱 화면·API·콜백은 검색에 노출하지 않는다.
      disallow: ["/dashboard/", "/api/", "/auth/", "/login"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteUrl(),
  };
}
