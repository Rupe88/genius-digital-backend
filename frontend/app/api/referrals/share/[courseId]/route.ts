import { NextRequest, NextResponse } from 'next/server';
import { generateSharingLinks } from '@/lib/api/referrals';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;

    if (!courseId) {
      return NextResponse.json(
        { success: false, message: 'Course ID is required' },
        { status: 400 }
      );
    }

    const sharingData = await generateSharingLinks(courseId);

    return NextResponse.json({
      success: true,
      data: sharingData
    });
  } catch (error) {
    console.error('Referral sharing error:', error);
    return NextResponse.json(
      { success: false, message: (error instanceof Error ? error.message : 'Failed to generate sharing links') },
      { status: 500 }
    );
  }
}
