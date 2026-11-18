import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const bffUrl = process.env.BFF_INTERNAL_URL ?? 'http://localhost:8090';
    const loginUrl = `${bffUrl}/api/auth/login`;

    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    // Forward Set-Cookie headers from BFF response
    if (response.headers.get('set-cookie')) {
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        // Create a response and manually set cookies
        const nextResponse = NextResponse.json(data, { status: response.status });
        nextResponse.headers.set('set-cookie', setCookie);
        return nextResponse;
      }
    }

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Login route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
