const translationCache = new Map();

// DO NOT hardcode API keys - use chrome.storage or your backend instead
// const API_KEY = '...'; // REMOVE THIS
API_KEY = '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'

// Enhanced rate limiter with per-domain tracking
class RequestQueue {
    constructor() {
        this.queues = new Map(); // Separate queue for each API
        this.isProcessing = false;
        this.domainDelays = {
            'simplytranslate.org': 1500, // 1.5 seconds between requests
            'libretranslate.com': 2000, // 2 seconds between requests
            'api.mymemory.translated.net': 1000 // 1 second for MyMemory
        };
    }

    async add(apiUrl, fn) {
        const domain = new URL(apiUrl).hostname;
        if (!this.queues.has(domain)) {
            this.queues.set(domain, []);
        }
        
        return new Promise((resolve, reject) => {
            this.queues.get(domain).push({ fn, resolve, reject });
            this.process();
        });
    }

    async process() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        
        while (this.hasPendingRequests()) {
            for (const [domain, queue] of this.queues) {
                if (queue.length > 0) {
                    const { fn, resolve, reject } = queue.shift();
                    try {
                        const result = await fn();
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                    
                    // Wait before next request to this domain
                    if (queue.length > 0) {
                        await new Promise(r => setTimeout(r, this.domainDelays[domain] || 1000));
                    }
                }
            }
            
            // Small delay between domain cycles
            await new Promise(r => setTimeout(r, 100));
        }
        
        this.isProcessing = false;
    }

    hasPendingRequests() {
        for (const queue of this.queues.values()) {
            if (queue.length > 0) return true;
        }
        return false;
    }
}

const requestQueue = new RequestQueue();

async function toEnglishSentence(language, sentence) {
    // Clean the sentence
    const cleanSentence = sentence.trim();
    if (!cleanSentence || cleanSentence.length < 5) {
        console.log("Skipping short sentence:", cleanSentence);
        return {
            choices: [{
                message: {
                    content: cleanSentence // Return original for short sentences
                }
            }]
        };
    }

    console.log(`Translating: "${cleanSentence.substring(0, 50)}..."`);

    // Map language names to language codes
    const languageMap = {
        'russian': 'ru',
        'french': 'fr',
        'spanish': 'es',
        'german': 'de',
        'italian': 'it',
        'japanese': 'ja',
        'korean': 'ko',
        'chinese': 'zh'
    };

    const targetLang = languageMap[language.toLowerCase()] || 'ru';

    try {
        // Try SimplyTranslate first (most reliable)
        console.log("Trying SimplyTranslate...");
        const response = await fetch(
            `https://simplytranslate.org/api/translate?text=${encodeURIComponent(cleanSentence)}&to=${targetLang}&engine=google`
        );
        
        if (response.ok) {
            const data = await response.json();
            const translatedText = data.translated_text;
            console.log("✅ SimplyTranslate success:", translatedText);
            
            return {
                choices: [{
                    message: {
                        content: translatedText
                    }
                }]
            };
        }
    } catch (error) {
        console.log("SimplyTranslate failed:", error.message);
    }

    // Fallback: Return a simple mock translation for testing
    console.log("Using mock translation for testing");
    const mockTranslation = `[${targetLang.toUpperCase()}] ${cleanSentence}`;
    
    return {
        choices: [{
            message: {
                content: mockTranslation
            }
        }]
    };
}

const languageNameMap = {
    'russian': 'Russian',
    'french': 'French',
    'spanish': 'Spanish',
    'german': 'German',
    'italian': 'Italian',
    'japanese': 'Japanese',
    'korean': 'Korean',
    'chinese': 'Chinese'
};

async function translateSentence(language, sentence) {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4.5',
        messages: [
        {
            role: 'user',
            content: `Translate the following sentence with no explanation or additional info into ${language}: ${sentence}`
        },
        ],
        provider: {
            sort: 'latency'
        }
    }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(data["choices"][0]["message"]["content"])
    return data;
  } catch (error) {
    console.error("Fetch error:", error);
    throw error; // Re-throw so caller knows it failed
  }
}

