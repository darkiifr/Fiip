import { bench, describe } from 'vitest';
import { moderationService } from './moderation.js';

describe('Moderation Service Benchmarks', () => {
    const safeMessage = "Ceci est un message tout à fait normal et sain.";
    const unsafeMessage = "Ceci contient un mot interdit : bomb et d'autres choses.";
    const linkMessage = "Voici un lien pour tester : https://google.com pas de soucis ici.";
    const badLinkMessage = "Ne cliquez pas sur ce lien : http://192.168.1.1 ou https://spam.xyz";
    const longMessage = "Un texte un peu plus long. ".repeat(100) + "Et à la fin https://github.com";

    bench('analyzeMessage - Message sûr', () => {
        moderationService.analyzeMessage(safeMessage);
    });

    bench('analyzeMessage - Message avec mots interdits', () => {
        moderationService.analyzeMessage(unsafeMessage);
    });

    bench('analyzeMessage - Message avec lien sûr', () => {
        moderationService.analyzeMessage(linkMessage);
    });

    bench('analyzeMessage - Message avec lien suspect', () => {
        moderationService.analyzeMessage(badLinkMessage);
    });

    bench('analyzeMessage - Message long', () => {
        moderationService.analyzeMessage(longMessage);
    });
});
