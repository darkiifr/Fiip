import { useRef, useEffect, useState, forwardRef } from "react";
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
            <span key={i} className="bg-red-700/30 text-transparent border-b border-b-red-500 rounded-sm" title={err.message}>
                {value.slice(offset, offset + length)}
            </span>
        );
        lastIndex = offset + length;
    });
    if (lastIndex < value.length) {
        result.push(value.slice(lastIndex));
    }
    if (value.endsWith('\n')) result.push(<br key="trailing" />);
    return result;
}

const LanguageToolHighlightTextarea = forwardRef(({ value, onChange, className, language = 'auto', enabled = true, onLanguageDetected, ...props }, ref) => {
    const localRef = useRef(null);
    const overlayRef = useRef(null);
    const [errors, setErrors] = useState([]);
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        if (typeof ref === 'function') ref(localRef.current);
        else if (ref) ref.current = localRef.current;
    }, [ref]);

    const handleInput = (e) => {
        if (onChange) onChange(e);
    };

    useEffect(() => {
        if (!enabled || !value || value.trim().length < 3) {
            const timer = setTimeout(() => {
                setErrors(prev => prev.length > 0 ? [] : prev);
                if (onLanguageDetected) onLanguageDetected(null);
            }, 0);
            return () => clearTimeout(timer);
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
                    const detectedLang = data.language?.detectedLanguage || data.language || '';
                    if (onLanguageDetected) {
                        onLanguageDetected({
                            code: detectedLang.code || 'fr-FR',
                            name: detectedLang.name || detectedLang.code || ''
                        });
                    }
                })
                .catch(() => setErrors([]))
                .finally(() => setChecking(false));
        }, 800);
        return () => clearTimeout(handler);
    }, [value, language, enabled, onLanguageDetected]);

    const handleSuggestionClick = (err, replacement) => {
        if (!replacement) return;
        const textarea = localRef.current;
        if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(err.offset, err.offset + err.length);
            document.execCommand('insertText', false, replacement);
        } else {
            const before = value.slice(0, err.offset);
            const after = value.slice(err.offset + err.length);
            if (onChange) onChange({ target: { value: before + replacement + after } });
        }
    };

    const handleScroll = (e) => {
        if (overlayRef.current) {
            overlayRef.current.scrollTop = e.target.scrollTop;
            overlayRef.current.scrollLeft = e.target.scrollLeft;
        }
    };

    const sharedStyles = "w-full h-full p-6 text-[16px] leading-7 font-sans outline-none border-0 m-0 resize-none font-medium tracking-wide whitespace-pre-wrap break-words";
    const baseClass = twMerge(sharedStyles, className);
    
    const overlayClass = twMerge(
        baseClass,
        "absolute inset-0 z-0 text-transparent select-none pointer-events-none bg-transparent [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
    );

    const textareaClass = twMerge(
        "text-gray-100 transition-[filter] duration-100 ease-out",
        baseClass,
        "relative z-10 bg-transparent"
    );

    return (
        <div className="relative w-full h-full transition-all duration-700 ease-out rounded-xl overflow-hidden group">
            <div
                ref={overlayRef}
                className={overlayClass}
                aria-hidden="true"
            >
                {getDecoratedText(value, errors)}
            </div>
            <textarea
                ref={localRef}
                value={value}
                onChange={handleInput}
                onScroll={handleScroll}
                spellCheck={false}
                lang={language === 'auto' ? undefined : language}
                className={textareaClass}
                style={{ background: 'transparent' }}
                {...props}
            />
            
            {checking && (
                <div className="absolute bottom-4 right-4 text-xs text-blue-400/70 font-medium px-2 py-1 bg-[#1C1C1E]/80 backdrop-blur rounded-md shadow z-20 pointer-events-none">
                    Vérification...
                </div>
            )}
            
            {errors.length > 0 && (
                <div className="absolute top-4 right-4 z-20 max-w-sm opacity-50 focus-within:opacity-100 hover:opacity-100 transition-opacity">
                    <div className="bg-[#1C1C1E]/95 backdrop-blur-xl border border-red-500/20 rounded-xl p-3 shadow-2xl">
                        <div className="text-[10px] text-gray-400 mb-2 uppercase tracking-wider font-bold px-1">
                            Corrections ({errors.length})
                        </div>
                        <ul className="text-xs space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                            {errors.slice(0, 8).map((err, i) => (
                                <li key={i} className="flex flex-col gap-1 p-2 bg-white/5 rounded-lg">
                                    <span className="text-gray-300 font-medium text-[13px]">{err.message}</span>
                                    {err.replacements?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {err.replacements.slice(0, 4).map((rep, j) => (
                                                <button
                                                    key={j}
                                                    title={`Remplacer par "${rep.value}"`}
                                                    className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 rounded text-xs transition-colors border border-red-500/20 cursor-pointer"
                                                    onClick={() => handleSuggestionClick(err, rep.value)}
                                                >
                                                    {rep.value}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
});

LanguageToolHighlightTextarea.displayName = "LanguageToolHighlightTextarea";

export default LanguageToolHighlightTextarea;
