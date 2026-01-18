import { NextRequest, NextResponse } from 'next/server';

// This handles GET /api/enrollments/my-enrollments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = new URLSearchParams();

    // Forward all query parameters
    for (const [key, value] of searchParams.entries()) {
      queryParams.append(key, value);
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://goldfish-app-d9t4j.ondigitalocean.app/api';
    const response = await fetch(`${backendUrl}/enrollments/my-enrollments?${queryParams}`, {
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('My enrollments fetch error:', error);
    return NextResponse.json(
      { success: false, message: (error instanceof Error ? error.message : 'Failed to fetch my enrollments') },
      { status: 500 }
    );
  }
}
