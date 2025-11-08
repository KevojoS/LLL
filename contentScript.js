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
    
    .translation-progress {
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, rgba(44,178,178,0.95) 0%, rgba(36,142,142,0.95) 100%);
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        font-family: Inter, system-ui, sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        z-index: 100000;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: opacity 0.3s ease;
    }
    
    .translation-progress.hidden {
        opacity: 0;
        pointer-events: none;
    }
    
    .progress-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .progress-bar {
        width: 100px;
        height: 4px;
        background: rgba(255,255,255,0.3);
        border-radius: 2px;
        overflow: hidden;
    }
    
    .progress-bar-fill {
        height: 100%;
        background: white;
        border-radius: 2px;
        transition: width 0.3s ease;
    }
`;
document.head.appendChild(style);

// Progress indicator
class ProgressIndicator {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'translation-progress hidden';
        this.element.innerHTML = `
            <div class="progress-spinner"></div>
            <span class="progress-text">Translating...</span>
            <div class="progress-bar">
                <div class="progress-bar-fill" style="width: 0%"></div>
            </div>
        `;
        document.body.appendChild(this.element);
        
        this.textElement = this.element.querySelector('.progress-text');
        this.barElement = this.element.querySelector('.progress-bar-fill');
    }
    
    show(total) {
        this.total = total;
        this.completed = 0;
        this.element.classList.remove('hidden');
        this.update();
    }
    
    increment() {
        this.completed++;
        this.update();
    }
    
    update() {
        const percent = Math.round((this.completed / this.total) * 100);
        this.textElement.textContent = `Translating ${this.completed}/${this.total}`;
        this.barElement.style.width = `${percent}%`;
        
        if (this.completed >= this.total) {
            setTimeout(() => this.hide(), 1000);
        }
    }
    
    hide() {
        this.element.classList.add('hidden');
    }
}

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

function addTooltipHandlersToSelected() {
    const selectedElements = document.querySelectorAll('.selected');
    selectedElements.forEach(el => {
        // Remove existing listeners to avoid duplicates
        el.replaceWith(el.cloneNode(true));
    });
    
    // Re-query after replacing
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
    
    // Check if element is at least partially in viewport
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
        elementsArray = elementsArray.concat(getActualtext(element));
    }
    elementsArray = elementsArray.filter(item => {
        if (item.classList.contains('hidden')) return false;
        if (item.getAttribute('aria-hidden') === 'true') return false;
        if (!isElementVisible(item)) return false;
        
        // Filter by viewport if requested
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

// Translation Manager - Handles viewport-based translation
class TranslationManager {
    constructor() {
        this.translatedSentences = new Set(); // Track what's been translated
        this.isTranslating = false;
        this.progress = new ProgressIndicator();
        this.debounceTimer = null;
    }

    async translateViewport() {
        if (this.isTranslating) {
            console.log("Translation already in progress, skipping...");
            return;
        }

        this.isTranslating = true;

        // Only scrape elements that are currently in viewport
        const sentencesArray = webScrape(document, true);
        if (!sentencesArray.length) {
            console.log("No visible sentences found in viewport");
            this.isTranslating = false;
            return;
        }

        // Count total sentences (only untranslated ones)
        let totalSentences = 0;
        const translationPromises = [];

        for (const elementObj of sentencesArray) {
            const el = elementObj.el;

            for (const sentence of elementObj.textArray) {
                const trimmedSentence = sentence.trim();
                if (!trimmedSentence) continue;

                // Skip if already translated
                if (this.translatedSentences.has(trimmedSentence)) continue;

                totalSentences++;
                this.translatedSentences.add(trimmedSentence);

                // Each API call is a promise; insert translation when done
                const promise = translateSentence("russian", trimmedSentence)
                    .then(result => {
                        const translatedText = result?.choices?.[0]?.message?.content?.trim() || trimmedSentence;
                        insertTranslatedSentence(el, trimmedSentence, translatedText);
                        this.progress.increment();
                        console.log("Translated:", translatedText);
                    })
                    .catch(err => {
                        console.error("Error translating sentence:", trimmedSentence, err);
                        this.progress.increment();
                        // Remove from set so we can retry later
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
        
        // Show progress bar
        this.progress.show(totalSentences);

        // Wait for all translations to finish
        await Promise.all(translationPromises);

        addTooltipHandlersToSelected();
        console.log("All visible sentences translated!");
        
        this.isTranslating = false;
    }

    onScroll() {
        // Debounce scroll events - only translate after user stops scrolling for 500ms
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.translateViewport();
        }, 500);
    }
}

// Initialize translation manager
const translationManager = new TranslationManager();

// Translate initial viewport
translationManager.translateViewport();

// Add scroll listener to translate as user scrolls
let scrollTimeout;
window.addEventListener('scroll', () => {
    translationManager.onScroll();
}, { passive: true });

console.log("✨ Auto-translation enabled! Scroll to translate more content.");