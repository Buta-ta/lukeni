// lib/hooks/useCheckPaymentStatus.ts

import { useEffect, useState } from 'react';

interface PaymentStatus {
  success: boolean;
  status: 'pending' | 'completed' | 'failed';
  product_type?: 'investigation' | 'book';
  product_id?: string;
}

export function useCheckPaymentStatus(transactionId: string | null) {
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
    if (!transactionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/payments/check-status?transactionId=${transactionId}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment check failed');
      }

      setStatus(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Poll toutes les 3 secondes
  useEffect(() => {
    if (!transactionId) return;

    checkStatus();
    const interval = setInterval(checkStatus, 3000);

    return () => clearInterval(interval);
  }, [transactionId]);

  return { status, isLoading, error, checkStatus };
}