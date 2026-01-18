import { NextRequest, NextResponse } from 'next/server';
import { getReferralStats } from '@/lib/api/referrals';

export async function GET(request: NextRequest) {
  try {
    const stats = await getReferralStats();

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Referral stats error:', error);
    return NextResponse.json(
      { success: false, message: (error instanceof Error ? error.message : 'Failed to get referral stats') },
      { status: 500 }
    );
  }
}
