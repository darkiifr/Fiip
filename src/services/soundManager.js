import interactionPath from '../assets/interactionbouton.mp3';
import messagePath from '../assets/message.mp3';

let currentAudio = null;

export const soundManager = {
    play: (type) => {
        // Read settings directly from localStorage to avoid prop drilling everywhere for global events
        const settings = JSON.parse(localStorage.getItem('fiip-settings') || '{}');

        if (type === 'interaction' && settings.appSound === false) return;
        if (type === 'message' && settings.chatSound === false) return;

        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }

        const src = type === 'interaction' ? interactionPath : messagePath;
        currentAudio = new Audio(src);
        
        // Lower volume for interactions as they are frequent
        currentAudio.volume = type === 'interaction' ? 0.2 : 0.5;
        
        currentAudio.play().catch(() => {});
    }
};