// New function to translate back to English using MyMemory API
async function translateToEnglish(text, sourceLanguage) {
    const cacheKey = `en:${text}`;
    if (translationCache.has(cacheKey)) {
        console.log("Using cached translation:", translationCache.get(cacheKey));
        return translationCache.get(cacheKey);
    }

    // If the text is already in English or very short, return as-is
    if (text.length < 3 || /^[a-zA-Z\s.,!?;:'"-]+$/.test(text)) {
        console.log("Text appears to be English, returning as-is:", text);
        translationCache.set(cacheKey, text);
        return text;
    }

    try {
        console.log("Translating to English:", text, "from", sourceLanguage);

        const languageMap = {
            'russian': 'ru',
            'french': 'fr',
            'spanish': 'es',
            'german': 'de',
            'italian': 'it',
            'japanese': 'ja',
            'korean': 'ko',
            'chinese': 'zh'
        };

        const sourceLang = languageMap[sourceLanguage.toLowerCase()] || 'ru';

        const response = await fetch(
            `https://simplytranslate.org/api/translate?text=${encodeURIComponent(text)}&from=${sourceLang}&to=en&engine=google`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const translation = data.translated_text || text;

        translationCache.set(cacheKey, translation);
        console.log("English translation:", translation);

        return translation;
    } catch (error) {
        console.error("Translation error:", error);
        // Final fallback: Return the original text with a marker
        const fallbackTranslation = `[EN] ${text}`;
        translationCache.set(cacheKey, fallbackTranslation);
        return fallbackTranslation;
    }
}

function createWordMapping(originalSentence, translatedSentence) {
    const cleanPunctuation = (text) => text.replace(/[.,!?;:"""'']/g, '').trim();

    const originalWords = cleanPunctuation(originalSentence).split(/\s+/).filter(w => w.trim());
    const translatedWords = cleanPunctuation(translatedSentence).split(/\s+/).filter(w => w.trim());

    const mapping = new Map();

    console.log("Creating word mapping:");
    console.log("Original words:", originalWords);
    console.log("Translated words:", translatedWords);

    // Try to map words based on position
    const minLength = Math.min(originalWords.length, translatedWords.length);
    for (let i = 0; i < minLength; i++) {
        const translatedKey = translatedWords[i].toLowerCase();
        const originalValue = originalWords[i];
        mapping.set(translatedKey, originalValue);
        console.log(`Mapping: ${translatedKey} -> ${originalValue}`);
    }

    // Also map common variations
    if (mapping.size === 0) {
        console.log("No direct mapping found, trying to map common words");
        // Add some common word mappings as fallback
        const commonMappings = {
            'the': 'the', 'and': 'and', 'is': 'is', 'in': 'in', 'to': 'to',
            'of': 'of', 'a': 'a', 'that': 'that', 'it': 'it', 'with': 'with',
            'for': 'for', 'as': 'as', 'was': 'was', 'on': 'on', 'are': 'are'
        };
        
        for (const [enWord, enValue] of Object.entries(commonMappings)) {
            mapping.set(enWord, enValue);
        }
    }

    return mapping;
}

function wrapTranslatedWords(text, wordMapping) {
    const fragment = document.createDocumentFragment();
    const parts = text.split(/(\s+)/);

    parts.forEach(part => {
        if (part.trim() === '') {
            fragment.appendChild(document.createTextNode(part));
        } else {
            const wordSpan = document.createElement('span');
            wordSpan.className = 'translated-word';
            wordSpan.textContent = part;
            wordSpan.setAttribute('data-translated-word', part);

            const cleanWord = part.replace(/[.,!?;:"""'']/g, '').toLowerCase();
            if (wordMapping && wordMapping.has(cleanWord)) {
                const originalWord = wordMapping.get(cleanWord);
                wordSpan.setAttribute('data-original-word', originalWord);
                console.log(`Setting original word for "${part}": ${originalWord}`);
            } else {
                console.log(`No original word mapping found for: ${part}`);
            }

            wordSpan.setAttribute('data-no-translate', 'true');
            fragment.appendChild(wordSpan);
        }
    });

    return fragment;
}

async function getUserSettings() {
    const data = await chrome.storage.sync.get(['difficultyLevel', 'selectedLanguage', 'volumeLevel', 'extensionEnabled']);
    return {
        level: data.difficultyLevel ?? null, // Default to 0 (A1)
        language: data.selectedLanguage ?? null,
        volume: data.volumeLevel !== undefined ? data.volumeLevel : 10,
        enabled: data.extensionEnabled
    };
}

// Listen for changes to difficulty
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.difficultyLevel) {
        main();
    }
    if (changes.selectedLanguage) {
        main();
    }
    if (changes.volumeLevel) {
        main();
    }
    if (changes.enabled) {
        main();
    }
 });

