import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { ModelsService } from '../services/models';

import IconCheck from '~icons/mingcute/check-fill';
import IconChevronDown from '~icons/mingcute/down-fill';


export default function ModelSelector({ selectedModel, onSelectModel, defaultModelLabel }) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [models, setModels] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchModels = async () => {
            setIsLoading(true);
            const data = await ModelsService.fetchModels();
            // Optional: filter or sort models if needed
            setModels(data);
            setIsLoading(false);
        };
        fetchModels();
    }, []);

    const getModelDisplay = () => {
        if (selectedModel === 'default') {
            return `${t('dexter.model_selector', 'Modèle par défaut')} (${defaultModelLabel})`;
        }
        const m = models.find(x => x.id === selectedModel);
        return m ? m.name : selectedModel.split('/').pop();
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 bg-[#ffffff]/[0.03] hover:bg-[#ffffff]/[0.08] border border-white/5 hover:border-white/10 text-xs text-gray-300 hover:text-white rounded-lg px-2.5 py-1.5 transition-all max-w-[220px]"
            >
                <span className="truncate">{getModelDisplay()}</span>
                <IconChevronDown className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#1C1C1E]/80 backdrop-blur-2xl border border-white/10 rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.6)] overflow-hidden z-20 flex flex-col max-h-72 animate-in fade-in zoom-in-95 duration-150">
                        {isLoading ? (
                            <div className="p-4 text-center text-xs text-gray-500">Chargement...</div>
                        ) : (
                            <div className="overflow-y-auto custom-scrollbar p-1">
                                <button
                                    onClick={() => { onSelectModel('default'); setIsOpen(false); }}
                                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between rounded-lg transition-colors mb-1 ${selectedModel === 'default' ? 'bg-blue-500/20 text-blue-400 font-bold' : 'text-gray-300 hover:bg-white/10'}`}
                                >
                                    <span className="truncate">{t('dexter.model_selector', 'Modèle par défaut')}</span>
                                    {selectedModel === 'default' && <IconCheck className="w-3.5 h-3.5 shrink-0" />}
                                </button>
                                
                                {models.map((model) => (
                                    <button
                                        key={model.id}
                                        onClick={() => { onSelectModel(model.id); setIsOpen(false); }}
                                        className={`w-full text-left px-2 py-2 text-xs flex items-center gap-2 rounded-lg transition-colors ${selectedModel === model.id ? 'bg-blue-500/20 text-blue-400 font-bold' : 'text-gray-300 hover:bg-white/10'}`}
                                        title={model.description || model.id}
                                    >
                                        <img src={model.logo_url} alt={model.provider} className="w-4 h-4 rounded-sm" onError={(e) => { e.target.style.display = 'none'; }} />
                                        <div className="truncate flex-1">
                                            <div>{model.name}</div>
                                            {(model.pricing || model.context_length) && (
                                                <div className="text-[9px] text-gray-500 font-normal">
                                                    {model.context_length ? `${(model.context_length/1000).toFixed(0)}k ctx` : ''} 
                                                </div>
                                            )}
                                        </div>
                                        {selectedModel === model.id && <IconCheck className="w-3.5 h-3.5 shrink-0" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}