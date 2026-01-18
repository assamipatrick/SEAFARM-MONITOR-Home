
import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

// Public Test Key for demonstration
const STRIPE_PUBLIC_KEY = 'pk_test_TYooMQauvdEDq54NiTphI7jx';

interface StripePaymentFormProps {
  amount: number;
  currency: string;
  onSuccess: (paymentMethodId: string) => void;
  onProcessing: (isProcessing: boolean) => void;
  buttonText?: string;
}

const StripePaymentForm: React.FC<StripePaymentFormProps> = ({ 
  amount, 
  currency, 
  onSuccess, 
  onProcessing,
  buttonText = "Pay Now"
}) => {
  const cardElementContainer = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<any>(null);
  const elementsRef = useRef<any>(null);
  const cardRef = useRef<any>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Initialize Stripe
    if ((window as any).Stripe && cardElementContainer.current && !stripeRef.current) {
      try {
        const stripe = (window as any).Stripe(STRIPE_PUBLIC_KEY);
        stripeRef.current = stripe;
        const elements = stripe.elements();
        elementsRef.current = elements;

        const style = {
          base: {
            color: '#ffffff',
            fontFamily: '"Segoe UI", "Roboto", "Helvetica Neue", sans-serif',
            fontSmoothing: 'antialiased',
            fontSize: '16px',
            '::placeholder': {
              color: '#9ca3af'
            },
            backgroundColor: 'transparent'
          },
          invalid: {
            color: '#ef4444',
            iconColor: '#ef4444'
          }
        };

        const card = elements.create('card', { style: style, hidePostalCode: true });
        card.mount(cardElementContainer.current);
        cardRef.current = card;

        card.on('change', (event: any) => {
          setReady(event.complete);
          setError(event.error ? event.error.message : null);
        });

      } catch (e) {
        console.error("Stripe initialization error:", e);
        setError("Failed to load payment system.");
      }
    }
    
    return () => {
       // Cleanup if needed
       if(cardRef.current) {
           // cardRef.current.destroy(); // Often safer to leave it unless strict SPA routing unmounts perfectly
       }
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripeRef.current || !cardRef.current) {
      return;
    }

    onProcessing(true);

    // In a real backend scenario, we would call createPaymentMethod or confirmCardPayment
    // Here we verify the card validity via Stripe's API to get a token
    const result = await stripeRef.current.createPaymentMethod({
      type: 'card',
      card: cardRef.current,
    });

    if (result.error) {
      setError(result.error.message);
      onProcessing(false);
    } else {
      // Success! Send the paymentMethod.id to parent (which would usually send to backend)
      // Simulate a slight network delay for realism
      setTimeout(() => {
          onSuccess(result.paymentMethod.id);
          onProcessing(false);
      }, 1000);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="mb-4">
          <label className="block text-xs uppercase tracking-wide text-gray-400 mb-2">
            Card Details (Secure via Stripe)
          </label>
          <div 
            ref={cardElementContainer} 
            className="w-full bg-gray-800/50 border border-gray-600 rounded-lg p-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all min-h-[46px]"
          >
            {/* Stripe Element Mounts Here */}
          </div>
          {error && (
            <div className="mt-2 text-sm text-red-400 flex items-center">
              <Icon name="AlertTriangle" className="w-4 h-4 mr-1" />
              {error}
            </div>
          )}
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
         <span className="flex items-center gap-1"><Icon name="Lock" className="w-3 h-3"/> SSL Secure Payment</span>
         <span>Powered by Stripe</span>
      </div>

      <button 
        type="submit" 
        disabled={!stripeRef.current || !ready} 
        className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg font-bold shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
          <Icon name="CreditCard" className="w-4 h-4" /> {buttonText}
      </button>
    </form>
  );
};

export default StripePaymentForm;
