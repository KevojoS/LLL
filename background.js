// background.js - Chrome Extension Service Worker
let wasmModule = null;
let getDifficultyFunc = null;
let isInitialized = false;

// Load and initialize the WebAssembly module
async function initializeWasm() {
  if (isInitialized) return true;
  
  try {
    console.log('Loading WASM module...');
    
    // Service workers can't use dynamic import(), so we use importScripts
    // This loads the Emscripten-generated JS file
    importScripts(chrome.runtime.getURL('WASMBloom.js'));
    
    // After importScripts, createModule should be available globally
    if (typeof createModule === 'undefined') {
      throw new Error('createModule not found after loading WASMBloom.js');
    }
    
    console.log('WASMBloom.js loaded, initializing module...');
    
    // Initialize the module
    wasmModule = await createModule({
      locateFile(path) {
        // Tell Emscripten where to find the .wasm file
        if (path.endsWith('.wasm')) {
          return chrome.runtime.getURL(path);
        }
        return path;
      }
    });
    
    console.log('WASM module loaded, calling main() to initialize...');
    
    // Call main() to initialize the bloom filters
    wasmModule._main();
    
    // Create a wrapped version of getDifficulty
    getDifficultyFunc = wasmModule.cwrap('getDifficulty', 'number', ['string']);
    
    isInitialized = true;
    console.log('WASM initialized successfully!');
    return true;
    
  } catch (error) {
    console.error('Failed to initialize WASM:', error);
    isInitialized = false;
    return false;
  }
}

const API_KEY = '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';

async function translateSentence(language, sentence) {
  console.log('Starting translation...', { language, sentence });
  
  try {
    const requestBody = {
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You must respond with ONLY valid JSON, no other text before or after. Do not include markdown code blocks or any explanation.

Translate the following sentence into ${language}: "${sentence}"

Return this exact JSON structure:
{
  "translated_sentence": "the translated text here",
  "word_definitions": [
    {
      "word": "exact word from translation including punctuation like l'extrémité",
      "translations": ["english definition 1", "english definition 2"]
    }
  ]
}

IMPORTANT: 
- Include EVERY word from the translation, even small connector words
- Keep words EXACTLY as they appear (don't modify l'extrémité to extrémité)
- Return ONLY the JSON object, nothing else`
        },
      ],
    };
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const data = await response.json();
    console.log('API response data:', data);
    
    const textContent = data.content.find(block => block.type === 'text');
    if (!textContent) {
      throw new Error('No text content in response');
    }
    
    console.log('Raw text from API:', textContent.text);
    
    // Extract JSON - handle markdown code blocks
    let jsonText = textContent.text.trim();
    
    // Remove markdown code blocks more carefully
    if (jsonText.startsWith('```')) {
      // Find the first { and last }
      const firstBrace = jsonText.indexOf('{');
      const lastBrace = jsonText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonText = jsonText.substring(firstBrace, lastBrace + 1);
      }
    }
    
    console.log('Cleaned JSON text:', jsonText);
    
    // Parse the JSON
    const result = JSON.parse(jsonText);
    console.log('Parsed result:', result);
    
    return result;
  } catch (error) {
    console.error("Fetch error in background:", error);
    throw error;
  }
}

// Function to get difficulty level
function getDifficulty(sentence) {
  if (!isInitialized || !getDifficultyFunc) {
    throw new Error('WASM module not initialized. Call initializeWasm() first.');
  }
  
  try {
    const difficulty = getDifficultyFunc(sentence);
    return difficulty;
  } catch (error) {
    console.error('Error calling getDifficulty:', error);
    throw error;
  }
}

// SINGLE message handler for ALL messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  
  if (request.type === 'TRANSLATE') {
    console.log('TRANSLATE request received:', request);
    translateSentence(request.language, request.sentence)
      .then(data => {
        console.log('Translation complete, sending response:', data);
        sendResponse({ data: data });
      })
      .catch(error => {
        console.error('Translation error:', error);
        sendResponse({ error: error.message });
      });
    return true; // Required for async response
  }
  
  if (request.action === 'initialize') {
    initializeWasm()
      .then(success => {
        sendResponse({ success, initialized: isInitialized });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  
  if (request.action === 'getDifficulty') {
    if (!isInitialized) {
      sendResponse({ 
        success: false, 
        error: 'WASM not initialized. Send initialize message first.' 
      });
      return;
    }
    
    try {
      const difficulty = getDifficulty(request.sentence);
      sendResponse({ success: true, difficulty });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  
  if (request.action === 'getStatus') {
    sendResponse({ initialized: isInitialized });
    return true;
  }
});

// Initialize on startup (optional - you can also initialize on first use)
initializeWasm().catch(error => {
  console.error('Failed to initialize on startup:', error);
});

console.log('Background worker loaded');