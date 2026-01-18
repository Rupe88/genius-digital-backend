import { NextRequest, NextResponse } from 'next/server';
import { getReferralLinks } from '@/lib/api/referrals';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const linksData = await getReferralLinks(page, limit);

    return NextResponse.json({
      success: true,
      data: linksData
    });
  } catch (error) {
    console.error('Referral links error:', error);
    return NextResponse.json(
      { success: false, message: (error instanceof Error ? error.message : 'Failed to get referral links') },
      { status: 500 }
    );
  }
}
