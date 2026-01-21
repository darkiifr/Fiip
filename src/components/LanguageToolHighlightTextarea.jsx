import { useRef, useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

const API_URL = "https://api.languagetoolplus.com/v2/check";

function getDecoratedText(value, errors) {
    if (!errors.length) return value;
    let result = [];
    let lastIndex = 0;
    errors.forEach((err, i) => {
        const { offset, length } = err;
        if (offset > lastIndex) {
            result.push(value.slice(lastIndex, offset));
        }
        result.push(
            <span key={i} className="bg-red-700/30 underline decoration-red-500 cursor-pointer" title={err.message}>
                {value.slice(offset, offset + length)}
            </span>
        );
        lastIndex = offset + length;
    });
    if (lastIndex < value.length) {
        result.push(value.slice(lastIndex));
    }
    return result;
}

export default function LanguageToolHighlightTextarea({ value, onChange, className, language = 'auto', enabled = true, ...props }) {
    const textareaRef = useRef(null);
    const [errors, setErrors] = useState([]);
    const [checking, setChecking] = useState(false);
    const [lang, setLang] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef(null);

    const handleInput = (e) => {
        setIsTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
        }, 150);
        
        if (onChange) onChange(e);
    };

    useEffect(() => {
        if (!enabled || !value || value.length < 3) {
            // Utiliser setTimeout pour éviter la mise à jour synchrone dans useEffect
            setTimeout(() => {
                setErrors(prev => prev.length > 0 ? [] : prev);
                setLang(prev => prev !== '' ? '' : prev);
            }, 0);
            return;
        }

        const handler = setTimeout(() => {
            setChecking(true);
            fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    text: value,
                    language: language === 'auto' ? 'auto' : language,
                })
            })
                .then(res => res.json())
                .then(data => {
                    setErrors(data.matches || []);
                    setLang(data.language?.detected || '');
                })
                .catch(() => setErrors([]))
                .finally(() => setChecking(false));
        }, 800);
        return () => clearTimeout(handler);
    }, [value, language, enabled]);

    // Correction par clic
    const handleSuggestionClick = (err, replacement) => {
        if (!replacement) return;
        const before = value.slice(0, err.offset);
        const after = value.slice(err.offset + err.length);
        onChange({ target: { value: before + replacement + after } });
    };

    const handleScroll = (e) => {
        const backdrop = textareaRef.current.previousSibling;
        if (backdrop) {
            backdrop.scrollTop = e.target.scrollTop;
            backdrop.scrollLeft = e.target.scrollLeft;
        }
    };

    const sharedStyles = "w-full h-full p-6 text-lg leading-relaxed font-sans outline-none border-0 m-0 resize-none font-medium tracking-wide";
    
    // Merge sharedStyles with passed className
    const baseClass = twMerge(sharedStyles, className);
    // Ensure overlay is strictly transparent and properly positioned/disabled
    const overlayClass = twMerge(baseClass, "absolute inset-0 z-0 text-transparent select-none pointer-events-none bg-transparent overflow-hidden");
    // Ensure textarea is visible and positioned above overlay
    const textareaClass = twMerge(
        "text-gray-100 transition-[filter] duration-100 ease-out", 
        baseClass, 
        "relative z-10 bg-transparent",
        isTyping && "blur-[0.5px]"
    );

    return ( 
        <div className="relative w-full h-full transition-all duration-700 ease-out rounded-xl overflow-hidden">
            <div 
                className={overlayClass}
                aria-hidden="true"
            >
                {getDecoratedText(value, errors)}
            </div>
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleInput}
                onScroll={handleScroll}
                spellCheck={false}
                lang={language === 'auto' ? undefined : language}
                className={textareaClass}
                style={{ background: 'transparent' }}
                {...props}
            />
            {checking && <div className="absolute bottom-2 right-2 text-xs text-blue-400 font-medium px-2 py-1 bg-[#1C1C1E] rounded-md border border-blue-500/20 shadow-lg animate-pulse z-20">Vérification...</div>}
            {errors.length > 0 && (
                <div className="absolute bottom-2 left-2 z-20 max-w-md">
                     <div className="bg-[#1C1C1E]/90 backdrop-blur-md border border-red-500/20 rounded-lg p-2 shadow-xl">
                        <div className="text-[10px] text-gray-400 mb-1 uppercase tracking-wider font-bold px-1">Corrections</div>
                        <ul className="text-xs space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                            {errors.slice(0, 5).map((err, i) => (
                                <li key={i} className="group flex items-start gap-2 p-1 hover:bg-white/5 rounded transition-colors">
                                    <span className="text-red-400 shrink-0 mt-0.5">•</span>
                                    <div className="flex flex-col">
                                        <span className="text-gray-300">{err.message}</span>
                                        {err.replacements?.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-0.5">
                                                {err.replacements.slice(0, 3).map((rep, j) => (
                                                    <button 
                                                        key={j} 
                                                        className="px-1.5 py-0.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 rounded text-[10px] transition-colors border border-blue-500/20" 
                                                        onClick={() => handleSuggestionClick(err, rep.value)}
                                                    >
                                                        {rep.value}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
            {lang && <span className="absolute top-2 right-2 text-xs bg-blue-900/80 text-blue-200 px-2 py-0.5 rounded-full z-20">{lang.toUpperCase()}</span>}
        </div>
    );
}
