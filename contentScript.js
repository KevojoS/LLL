API_KEY = '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'

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
            content: `Your response must be in JSON format with key "translated_sentence" where the translated sentence will be held. There must also be a key "word_definitions", which is an array of objects. The objects must have field "word", and an array of english definitions for the non-english translated word with field "translations." Make sure to include EVERY SINGLE WORD AS IS, STRICTLY UNMODIFIED (ex. l'extrémité is not reduced to extrémité), including connector words. Translate the following sentence into ${language}: ${sentence}`
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
        return data;
    } catch (error) {
        console.error("Fetch error:", error);
        throw error; // Re-throw so caller knows it failed
    }
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
    main();
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

async function showTranslationTooltip(element, translatedWord, originalWord, x, y) {
    if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
    }

    currentHoveredElement = element;

    let englishTranslation;

    // Check if we have translations data stored
    const translationsData = element.getAttribute('data-translations');
    
    if (translationsData) {
        // Use the stored translations
        try {
            const translations = JSON.parse(translationsData);
            englishTranslation = translations.join('<br>');
            
            // Display immediately with the translated word at the top (use original translatedWord, not cleaned)
            translationTooltip.innerHTML = `
                <div class="translation-tooltip-header">${translatedWord}</div>
                <div class="translation-tooltip-text">${englishTranslation}</div>
            `;
            positionTooltip(x, y);
            translationTooltip.classList.add('visible');
            return;
        } catch (e) {
            console.error("Error parsing translations data:", e);
            englishTranslation = "Translation unavailable";
        }
    } else if (originalWord) {
        // If we have the original English word stored, use it directly
        englishTranslation = originalWord;
    } else {
        // If no original word is stored, try to translate the translated word back to English
        const languageName = languageNameMap[storageInfo.language.toLowerCase()] || 'Russian';
        const cleanWord = translatedWord.replace(/[.,!?;:"""'']/g, '').trim();
        
        // Show loading tooltip immediately with the translated word (use original, not cleaned)
        translationTooltip.innerHTML = `
            <div class="translation-tooltip-header">${translatedWord}</div>
            <div class="translation-tooltip-text">Translating...</div>
        `;
        positionTooltip(x, y);
        translationTooltip.classList.add('visible');
        
        // Then get the actual translation
        englishTranslation = await translateSentence("english", cleanWord);
    }

    // Only update if we're still hovering over the same element (use original translatedWord)
    if (currentHoveredElement === element) {
        translationTooltip.innerHTML = `
            <div class="translation-tooltip-header">${translatedWord}</div>
            <div class="translation-tooltip-text">${englishTranslation}</div>
        `;
        positionTooltip(x, y);
        translationTooltip.classList.add('visible');
    }
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

    return startsWithCapital && endsWithPunctuation && hasMinWords;
}

let storageInfo = null;
let isProcessing = false; // Add flag to prevent re-processing during injection

// Replace the injectTranslation function with this updated version:

function injectTranslation(parentElement, translationData) {
  parentElement.textContent = "";
  
  // Parse the translation data if it's a string
  let data;
  
  // Handle different input formats
  if (typeof translationData === 'object' && translationData.choices) {
    // This is the full API response object from translateSentence
    const content = translationData.choices[0]?.message?.content;
    if (!content) {
      console.error("No content in API response");
      return;
    }
    translationData = content;
  }
  
  if (typeof translationData === 'string') {
    // Remove markdown code block markers if present
    let cleanData = translationData.trim();
    
    // Remove ```json or ``` at the start and ``` at the end
    cleanData = cleanData.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    
    try {
      data = JSON.parse(cleanData);
    } catch (e) {
      console.error("Error parsing translation data:", e, "Raw data:", translationData);
      // Fallback: treat as plain translated sentence
      data = { translated_sentence: translationData, word_definitions: [] };
    }
  } else {
    data = translationData;
  }
  
  const translatedSentence = data.translated_sentence;
  const wordDefinitions = data.word_definitions || [];
  
  // Helper function to normalize text for comparison
  function normalizeForComparison(text) {
    return text
      .toLowerCase()
      .replace(/['']/g, "'") // Normalize apostrophes to straight apostrophe
      .replace(/[.,!?;:"""—–\-()]/g, '') // Remove punctuation including em/en dashes
      .replace(/\s+/g, '') // Remove all whitespace for comparison
      .trim();
  }
  
  // Helper function to check if a word is meaningful (not just punctuation or URL fragments)
  function isMeaningfulWord(word) {
    const normalized = normalizeForComparison(word);
    // Must have at least one letter/character from any script
    // This uses Unicode property escapes to match any letter from any language
    // Also checks for digits to exclude pure punctuation/symbols
    return /\p{L}/u.test(normalized) || /\d/.test(normalized);
  }
  
  // Filter out non-meaningful definitions (like standalone punctuation, URL fragments)
  const filteredDefinitions = wordDefinitions.filter(def => {
    return isMeaningfulWord(def.word);
  });
  
  // Sort by length (longest first) to match multi-word phrases before individual words
  const sortedDefinitions = [...filteredDefinitions].sort((a, b) => b.word.length - a.word.length);
  
  const translatedBlock = document.createElement('span');
  translatedBlock.className = 'translated-block';
  translatedBlock.style.cssText = `
      background: rgba(44, 178, 178, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 6px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.2);
      padding: 2px 4px;
      font-size: inherit;
      font-family: inherit;
      display: inline;
      transition: background 0.3s ease, box-shadow 0.3s ease;
  `;
  
  // Check if this is a space-separated language or not (like Chinese/Japanese)
  const hasSpaces = translatedSentence.includes(' ');
  
  let position = 0;
  
  while (position < translatedSentence.length) {
    let matched = false;
    let matchedPhrase = '';
    let matchedTranslations = null;
    let matchLength = 0;
    let actualMatchText = '';
    
    // Skip leading punctuation/whitespace for matching
    let searchStart = position;
    while (searchStart < translatedSentence.length && 
           /[\s.,!?;:"""''—–\-()]/.test(translatedSentence[searchStart])) {
      searchStart++;
    }
    
    // If we only found punctuation/spaces, handle them separately
    if (searchStart > position) {
      const punctText = translatedSentence.substring(position, searchStart);
      const wordSpan = document.createElement('span');
      wordSpan.className = 'translated-word';
      wordSpan.textContent = punctText;
      wordSpan.style.cssText = `display: inline;`;
      translatedBlock.appendChild(wordSpan);
      position = searchStart;
      continue;
    }
    
    // Try to match phrases from longest to shortest
    for (const def of sortedDefinitions) {
      const defWord = def.word;
      
      // Try to find this definition word starting from current position
      // Account for possible trailing punctuation in the sentence
      let testLength = defWord.length;
      let extraChars = 0;
      
      // Extend to capture trailing punctuation
      while (searchStart + testLength + extraChars < translatedSentence.length &&
             /[.,!?;:"""''—–\-()]/.test(translatedSentence[searchStart + testLength + extraChars])) {
        extraChars++;
      }
      
      const potentialMatch = translatedSentence.substring(searchStart, searchStart + testLength + extraChars);
      
      // Normalize both for comparison
      const normalizedPotential = normalizeForComparison(potentialMatch);
      const normalizedDef = normalizeForComparison(defWord);
      
      if (normalizedPotential === normalizedDef) {
        matched = true;
        matchedPhrase = defWord;
        matchedTranslations = def.translations;
        actualMatchText = potentialMatch;
        matchLength = testLength + extraChars;
        break;
      }
    }
    
    if (matched) {
      // Create a span for the matched phrase
      const phraseSpan = document.createElement('span');
      phraseSpan.className = 'translated-word';
      phraseSpan.textContent = actualMatchText;
      
      // Store the matched phrase and its translations
      phraseSpan.setAttribute('data-translated-word', matchedPhrase);
      phraseSpan.setAttribute('data-translations', JSON.stringify(matchedTranslations));
      
      phraseSpan.style.cssText = `
        pointer-events: auto;
        position: relative;
        cursor: pointer;
      `;
      
      let mouseMoveHandler = null;
      
      phraseSpan.addEventListener('mouseenter', function(e) {
        const translatedWord = this.getAttribute('data-translated-word') || this.textContent.trim();
        const originalWord = this.getAttribute('data-original-word');
        showTranslationTooltip(this, translatedWord, originalWord, e.clientX, e.clientY);
        
        mouseMoveHandler = function(ev) {
          positionTooltip(ev.clientX, ev.clientY);
        };
        phraseSpan.addEventListener('mousemove', mouseMoveHandler);
      });
      
      phraseSpan.addEventListener('mouseleave', function() {
        hideTranslationTooltip();
        if (mouseMoveHandler) {
          phraseSpan.removeEventListener('mousemove', mouseMoveHandler);
          mouseMoveHandler = null;
        }
      });
      
      translatedBlock.appendChild(phraseSpan);
      position = searchStart + matchLength;
    } else {
      // No match found - find next word/character boundary
      let endPos;
      if (hasSpaces) {
        // For space-separated languages, find the next space or punctuation
        endPos = searchStart + 1;
        while (endPos < translatedSentence.length && 
               translatedSentence[endPos] !== ' ' &&
               !/[.,!?;:"""''—–\-()]/.test(translatedSentence[endPos])) {
          endPos++;
        }
      } else {
        // For non-space languages (Chinese, Japanese), just take one character
        endPos = searchStart + 1;
      }
      
      const unmatchedText = translatedSentence.substring(searchStart, endPos);
      const wordSpan = document.createElement('span');
      wordSpan.className = 'translated-word';
      wordSpan.textContent = unmatchedText;
      wordSpan.style.cssText = `display: inline;`;
      
      translatedBlock.appendChild(wordSpan);
      position = endPos;
    }
    
    // Add space if we're at a space character in space-separated languages
    if (hasSpaces && position < translatedSentence.length && translatedSentence[position] === ' ') {
      translatedBlock.appendChild(document.createTextNode(' '));
      position++;
    }
  }
  
  parentElement.appendChild(translatedBlock);
}


async function translateNodes(matches) {
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
            const result = Math.random()
            if (result > (storageInfo.volume / 100)) {
                return;
            }
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