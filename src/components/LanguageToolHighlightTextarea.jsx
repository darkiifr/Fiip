import React, { useRef, useEffect, useState } from "react";

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

export default function LanguageToolHighlightTextarea({ value, onChange, language = 'auto', ...props }) {
    const textareaRef = useRef(null);
    const [errors, setErrors] = useState([]);
    const [checking, setChecking] = useState(false);
    const [lang, setLang] = useState('');

    useEffect(() => {
        if (!value || value.length < 3) {
            setErrors([]);
            setLang('');
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
    }, [value, language]);

    // Correction par clic
    const handleSuggestionClick = (err, replacement) => {
        if (!replacement) return;
        const before = value.slice(0, err.offset);
        const after = value.slice(err.offset + err.length);
        onChange({ target: { value: before + replacement + after } });
    };

    return (
        <div className="relative w-full">
            <div className="absolute inset-0 pointer-events-none whitespace-pre-wrap text-lg leading-relaxed font-sans text-transparent select-none z-0" aria-hidden>
                {getDecoratedText(value, errors)}
            </div>
            <textarea
                ref={textareaRef}
                value={value}
                onChange={onChange}
                spellCheck={true}
                lang={language === 'auto' ? undefined : language}
                className="relative z-10 bg-transparent"
                style={{ position: 'relative', background: 'none' }}
                {...props}
            />
            {checking && <div className="text-xs text-gray-400 mt-1">Vérification…</div>}
            {errors.length > 0 && (
                <ul className="text-xs text-red-400 mt-1">
                    {errors.slice(0, 5).map((err, i) => (
                        <li key={i}>
                            {err.message} {err.replacements?.length > 0 && (
                                <>
                                    <span className="text-gray-500">→</span>
                                    {err.replacements.slice(0, 2).map((rep, j) => (
                                        <button key={j} className="ml-1 underline text-blue-400 hover:text-blue-300" onClick={() => handleSuggestionClick(err, rep.value)}>{rep.value}</button>
                                    ))}
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            {lang && <span className="absolute top-2 right-2 text-xs bg-blue-900/80 text-blue-200 px-2 py-0.5 rounded-full z-20">{lang.toUpperCase()}</span>}
        </div>
    );
}
