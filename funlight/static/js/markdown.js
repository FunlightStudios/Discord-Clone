class MarkdownParser {
    constructor() {
        this.rules = [
            // Code Blocks
            {
                pattern: /```([a-z]*)\n([\s\S]*?)```/g,
                replace: (match, lang, code) => `<pre><code class="language-${lang}">${this.escapeHtml(code.trim())}</code></pre>`
            },
            // Inline Code
            {
                pattern: /`([^`]+)`/g,
                replace: (match, code) => `<code>${this.escapeHtml(code)}</code>`
            },
            // Bold
            {
                pattern: /\*\*([^*]+)\*\*/g,
                replace: (match, text) => `<strong>${text}</strong>`
            },
            // Italic
            {
                pattern: /\*([^*]+)\*/g,
                replace: (match, text) => `<em>${text}</em>`
            },
            // Strikethrough
            {
                pattern: /~~([^~]+)~~/g,
                replace: (match, text) => `<del>${text}</del>`
            },
            // Underline
            {
                pattern: /__([^_]+)__/g,
                replace: (match, text) => `<u>${text}</u>`
            },
            // Headers
            {
                pattern: /^(#{1,6})\s(.+)$/gm,
                replace: (match, hashes, text) => `<h${hashes.length}>${text}</h${hashes.length}>`
            },
            // Blockquotes
            {
                pattern: /^>\s(.+)$/gm,
                replace: (match, text) => `<blockquote>${text}</blockquote>`
            },
            // Unordered Lists
            {
                pattern: /^[*-]\s(.+)$/gm,
                replace: (match, text) => `<li>${text}</li>`
            },
            // Ordered Lists
            {
                pattern: /^\d+\.\s(.+)$/gm,
                replace: (match, text) => `<li>${text}</li>`
            },
            // Links
            {
                pattern: /\[([^\]]+)\]\(([^)]+)\)/g,
                replace: (match, text, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`
            },
            // Images
            {
                pattern: /!\[([^\]]*)\]\(([^)]+)\)/g,
                replace: (match, alt, src) => `<img src="${src}" alt="${alt}" class="markdown-image">`
            },
            // Spoiler
            {
                pattern: /\|\|([^|]+)\|\|/g,
                replace: (match, text) => `<span class="spoiler">${text}</span>`
            }
        ];
    }
    
    parse(text) {
        // Vorverarbeitung für Listen
        text = this.preprocessLists(text);
        
        // Wende alle Regeln an
        this.rules.forEach(rule => {
            text = text.replace(rule.pattern, rule.replace);
        });
        
        // Nachverarbeitung für Listen
        text = this.postprocessLists(text);
        
        // Ersetze Zeilenumbrüche
        text = text.replace(/\n/g, '<br>');
        
        return text;
    }
    
    preprocessLists(text) {
        // Finde zusammenhängende Listenelemente
        const lines = text.split('\n');
        let inList = false;
        let listType = '';
        
        return lines.map(line => {
            if (line.match(/^[*-]\s/)) {
                if (!inList || listType !== 'ul') {
                    inList = true;
                    listType = 'ul';
                    return '<ul>' + line;
                }
            } else if (line.match(/^\d+\.\s/)) {
                if (!inList || listType !== 'ol') {
                    inList = true;
                    listType = 'ol';
                    return '<ol>' + line;
                }
            } else if (inList && line.trim() === '') {
                inList = false;
                return (listType === 'ul' ? '</ul>' : '</ol>') + line;
            } else if (inList) {
                inList = false;
                return (listType === 'ul' ? '</ul>' : '</ol>') + line;
            }
            return line;
        }).join('\n');
    }
    
    postprocessLists(text) {
        // Schließe offene Listen
        if (text.includes('<ul>') && !text.includes('</ul>')) {
            text += '</ul>';
        }
        if (text.includes('<ol>') && !text.includes('</ol>')) {
            text += '</ol>';
        }
        return text;
    }
    
    escapeHtml(text) {
        const escapeChars = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return text.replace(/[&<>"']/g, char => escapeChars[char]);
    }
}
