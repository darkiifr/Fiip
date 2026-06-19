import { useState } from 'react';

const STEPS = [
  { key: 'profile', title: 'Profil minimal', desc: 'Choisissez votre nom visible pour les notes partagées.' },
  { key: 'prefs', title: 'Préférences rapides', desc: 'Définissez thème et synchronisation cloud en une étape.' },
  { key: 'first', title: 'Première note', desc: 'Créez une note de départ pour valider votre espace.' },
  { key: 'assist', title: 'Assistant & partage', desc: 'Activez les workflows AI et collaboration.' },
];

export default function DesktopOnboardingFlow({ settings, onUpdateSettings, onCreateNote, onDone }) {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];

  return (
    <div className="fiip-auth-shell">
      <div className="fiip-auth-card fiip-onboarding">
        <h1>Onboarding</h1>
        <p>Étape {index + 1} / {STEPS.length}</p>
        <h2>{step.title}</h2>
        <p>{step.desc}</p>

        {step.key === 'prefs' && (
          <div className="fiip-auth-form">
            <label>
              <span>Synchronisation cloud</span>
              <input type="checkbox" checked={settings.cloudSync !== false} onChange={(e) => onUpdateSettings({ ...settings, cloudSync: e.target.checked })} />
            </label>
          </div>
        )}

        {step.key === 'first' && (
          <button type="button" onClick={() => onCreateNote('Ma première note', 'Bienvenue dans Fiip.')}>Créer une première note</button>
        )}

        <div className="fiip-auth-actions">
          <button type="button" disabled={index === 0} onClick={() => setIndex((v) => v - 1)}>Précédent</button>
          {index < STEPS.length - 1 ? (
            <button type="button" onClick={() => setIndex((v) => v + 1)}>Suivant</button>
          ) : (
            <button type="button" onClick={onDone}>Terminer</button>
          )}
        </div>
      </div>
    </div>
  );
}
