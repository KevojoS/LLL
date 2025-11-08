API_KEY = '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'

async function translateSentence(language, sentence) { //fragile no error checking
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
    });;

    //const start = performance.now();

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(data["choices"][0]["message"]["content"])
    
    //const end = performance.now();  
    //console.log(`Execution time: ${end - start} ms`);
    return data;
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

async function testTranslations() {
    /*
    translateSentence("russian", "Hello, how are you?");
    translateSentence("russian", "What's your name?");
    translateSentence("russian", "What's your favorite color?");
    translateSentence("russian", "Should I wear a blue or red shirt?");
    translateSentence("russian", "Back to the future");
    translateSentence("russian", "What's your favorite back exercise?");
    */
   console.log("Blank test")
}

testTranslations()


// Tooltip logic for .selected elements
// Create tooltip element
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
    // offset to avoid cursor overlap
    let offsetX = 12;
    let offsetY = 16;
    // viewport bounds
    const tooltipRect = tooltip.getBoundingClientRect();
    let left = x + offsetX;
    let top = y + offsetY;
    // prevent overflow right/bottom
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
        let mouseMoveHandler = null;
        el.addEventListener('mouseover', function(e) {
            showTooltip(el.textContent, e.clientX, e.clientY);
            // mousemove so tooltip follows cursor
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

addTooltipHandlersToSelected();
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
        const list = ['A', 'STRONG', 'EM', 'I', 'B', 'MARK',
            'SMALL',
            'SUB',
            'SUP',
            'CODE',
            'SAMP',
            'VAR',
            'KBD',
        ]
        for (const element of el) {
            if (!list.includes(element.tagName)) {
                return false
            }
        }
        return true
    }
    const recurse = (el) => {
        if (!el) return;
        if (isEditable(el)) return;
        const children = Array.from(el.children);
        if (children.length === 0 || isWrapper(el.children)) {
            if ((el.textContent || '').trim().length > 0) {
            results.push(el);
            } 
            else {
                return
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

const uniqueById = (arr, key) => {
    const seen = new Set();
    return arr.filter(obj => {
        let keyValue = obj[key];
        if (keyValue && typeof keyValue === 'object') {
            try {
                keyValue = JSON.stringify(keyValue);
            } catch (e) {
                keyValue = String(keyValue);
            }
        }
        if (seen.has(keyValue)) {
            return false;
        } else {
            seen.add(keyValue);
            return true; 
        }
    });
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
        } 
        else if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.tagName !== 'MARK' &&
            !node.classList.contains('lmao')
        ) {
            wrapTextNodes(node);
        }
    });
};

const webScrape = (dom) => {
    const elements = dom.querySelectorAll(`
    p, h1, h2, h3, h4, h5, h6, article, strong, mark, em, span, div
    `);
    let elementsArray = []
    for (const element of elements) {
        elementsArray = elementsArray.concat(getActualtext(element))
    }
    elementsArray = elementsArray.filter(item => {
            const style = window.getComputedStyle(item);
            if (style.display === 'none' || style.visibility === 'hidden' || style.position === 'fixed') return false;
            return true;
        })
        .filter(element => !element.classList.contains('hidden'))
        .map((element, index) => ({ id: `element-${index}`, element: element }));


    let sentencesArray = Array.from(elementsArray).map(
        element => ({ id: element.id, el: element.element, textArray: getFullText(element.element).match(/[A-Z][^.?!]*[.?!]/g) || [] })
    )
    .filter(item => item.textArray.length != 0)

    console.log(sentencesArray);
    return (sentencesArray)
}

const highlightsentencesArray = (sentencesArray) => {
    sentencesArray.forEach(element => {
        const el = element.el;
        if (!el) return;
        wrapTextNodes(el);
    });
};


// highlightsentencesArray(webScrape(document))

