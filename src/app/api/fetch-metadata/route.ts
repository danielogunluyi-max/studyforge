import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  
  try {
    // Special case for YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      const oembed = await oembedRes.json();
      return NextResponse.json({
        title: oembed.title,
        author: oembed.author_name,
        siteName: 'YouTube',
        sourceType: 'video',
        accessedDate: new Date().toISOString().split('T')[0]
      });
    }

    // For all other URLs fetch the HTML and parse meta tags
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();

    const getMeta = (property: string) => {
      const match = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${property}["']`, 'i'));
      return match?.[1] ?? '';
    };

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

    return NextResponse.json({
      title: getMeta('og:title') || getMeta('twitter:title') || titleMatch?.[1] || '',
      author: getMeta('article:author') || getMeta('author') || '',
      siteName: getMeta('og:site_name') || new URL(url).hostname.replace('www.', ''),
      publishedDate: getMeta('article:published_time') || getMeta('og:updated_time') || '',
      description: getMeta('og:description') || getMeta('description') || '',
      sourceType: 'website',
      accessedDate: new Date().toISOString().split('T')[0]
    });

  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 });
  }
}
