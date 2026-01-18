import { NextRequest, NextResponse } from 'next/server';
import { deactivateReferralLink } from '@/lib/api/referrals';

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

    await deactivateReferralLink(linkId);

    return NextResponse.json({
      success: true,
      message: 'Referral link deactivated successfully'
    });
  } catch (error) {
    console.error('Referral link deactivation error:', error);
    return NextResponse.json(
      { success: false, message: (error instanceof Error ? error.message : 'Failed to deactivate referral link') },
      { status: 500 }
    );
  }
}
