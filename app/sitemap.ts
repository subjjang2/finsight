import type { MetadataRoute } from "next";
import { absoluteUrl } from "../lib/seo";

// 인덱싱 대상 공개 경로. 콘텐츠(가이드/블로그)를 추가하면 여기에 등록한다.
// 대시보드·API·인증 경로는 robots.ts에서 disallow 처리한다.
const PUBLIC_ROUTES = ["/"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((route) => ({
    url: absoluteUrl(route),
    changeFrequency: "weekly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
