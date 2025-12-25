import { UserClass } from "../store/useUserStore";

export type ToolId = 'explain' | 'notes' | 'practice' | 'homework' | 'translate';

export interface ToolDefinition {
    id: ToolId;
    name: string;
    icon: string; // Ionicons name
    minClass: number; // 0 for Nursery/KG
    description: string;
}

const CLASS_MAP: Record<UserClass, number> = {
    'Nursery': 0, 'LKG': 0, 'UKG': 0,
    '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
    '6': 6, '7': 7, '8': 8, '9': 9, '10': 10
};

export const TOOLS: ToolDefinition[] = [
    {
        id: 'explain',
        name: 'Explain Topic',
        icon: 'bulb-outline',
        minClass: 0,
        description: 'Get clear explanations for any topic.'
    },
    {
        id: 'notes',
        name: 'Short Notes',
        icon: 'document-text-outline',
        minClass: 3,
        description: 'Summarize topics into bullet points.'
    },
    {
        id: 'practice',
        name: 'Practice Questions',
        icon: 'help-circle-outline',
        minClass: 3,
        description: 'Test your knowledge with questions.'
    },
    {
        id: 'homework',
        name: 'Homework Helper',
        icon: 'library-outline',
        minClass: 9,
        description: 'Get hints and steps (no direct answers).'
    },
    {
        id: 'translate',
        name: 'Simplify / Translate',
        icon: 'language-outline',
        minClass: 0,
        description: 'Translate text or make it simpler.'
    }
];

export const isToolAvailable = (toolId: ToolId, userClass: UserClass | null): boolean => {
    if (!userClass) return false;
    const tool = TOOLS.find(t => t.id === toolId);
    if (!tool) return false;

    const classNum = CLASS_MAP[userClass];
    return classNum >= tool.minClass;
};

export const getAvailableTools = (userClass: UserClass | null): ToolDefinition[] => {
    if (!userClass) return [];
    const classNum = CLASS_MAP[userClass];
    return TOOLS.filter(t => classNum >= t.minClass);
};
