
import { MonthlyPayment } from '../types';

export interface MobileMoneyResponse {
    success: boolean;
    transactionId?: string;
    message?: string;
}

export const initiateMobileMoneyPayment = async (payment: MonthlyPayment): Promise<MobileMoneyResponse> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Simulate success rate (90% success)
            const isSuccess = Math.random() > 0.1;
            
            if (isSuccess) {
                // Generate a mock transaction ID
                const txnId = `TXN-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 10000)}`;
                resolve({
                    success: true,
                    transactionId: txnId
                });
            } else {
                resolve({
                    success: false,
                    message: "Transaction failed: Insufficient funds or network timeout."
                });
            }
        }, 2000); // 2 second delay simulation
    });
};
