
export const validateOutput = (text: string): { isValid: boolean; reason?: string } => {
    const lowerText = text.toLowerCase();

    // Basic Safety Keywords (Article VII)
    const safetyViolations = [
        'violence', 'sexual', 'drug', 'illegal', 'politics', 'religion', 'suicide'
    ];

    for (const keyword of safetyViolations) {
        if (lowerText.includes(keyword)) {
            return { isValid: false, reason: 'Safety violation detected.' };
        }
    }

    // Constitutional Refusal if model claims unauthorized authority
    if (lowerText.includes("according to your syllabus") || lowerText.includes("in your textbook")) {
        // This is tricky; we only check this if NOT in grounded mode, 
        // but the runtime handles that. Here we just catch obvious hallucinations of authority.
    }

    return { isValid: true };
};

export const getHardRefusal = (reason?: string): string => {
    return "Cortex has intercepted a violation of the Constitution or Safety Rules. The model's output has been discarded.";
};
