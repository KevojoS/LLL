const translationCache = new Map();

// DO NOT hardcode API keys - use chrome.storage or your backend instead
// const API_KEY = '...'; // REMOVE THIS
API_KEY = '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'
// Get current volume level from chrome.storage
chrome.storage.sync.get(['volumeLevel', 'extensionEnabled'], (data) => {
    if (data.extensionEnabled === false) {
        console.log("Extension is disabled");
        return;
    }
    const volume = data.volumeLevel !== undefined ? data.volumeLevel : 100;
    console.log("Current volume level:", volume);

    const translationManager = new TranslationManager(volume);
    translationManager.translateViewport();

    // Add scroll listener
    window.addEventListener('scroll', () => {
        translationManager.onScroll();
    }, { passive: true });
});

// Rate limiter - queue requests with delay between them
class RequestQueue {
    constructor(delayMs = 500) {
        this.queue = [];
        this.isProcessing = false;
        this.delayMs = delayMs;
    }

    async add(fn) {
        return new Promise((resolve, reject) => {
            this.queue.push({ fn, resolve, reject });
            this.process();
        });
    }

    async process() {
        if (this.isProcessing || this.queue.length === 0) return;
        
        this.isProcessing = true;
        
        while (this.queue.length > 0) {
            const { fn, resolve, reject } = this.queue.shift();
            try {
                const result = await fn();
                resolve(result);
            } catch (error) {
                reject(error);
            }
            
            // Wait before next request
            if (this.queue.length > 0) {
                await new Promise(r => setTimeout(r, this.delayMs));
            }
        }
        
        this.isProcessing = false;
    }
}

const requestQueue = new RequestQueue(600); // 600ms delay between requests

async function translateSentence(language, text) {
    try {
        // Map language names to language codes for MyMemory
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

        const sourceLang = languageMap[language.toLowerCase()] || 'ru';
        const email = "kaunghtetsan6574@gmail.com"

        const response = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|en&de=${encodeURIComponent(email)}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const translatedText = data.responseData.translatedText;

        console.log("MyMemory translation:", translatedText);

        return {
            choices: [{
                message: {
                    content: translatedText
                }
            }]
        };
    } catch (error) {
        console.error("Fetch error:", error);
        throw error;
    }
}

function getRandomElements(array, n) {
    if (n > array.length) {
        throw new Error("Cannot select more elements than exist in the array");
    }

    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, n);
}

