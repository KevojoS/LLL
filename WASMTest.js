// content.js - Content Script for Testing
console.log('Language Difficulty Analyzer content script loaded');

// Helper function to analyze text
async function analyzeText(text) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getDifficulty',
      sentence: text
    });
    
    if (response.success) {
      const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
      return {
        level: levels[response.difficulty] || 'Unknown',
        score: response.difficulty
      };
    } else {
      console.error('Error analyzing text:', response.error);
      return null;
    }
  } catch (error) {
    console.error('Failed to communicate with background:', error);
    return null;
  }
}

// Test function - analyzes selected text
async function analyzeSelection() {
  const selectedText = window.getSelection().toString().trim();
  
  if (!selectedText) {
    console.log('No text selected');
    return;
  }
  
  console.log('Analyzing:', selectedText);
  const result = await analyzeText(selectedText);
  
  if (result) {
    // Create a tooltip to show the result
    showTooltip(result.level, result.score);
  }
}

// Show a tooltip with the difficulty level
function showTooltip(level, score) {
  // Remove any existing tooltip
  const existing = document.getElementById('difficulty-tooltip');
  if (existing) {
    existing.remove();
  }
  
  // Create tooltip
  const tooltip = document.createElement('div');
  tooltip.id = 'difficulty-tooltip';
  tooltip.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 999999;
    font-family: Arial, sans-serif;
    font-size: 16px;
    animation: slideIn 0.3s ease-out;
  `;
  
  tooltip.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 5px;">Difficulty Level</div>
    <div style="font-size: 24px;">${level}</div>
    <div style="font-size: 12px; opacity: 0.8; margin-top: 5px;">Score: ${score}</div>
  `;
  
  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(tooltip);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    tooltip.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => tooltip.remove(), 300);
  }, 3000);
}

// Listen for keyboard shortcut (Ctrl+Shift+D or Cmd+Shift+D)
document.addEventListener('keydown', async (e) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
    e.preventDefault();
    await analyzeSelection();
  }
});

// Listen for double-click to analyze a word
document.addEventListener('dblclick', async (e) => {
  // Optional: uncomment to enable double-click analysis
  // await analyzeSelection();
});

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

function isValidSentence(sentence) {
    const trimmed = sentence.trim();
    if (trimmed.length === 0) return false;

    // Check if starts with capital letter
    const startsWithCapital = /^[A-Z]/.test(trimmed);

    // Check if ends with period, exclamation mark, or question mark
    const endsWithPunctuation = /[.!?]$/.test(trimmed);

    // Check if has at least 3 words
    const words = trimmed.split(/\s+/).filter(word => word.length > 0);
    const hasMinWords = words.length >= 1;

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

// Add a context menu option (if you want)
// This requires adding contextMenus permission to manifest.json

// Simple test on page load
(async function runTest() {
  console.log('Running difficulty analyzer test...');
  
  // Test sentences
  const testSentences = [
    'Hello, how are you?',
    'The cat sits on the mat.',
    'Comprehensively analyzing multifaceted philosophical paradigms.',
  ];
  
  for (const sentence of testSentences) {
    const result = await analyzeText(sentence);
    if (result) {
      console.log(`"${sentence}" -> ${result.level} (${result.score})`);
    }
  }
  
  console.log('Test complete! Select text and press Ctrl+Shift+D to analyze.');
})();