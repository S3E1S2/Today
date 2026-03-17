export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return new Response('Missing ?url= parameter', { status: 400 })
  }

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSS reader)' },
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      return new Response(`Upstream error: ${response.status}`, { status: response.status })
    }

    const text = await response.text()
    return new Response(text, {
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
    })
  } catch (err) {
    return new Response(`Fetch failed: ${String(err)}`, { status: 500 })
  }
}
