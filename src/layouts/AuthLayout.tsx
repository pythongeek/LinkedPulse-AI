import { Outlet } from 'react-router-dom';
import { Sparkles, BarChart3, Users, Zap } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex bg-[#050505] font-sans text-slate-200">
      {/* Left side - Marketing/Branding (Hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-14 relative overflow-hidden bg-[#020202] border-r border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/10 via-transparent to-purple-900/10 z-0" />
        <div className="absolute top-[-10%] left-[-20%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] mix-blend-screen animate-[pulse_8s_ease-in-out_infinite]" />
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)] border border-white/10">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            LinkedPulse AI
          </span>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg mt-12 mb-auto">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.15]">
            Dominate your <br/>
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">LinkedIn niche</span>
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed font-medium max-w-md">
            Stop guessing. Start growing. Our multi-agent AI pipeline analyzes real Google Search trends and competitor gaps to ghostwrite viral content.
          </p>
          
          <div className="space-y-5 pt-8">
            <div className="flex items-center gap-4 text-sm text-slate-300 font-medium">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-inner">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
              </div>
              Real-time Google search grounding
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-300 font-medium">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-inner">
                <Users className="w-5 h-5 text-indigo-400" />
              </div>
              Competitor gap intelligence
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-300 font-medium">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-inner">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              Multi-agent ghostwriting pipeline
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-12">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <div className="flex -space-x-3">
              <img src="https://i.pravatar.cc/100?img=33" alt="User" className="w-10 h-10 rounded-full border-2 border-[#020202]" />
              <img src="https://i.pravatar.cc/100?img=47" alt="User" className="w-10 h-10 rounded-full border-2 border-[#020202]" />
              <img src="https://i.pravatar.cc/100?img=12" alt="User" className="w-10 h-10 rounded-full border-2 border-[#020202]" />
            </div>
            <div className="text-sm">
              <p className="font-bold text-white">Join 10,000+ creators</p>
              <p className="text-slate-400 text-xs font-medium">scaling their audience today</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form Container */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-6 sm:p-12 relative overflow-hidden bg-[#050505]">
        {/* Ambient glow behind form */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20viewBox=%220%200%20200%20200%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter%20id=%22noiseFilter%22%3E%3CfeTurbulence%20type=%22fractalNoise%22%20baseFrequency=%220.65%22%20numOctaves=%223%22%20stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect%20width=%22100%25%22%20height=%22100%25%22%20filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>

        <div className="w-full max-w-[420px] relative z-10">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg border border-white/10">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">LinkedPulse AI</span>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
