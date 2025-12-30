import OfflineLLMModule from 'offline-llm-module';
import { getConstitutionPrompt } from './Constitution';
import { discoverPacks, extractRelevantSection, findPack, findPackByQuery, KnowledgePack } from './PackManager';
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

    // 2. Decide Grounding Depth & Resume Logic
    const detailKeywords = ["explain", "detail", "describe", "notes", "process", "syllabus", "define"];
    const resumeKeywords = ["resume", "continue", "go on", "tell me more", "keep going"];

    const needsDetail = detailKeywords.some(k => input.toLowerCase().includes(k));
    const isResume = resumeKeywords.some(k => input.toLowerCase().includes(k));

    let compactGrounding = pack?.compactContent || "";
    let detailedGrounding = "";

    if (pack && needsDetail) {
        detailedGrounding = extractRelevantSection(pack.knowledgeContent, input);
        // Bloat Protection: Cap detailed grounding
        if (detailedGrounding.length > 1500) {
            detailedGrounding = detailedGrounding.slice(0, 1500) + "... [truncated]";
        }
        console.log(`[Runtime] High-Precision Mode Triggered. Section Length: ${detailedGrounding.length}`);
    }

    // Bloat Protection: Cap compact grounding
    if (compactGrounding.length > 800) {
        compactGrounding = compactGrounding.slice(0, 800) + "... [truncated]";
    }

    // 3. Assemble Prompt (STRICT ORDER)
    const constitution = getConstitutionPrompt();

    const safetyHeader = `
SAFETY CONSTRAINTS:
- Do NOT provide medical diagnoses.
- Do NOT generate code for cyberattacks.
- If unsure, stick to the provided knowledge.
`.trim();

    const compactInjection = compactGrounding ? `
SCOPE CONTEXT (Compact):
${compactGrounding}
`.trim() : "";

    const detailedInjection = detailedGrounding ? `
DETAILED REFERENCE:
${detailedGrounding}
`.trim() : "";

    const resumeInstruction = isResume ? `
CONTINUATION INSTRUCTION:
The user has asked you to resume or continue. Look at your LAST message in the history. DO NOT repeat the parts already written. Start exactly where you stopped to complete the answer.
`.trim() : "";

    const systemPrompt = `
${constitution}

${safetyHeader}

${compactInjection}

${detailedInjection}

${resumeInstruction}

CONSTITUTIONAL FALLBACK:
If the user's question is unrelated to the provided knowledge, answer generally based on the Cortex Constitution principles.
`.trim();

    // 4. Format prompt based on model
    let prompt = "";
    const isLlama3 = modelName.toLowerCase().includes('llama 3');

    // Enforce Generation Parameters (Dynamic)
    const finalParams = {
        temperature: 0.1, // Even colder for faster/stricter results
        top_p: 0.9,
        top_k: 40,
        max_tokens: (needsDetail || isResume) ? 256 : 100, // Reduced default token count
        ...generationParams
    };

    // Dynamic Pruning: If Grounding is present, we only need a sliver of history
    const pruningLimit = pack ? 2 : 4;
    const prunedHistory = history.slice(-pruningLimit);

    if (isLlama3) {
        prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${systemPrompt}<|eot_id|>\n\n`;
        prunedHistory.forEach((msg, idx) => {
            let content = msg.content;
            // Hyper-Optimization: Aggressive history caps
            const charCap = pack ? 300 : 500;
            if (content.length > charCap) {
                if (isResume && idx === prunedHistory.length - 1 && msg.role === 'assistant') {
                    content = "... " + content.slice(-800); // Smaller anchor
                } else {
                    content = content.slice(0, charCap) + " [truncated]";
                }
            }
            prompt += `<|start_header_id|>${msg.role}<|end_header_id|>\n\n${content}<|eot_id|>`;
        });
        prompt += `<|start_header_id|>user<|end_header_id|>\n\n${input}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;
    } else {
        prompt = `System: ${systemPrompt}\n\n`;
        prunedHistory.forEach((msg, idx) => {
            let content = msg.content;
            const charCap = pack ? 300 : 500;
            if (content.length > charCap) {
                if (isResume && idx === prunedHistory.length - 1 && msg.role === 'assistant') {
                    content = "... " + content.slice(-800);
                } else {
                    content = content.slice(0, charCap) + " [truncated]";
                }
            }
            prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${content}\n`;
        });
        prompt += `User: ${input}\nAssistant:`;
    }

    console.log(`[Runtime] Hyper-Optimization Active. 
    Segments: System(${systemPrompt.length}), History(${prompt.length - systemPrompt.length}), Input(${input.length})
    (PackActive: ${!!pack}, Detail: ${needsDetail}, Resume: ${isResume})`);

    // 4. Generate
    let subscription: any = null;
    try {
        if (options.onToken) {
            subscription = OfflineLLMModule.addListener('onToken', (event: { token: string }) => {
                options.onToken?.(event.token);
            });
        }

        const response = await OfflineLLMModule.generate(prompt, finalParams);

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
