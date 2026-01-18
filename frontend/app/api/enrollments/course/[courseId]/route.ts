import { NextRequest, NextResponse } from 'next/server';

// This handles DELETE /api/enrollments/course/[courseId] (unenroll)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://goldfish-app-d9t4j.ondigitalocean.app/api';
    const response = await fetch(`${backendUrl}/enrollments/course/${courseId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Unenrollment error:', error);
    return NextResponse.json(
      { success: false, message: (error instanceof Error ? error.message : 'Failed to unenroll from course') },
      { status: 500 }
    );
  }
}
