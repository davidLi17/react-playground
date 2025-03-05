export const fileName2Language = (name: string):string =>{
    const suffix = name.split('.').pop()?.toLowerCase() || '';
    
    const languageMap: Record<string, string[]> = {
        javascript: ['js', 'jsx'],
        typescript: ['ts', 'tsx'],
        json: ['json'],
        css: ['css'],
        markdown: ['md', 'markdown'],
        html: ['html', 'htm'],
    };

    for (const [language, extensions] of Object.entries(languageMap)) {
        if (extensions.includes(suffix)) {
            return language;
        }
    }

    return 'plaintext';
};