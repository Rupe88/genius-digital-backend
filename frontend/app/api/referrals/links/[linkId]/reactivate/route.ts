import { NextRequest, NextResponse } from 'next/server';
import { reactivateReferralLink } from '@/lib/api/referrals';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params;

    if (!linkId) {
      return NextResponse.json(
        { success: false, message: 'Link ID is required' },
        { status: 400 }
      );
    }

    await reactivateReferralLink(linkId);

    return NextResponse.json({
      success: true,
      message: 'Referral link reactivated successfully'
    });
  } catch (error) {
    console.error('Referral link reactivation error:', error);
    return NextResponse.json(
      { success: false, message: (error instanceof Error ? error.message : 'Failed to reactivate referral link') },
      { status: 500 }
    );
  }
}
