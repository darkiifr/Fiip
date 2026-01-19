import { useRef, useEffect, useState } from "react";

// Utilise l'API publique de LanguageTool (limite de requêtes)
const API_URL = "https://api.languagetoolplus.com/v2/check";

export default function LanguageToolTextarea({ value, onChange, language = 'auto', ...props }) {
    const textareaRef = useRef(null);
    const [errors, setErrors] = useState([]);
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        if (!value || value.length < 3) {
            setTimeout(() => {
                setErrors(prev => prev.length > 0 ? [] : prev);
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
                })
                .catch(() => setErrors([]))
                .finally(() => setChecking(false));
        }, 800);
        return () => clearTimeout(handler);
    }, [value, language]);

    // Affichage des erreurs sous le textarea
    return (
        <div className="relative w-full">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={onChange}
                spellCheck={true}
                lang={language === 'auto' ? undefined : language}
                {...props}
            />
            {checking && <div className="text-xs text-gray-400 mt-1">Vérification…</div>}
            {errors.length > 0 && (
                <ul className="text-xs text-red-400 mt-1">
                    {errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err.message} <span className="text-gray-500">({err.replacements?.[0]?.value || ''})</span></li>
                    ))}
                </ul>
            )}
        </div>
    );
}
