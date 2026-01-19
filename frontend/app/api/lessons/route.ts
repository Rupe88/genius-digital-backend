import { NextRequest, NextResponse } from 'next/server';

// This handles POST /api/lessons (create lesson)
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let body: any;

    if (contentType.includes('application/json')) {
      const json = await request.json();
      // Lessons often need FormData on backend because of files
      const formData = new FormData();
      Object.keys(json).forEach(key => {
        if (json[key] !== undefined && json[key] !== null) {
          formData.append(key, typeof json[key] === 'object' ? JSON.stringify(json[key]) : json[key]);
        }
      });
      body = formData;
    } else {
      body = await request.formData();
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://goldfish-app-d9t4j.ondigitalocean.app/api';
    const response = await fetch(`${backendUrl}/lessons`, {
      method: 'POST',
      body: body,
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
