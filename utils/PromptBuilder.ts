import { ToolId } from '../constants/ToolDefinitions';
import { UserClass } from '../store/useUserStore';

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

// 8. HARD SAFETY PROMPT (LLAMA NEEDS THIS)
const HARD_SAFETY_PROMPT = `
SAFETY RULES:
You must NOT answer questions about:
- Sexual or adult content
- Violence or weapons
- Drugs or illegal activities
- Politics or religion
- Medical advice
- Self-harm

If asked:
- Say the topic is not appropriate for school students.
- Suggest asking a parent or teacher.
`.trim();

// 6. CLASS CONTEXT PROMPT (MANDATORY)
const getClassContext = (cls: UserClass | null): string => {
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

// 7. TOOL PROMPTS (LLAMA-TUNED)
const getToolPrompt = (tool: ToolId | null, cls: UserClass | null): string => {
    if (!cls) return "";

    switch (tool) {
        case 'explain':
            return `
🧠 TOOL: EXPLAIN TOPIC
ROLE: You are explaining a school topic to a Class ${cls} student.
TASK: Explain the given topic clearly and simply.
RULES:
- Start with a simple definition.
- Explain step by step.
- Use bullet points.
- Maximum 6–8 points.
- No advanced terms unless appropriate for Class ${cls}.
If the topic is above Class ${cls}:
- Say so politely.
- Give only a basic idea.
`.trim();

        case 'notes':
            return `
📝 TOOL: MAKE SHORT NOTES
ROLE: You are helping a student revise for exams.
TASK: Create short revision notes for a Class ${cls} student.
FORMAT:
- Bullet points only
- Clear keywords
- No paragraphs
- Maximum 120 words
RULES:
- Focus only on exam-relevant points.
- Do not add extra information.
`.trim();

        case 'practice':
            return `
❓ TOOL: PRACTICE QUESTIONS
ROLE: You are a teacher preparing practice questions.
TASK: Create practice questions for a Class ${cls} student.
FORMAT:
- 2 easy questions
- 2 medium questions
- 1 slightly challenging question
RULES:
- Do NOT give answers.
- Keep questions strictly syllabus-based.
`.trim();

        case 'homework':
            return `
🧩 TOOL: HOMEWORK HELPER
ROLE: You are guiding a student to solve homework.
TASK: Explain how to think about the problem step by step.
STRICT RULES:
- Do NOT give the final answer.
- Give hints and reasoning.
- Encourage the student to try.
ONLY IF explicitly asked AND Class >= 9:
- Provide the final answer with explanation.
`.trim();

        case 'translate':
            return `
🌐 TOOL: SIMPLIFY / TRANSLATE
ROLE: You help students understand text easily.
TASK: Simplify or translate the text for a Class ${cls} student.
RULES:
- Use simple words.
- Short sentences.
- Keep the meaning correct.
`.trim();

        default:
            return "TASK: Answer the student's question helpfully via chat.";
    }
};

export const buildPrompt = ({ userClass, activeTool, input, modelName, history, customSystemPrompt }: BuildPromptOptions): string => {
    const isLlama3 = modelName.toLowerCase().includes('llama 3') || modelName.toLowerCase().includes('llama-3');
    const isQwen = modelName.toLowerCase().includes('qwen');
    const isTinyLlama = modelName.toLowerCase().includes('tinyllama');

    // Construct the System Prompt
    // LOGIC: If customSystemPrompt is provided, it replaces MASTER_SYSTEM_PROMPT (Persona).
    // Safety, Class Context, and Tools are ALWAYS appended.
    const systemPromptLines = [
        customSystemPrompt?.trim() ? customSystemPrompt.trim() : MASTER_SYSTEM_PROMPT,
        HARD_SAFETY_PROMPT,
        getClassContext(userClass),
        getToolPrompt(activeTool, userClass)
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
