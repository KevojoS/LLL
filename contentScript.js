const translationCache = new Map();

// API_KEY = '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'

async function translateSentence(language, sentence) {
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
 
 const targetLang = languageMap[language.toLowerCase()] || 'ru';
 
 const response = await fetch(
 `https://api.mymemory.translated.net/get?q=${encodeURIComponent(sentence)}&langpair=en|${targetLang}`
 );

 if (!response.ok) {
 throw new Error(`HTTP error! status: ${response.status}`);
 }

 const data = await response.json();
 const translatedText = data.responseData.translatedText;
 
 console.log("MyMemory translation:", translatedText);
 
 // Return in same format as OpenRouter for compatibility
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

// New function to translate back to English using MyMemory API
async function translateToEnglish(text, sourceLanguage) {
 // Check cache first
 const cacheKey = `en:${text}`;
 if (translationCache.has(cacheKey)) {
 console.log("Using cached translation:", translationCache.get(cacheKey));
 return translationCache.get(cacheKey);
 }

 try {
 console.log("Translating to English:", text, "from", sourceLanguage);
 
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
 
 const sourceLang = languageMap[sourceLanguage.toLowerCase()] || 'ru';
 
 const response = await fetch(
 `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|en`
 );

 if (!response.ok) {
 throw new Error(`HTTP error! status: ${response.status}`);
 }

 const data = await response.json();
 const translation = data.responseData.translatedText || text;
 
 // Cache the result
 translationCache.set(cacheKey, translation);
 console.log("English translation:", translation);
 
 return translation;
 } catch (error) {
 console.error("Translation error:", error);
 return text; // Return original text if translation fails
 }
}

// Map language names to full language names for display (keep this for reference)
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
 
 .translation-loading {
 display: inline-block;
 width: 12px;
 height: 12px;
 border: 2px solid rgba(255,255,255,0.3);
 border-top-color: #fff;
 border-radius: 50%;
 animation: spin 0.6s linear infinite;
 margin-left: 8px;
 }
 
 @keyframes spin {
 to { transform: rotate(360deg); }
 }
`;
document.head.appendChild(style);

// Create translation tooltip element
const translationTooltip = document.createElement('div');
translationTooltip.className = 'translation-tooltip';
translationTooltip.setAttribute('data-no-translate', 'true'); // Prevent auto-translation
document.body.appendChild(translationTooltip);

let currentHoveredElement = null;
let tooltipTimeout = null;
let currentLanguage = 'russian'; // Default language, should be synced with extension settings

// Function to show translation tooltip
async function showTranslationTooltip(element, translatedWord, originalWord, x, y) {
 // Clear any existing timeout
 if (tooltipTimeout) {
 clearTimeout(tooltipTimeout);
 }

 currentHoveredElement = element;
 
 // Show loading state
 translationTooltip.innerHTML = `
 <div class="translation-tooltip-header">Translating...</div>
 <div class="translation-tooltip-text">
 <span class="translation-loading"></span>
 </div>
 `;
 
 // Position tooltip
 positionTooltip(x, y);
 translationTooltip.classList.add('visible');
 
 let englishTranslation;
 
 // First, check if we have the original English word stored
 if (originalWord) {
 // Use the stored original English word
 englishTranslation = originalWord;
 console.log("Using stored original English:", englishTranslation);
 } else {
 // Get language name
 const languageName = languageNameMap[currentLanguage.toLowerCase()] || 'Russian';
 
 // Clean the word (remove punctuation)
 const cleanWord = translatedWord.replace(/[.,!?;:"""'']/g, '').trim();
 
 // Translate to English using MyMemory API
 englishTranslation = await translateToEnglish(cleanWord, languageName);
 }
 
 // Only update if still hovering over the same element
 if (currentHoveredElement === element) {
 translationTooltip.innerHTML = `
 <div class="translation-tooltip-header">English</div>
 <div class="translation-tooltip-text">${englishTranslation}</div>
 `;
 }
}

// Function to position tooltip
function positionTooltip(x, y) {
 let offsetX = 12;
 let offsetY = 16;
 
 // Get tooltip dimensions (even if not visible yet)
 translationTooltip.style.left = '-9999px';
 translationTooltip.style.top = '-9999px';
 translationTooltip.classList.add('visible');
 
 const tooltipRect = translationTooltip.getBoundingClientRect();
 
 let left = x + offsetX;
 let top = y + offsetY;
 
 // Keep tooltip within viewport
 if (left + tooltipRect.width > window.innerWidth) {
 left = window.innerWidth - tooltipRect.width - 8;
 }
 if (left < 8) {
 left = 8;
 }
 
 if (top + tooltipRect.height > window.innerHeight) {
 top = y - tooltipRect.height - 8; // Show above cursor
 }
 if (top < 8) {
 top = 8;
 }
 
 translationTooltip.style.left = left + 'px';
 translationTooltip.style.top = top + 'px';
}

// Function to hide translation tooltip
function hideTranslationTooltip() {
 currentHoveredElement = null;
 if (tooltipTimeout) {
 clearTimeout(tooltipTimeout);
 }
 translationTooltip.classList.remove('visible');
}

// Function to create word mapping between English and translated text
function createWordMapping(originalSentence, translatedSentence) {
 // Remove punctuation and split into words
 const cleanPunctuation = (text) => text.replace(/[.,!?;:"""'']/g, '').trim();
 
 const originalWords = cleanPunctuation(originalSentence).split(/\s+/).filter(w => w.trim());
 const translatedWords = cleanPunctuation(translatedSentence).split(/\s+/).filter(w => w.trim());
 
 // Simple word-to-word mapping (works best for similar sentence structures)
 const mapping = new Map();
 
 console.log("Creating word mapping:");
 console.log("Original words:", originalWords);
 console.log("Translated words:", translatedWords);
 
 // If word counts match, create direct mapping
 if (originalWords.length === translatedWords.length) {
 for (let i = 0; i < originalWords.length; i++) {
 const translatedKey = translatedWords[i].toLowerCase();
 const originalValue = originalWords[i];
 mapping.set(translatedKey, originalValue);
 console.log(`Mapping: ${translatedKey} -> ${originalValue}`);
 }
 } else {
 console.log("Word counts don't match, skipping direct mapping");
 }
 
 return mapping;
}

// Function to wrap individual words in a translated sentence
function wrapTranslatedWords(text, wordMapping) {
 const fragment = document.createDocumentFragment();
 // Split by spaces but keep the spaces
 const parts = text.split(/(\s+)/);
 
 parts.forEach(part => {
 if (part.trim() === '') {
 // It's whitespace, add as text node
 fragment.appendChild(document.createTextNode(part));
 } else {
 // It's a word, wrap it in a span
 const wordSpan = document.createElement('span');
 wordSpan.className = 'translated-word';
 wordSpan.textContent = part;
 wordSpan.setAttribute('data-translated-word', part);
 
 // Store the original English word if we have a mapping
 const cleanWord = part.replace(/[.,!?;:"""'']/g, '').toLowerCase();
 if (wordMapping && wordMapping.has(cleanWord)) {
 const originalWord = wordMapping.get(cleanWord);
 wordSpan.setAttribute('data-original-word', originalWord);
 console.log(`Setting original word for "${part}": ${originalWord}`);
 }
 
 wordSpan.setAttribute('data-no-translate', 'true'); // Mark to prevent re-translation
 fragment.appendChild(wordSpan);
 }
 });
 
 return fragment;
}

// Function to insert a translated sentence into its element
function insertTranslatedSentence(el, sentence, translatedText) {
 const fullText = el.textContent;
 const sentenceStart = fullText.indexOf(sentence);
 if (sentenceStart === -1) return;
 const sentenceEnd = sentenceStart + sentence.length;

 console.log("Inserting translated sentence:");
 console.log("Original:", sentence);
 console.log("Translated:", translatedText);

 // Create word mapping
 const wordMapping = createWordMapping(sentence, translatedText);

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

 // Create translated span with individual words wrapped
 const translatedSpan = document.createElement('span');
 translatedSpan.className = 'translated-sentence';
 translatedSpan.style.display = 'inline';
 translatedSpan.setAttribute('data-no-translate', 'true'); // Prevent re-translation
 
 // Store original text as data attribute
 translatedSpan.setAttribute('data-original-text', sentence);
 
 // Wrap each word in the translated text with word mapping
 const wrappedWords = wrapTranslatedWords(translatedText, wordMapping);
 translatedSpan.appendChild(wrappedWords);

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
 
 // Add hover event listeners to each translated word
 translatedSpan.querySelectorAll('.translated-word').forEach(wordSpan => {
 addTranslationHoverListeners(wordSpan);
 });
}

// Function to add hover listeners to translated word elements
function addTranslationHoverListeners(element) {
 let mouseMoveHandler = null;
 
 element.addEventListener('mouseenter', function(e) {
 const translatedWord = this.getAttribute('data-translated-word') || this.textContent.trim();
 const originalWord = this.getAttribute('data-original-word');
 console.log("Hovering over word:", translatedWord, "Original:", originalWord);
 showTranslationTooltip(this, translatedWord, originalWord, e.clientX, e.clientY);
 
 mouseMoveHandler = function(ev) {
 positionTooltip(ev.clientX, ev.clientY);
 };
 element.addEventListener('mousemove', mouseMoveHandler);
 });
 
 element.addEventListener('mouseleave', function() {
 hideTranslationTooltip();
 if (mouseMoveHandler) {
 element.removeEventListener('mousemove', mouseMoveHandler);
 mouseMoveHandler = null;
 }
 });
}

// Tooltip logic (original tooltip for word selection)
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

function addTooltipHandlersToSelected() {
 const selectedElements = document.querySelectorAll('.selected');
 selectedElements.forEach(el => {
 el.replaceWith(el.cloneNode(true));
 });
 
 document.querySelectorAll('.selected').forEach(el => {
 let mouseMoveHandler = null;
 el.addEventListener('mouseover', function(e) {
 showTooltip(el.textContent, e.clientX, e.clientY);
 mouseMoveHandler = function(ev) {
 showTooltip(el.textContent, ev.clientX, ev.clientY);
 };
 el.addEventListener('mousemove', mouseMoveHandler);
 });
 el.addEventListener('mouseout', function() {
 hideTooltip();
 if (mouseMoveHandler) {
 el.removeEventListener('mousemove', mouseMoveHandler);
 mouseMoveHandler = null;
 }
 });
 });
}

const getFullText = (el) => {
 if (!el) return '';
 return el.textContent.trim();
};

const isEditable = (el) => {
 if (!el) return false;
 const editableTags = ['INPUT', 'TEXTAREA', 'SELECT'];
 return el.isContentEditable || editableTags.includes(el.tagName);
};

const getActualtext = (element) => {
 const results = [];
 const isWrapper = (el) => {
 const list = ['A', 'STRONG', 'EM', 'I', 'B', 'MARK', 'SMALL', 'SUB', 'SUP', 'CODE', 'SAMP', 'VAR', 'KBD'];
 for (const element of el) {
 if (!list.includes(element.tagName)) {
 return false;
 }
 }
 return true;
 };
 const recurse = (el) => {
 if (!el) return;
 if (isEditable(el)) return;
 const children = Array.from(el.children);
 if (children.length === 0 || isWrapper(el.children)) {
 if ((el.textContent || '').trim().length > 0) {
 results.push(el);
 }
 } else {
 for (const child of children) {
 recurse(child);
 }
 }
 };
 recurse(element);
 return results;
};

const wrapTextNodes = (el) => {
 Array.from(el.childNodes).forEach(node => {
 if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
 const text = node.textContent;
 const parent = node.parentNode;
 const fragments = [];
 const wordsAndSpaces = text.match(/\S+|\s+/g) || [];
 wordsAndSpaces.forEach(part => {
 if (part.trim() === '') {
 fragments.push(document.createTextNode(part));
 } else {
 const span = document.createElement('span');
 span.className = 'selected';
 span.textContent = part;
 fragments.push(span);
 }
 });
 fragments.forEach(frag => parent.insertBefore(frag, node));
 parent.removeChild(node);
 } else if (
 node.nodeType === Node.ELEMENT_NODE &&
 node.tagName !== 'MARK' &&
 !node.classList.contains('lmao')
 ) {
 wrapTextNodes(node);
 }
 });
};

const isElementVisible = (element) => {
 if (!element) return false;
 const style = window.getComputedStyle(element);
 if (style.display === 'none' || style.visibility === 'hidden') return false;
 if (parseFloat(style.opacity) === 0) return false;
 if (style.position === 'fixed' || style.position === 'absolute') {
 const rect = element.getBoundingClientRect();
 if (rect.width === 0 || rect.height === 0) return false;
 if (rect.right < 0 || rect.bottom < 0) return false;
 if (rect.left > window.innerWidth || rect.top > window.innerHeight) return false;
 }
 if (style.clip === 'rect(0px, 0px, 0px, 0px)' || style.clipPath === 'inset(100%)') return false;
 let parent = element.parentElement;
 while (parent && parent !== document.body) {
 const parentStyle = window.getComputedStyle(parent);
 if (parentStyle.display === 'none' || parentStyle.visibility === 'hidden') return false;
 if (parseFloat(parentStyle.opacity) === 0) return false;
 parent = parent.parentElement;
 }
 return true;
};

const isElementInViewport = (element) => {
 const rect = element.getBoundingClientRect();
 
 return (
 rect.top < window.innerHeight &&
 rect.bottom > 0 &&
 rect.left < window.innerWidth &&
 rect.right > 0
 );
};

const webScrape = (dom, viewportOnly = false) => {
 const elements = dom.querySelectorAll('p, h1, h2, h3, h4, h5, h6, article, strong, mark, em, span, div');
 let elementsArray = [];
 for (const element of elements) {
 // Skip elements marked as no-translate
 if (element.hasAttribute('data-no-translate')) continue;
 if (element.closest('[data-no-translate]')) continue;
 
 elementsArray = elementsArray.concat(getActualtext(element));
 }
 elementsArray = elementsArray.filter(item => {
 if (item.classList.contains('hidden')) return false;
 if (item.getAttribute('aria-hidden') === 'true') return false;
 if (item.hasAttribute('data-no-translate')) return false;
 if (item.closest('[data-no-translate]')) return false;
 if (!isElementVisible(item)) return false;
 
 if (viewportOnly && !isElementInViewport(item)) return false;
 
 const text = item.textContent.trim();
 if (text.length === 0) return false;
 if (text.includes('\n')) return false;
 const parentNav = item.closest('nav, header, footer, aside');
 if (parentNav) {
 const navStyle = window.getComputedStyle(parentNav);
 if (navStyle.position === 'fixed' || navStyle.position === 'sticky') return false;
 }
 if (text.length < 10) return false;
 return true;
 }).map((element, index) => ({ id: `element-${index}`, element: element }));

 const seenTexts = new Set();
 elementsArray = elementsArray.filter(item => {
 const text = getFullText(item.element);
 if (seenTexts.has(text)) return false;
 seenTexts.add(text);
 return true;
 });

 let sentencesArray = Array.from(elementsArray).map(
 element => ({ id: element.id, el: element.element, textArray: getFullText(element.element).match(/[A-Z][^.?!]*[.?!]/g) || [] })
 ).filter(item => item.textArray.length != 0);

 console.log(sentencesArray);
 return sentencesArray;
};

// Translation Manager
class TranslationManager {
 constructor() {
 this.translatedSentences = new Set();
 this.isTranslating = false;
 this.debounceTimer = null;
 }

 async translateViewport() {
 if (this.isTranslating) {
 console.log("Translation already in progress, skipping...");
 return;
 }

 this.isTranslating = true;

 const sentencesArray = webScrape(document, true);
 if (!sentencesArray.length) {
 console.log("No visible sentences found in viewport");
 this.isTranslating = false;
 return;
 }

 let totalSentences = 0;
 const translationPromises = [];

 for (const elementObj of sentencesArray) {
 const el = elementObj.el;

 for (const sentence of elementObj.textArray) {
 const trimmedSentence = sentence.trim();
 if (!trimmedSentence) continue;

 if (this.translatedSentences.has(trimmedSentence)) continue;

 totalSentences++;
 this.translatedSentences.add(trimmedSentence);

 const promise = translateSentence("russian", trimmedSentence)
 .then(result => {
 const translatedText = result?.choices?.[0]?.message?.content?.trim() || trimmedSentence;
 insertTranslatedSentence(el, trimmedSentence, translatedText);
 console.log("Translated:", translatedText);
 })
 .catch(err => {
 console.error("Error translating sentence:", trimmedSentence, err);
 this.translatedSentences.delete(trimmedSentence);
 });

 translationPromises.push(promise);
 }
 }

 if (totalSentences === 0) {
 console.log("All visible sentences already translated");
 this.isTranslating = false;
 return;
 }

 console.log(`Translating ${totalSentences} new sentences in viewport`);

 await Promise.all(translationPromises);

 addTooltipHandlersToSelected();
 console.log("All visible sentences translated!");

 this.isTranslating = false;
 }

 onScroll() {
 clearTimeout(this.debounceTimer);
 this.debounceTimer = setTimeout(() => {
 this.translateViewport();
 }, 500);
 }
}
// Check if extension is enabled
chrome.storage.sync.get('extensionEnabled', (data) => {
    if (data.extensionEnabled === false) {
        console.log("Extension is disabled");
        return;
    }
})
// Initialize translation manager
const translationManager = new TranslationManager();

// Translate initial viewport
translationManager.translateViewport();

// Add scroll listener
let scrollTimeout;
window.addEventListener('scroll', () => {
 translationManager.onScroll();
}, { passive: true });

console.log("Auto-translation enabled! Hover over individual translated words to see English translation.");