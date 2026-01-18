export type PaymentMethod = 'ESEWA' | 'MOBILE_BANKING' | 'VISA_CARD' | 'MASTERCARD' | 'KHALTI' | 'RAZORPAY';

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  orderId?: string;
  courseId?: string;
  productIds?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentAnalytics {
  totalRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
  paymentMethodDistribution: Array<{
    method: PaymentMethod;
    count: number;
    total: number;
  }>;
}

export interface PaymentTrend {
  date: string;
  revenue: number;
  transactions: number;
}