(async () => {
    const sentencesArray = webScrape(document);
    if (sentencesArray.length === 0 || sentencesArray[0].textArray.length === 0) {
        console.log("No sentences to translate.");
        return;
    }
    const firstElement = sentencesArray[0];
    const firstSentence = firstElement.textArray[0].trim();
    console.log("Translating first sentence:", firstSentence);
    
    // Translate the first sentence
    const translationResult = await translateSentence("russian", firstSentence);
    const translatedText = translationResult?.choices?.[0]?.message?.content?.trim() || firstSentence;
    
    const el = firstElement.el;
    
    // Find the sentence in the full text
    const fullText = el.textContent;
    const sentenceStart = fullText.indexOf(firstSentence);
    
    if (sentenceStart === -1) {
        console.log("Could not find sentence in element");
        return;
    }
    
    const sentenceEnd = sentenceStart + firstSentence.length;
    
    console.log(`Sentence position: ${sentenceStart} to ${sentenceEnd}`);
    
    // Collect all text nodes with their positions
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    let currentPos = 0;
    let node;
    
    while (node = walker.nextNode()) {
        const nodeLength = node.textContent.length;
        textNodes.push({
            node: node,
            parent: node.parentNode,
            start: currentPos,
            end: currentPos + nodeLength,
            text: node.textContent
        });
        currentPos += nodeLength;
    }
    
    // Find which nodes the sentence spans
    const affectedNodes = textNodes.filter(n => 
        (n.start < sentenceEnd && n.end > sentenceStart)
    );
    
    if (affectedNodes.length === 0) {
        console.log("No affected nodes found");
        return;
    }
    
    console.log("Affected nodes:", affectedNodes.length);
    
    // Create the translated span
    const tempDiv = document.createElement('div');
    tempDiv.textContent = translatedText;
    wrapTextNodes(tempDiv);
    
    const translatedSpan = document.createElement('span');
    translatedSpan.className = 'translated-sentence';
    translatedSpan.style.display = 'inline';
    while (tempDiv.firstChild) {
        translatedSpan.appendChild(tempDiv.firstChild);
    }
    
    // Track elements to remove (like <a> tags that are fully within the sentence)
    const elementsToRemove = new Set();
    
    // Process nodes from last to first to avoid position shifts
    for (let i = affectedNodes.length - 1; i >= 0; i--) {
        const nodeInfo = affectedNodes[i];
        const node = nodeInfo.node;
        const parent = nodeInfo.parent;
        const nodeStart = nodeInfo.start;
        
        // Calculate what part of this node is in the sentence
        const overlapStart = Math.max(0, sentenceStart - nodeStart);
        const overlapEnd = Math.min(node.textContent.length, sentenceEnd - nodeStart);
        
        const before = node.textContent.substring(0, overlapStart);
        const after = node.textContent.substring(overlapEnd);
        
        // Check if parent element (like <a>) is fully within the sentence
        if (parent !== el && parent.nodeType === Node.ELEMENT_NODE) {
            const parentText = parent.textContent;
            const parentInSentence = firstSentence.includes(parentText.trim());
            
            if (parentInSentence && overlapStart === 0 && overlapEnd === node.textContent.length) {
                // This entire element is within the sentence, mark for removal
                elementsToRemove.add(parent);
            }
        }
        
        if (i === 0) {
            // First affected node
            const fragment = document.createDocumentFragment();
            
            if (before) {
                fragment.appendChild(document.createTextNode(before));
            }
            fragment.appendChild(translatedSpan);
            
            if (i === affectedNodes.length - 1 && after) {
                // Also last node
                fragment.appendChild(document.createTextNode(after));
            }
            
            // If parent should be removed, replace the parent instead
            if (elementsToRemove.has(parent)) {
                const grandparent = parent.parentNode;
                grandparent.replaceChild(fragment, parent);
                elementsToRemove.delete(parent); // Already handled
            } else {
                parent.replaceChild(fragment, node);
            }
        } else if (i === affectedNodes.length - 1) {
            // Last affected node
            if (elementsToRemove.has(parent)) {
                if (after) {
                    // Replace parent element with just the after text
                    const grandparent = parent.parentNode;
                    grandparent.replaceChild(document.createTextNode(after), parent);
                } else {
                    parent.remove();
                }
                elementsToRemove.delete(parent);
            } else {
                if (after) {
                    node.textContent = after;
                } else {
                    parent.removeChild(node);
                }
            }
        } else {
            // Middle node
            if (elementsToRemove.has(parent)) {
                parent.remove();
                elementsToRemove.delete(parent);
            } else {
                parent.removeChild(node);
            }
        }
    }
    
    // Clean up any remaining elements marked for removal
    elementsToRemove.forEach(el => el.remove());
    
    // Re-apply tooltip handlers
    addTooltipHandlersToSelected();
    console.log("First sentence translated and inserted:", translatedText);
})();