// New function to translate back to English using MyMemory API
async function translateToEnglish(text, sourceLanguage) {
    const cacheKey = `en:${text}`;
    if (translationCache.has(cacheKey)) {
        console.log("Using cached translation:", translationCache.get(cacheKey));
        return translationCache.get(cacheKey);
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
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|en`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const translation = data.responseData.translatedText || text;

        translationCache.set(cacheKey, translation);
        console.log("English translation:", translation);

        return translation;
    } catch (error) {
        console.error("Translation error:", error);
        return text;
    }
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
async function getUserSettings() {
    const data = await chrome.storage.sync.get(['difficultyLevel', 'selectedLanguage']);
    return {
        level: data.difficultyLevel ?? null, // Default to 0 (A1)
        language: data.selectedLanguage ?? null
    };
}

// Listen for changes to difficulty
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.difficultyLevel) {
        console.log('Difficulty changed to:', changes.difficultyLevel.newValue);
        main();
    }
    if (changes.selectedLanguage) {
        console.log('Languaged changed to:', changes.selectedLanguage.newValue);
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


// Function to insert a translated sentence into its element
function insertTranslatedSentence(el, sentence, translatedText) {
    const fullText = el.textContent;
    const sentenceStart = fullText.indexOf(sentence);
    if (sentenceStart === -1) return;
    const sentenceEnd = sentenceStart + sentence.length;

    // Collect all text nodes
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    let currentPos = 0;
    let node;
    while (node = walker.nextNode()) {
        const nodeLength = node.textContent.length;
        textNodes.push({
            node,
            parent: node.parentNode,
            start: currentPos,
            end: currentPos + nodeLength,
            text: node.textContent
        });
        currentPos += nodeLength;
    }

    // Find affected nodes
    const affectedNodes = textNodes.filter(n => n.start < sentenceEnd && n.end > sentenceStart);
    if (!affectedNodes.length) return;

    // Create translated span
    const tempDiv = document.createElement('div');
    tempDiv.textContent = translatedText;
    wrapTextNodes(tempDiv);

    const translatedSpan = document.createElement('span');
    translatedSpan.className = 'translated-sentence';
    translatedSpan.style.display = 'inline';
    while (tempDiv.firstChild) translatedSpan.appendChild(tempDiv.firstChild);

    const elementsToRemove = new Set();

    // Replace nodes (from last to first)
    for (let i = affectedNodes.length - 1; i >= 0; i--) {
        const nodeInfo = affectedNodes[i];
        const node = nodeInfo.node;
        const parent = nodeInfo.parent;
        const overlapStart = Math.max(0, sentenceStart - nodeInfo.start);
        const overlapEnd = Math.min(node.textContent.length, sentenceEnd - nodeInfo.start);

        const before = node.textContent.substring(0, overlapStart);
        const after = node.textContent.substring(overlapEnd);

        if (parent !== el && parent.nodeType === Node.ELEMENT_NODE) {
            const parentText = parent.textContent;
            if (sentence.includes(parentText.trim()) && overlapStart === 0 && overlapEnd === node.textContent.length) {
                elementsToRemove.add(parent);
            }
        }

        if (i === 0) {
            const fragment = document.createDocumentFragment();
            if (before) fragment.appendChild(document.createTextNode(before));
            fragment.appendChild(translatedSpan);
            if (i === affectedNodes.length - 1 && after) fragment.appendChild(document.createTextNode(after));

            if (elementsToRemove.has(parent)) {
                parent.parentNode.replaceChild(fragment, parent);
                elementsToRemove.delete(parent);
            } else {
                parent.replaceChild(fragment, node);
            }
        } else if (i === affectedNodes.length - 1) {
            if (elementsToRemove.has(parent)) {
                if (after) parent.parentNode.replaceChild(document.createTextNode(after), parent);
                else parent.remove();
                elementsToRemove.delete(parent);
            } else {
                if (after) node.textContent = after;
                else parent.removeChild(node);
            }
        } else {
            if (elementsToRemove.has(parent)) {
                parent.remove();
                elementsToRemove.delete(parent);
            } else {
                parent.removeChild(node);
            }
        }
    }

    elementsToRemove.forEach(el => el.remove());
}

// Tooltip logic
const tooltip = document.createElement('div');
tooltip.style.position = 'fixed';
tooltip.style.background = 'linear-gradient(180deg, rgba(44,178,178,0.15) 0%, rgba(255,255,255,0.15) 100%)';
tooltip.style.border = '1px solid rgba(44,178,178,0.25)';
tooltip.style.backdropFilter = 'blur(12px) saturate(150%)';
tooltip.style.webkitBackdropFilter = 'blur(12px) saturate(150%)';
tooltip.style.color = '#fff';
tooltip.style.padding = '8px 14px';
tooltip.style.borderRadius = '12px';
tooltip.style.fontSize = '15px';
tooltip.style.fontFamily = 'Inter, system-ui, sans-serif';
tooltip.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255,255,255,0.3)';
tooltip.style.pointerEvents = 'none';
tooltip.style.zIndex = '99999';
tooltip.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
tooltip.style.opacity = '0.95';
tooltip.style.display = 'none';
document.body.appendChild(tooltip);

function showTooltip(text, x, y) {
    tooltip.textContent = text;
    tooltip.style.display = 'block';
    let offsetX = 12;
    let offsetY = 16;
    const tooltipRect = tooltip.getBoundingClientRect();
    let left = x + offsetX;
    let top = y + offsetY;
    if (left + tooltipRect.width > window.innerWidth) {
        left = window.innerWidth - tooltipRect.width - 8;
    }
    if (top + tooltipRect.height > window.innerHeight) {
        top = window.innerHeight - tooltipRect.height - 8;
    }
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
}

function hideTooltip() {
    tooltip.style.display = 'none';
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
    wordSpan.style.cssText = `
      pointer-events: auto;
      position: relative;
      cursor: pointer;
    `;
    
    wordSpan.addEventListener('mouseover', function(e) {
      // Show the tooltip using the event's clientX/Y, only once.
      // This positions the tooltip near the initial mouse-over point.
      showTooltip(word, e.clientX, e.clientY); 
    });
    
    wordSpan.addEventListener('mouseout', function() {
      // Hide the tooltip when the mouse leaves the wordSpan area.
      hideTooltip();
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

// Helper function to split text into sentences
function splitIntoSentences(text) {
  // Match sentences ending with .!? followed by space/newline or end of string
  const regex = /[^.!?]+[.!?]+/g;
  const sentences = [];
  let lastIndex = 0;
  let match;
  
  const regexCopy = new RegExp(regex.source, regex.flags);
  
  while ((match = regexCopy.exec(text)) !== null) {
    // Add any text between last sentence and this one (preserves spaces/gaps)
    if (match.index > lastIndex) {
      const gap = text.substring(lastIndex, match.index);
      if (gap) {
        sentences.push(gap);
      }
    }
    // Add the sentence
    sentences.push(match[0]);
    lastIndex = match.index + match[0].length;
  }
  
  // Add any remaining text
  if (lastIndex < text.length) {
    const remainder = text.substring(lastIndex);
    if (remainder) {
      sentences.push(remainder);
    }
  }
  
  return sentences;
}

let storageInfo = null;
let isProcessing = false; // Add flag to prevent re-processing during injection

async function translateNodes(matches) {
    if (!storageInfo) {
        storageInfo = await getUserSettings();
    }
    
    for (const { node, parent, text } of matches) {
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

    const matches = await grabNodesIn(document.body);
    await translateNodes(matches);
}

const observer = new MutationObserver(mutations => {
    // Skip if we're currently processing/injecting translations
    if (isProcessing) {
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