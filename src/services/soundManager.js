import interactionPath from '../assets/interactionbouton.mp3';
import messagePath from '../assets/message.mp3';

let currentAudio = null;
let appSoundEnabled = true;
let chatSoundEnabled = true;

const normalizeType = (type) => {
    if (['message', 'chat', 'notification'].includes(type)) {
        return 'message';
    }
    return 'interaction';
};

export const soundManager = {
    setAppSoundEnabled: (enabled) => {
        appSoundEnabled = enabled !== false;
    },

    setChatSoundEnabled: (enabled) => {
        chatSoundEnabled = enabled !== false;
    },

    play: (type = 'interaction') => {
        const normalizedType = normalizeType(type);
        // Read settings directly from localStorage to avoid prop drilling everywhere for global events
        const settings = JSON.parse(localStorage.getItem('fiip-settings') || '{}');

        const shouldPlayAppSound = settings.appSound ?? appSoundEnabled;
        const shouldPlayChatSound = settings.chatSound ?? chatSoundEnabled;

        if (normalizedType === 'interaction' && shouldPlayAppSound === false) {return Promise.resolve(false);}
        if (normalizedType === 'message' && shouldPlayChatSound === false) {return Promise.resolve(false);}

        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }

        const src = normalizedType === 'interaction' ? interactionPath : messagePath;
        currentAudio = new Audio(src);
        
        // Lower volume for interactions as they are frequent
        currentAudio.volume = normalizedType === 'interaction' ? 0.2 : 0.5;
        
        return currentAudio.play()
            .then(() => true)
            .catch((error) => {
                console.warn('Fiip sound playback was blocked or failed:', error);
                return false;
            });
    }
};
