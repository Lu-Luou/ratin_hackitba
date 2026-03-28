export type WebSearchCitation = {
  title: string;
  url: string;
  snippet: string;
  source: "tavily" | "duckduckgo";
  publishedAt?: string;
};

type SearchInput = {
  query: string;
  maxResults?: number;
};

type DuckDuckGoTopic = {
  FirstURL?: string;
  Text?: string;
  Name?: string;
  Topics?: DuckDuckGoTopic[];
};

type DuckDuckGoResponse = {
  AbstractText?: string;
  AbstractURL?: string;
  AbstractSource?: string;
  RelatedTopics?: DuckDuckGoTopic[];
};

type TavilyResponse = {
  results?: Array<{
    title?: string;
    url?: string;
    content?: string;
    published_date?: string;
  }>;
};

function cleanText(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3)}...`;
}

function flattenTopics(topics: DuckDuckGoTopic[] = []) {
  const out: DuckDuckGoTopic[] = [];

  for (const topic of topics) {
    if (Array.isArray(topic.Topics) && topic.Topics.length > 0) {
      out.push(...flattenTopics(topic.Topics));
    } else {
      out.push(topic);
    }
  }

  return out;
}

async function searchWithTavily(input: SearchInput): Promise<WebSearchCitation[]> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    return [];
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      query: input.query,
      max_results: input.maxResults ?? 4,
      search_depth: "advanced",
      topic: "news",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json().catch(() => ({}))) as TavilyResponse;

  return (payload.results ?? [])
    .filter((item) => typeof item.url === "string" && typeof item.title === "string")
    .map((item) => ({
      title: item.title as string,
      url: item.url as string,
      snippet: cleanText(item.content ?? "", 220),
      source: "tavily" as const,
      publishedAt: item.published_date,
    }));
}

async function searchWithDuckDuckGo(input: SearchInput): Promise<WebSearchCitation[]> {
  const params = new URLSearchParams({
    q: input.query,
    format: "json",
    no_html: "1",
    no_redirect: "1",
  });

  const response = await fetch(`https://api.duckduckgo.com/?${params.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json().catch(() => ({}))) as DuckDuckGoResponse;
  const citations: WebSearchCitation[] = [];

  if (payload.AbstractText && payload.AbstractURL) {
    citations.push({
      title: payload.AbstractSource ?? "DuckDuckGo abstract",
      url: payload.AbstractURL,
      snippet: cleanText(payload.AbstractText, 220),
      source: "duckduckgo",
    });
  }

  const related = flattenTopics(payload.RelatedTopics).slice(0, input.maxResults ?? 4);

  for (const topic of related) {
    if (!topic.FirstURL || !topic.Text) {
      continue;
    }

    citations.push({
      title: topic.Name ?? "DuckDuckGo result",
      url: topic.FirstURL,
      snippet: cleanText(topic.Text, 220),
      source: "duckduckgo",
    });
  }

  return citations;
}

export async function runWebSearch(input: SearchInput): Promise<WebSearchCitation[]> {
  const primary = await searchWithTavily(input);

  if (primary.length > 0) {
    return primary.slice(0, input.maxResults ?? 4);
  }

  const fallback = await searchWithDuckDuckGo(input);
  return fallback.slice(0, input.maxResults ?? 4);
}
