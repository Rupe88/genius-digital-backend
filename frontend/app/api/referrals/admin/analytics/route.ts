import { NextRequest, NextResponse } from 'next/server';
import { getReferralAnalytics } from '@/lib/api/referrals';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      status: searchParams.get('status') || undefined,
    };

    const analytics = await getReferralAnalytics(filters);

    return NextResponse.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Referral analytics error:', error);
    return NextResponse.json(
      { success: false, message: (error instanceof Error ? error.message : 'Failed to get referral analytics') },
      { status: 500 }
    );
  }
}
