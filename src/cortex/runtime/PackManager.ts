import * as FileSystem from 'expo-file-system/legacy';

export interface KnowledgePack {
    id: string;
    class: string;
    subject: string;
    language: string;
    version: string;
    scope: 'subject';
    strict: boolean;
    keywords: string[];
    knowledgeContent: string;
    compactContent?: string;
}

const PACKS_ROOT = FileSystem.documentDirectory + 'knowledge-packs/';
let cachedPacks: KnowledgePack[] | null = null;

export const discoverPacks = async (forceRefresh = false): Promise<KnowledgePack[]> => {
    if (cachedPacks && !forceRefresh) return cachedPacks;

    try {
        const dirInfo = await FileSystem.getInfoAsync(PACKS_ROOT);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(PACKS_ROOT, { intermediates: true });
            return [];
        }

        const folders = await FileSystem.readDirectoryAsync(PACKS_ROOT);
        console.log(`[PackManager] Found ${folders.length} folders in ${PACKS_ROOT}`);
        const packs: KnowledgePack[] = [];

        for (const folder of folders) {
            const folderPath = PACKS_ROOT + folder + '/';
            const packJsonPath = folderPath + 'pack.json';
            const knowledgeMdPath = folderPath + 'knowledge.md';
            const compactMdPath = folderPath + 'knowledge.compact.md';

            const jsonInfo = await FileSystem.getInfoAsync(packJsonPath);
            const mdInfo = await FileSystem.getInfoAsync(knowledgeMdPath);
            const compactInfo = await FileSystem.getInfoAsync(compactMdPath);

            console.log(`[PackManager] Checking folder ${folder}: json=${jsonInfo.exists}, md=${mdInfo.exists}`);

            if (jsonInfo.exists && mdInfo.exists) {
                try {
                    const jsonContent = await FileSystem.readAsStringAsync(packJsonPath);
                    const mdContent = await FileSystem.readAsStringAsync(knowledgeMdPath);
                    const compactContent = compactInfo.exists ? await FileSystem.readAsStringAsync(compactMdPath) : undefined;
                    const config = JSON.parse(jsonContent);

                    console.log(`[PackManager] Loaded pack: ${config.id} with ${config.keywords?.length || 0} keywords`);

                    packs.push({
                        ...config,
                        knowledgeContent: mdContent,
                        compactContent
                    });
                } catch (e) {
                    console.error(`[PackManager] Failed to load pack in ${folder}:`, e);
                }
            }
        }

        cachedPacks = packs;
        return packs;
    } catch (e) {
        console.error('Error discovering packs:', e);
        return [];
    }
};

export const findPack = (packs: KnowledgePack[], userClass: string | null, subject: string | null): KnowledgePack | null => {
    if (!userClass || !subject) return null;
    return packs.find(p => p.class === userClass && p.subject.toLowerCase() === subject.toLowerCase()) || null;
};

/**
 * Auto-discovery: Finds a pack based on keywords in the user's query
 */
export const findPackByQuery = (packs: KnowledgePack[], query: string): KnowledgePack | null => {
    const lowerQuery = query.toLowerCase();
    // Prioritize packs with more keyword matches or specific subjects
    return packs.find(pack =>
        pack.keywords.some(keyword => lowerQuery.includes(keyword.toLowerCase()))
    ) || null;
};
/**
 * Downloads a pack from a remote URL.
 * Since we are avoiding zip for now, we expect individual files.
 */
export const downloadPack = async (packId: string, baseUrl: string): Promise<boolean> => {
    try {
        console.log(`[PackManager] Starting download for ${packId} from ${baseUrl}`);
        const packDir = PACKS_ROOT + packId + '/';
        await FileSystem.makeDirectoryAsync(packDir, { intermediates: true });

        // Download pack.json
        console.log(`[PackManager] Fetching pack.json...`);
        const jsonRes = await fetch(`${baseUrl}/pack.json`);
        if (!jsonRes.ok) throw new Error(`HTTP ${jsonRes.status} fetching pack.json`);
        const jsonContent = await jsonRes.text();
        await FileSystem.writeAsStringAsync(packDir + 'pack.json', jsonContent);

        // Download knowledge.md
        console.log(`[PackManager] Fetching knowledge.md...`);
        const mdRes = await fetch(`${baseUrl}/knowledge.md`);
        if (!mdRes.ok) throw new Error(`HTTP ${mdRes.status} fetching knowledge.md`);
        const mdContent = await mdRes.text();
        await FileSystem.writeAsStringAsync(packDir + 'knowledge.md', mdContent);

        // Download knowledge.compact.md (New)
        console.log(`[PackManager] Fetching knowledge.compact.md...`);
        try {
            const compactRes = await fetch(`${baseUrl}/knowledge.compact.md`);
            if (compactRes.ok) {
                const compactContent = await compactRes.text();
                await FileSystem.writeAsStringAsync(packDir + 'knowledge.compact.md', compactContent);
            }
        } catch (e) {
            console.log(`[PackManager] No compact knowledge found for ${packId}, using full only.`);
        }

        console.log(`[PackManager] Successfully installed pack: ${packId}`);
        cachedPacks = null; // Invalidate cache
        return true;
    } catch (e) {
        console.error(`[PackManager] Failed to download pack ${packId}:`, e);
        return false;
    }
};

/**
 * Simple sectional extraction from Markdown.
 * Looks for ## or ### headings matching query keywords.
 */
export const extractRelevantSection = (fullKnowledge: string, query: string): string => {
    const sections = fullKnowledge.split(/(?=\n#{2,3}\s)/);
    const queryWords = query.toLowerCase().split(/\W+/);

    // Find the first section that mentions a significant word from the query
    for (const section of sections) {
        const firstLine = section.split('\n')[0].toLowerCase();
        if (queryWords.some(word => word.length > 3 && firstLine.includes(word))) {
            return section.trim();
        }
    }

    return ""; // Fallback to empty if no specific section matches
};

/**
 * Fetches the master catalog of available packs
 */
export const getRemoteCatalog = async (catalogUrl: string): Promise<any[]> => {
    try {
        const res = await fetch(catalogUrl);
        const data = await res.json();
        return data.packs || [];
    } catch (e) {
        console.error('Failed to fetch remote catalog:', e);
        return [];
    }
};
