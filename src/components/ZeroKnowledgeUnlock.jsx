import { useMemo, useState } from 'react';

import {
  createPassphraseVerifier,
  setZeroKnowledgePassphrase,
  unlockWithPassphrase,
} from '../services/zeroKnowledge';

export default function ZeroKnowledgeUnlock({ userId, children }) {
  const verifierKey = useMemo(() => `fiip-zk-verifier:${userId}`, [userId]);
  const [verifier, setVerifier] = useState(() => localStorage.getItem(verifierKey) || '');
  const [unlocked, setUnlocked] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const isSetup = !verifier;

  if (unlocked) {return children;}

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (passphrase.length < 12) {
      setError('Utilisez une passphrase Fiip d’au moins 12 caractères.');
      return;
    }
    if (isSetup) {
      if (passphrase !== confirmation) {
        setError('Les deux passphrases ne correspondent pas.');
        return;
      }
      const nextVerifier = await createPassphraseVerifier(passphrase);
      localStorage.setItem(verifierKey, nextVerifier);
      setVerifier(nextVerifier);
      setZeroKnowledgePassphrase(passphrase);
      setUnlocked(true);
      return;
    }
    if (!await unlockWithPassphrase(passphrase, verifier)) {
      setError('Passphrase Fiip incorrecte.');
      return;
    }
    setUnlocked(true);
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[#0a0a0a] p-6 text-white">
      <form
        onSubmit={submit}
        className="grid w-full max-w-md gap-4 rounded-lg border border-white/15 bg-[#141414] p-6 shadow-2xl"
      >
        <div>
          <p className="text-xs font-semibold uppercase text-blue-300">Synchronisation zero-knowledge</p>
          <h1 className="mt-2 text-2xl font-bold">
            {isSetup ? 'Créer votre passphrase Fiip' : 'Déverrouiller vos données'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Cette passphrase reste uniquement en mémoire sur cet appareil. Fiip ne peut pas la récupérer.
          </p>
        </div>
        <label className="grid gap-2 text-sm font-semibold">
          Passphrase Fiip
          <input
            autoFocus
            type="password"
            autoComplete={isSetup ? 'new-password' : 'current-password'}
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
            className="rounded-md border border-white/15 bg-black/40 px-3 py-3 outline-none focus:border-blue-400"
          />
        </label>
        {isSetup ? (
          <label className="grid gap-2 text-sm font-semibold">
            Confirmer la passphrase
            <input
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="rounded-md border border-white/15 bg-black/40 px-3 py-3 outline-none focus:border-blue-400"
            />
          </label>
        ) : null}
        {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
        <button type="submit" className="rounded-md bg-blue-600 px-4 py-3 font-bold hover:bg-blue-500">
          {isSetup ? 'Activer la synchronisation chiffrée' : 'Déverrouiller'}
        </button>
      </form>
    </main>
  );
}
