import { NextRequest, NextResponse } from 'next/server';
import { markCommissionsAsPaid } from '@/lib/api/referrals';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversionIds } = body;

    if (!Array.isArray(conversionIds) || conversionIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Conversion IDs array is required' },
        { status: 400 }
      );
    }

    const result = await markCommissionsAsPaid(conversionIds);

    return NextResponse.json({
      success: true,
      message: 'Commissions marked as paid successfully',
      data: result
    });
  } catch (error) {
    console.error('Commission payment error:', error);
    return NextResponse.json(
      { success: false, message: (error instanceof Error ? error.message : 'Failed to mark commissions as paid') },
      { status: 500 }
    );
  }
}
