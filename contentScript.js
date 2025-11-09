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
    
`;
document.head.appendChild(style);

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