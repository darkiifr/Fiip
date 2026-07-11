import { ChevronRight } from 'lucide-react';

function Row({ title, description, right }) {
  return (
    <div className="fiip-settings-row">
      <div>
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
      <div>{right}</div>
    </div>
  );
}

function Switch({ checked, onChange }) {
  return (
    <button type="button" className={`fiip-switch ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}

export default function DesktopSettingsView({ settings, onUpdateSettings, onManageAccount }) {
  return (
    <div className="fiip-workspace-body fiip-settings-page">
      <h2>Paramètres</h2>

      <section>
        <h3>Apparence</h3>
        <div className="fiip-settings-card">
          <Row
            title="Thème"
            description="Fiip utilise un thème sombre unique."
            right={<div className="fiip-segment"><button>Sombre</button></div>}
          />
          <Row
            title="Typographie"
            description="Définissez la police par défaut dans l'éditeur."
            right={<select defaultValue="Inter"><option>Inter</option><option>SF Pro Text</option><option>Segoe UI</option></select>}
          />
          <Row
            title="Taille de la police"
            description="Ajustez la taille du texte dans l'éditeur."
            right={<div className="fiip-segment"><button>Petite</button><button>Moyenne</button><button>Grande</button></div>}
          />
        </div>
      </section>

      <section>
        <h3>Éditeur</h3>
        <div className="fiip-settings-card">
          <Row title="Enregistrement automatique" description="Enregistrez automatiquement vos modifications." right={<Switch checked={settings.autoSave !== false} onChange={(v) => onUpdateSettings({ ...settings, autoSave: v })} />} />
          <Row title="Afficher le nombre de mots" description="Affichez le nombre de mots en bas de chaque note." right={<Switch checked={settings.showWords !== false} onChange={(v) => onUpdateSettings({ ...settings, showWords: v })} />} />
          <Row title="Afficher le temps de lecture" description="Estimez le temps de lecture de vos notes." right={<Switch checked={settings.showReading !== false} onChange={(v) => onUpdateSettings({ ...settings, showReading: v })} />} />
          <Row title="Raccourcis clavier" description="Consultez et personnalisez vos raccourcis clavier." right={<ChevronRight size={16} />} />
        </div>
      </section>

      <section>
        <h3>Synchronisation</h3>
        <div className="fiip-settings-card">
          <Row title="Synchroniser avec Fiip Cloud" description="Accédez à vos notes depuis tous vos appareils." right={<Switch checked={settings.cloudSync !== false} onChange={(v) => onUpdateSettings({ ...settings, cloudSync: v })} />} />
          <Row title="Compte" description="Vous êtes connecté." right={<button type="button" onClick={onManageAccount}>Gérer le compte</button>} />
        </div>
      </section>
    </div>
  );
}
