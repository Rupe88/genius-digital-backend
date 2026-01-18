import { NextRequest, NextResponse } from 'next/server';

// This handles POST /api/lessons (create lesson)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://goldfish-app-d9t4j.ondigitalocean.app/api';
    const response = await fetch(`${backendUrl}/lessons`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Lesson creation error:', error);
    return NextResponse.json(
      { success: false, message: (error instanceof Error ? error.message : 'Failed to create lesson') },
      { status: 500 }
    );
  }
}
