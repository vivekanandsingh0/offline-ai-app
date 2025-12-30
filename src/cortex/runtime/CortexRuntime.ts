import OfflineLLMModule from 'offline-llm-module';
import { getConstitutionPrompt } from './Constitution';
import { discoverPacks, findPack, findPackByQuery, KnowledgePack } from './PackManager';
import { getHardRefusal, validateOutput } from './Validation';

interface RuntimeOptions {
    userClass: string | null;
    subject: string | null;
    modelName: string;
    history: { role: 'user' | 'assistant'; content: string }[];
    generationParams?: {
        temperature?: number;
        max_tokens?: number;
    };
    onToken?: (token: string) => void;
}

export interface RuntimeResult {
    response: string;
    packUsed?: string;
}

export const processQuery = async (input: string, options: RuntimeOptions): Promise<RuntimeResult> => {
    const { userClass, subject, modelName, history, generationParams } = options;

    // 1. Discover and find pack
    const packs = await discoverPacks();

    // Heuristics for discovery
    let pack: KnowledgePack | null = findPack(packs, userClass, subject);

    // Direct match check
    const directMatch = input.length > 3 ? findPackByQuery(packs, input) : null;

    if (directMatch) {
        pack = directMatch;
    } else if (!pack && history.length > 0) {
        // Only use history-based stickiness if the current query 
        // is likely a follow-up (short) or has NO topic of its own.
        // If it's a long sentence and didn't match anything, it's probably off-topic.
        const likelyFollowUp = input.length < 25 || input.split(' ').length < 5;

        if (likelyFollowUp) {
            for (let i = history.length - 1; i >= 0; i--) {
                const match = findPackByQuery(packs, history[i].content);
                if (match) {
                    pack = match;
                    break;
                }
            }
        }
    }

    // 2. Assemble Prompt
    const constitution = getConstitutionPrompt();
    let knowledgeInjection = "";

    if (pack) {
        // If it's a direct match, we are strict. If it's sticky, we are flexible.
        const isDirect = !!directMatch;

        knowledgeInjection = `
KNOWLEDGE-GROUNDED MODE:
You are provided with specialized knowledge for this conversation.

INSTRUCTIONS:
1. If the user's question relates to the CONTENT below, use it as your primary authority.
2. If the user's question is unrelated to the CONTENT (e.g., greetings, general pleasantries, or off-topic questions), ignore the content and answer generally according to the Cortex Constitution.
${pack.strict || isDirect ? "3. For subject-specific queries, do NOT provide information beyond the provided scope." : ""}

CONTENT:
${pack.knowledgeContent}
`.trim();
    } else {
        knowledgeInjection = `
CONSTITUTIONAL MODE:
No specialized knowledge is grounded. Answer generally based on the Cortex Constitution.
`.trim();
    }

    const systemPrompt = `
${constitution}

${knowledgeInjection}
`.trim();

    // 3. Format prompt based on model
    let prompt = "";
    const isLlama3 = modelName.toLowerCase().includes('llama 3');

    if (isLlama3) {
        prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${systemPrompt}<|eot_id|>`;
        history.forEach(msg => {
            // Trim individual history messages slightly if they are massive
            const content = msg.content.length > 1000 ? msg.content.slice(0, 1000) + "..." : msg.content;
            prompt += `<|start_header_id|>${msg.role}<|end_header_id|>\n\n${content}<|eot_id|>`;
        });
        prompt += `<|start_header_id|>user<|end_header_id|>\n\n${input}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;
    } else {
        prompt = `System: ${systemPrompt}\n\n`;
        history.forEach(msg => {
            const content = msg.content.length > 1000 ? msg.content.slice(0, 1000) + "..." : msg.content;
            prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${content}\n`;
        });
        prompt += `User: ${input}\nAssistant:`;
    }

    console.log(`[Runtime] Prompt length: ${prompt.length} chars. Ingesting...`);

    // 4. Generate
    let subscription: any = null;
    try {
        if (options.onToken) {
            subscription = OfflineLLMModule.addListener('onToken', (event: { token: string }) => {
                options.onToken?.(event.token);
            });
        }

        const response = await OfflineLLMModule.generate(prompt, generationParams);

        if (subscription) {
            subscription.remove();
        }

        // 5. Post-Generation Validation
        const validation = validateOutput(response);
        if (!validation.isValid) {
            return {
                response: getHardRefusal(validation.reason),
                packUsed: pack?.id
            };
        }

        return {
            response: response.trim(),
            packUsed: pack?.id
        };
    } catch (e) {
        if (subscription) {
            subscription.remove();
        }
        console.error("Inference Error:", e);
        return { response: "An internal error occurred in the Cortex Runtime." };
    }
};