const style = document.createElement('style');
style.textContent = `
 @keyframes fadeInLeft {
 from {
 opacity: 0;
 transform: translateX(-10px);
 }
 to {
 opacity: 1;
 transform: translateX(0);
 }
 }
 .translated-sentence {
 animation: fadeInLeft 0.6s ease-out;
 color: #2CB2B2;
 }
 
 .translated-word {
 cursor: pointer;
 position: relative;
 display: inline;
 }
 
 .translation-tooltip {
 position: fixed;
 background: linear-gradient(180deg, rgba(44,178,178,0.95) 0%, rgba(26,140,140,0.95) 100%);
 border: 2px solid rgba(255,255,255,0.3);
 backdrop-filter: blur(12px) saturate(150%);
 -webkit-backdrop-filter: blur(12px) saturate(150%);
 color: #fff;
 padding: 12px 16px;
 border-radius: 12px;
 font-size: 15px;
 font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
 box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255,255,255,0.3);
 pointer-events: none;
 z-index: 999999;
 transition: opacity 0.25s ease, transform 0.25s ease;
 opacity: 0;
 transform: translateY(-5px);
 max-width: 300px;
 word-wrap: break-word;
 }
 
 .translation-tooltip.visible {
 opacity: 1;
 transform: translateY(0);
 }
 
 .translation-tooltip-header {
 font-size: 11px;
 opacity: 0.8;
 margin-bottom: 4px;
 text-transform: uppercase;
 letter-spacing: 0.5px;
 }
 
 .translation-tooltip-text {
 font-weight: 600;
 font-size: 16px;
 }
`;
document.head.appendChild(style);

// Enhanced tooltip with English translation
const translationTooltip = document.createElement('div');
translationTooltip.className = 'translation-tooltip';
translationTooltip.setAttribute('data-no-translate', 'true');
document.body.appendChild(translationTooltip);

let currentHoveredElement = null;
let tooltipTimeout = null;

