
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocalization } from '../contexts/LocalizationContext';
import Icon from '../components/ui/Icon';
import StripePaymentForm from '../components/ui/StripePaymentForm';

type Step = 'account' | 'plan' | 'payment';

const Signup: React.FC = () => {
    const { t } = useLocalization();
    const navigate = useNavigate();
    const { signup } = useAuth();
    
    const [step, setStep] = useState<Step>('account');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form Data
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        organizationName: ''
    });
    const [selectedPlanId, setSelectedPlanId] = useState<'starter' | 'pro'>('starter');
    
    // Removed manual payment state in favor of Stripe handling it
    const [cardName, setCardName] = useState('');

    const PLANS = [
        { 
            id: 'starter', 
            name: 'Starter Plan', 
            price: 20, 
            limit: 5, 
            description: 'Perfect for small farms getting started.',
            features: ['Up to 5 Users', 'Basic Reporting', 'Map View', 'Inventory Management'] 
        },
        { 
            id: 'pro', 
            name: 'Pro Plan', 
            price: 35, 
            limit: 10, 
            description: 'Advanced features for growing operations.',
            features: ['Up to 10 Users', 'Advanced AI Analytics', 'Priority Support', 'Multiple Sites'] 
        }
    ] as const;

    const handleAccountSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        setError('');
        setStep('plan');
    };

    const handlePlanSelect = (planId: 'starter' | 'pro') => {
        setSelectedPlanId(planId);
        setStep('payment');
    };

    const handleStripeSuccess = async (paymentMethodId: string) => {
        setLoading(true);
        setError('');

        try {
            // Here you would send the paymentMethodId to your backend
            // For this frontend-only demo, we assume the transaction is verified via Stripe
            console.log("Payment Method ID received:", paymentMethodId);

            // Combine data to register
            // FORCE ROLE TO SITE_MANAGER for the account creator/payer
            const success = await signup({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                password: formData.password,
                // Extra fields handled by updated AuthContext
                // @ts-ignore
                organizationName: formData.organizationName,
                planId: selectedPlanId,
                roleId: 'SITE_MANAGER',
                paymentMethodId: paymentMethodId // Simulate saving the method
            });

            if (success) {
                navigate('/dashboard');
            } else {
                setError(t('emailExists'));
                setLoading(false);
            }
        } catch (err) {
            setError('Registration failed. Please try again.');
            setLoading(false);
        }
    };

    const currentPlan = PLANS.find(p => p.id === selectedPlanId);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4 font-sans bg-[url('https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center text-white">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
            
            <div className="w-full max-w-5xl z-10 grid grid-cols-1 md:grid-cols-12 rounded-2xl overflow-hidden shadow-2xl border border-gray-700 bg-black/40 backdrop-blur-xl min-h-[600px]">
                
                {/* Left Side - Info / Progress */}
                <div className="md:col-span-5 bg-gradient-to-b from-blue-900/90 to-black/90 p-8 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/20 rounded-full filter blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Get Started</h1>
                        <p className="text-gray-300 text-sm">Join the future of seaweed farming management.</p>
                        
                        <div className="mt-10 space-y-6">
                            <div className={`flex items-center gap-4 ${step === 'account' ? 'opacity-100' : 'opacity-50'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step === 'account' ? 'bg-blue-600 border-blue-600' : 'border-gray-400'} font-bold`}>1</div>
                                <div>
                                    <p className="font-semibold">Account</p>
                                    <p className="text-xs text-gray-400">Your details & organization</p>
                                </div>
                            </div>
                            <div className={`flex items-center gap-4 ${step === 'plan' ? 'opacity-100' : 'opacity-50'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step === 'plan' ? 'bg-blue-600 border-blue-600' : 'border-gray-400'} font-bold`}>2</div>
                                <div>
                                    <p className="font-semibold">Plan</p>
                                    <p className="text-xs text-gray-400">Choose your capacity</p>
                                </div>
                            </div>
                            <div className={`flex items-center gap-4 ${step === 'payment' ? 'opacity-100' : 'opacity-50'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step === 'payment' ? 'bg-blue-600 border-blue-600' : 'border-gray-400'} font-bold`}>3</div>
                                <div>
                                    <p className="font-semibold">Payment</p>
                                    <p className="text-xs text-gray-400">Secure credit card checkout</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 mt-8">
                         <div className="text-xs text-gray-400">
                            Already have an account? <Link to="/login" className="text-cyan-400 hover:underline">Log In</Link>
                        </div>
                         <Link to="/terms" className="text-xs text-gray-500 hover:text-gray-400 hover:underline">
                            {t('termsOfUse')}
                        </Link>
                    </div>
                </div>

                {/* Right Side - Forms */}
                <div className="md:col-span-7 p-8 md:p-12 flex flex-col justify-center relative">
                     {error && (
                        <div className="absolute top-4 left-8 right-8 p-3 bg-red-500/20 border border-red-500/50 text-red-300 rounded-md text-sm text-center z-20">
                            {error}
                        </div>
                    )}

                    {step === 'account' && (
                        <form onSubmit={handleAccountSubmit} className="space-y-5 animate-fade-in">
                            <h2 className="text-2xl font-bold">Create Account</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs uppercase tracking-wide text-gray-400">First Name</label>
                                    <input required className="w-full bg-gray-800/50 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} placeholder="John" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs uppercase tracking-wide text-gray-400">Last Name</label>
                                    <input required className="w-full bg-gray-800/50 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} placeholder="Doe" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs uppercase tracking-wide text-gray-400">Email Address</label>
                                <input type="email" required className="w-full bg-gray-800/50 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="john@example.com" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs uppercase tracking-wide text-gray-400">Organization Name</label>
                                <input required className="w-full bg-gray-800/50 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    value={formData.organizationName} onChange={e => setFormData({...formData, organizationName: e.target.value})} placeholder="Ocean Harvest Ltd." />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs uppercase tracking-wide text-gray-400">Password</label>
                                <input type="password" required className="w-full bg-gray-800/50 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="••••••••" />
                            </div>
                            <div className="text-xs text-gray-400">
                                {t('agreeToTerms')} <Link to="/terms" className="text-cyan-400 hover:underline">{t('termsOfUse')}</Link>
                            </div>
                            <button type="submit" className="w-full py-3 mt-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg font-bold shadow-lg transition-all">
                                Next: Select Plan
                            </button>
                        </form>
                    )}

                    {step === 'plan' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold">Select Plan</h2>
                                <button onClick={() => setStep('account')} className="text-sm text-gray-400 hover:text-white">Back</button>
                            </div>
                            <div className="grid gap-4">
                                {PLANS.map(plan => (
                                    <div key={plan.id} onClick={() => handlePlanSelect(plan.id as any)}
                                         className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center group
                                         ${selectedPlanId === plan.id ? 'border-blue-500 bg-blue-900/20' : 'border-gray-700 bg-gray-800/30 hover:border-gray-500'}`}>
                                        <div>
                                            <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">{plan.name}</h3>
                                            <p className="text-sm text-gray-400">{plan.description}</p>
                                            <ul className="mt-2 text-xs text-gray-300 space-y-1">
                                                {plan.features.slice(0, 2).map(f => <li key={f} className="flex items-center gap-1"><Icon name="Check" className="w-3 h-3 text-green-400"/> {f}</li>)}
                                            </ul>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-white">${plan.price}<span className="text-sm font-normal text-gray-400">/mo</span></p>
                                            <p className="text-xs text-gray-400 mt-1">Up to {plan.limit} users</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 'payment' && (
                        <div className="space-y-5 animate-fade-in">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-2xl font-bold">Secure Payment</h2>
                                <button type="button" onClick={() => setStep('plan')} className="text-sm text-gray-400 hover:text-white">Change Plan</button>
                            </div>
                            
                            <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg flex justify-between items-center mb-4">
                                <div>
                                    <p className="font-bold text-white">{currentPlan?.name}</p>
                                    <p className="text-xs text-gray-400">Billed monthly</p>
                                </div>
                                <p className="text-xl font-bold text-white">${currentPlan?.price}</p>
                            </div>

                            {/* Cardholder Name */}
                            <div className="space-y-1 mb-4">
                                <label className="text-xs uppercase tracking-wide text-gray-400">Cardholder Name</label>
                                <div className="relative">
                                    <Icon name="User" className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
                                    <input 
                                        required 
                                        className="w-full bg-gray-800/50 border border-gray-600 rounded-lg p-3 pl-10 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={cardName} 
                                        onChange={e => setCardName(e.target.value)} 
                                        placeholder="JOHN DOE" 
                                    />
                                </div>
                            </div>

                            {/* Stripe Payment Form */}
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                    <Icon name="Activity" className="w-10 h-10 text-blue-500 animate-spin" />
                                    <p className="text-gray-300">Processing Payment...</p>
                                </div>
                            ) : (
                                <StripePaymentForm 
                                    amount={currentPlan?.price || 20} 
                                    currency="USD" 
                                    onSuccess={handleStripeSuccess}
                                    onProcessing={setLoading}
                                    buttonText={`Pay $${currentPlan?.price} & Join`}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Signup;
