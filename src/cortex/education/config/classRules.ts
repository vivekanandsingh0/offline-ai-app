import { UserClass } from '@/src/cortex/education/store/useUserStore';

export const getClassContext = (cls: UserClass | null): string => {
    if (!cls) return "";
    return `
STUDENT CONTEXT:
- Class: ${cls}
- Subject: General

STRICT RULES:
- Do NOT include content above Class ${cls}.
- If the topic belongs to a higher class, give only a very basic introduction.
- Use examples suitable for a Class ${cls} student.
`.trim();
};
