import React, { useRef, useEffect } from "react";

export default function SpellCheckTextarea({ value, onChange, ...props }) {
    const textareaRef = useRef(null);
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.setAttribute("spellcheck", "true");
            textareaRef.current.setAttribute("lang", "fr");
        }
    }, []);
    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            {...props}
        />
    );
}
