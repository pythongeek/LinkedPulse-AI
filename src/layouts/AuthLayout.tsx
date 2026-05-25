import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden p-4 sm:p-8 font-sans text-slate-200">
      {/* Premium Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-600/10 rounded-full blur-[120px] mix-blend-screen animate-[pulse_8s_ease-in-out_infinite]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-violet-600/10 rounded-full blur-[150px] mix-blend-screen animate-[pulse_10s_ease-in-out_infinite_reverse]" />
      <div className="absolute top-[40%] left-[20%] w-[30vw] h-[30vw] bg-blue-600/5 rounded-full blur-[100px] mix-blend-screen animate-[pulse_12s_ease-in-out_infinite]" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        <Outlet />
      </div>
    </div>
  );
}