async function showTranslationTooltip(element, translatedWord, originalWord, x, y) {
    if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
    }

    currentHoveredElement = element;

    let englishTranslation;

    // If we have the original English word stored, use it directly
    if (originalWord) {
        englishTranslation = originalWord;
        console.log("Using stored original English:", englishTranslation);
    } else {
        // If no original word is stored, try to translate the translated word back to English
        console.log("No stored original word, translating back to English:", translatedWord);
        const languageName = languageNameMap[storageInfo.language.toLowerCase()] || 'Russian';
        const cleanWord = translatedWord.replace(/[.,!?;:"""'']/g, '').trim();
        
        // Show loading tooltip immediately
        translationTooltip.innerHTML = `
            <div class="translation-tooltip-header">Translating...</div>
            <div class="translation-tooltip-text">${cleanWord}</div>
        `;
        positionTooltip(x, y);
        translationTooltip.classList.add('visible');
        
        // Then get the actual translation
        englishTranslation = await translateToEnglish(cleanWord, languageName);
    }

    // Only update if we're still hovering over the same element
    if (currentHoveredElement === element) {
        translationTooltip.innerHTML = `
            <div class="translation-tooltip-header">English</div>
            <div class="translation-tooltip-text">${englishTranslation}</div>
        `;
        positionTooltip(x, y);
        translationTooltip.classList.add('visible');
    }
}

function positionTooltip(x, y) {
    let offsetX = 12;
    let offsetY = 16;

    translationTooltip.style.left = '-9999px';
    translationTooltip.style.top = '-9999px';
    translationTooltip.classList.add('visible');

    const tooltipRect = translationTooltip.getBoundingClientRect();

    let left = x + offsetX;
    let top = y + offsetY;

    if (left + tooltipRect.width > window.innerWidth) {
        left = window.innerWidth - tooltipRect.width - 8;
    }
    if (left < 8) {
        left = 8;
    }

    if (top + tooltipRect.height > window.innerHeight) {
        top = y - tooltipRect.height - 8;
    }
    if (top < 8) {
        top = 8;
    }

    translationTooltip.style.left = left + 'px';
    translationTooltip.style.top = top + 'px';
}

function hideTranslationTooltip() {
    currentHoveredElement = null;
    if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
    }
    translationTooltip.classList.remove('visible');
}

function injectTranslation(parentElement, translatedSentence) {
  parentElement.textContent = "";
  
  const words = translatedSentence.split(' ');
  
  const translatedBlock = document.createElement('span');
  translatedBlock.className = 'translated-block';
  translatedBlock.style.cssText = `
    background: rgba(119, 255, 124, 0.298);
    border-radius: 4px;
    padding: 0 2px;
    font-size: inherit;
    font-family: inherit;
    display: inline;
  `;
  
  words.forEach((word, index) => {
    const wordSpan = document.createElement('span');
    wordSpan.className = 'translated-word';
    wordSpan.textContent = word;
    wordSpan.setAttribute('data-translated-word', word);
    wordSpan.style.cssText = `
      pointer-events: auto;
      position: relative;
      cursor: pointer;
    `;
    
    let mouseMoveHandler = null;
    
    // Enhanced hover listeners with English translation
    wordSpan.addEventListener('mouseenter', function(e) {
      const translatedWord = this.getAttribute('data-translated-word') || this.textContent.trim();
      const originalWord = this.getAttribute('data-original-word');
      console.log("Hovering over word:", translatedWord, "Original:", originalWord);
      showTranslationTooltip(this, translatedWord, originalWord, e.clientX, e.clientY);
      
      mouseMoveHandler = function(ev) {
        positionTooltip(ev.clientX, ev.clientY);
      };
      wordSpan.addEventListener('mousemove', mouseMoveHandler);
    });
    
    wordSpan.addEventListener('mouseleave', function() {
      hideTranslationTooltip();
      if (mouseMoveHandler) {
        wordSpan.removeEventListener('mousemove', mouseMoveHandler);
        mouseMoveHandler = null;
      }
    });
    
    translatedBlock.appendChild(wordSpan);
    
    if (index < words.length - 1) {
      translatedBlock.appendChild(document.createTextNode(' '));
    }
  });
  
  parentElement.appendChild(translatedBlock);
}


function isVisible(element) {
  if (!element || !element.isConnected || element.nodeType !== Node.ELEMENT_NODE) return false;

  const style = window.getComputedStyle(element);

  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0" ||
    style.clipPath === "inset(100%)" ||
    style.position === "absolute" && style.left === "-9999px"
  ) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;

  return true;
}

const TO_ANALYZE_TEXT_CONTAINERS = new Set([
  "P",
  "SPAN",
  "DIV",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "LI",
  "A",
  "BUTTON",
  "LABEL",
  "STRONG",
  "EM",
  "B",
  "I",
  "TD",
  "TH"
]);

function shouldAnalyze(text, parent) {
  if (text === null || parent === null) return false;
  return (
    text.trim().length > 0 &&
    TO_ANALYZE_TEXT_CONTAINERS.has(parent.tagName) &&
    isVisible(parent)
  )
}

async function grabNodesIn(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const matches = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement;
    if (!parent || !shouldAnalyze(node.textContent, parent)) continue;

    const text = node.textContent?.trim();
    if (!text) continue;

    matches.push({ node, parent, text });
  }

  return matches;
}

// Helper function to split text into sentences
function splitIntoSentences(text) {
  // Split by period, exclamation mark, or question mark followed by space or end of string
  // This regex keeps the punctuation with each sentence
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  
  // Handle case where text doesn't end with punctuation
  const lastMatch = sentences.join('');
  if (lastMatch.length < text.length) {
    const remainder = text.slice(lastMatch.length).trim();
    if (remainder) {
      sentences.push(remainder);
    }
  }
  
  return sentences.map(s => s.trim()).filter(s => s.length > 0);
}

// Helper function to check if a sentence meets the criteria
function isValidSentence(sentence) {
  const trimmed = sentence.trim();
  if (trimmed.length === 0) return false;
  
  // Check if starts with capital letter
  const startsWithCapital = /^[A-Z]/.test(trimmed);
  
  // Check if ends with period, exclamation mark, or question mark
  const endsWithPunctuation = /[.!?]$/.test(trimmed);
  
  // Check if has at least 3 words
  const words = trimmed.split(/\s+/).filter(word => word.length > 0);
  const hasMinWords = words.length >= 3;
  
  console.log('Validating sentence:', {
    sentence: trimmed,
    startsWithCapital,
    endsWithPunctuation,
    wordCount: words.length,
    hasMinWords,
    isValid: startsWithCapital && endsWithPunctuation && hasMinWords
  });
  
  return startsWithCapital && endsWithPunctuation && hasMinWords;
}

let storageInfo = null;
let isProcessing = false; // Add flag to prevent re-processing during injection

async function translateNodes(matches) {
    for (const { node, parent, text } of matches) {
        if (Math.random() > (storageInfo.volume/100)) {
            return;
        }

        // Skip if already processed or inside a translated container
        if (node.parentElement && 
            (node.parentElement.hasAttribute('data-translated-container') ||
             node.parentElement.closest('[data-translated-container]') ||
             node.parentElement.closest('.translated-block'))) {
            continue;
        }
        
        const sentences = splitIntoSentences(text);
        
        // Check if we need to add space after this node
        const needsTrailingSpace = node.nextSibling && 
                                   node.nextSibling.nodeType === Node.ELEMENT_NODE &&
                                   !text.endsWith(' ') &&
                                   !/[.!?,;:\-—]$/.test(text.trim()); // Don't add space after punctuation
        
        const needsLeadingSpace = node.previousSibling && 
                                 node.previousSibling.nodeType === Node.ELEMENT_NODE &&
                                 !text.startsWith(' ') &&
                                 !/^[.!?,;:\-—)]/.test(text.trim()); // Don't add space before punctuation or closing paren
        
        // Create a document fragment to hold the new content
        const fragment = document.createDocumentFragment();
        
        // Add leading space if needed
        if (needsLeadingSpace) {
            fragment.appendChild(document.createTextNode(' '));
        }
        
        // Create placeholders for all parts (sentences and gaps)
        const sentencePlaceholders = sentences.map((sentence) => {
            const container = document.createElement('span');
            container.style.cssText = 'display: inline; white-space: pre-wrap;';
            container.textContent = sentence;
            container.setAttribute('data-translated-container', 'true');
            fragment.appendChild(container);
            
            return { container, sentence };
        });
        
        // Add trailing space if needed
        if (needsTrailingSpace) {
            fragment.appendChild(document.createTextNode(' '));
        }
        
        // Replace only the specific text node, not the entire parent
        node.replaceWith(fragment);
        
        // Process translations asynchronously
        sentencePlaceholders.forEach(async ({ container, sentence }) => {
            const trimmedSentence = sentence.trim();
            
            if (!isValidSentence(trimmedSentence)) {
                return;
            }
            
            try {
                const response = await chrome.runtime.sendMessage({
                    action: 'getDifficulty',
                    sentence: trimmedSentence.toLowerCase()
                });
    
                if (!response.success) {
                    console.error(`Error analyzing text ${trimmedSentence}:`, response.error);
                    return;
                }
                
                if (response.difficulty > storageInfo.level) {
                    return;
                }
                
                // Translate the sentence
                const result = await translateSentence(storageInfo.language, trimmedSentence);
                const translatedText = result?.choices?.[0]?.message?.content?.trim() || trimmedSentence;
                
                // Preserve leading/trailing whitespace from original sentence
                const leadingSpace = sentence.match(/^\s*/)[0];
                const trailingSpace = sentence.match(/\s*$/)[0];
                
                // Replace placeholder content with translation
                isProcessing = true;
                container.textContent = "";
                
                // Add leading space if present
                if (leadingSpace) {
                    container.appendChild(document.createTextNode(leadingSpace));
                }
                
                injectTranslation(container, translatedText);
                
                // Add trailing space if present
                if (trailingSpace) {
                    container.appendChild(document.createTextNode(trailingSpace));
                }
                
                setTimeout(() => { isProcessing = false; }, 10);
                console.log("Translated:", translatedText);
                
            } catch (err) {
                console.error("Error translating sentence:", trimmedSentence, err);
            }
        });
    }
}

async function main() {
    storageInfo = await getUserSettings();
    if (storageInfo.enabled) {
        const matches = await grabNodesIn(document.body);
        await translateNodes(matches);
    }
}

const observer = new MutationObserver(mutations => {
    // Skip if we're currently processing/injecting translations
    if (isProcessing || !storageInfo || !storageInfo.enabled) {
        return;
    }
    
    for (const mutation of mutations) {
        if (mutation.type === "childList") {
            for (const node of mutation.addedNodes) {
                // Skip if this is a node we created
                if (node.nodeType === Node.ELEMENT_NODE && 
                    (node.hasAttribute('data-translated-container') || 
                     node.classList?.contains('translated-block') ||
                     node.classList?.contains('translated-word') ||
                     node.querySelector('[data-translated-container]') ||
                     node.querySelector('.translated-block'))) {
                    continue;
                }
                
                setTimeout(() => {
                    if (node.nodeType === Node.ELEMENT_NODE || 
                        node.nodeType === Node.TEXT_NODE) {
                        grabNodesIn(node)
                            .then(result => {
                                translateNodes(result);
                            });
                    }
                }, 0);
            }
        } else if (mutation.type === "characterData") {
            const parent = mutation.target.parentElement;
            // Don't re-process our own containers
            if (parent && 
                !parent.hasAttribute('data-translated-container') &&
                !parent.classList?.contains('translated-block') &&
                !parent.classList?.contains('translated-word') &&
                !parent.closest('[data-translated-container]') &&
                !parent.closest('.translated-block')) {
                setTimeout(() => grabNodesIn(parent)
                    .then(result => {
                        translateNodes(result);
                    }), 0);
            }
        }
    }
});

// Start observing
observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
});

main();