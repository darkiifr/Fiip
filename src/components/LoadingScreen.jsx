import IconLoading from '~icons/mingcute/loading-fill';

export default function LoadingScreen({ status }) {
    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#1C1C1E] text-white font-sora select-none animate-fade-in">
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                <IconLoading className="w-12 h-12 text-blue-500 animate-spin relative z-10" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-[0.2em] uppercase mb-4 opacity-50">
                Fiip
            </h2>
            <div className="h-0.5 w-32 bg-white/5 rounded-full overflow-hidden mb-6 relative">
                <div className="absolute top-0 left-0 h-full bg-blue-500 w-1/3 animate-loading-bar rounded-full shadow-[0_0_10px_#007AFF]"></div>
            </div>
            <p className="text-[10px] text-white/30 font-bold tracking-[0.1em] uppercase animate-pulse">{status}</p>
        </div>
    );
}
