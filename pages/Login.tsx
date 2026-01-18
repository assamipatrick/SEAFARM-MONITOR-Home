
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useSettings } from '../contexts/SettingsContext';
import Icon from '../components/ui/Icon';

const Login: React.FC = () => {
    const { t } = useLocalization();
    const { settings } = useSettings();
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('admin@seafarm.com');
    const [password, setPassword] = useState('password');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const success = await login(email, password);
        if (success) {
            navigate('/dashboard');
        } else {
            setError(t('invalidCredentials'));
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4 font-sans bg-[url('https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
            
            <div className="w-full max-w-4xl z-10 grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden shadow-2xl border border-gray-700">
                {/* Left Side - Welcome */}
                <div className="hidden md:flex flex-col justify-center items-center p-8 bg-gradient-to-br from-blue-900/80 to-black/80 text-white relative">
                    <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.5),transparent_70%)]"></div>
                    <h1 className="text-4xl font-bold mb-4 relative z-10">{t('welcomeBack')}</h1>
                    <p className="text-center text-gray-300 relative z-10">
                        Efficiently manage your seaweed farm operations, inventory, and payments in one place.
                    </p>
                    <div className="mt-8 p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-sm text-gray-300 relative z-10">
                        <p className="font-semibold text-blue-400 mb-1">Default Access:</p>
                        <p>Email: admin@seafarm.com</p>
                        <p>Pass: password</p>
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div className="p-8 md:p-12 bg-black/80 backdrop-blur-md flex flex-col justify-center">
                    <div className="flex justify-center mb-8">
                         {/* Logo Placeholder if image fails */}
                         {settings.company.logoUrl ? (
                             <img src={settings.company.logoUrl} alt="Logo" className="h-16 object-contain drop-shadow-lg" />
                         ) : (
                             <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center">
                                 <Icon name="Activity" className="w-8 h-8 text-white" />
                             </div>
                         )}
                    </div>
                    
                    <h2 className="text-2xl font-bold text-white text-center mb-2">Login</h2>
                    <p className="text-gray-400 text-center mb-8">Enter your credentials to access your account</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-3 bg-red-500/20 border border-red-500/50 text-red-300 rounded-md text-sm text-center">
                                {error}
                            </div>
                        )}
                        
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-300">{t('email')}</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Icon name="User" className="h-5 w-5 text-gray-500" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500 transition-all"
                                    placeholder="name@company.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-300">{t('password')}</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Icon name="Lock" className="h-5 w-5 text-gray-500" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500 transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center text-gray-400 cursor-pointer">
                                <input type="checkbox" className="form-checkbox h-4 w-4 text-blue-600 bg-gray-800 border-gray-600 rounded" />
                                <span className="ml-2">Remember me</span>
                            </label>
                            <Link to="/forgot-password" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                                {t('forgotPassword')}
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded-lg shadow-lg transform transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                        >
                            {loading ? <Icon name="Activity" className="animate-spin h-5 w-5" /> : 'Login'}
                        </button>
                    </form>

                    <div className="mt-6 flex flex-col gap-2 text-center text-sm text-gray-400">
                        <p>
                            Don't have an account?{' '}
                            <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">
                                Sign Up
                            </Link>
                        </p>
                        <Link to="/terms" className="text-xs text-gray-500 hover:text-gray-400 hover:underline mt-2">
                            {t('termsOfUse')}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
