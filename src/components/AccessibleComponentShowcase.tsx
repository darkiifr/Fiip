import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as Tabs from '@radix-ui/react-tabs';
import { 
  Accessibility, 
  Sparkles, 
  HelpCircle, 
  Check, 
  Info,
  Keyboard,
  MousePointer2
} from 'lucide-react';

import { GlassButton } from './ui/GlassButton';
import { GlassSwitch } from './ui/GlassSwitch';
import { GlassDialog } from './ui/GlassDialog';
import { LiquidGlassPrimitive } from './ui/LiquidGlassPrimitive';

interface ShowcaseCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
}

function ShowcaseCard({ title, description, icon: Icon }: ShowcaseCardProps) {
  return (
    <LiquidGlassPrimitive 
      variant="subtle" 
      interactive 
      className="p-4 border border-white/5 hover:border-white/10"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
          <Icon size={18} />
        </div>
        <div>
          <h4 className="font-sora text-sm font-semibold text-white mb-1">{title}</h4>
          <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
        </div>
      </div>
    </LiquidGlassPrimitive>
  );
}

export default function AccessibleComponentShowcase() {
  const [highContrast, setHighContrast] = useState(false);
  const [activeTab, setActiveTab] = useState('features');

  return (
    <Tooltip.Provider delayDuration={200}>
      <LiquidGlassPrimitive className="p-6 max-w-xl w-full mx-auto shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
              <Accessibility size={20} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold font-sora text-white">Interface macOS 26</h2>
              <p className="text-xs text-gray-400">Radix UI + React Aria + Liquid Glass</p>
            </div>
          </div>

          <Popover.Root>
            <Popover.Trigger asChild>
              <button 
                className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                aria-label="Info"
              >
                <Info size={18} />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content 
                className="z-50 w-72 p-4 rounded-2xl glass border border-white/20 shadow-2xl animate-slideDownAndFade"
                sideOffset={5}
              >
                <h3 className="font-semibold text-white font-sora mb-2 flex items-center gap-1.5 text-sm">
                  <Sparkles size={14} className="text-blue-400" /> 
                  Synergie Native
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed mb-3">
                  Cette architecture utilise Radix UI pour la structure accessible (Dialogs, Tabs) et React Aria pour les comportements d'interaction précis.
                </p>
                <div className="text-[10px] text-blue-400 font-mono flex items-center gap-1">
                  <Check size={10} /> Deno Ecosystem Ready
                </div>
                <Popover.Arrow className="fill-sidebar-dark/80" />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>

        {/* Tabs */}
        <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-4">
          <Tabs.List className="flex bg-black/40 p-1 rounded-xl border border-white/5">
            {['features', 'switches'].map((tab) => (
              <Tabs.Trigger 
                key={tab}
                value={tab}
                className={`
                  flex-1 py-2 text-xs font-semibold font-sora rounded-lg transition-all duration-200 outline-none
                  ${activeTab === tab ? 'bg-white/10 text-white shadow-xl' : 'text-gray-400 hover:text-white'}
                  focus-visible:ring-1 focus-visible:ring-blue-500
                `}
              >
                {tab === 'features' ? 'Expérience' : 'Contrôles'}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="features" className="flex flex-col gap-3 outline-none">
            <ShowcaseCard 
              icon={Keyboard}
              title="Focus Précis"
              description="La gestion du focus par React Aria assure une accessibilité parfaite pour la navigation au clavier."
            />
            <ShowcaseCard 
              icon={MousePointer2}
              title="Interactions Fluides"
              description="Les hooks usePress et useHover garantissent des états réactifs sur tous les écrans."
            />
          </Tabs.Content>

          <Tabs.Content value="switches" className="flex flex-col gap-4 outline-none py-1">
            <LiquidGlassPrimitive variant="subtle" className="p-4 border border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-white font-sora">Haut Contraste</span>
                  <span className="text-[10px] text-gray-400">Optimiser pour les malvoyants.</span>
                </div>
                <GlassSwitch 
                  checked={highContrast} 
                  onCheckedChange={setHighContrast}
                />
              </div>
            </LiquidGlassPrimitive>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-white font-sora flex items-center gap-1.5">
                  Aide Contextuelle
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button className="text-gray-400 hover:text-white transition-colors cursor-help outline-none">
                        <HelpCircle size={14} />
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content 
                        className="z-50 px-2 py-1 bg-black text-white rounded-md text-[10px] border border-white/10 shadow-lg animate-scale-in"
                        side="top"
                        sideOffset={5}
                      >
                        Aide ARIA active.
                        <Tooltip.Arrow className="fill-black" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </span>
                <span className="text-[10px] text-gray-400">Vérifie l'agencement sémantique.</span>
              </div>
              <div className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg flex items-center gap-1">
                <Check size={10} /> Sémantique OK
              </div>
            </div>
          </Tabs.Content>
        </Tabs.Root>

        {/* Action Example */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-col gap-3">
          <GlassDialog 
            title="Activation de l'IA"
            description="Êtes-vous sûr de vouloir activer les fonctionnalités avancées de macOS 26 ?"
            trigger={
              <GlassButton variant="primary" className="w-full">
                <Sparkles size={16} />
                Lancer l'expérience Liquid Glass
              </GlassButton>
            }
          >
            <div className="space-y-4">
              <p className="text-sm text-gray-300">
                L'activation permet une personnalisation dynamique basée sur votre utilisation.
              </p>
              <div className="flex justify-end gap-3 pt-4">
                <GlassButton variant="ghost">Annuler</GlassButton>
                <GlassButton variant="primary" onPress={() => console.log('Confirmé')}>
                  Confirmer
                </GlassButton>
              </div>
            </div>
          </GlassDialog>
          
          <div className="text-[10px] text-gray-500 text-center flex items-center justify-center gap-1">
            <Keyboard size={12} /> Testez avec <kbd className="px-1 py-0.5 bg-white/5 rounded border border-white/10">Tab</kbd>
          </div>
        </div>

      </LiquidGlassPrimitive>
    </Tooltip.Provider>
  );
}
