export interface LocalNewsItem {
  id: string;
  title: string;
  location: string;
  publishedAt: string;
  timeAgo: string;
  source: string;
  url: string;
  summary: string;
  category: "traffic" | "security";
  impactLevel: "low" | "medium" | "high";
}

export async function getLocalNews(
  location: string,
  limit = 8,
): Promise<LocalNewsItem[]> {
  const searchParams = new URLSearchParams({
    location,
    limit: String(limit),
  });

  const response = await fetch(`/api/local-news?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error("No se pudieron obtener las noticias locales.");
  }

  return (await response.json()) as LocalNewsItem[];
}
