import { NextRequest, NextResponse } from 'next/server';
import { getReferralConversions } from '@/lib/api/referrals';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = {
      status: searchParams.get('status') || undefined,
      isFraudulent: searchParams.get('isFraudulent') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
    };

    const conversions = await getReferralConversions(params);

    return NextResponse.json({
      success: true,
      data: conversions
    });
  } catch (error) {
    console.error('Referral conversions error:', error);
    return NextResponse.json(
      { success: false, message: (error instanceof Error ? error.message : 'Failed to get referral conversions') },
      { status: 500 }
    );
  }
}
