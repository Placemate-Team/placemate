import { Link } from 'react-router-dom';
import { GraduationCap, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center overflow-hidden">
            {/* Orb */}
            <div className="orb w-80 h-80 opacity-[.07] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

            <div className="relative z-10 animate-scale-in">
                {/* Big number */}
                <p className="text-[140px] sm:text-[200px] font-black leading-none select-none"
                    style={{ color: '#F1F5F9', letterSpacing: '-0.04em' }}>
                    404
                </p>

                {/* Floating logo over the number */}
                <div className="absolute inset-0 flex items-center justify-center animate-float">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                        style={{ background: '#00BFFF', boxShadow: '0 8px 28px rgba(0,191,255,.40)' }}>
                        <GraduationCap className="text-white" size={30} />
                    </div>
                </div>
            </div>

            <div className="relative z-10 -mt-4 animate-fade-up [animation-delay:.15s]">
                <h1 className="text-2xl font-black text-gray-900 mb-2">Page not found</h1>
                <p className="text-gray-400 text-sm max-w-xs mb-8 leading-relaxed">
                    The page you're looking for doesn't exist or has been moved. Head back to safety.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link to="/" className="btn-primary px-7 py-3 rounded-2xl">
                        <Home size={16} /> Go Home
                    </Link>
                    <Link to="/dashboard" className="btn-secondary px-7 py-3 rounded-2xl">
                        <ArrowLeft size={16} /> Dashboard
                    </Link>
                </div>

                <p className="mt-10 text-xs text-gray-300">PlaceMate · ANITS</p>
            </div>
        </div>
    );
}
