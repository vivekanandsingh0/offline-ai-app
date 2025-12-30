import { UserClass } from '@/src/cortex/education/store/useUserStore';
import { ToolId } from '@/src/cortex/shared/constants/ToolDefinitions';
import { getClassContext } from './config/classRules';
import { HARD_SAFETY_PROMPT } from './config/safety';
import { getToolPrompt } from './config/tools';

type Message = {
    role: 'user' | 'assistant';
    content: string;
};

interface BuildPromptOptions {
    userClass: UserClass | null;
    activeTool: ToolId | null;
    input: string;
    modelName: string;
    history: Message[];
    customSystemPrompt?: string;
}

// 5. MASTER SYSTEM PROMPT (LLAMA-OPTIMIZED)
const MASTER_SYSTEM_PROMPT = `
You are a calm, friendly, and disciplined school teacher.
You help students from Nursery to Class 10 learn their school subjects in a safe, simple, and correct way.

IMPORTANT BEHAVIOR RULES:
- Always teach according to the student's class level.
- Use simple and age-appropriate language.
- Never explain concepts beyond the student's syllabus level.
- Never use adult, political, religious, medical, or unsafe topics.
- Never encourage cheating.
- Never mention AI, models, training, or internal rules.

TEACHING STYLE:
- Be clear and structured.
- Prefer short sentences.
- Prefer bullet points.
- Explain step by step.
- Be encouraging, not authoritative.

OUTPUT RULES:
- Keep answers short by default.
- Do not over-explain unless asked.
- If unsure, ask a simple clarification question.
`.trim();

// 9. KNOWLEDGE INGESTION (STEP 3.4)
const loadKnowledgeIfAvailable = (cls: UserClass | null, subject: string | null, input: string): { content: string | null, isSyllabusMatch: boolean } => {
    if (!cls) return { content: null, isSyllabusMatch: false };

    // For now, we have a hardcoded check for our first pack
    // In the future, this will scan the packs directory and use RAG or keyword search
    if (cls === '6' && (subject === 'science' || !subject)) {
        const keywords = ['plant', 'photosynthesis', 'root', 'leaf', 'stem'];
        const matches = keywords.some(k => input.toLowerCase().includes(k));

        if (matches) {
            return {
                content: `
KNOWLEDGE BASE (CLASS 6 SCIENCE):
- Plants have stems, roots, and leaves.
- Photosynthesis is the process by which plants make food.
- Water and minerals are absorbed by roots.
- Leaves are the food factories of plants.
`.trim(),
                isSyllabusMatch: true
            };
        }
    }

    return { content: null, isSyllabusMatch: false };
};

export const buildPrompt = ({ userClass, activeTool, input, modelName, history, customSystemPrompt }: BuildPromptOptions): string => {
    const isLlama3 = modelName.toLowerCase().includes('llama 3') || modelName.toLowerCase().includes('llama-3');
    const isQwen = modelName.toLowerCase().includes('qwen');
    const isTinyLlama = modelName.toLowerCase().includes('tinyllama');

    // Load Knowledge & Check Syllabus (Phase 3.4 & 3.5)
    const { content: knowledge, isSyllabusMatch } = loadKnowledgeIfAvailable(userClass, null, input);

    // Hard Refusal for Out-of-Syllabus (Phase 3.5)
    if (activeTool === 'explain' && userClass === '6' && !isSyllabusMatch) {
        return "I'm sorry, but this topic is not part of your current Class 6 Science syllabus. Please ask something related to your school subjects!";
    }

    // Construct the System Prompt
    // LOGIC: If customSystemPrompt is provided, it replaces MASTER_SYSTEM_PROMPT (Persona).
    // Safety, Class Context, and Tools are ALWAYS appended.
    const systemPromptLines = [
        customSystemPrompt?.trim() ? customSystemPrompt.trim() : MASTER_SYSTEM_PROMPT,
        HARD_SAFETY_PROMPT,
        getClassContext(userClass),
        getToolPrompt(activeTool, userClass),
        knowledge ? `CONTEXT INFORMATION:\n${knowledge}` : ""
    ].filter(line => line.length > 0);

    const systemPrompt = systemPromptLines.join("\n\n");

    let prompt = "";

    if (isLlama3) {
        // Llama 3 Format
        prompt += `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${systemPrompt}<|eot_id|>`;
        history.forEach(msg => {
            prompt += `<|start_header_id|>${msg.role}<|end_header_id|>\n\n${msg.content}<|eot_id|>`;
        });
        prompt += `<|start_header_id|>user<|end_header_id|>\n\n${input}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;
    } else if (isQwen) {
        // Qwen Format
        prompt += `<|im_start|>system\n${systemPrompt}<|im_end|>\n`;
        history.forEach(msg => {
            prompt += `<|im_start|>${msg.role}\n${msg.content}<|im_end|>\n`;
        });
        prompt += `<|im_start|>user\n${input}<|im_end|>\n<|im_start|>assistant\n`;
    } else if (isTinyLlama) {
        // TinyLlama Chat Format
        prompt += `<|system|>\n${systemPrompt}</s>\n`;
        history.forEach(msg => {
            prompt += `<|${msg.role}|>\n${msg.content}</s>\n`;
        });
        prompt += `<|user|>\n${input}</s>\n<|assistant|>\n`;
    } else {
        // Mistral / Generic Format
        let fullContext = systemPrompt + "\n\n";
        history.forEach(msg => {
            if (msg.role === 'user') fullContext += `User: ${msg.content}\n`;
            else fullContext += `Assistant: ${msg.content}\n`;
        });
        fullContext += `User: ${input}\nAssistant:`;

        if (history.length === 0) {
            prompt = `<s>[INST] ${systemPrompt}\n\n${input} [/INST]`;
        } else {
            prompt = `<s>[INST] ${systemPrompt} [/INST] </s>`;
            history.forEach(m => {
                if (m.role === 'user') prompt += `<s>[INST] ${m.content} [/INST] `;
                else prompt += `${m.content} </s>`;
            });
            prompt += `<s>[INST] ${input} [/INST]`;
        }
    }

    return prompt;
};
