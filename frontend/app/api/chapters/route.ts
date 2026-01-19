import { NextRequest, NextResponse } from 'next/server';

// This handles POST /api/chapters (create chapter)
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let body;

    if (contentType.includes('application/json')) {
      const json = await request.json();
      // If backend expects FormData for consistency, we could convert it, 
      // but chapterController.js handles JSON fine.
      body = JSON.stringify(json);
    } else {
      body = await request.formData();
    }

    // Forward to backend API
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://goldfish-app-d9t4j.ondigitalocean.app/api';
    const response = await fetch(`${backendUrl}/chapters`, {
      method: 'POST',
      body: body,
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        ...(contentType.includes('application/json') ? { 'Content-Type': 'application/json' } : {}),
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Chapter creation error:', error);
    return NextResponse.json(
      { success: false, message: (error instanceof Error ? error.message : 'Failed to create chapter') },
      { status: 500 }
    );
  }
}
