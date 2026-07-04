import { Wifi, WifiOff } from 'lucide-react';

export default function OfflineConnectionDialog({
  isWaiting = false,
  onWaitOnline,
  onUseOffline,
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 px-4 text-white backdrop-blur-xl">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/12 bg-[#151515]/95 shadow-[0_32px_120px_rgba(0,0,0,0.55)]">
        <div className="border-b border-white/10 bg-white/[0.035] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-200">
              <WifiOff size={21} />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-white">Connexion indisponible</h2>
              <p className="mt-0.5 text-xs font-semibold text-white/48">Fiip ne détecte pas de réseau actif.</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-5">
          <p className="text-sm leading-6 text-white/72">
            Vous pouvez attendre le retour du réseau pour continuer la synchronisation, ou passer en mode hors ligne et travailler uniquement avec vos notes locales.
          </p>

          {isWaiting && (
            <div className="mt-4 rounded-2xl border border-blue-400/20 bg-blue-400/10 px-4 py-3 text-xs font-semibold text-blue-100">
              En attente du réseau. Fiip reprendra la connexion automatiquement.
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onWaitOnline}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.07] px-4 text-sm font-bold text-white transition hover:bg-white/[0.11]"
            >
              <Wifi size={17} />
              Attendre
            </button>
            <button
              type="button"
              onClick={onUseOffline}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-zinc-950 transition hover:bg-zinc-200"
            >
              <WifiOff size={17} />
              Mode hors ligne
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
