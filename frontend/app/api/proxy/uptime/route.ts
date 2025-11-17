import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555';
  try {
    const url = new URL(request.url);
    const search = url.search || '';
    const res = await fetch(`${base}/api/uptime${search}`);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ success: false, error: 'Upstream did not return JSON' }, { status: res.status });
    }
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
