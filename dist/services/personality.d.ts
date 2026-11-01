import type { PersonalityTraits, PersonalityType, UserProfile } from '../types';
export declare class PersonalityService {
    private static instance;
    private currentPersonality;
    private traits;
    private constructor();
    static getInstance(): PersonalityService;
    getTraits(): PersonalityTraits;
    getSystemPrompt(userName: string, userProfile?: UserProfile): string;
    getRandomEmoji(): string;
    getRandomCatchphrase(): string;
    setPersonality(type: PersonalityType): void;
    getPersonalityType(): PersonalityType;
}
export declare const personalityService: PersonalityService;
//# sourceMappingURL=personality.d.ts.map