import { NextRequest, NextResponse } from 'next/server';

/**
 * Builds headers to forward to the BFF. The Authorization header is only
 * included when the incoming request actually carries one: forwarding an
 * empty Authorization header causes the BFF's CookieAuthenticationFilter to
 * skip the access_token cookie -> Bearer conversion, resulting in a 401.
 */
function buildForwardHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const cookie = request.headers.get('cookie');
  if (cookie) {
    headers.Cookie = cookie;
  }

  const authorization = request.headers.get('authorization');
  if (authorization) {
    headers.Authorization = authorization;
  }

  return headers;
}

export async function GET(request: NextRequest) {
  try {
    const bffUrl = process.env.BFF_INTERNAL_URL ?? 'http://localhost:8090';
    const url = new URL('/api/claims', bffUrl);
    url.search = request.nextUrl.search;

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: buildForwardHeaders(request),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Claims GET route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const bffUrl = process.env.BFF_INTERNAL_URL ?? 'http://localhost:8090';
    const submitClaimUrl = `${bffUrl}/api/claims`;

    const response = await fetch(submitClaimUrl, {
      method: 'POST',
      headers: buildForwardHeaders(request),
      body: JSON.stringify(body),
    });

    const responseText = await response.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse BFF response:', e, 'status:', response.status, 'body:', responseText);
      return NextResponse.json(
        { error: 'Failed to parse BFF response' },
        { status: 500 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Claims POST route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
