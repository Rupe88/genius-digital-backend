import { NextRequest, NextResponse } from 'next/server';

// This handles GET /api/chapters/course/[courseId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://goldfish-app-d9t4j.ondigitalocean.app/api';
    const response = await fetch(`${backendUrl}/chapters/course/${courseId}`, {
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Course chapters fetch error:', error);
    return NextResponse.json(
      { success: false, message: (error instanceof Error ? error.message : 'Failed to fetch course chapters') },
      { status: 500 }
    );
  }
}
