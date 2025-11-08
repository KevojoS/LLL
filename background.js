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

// Message handler for communication with other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  if (request.action === 'initialize') {
    initializeWasm()
      .then(success => {
        sendResponse({ success, initialized: isInitialized });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep the message channel open for async response
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
    return;
  }
});

// Initialize on startup (optional - you can also initialize on first use)
initializeWasm().catch(error => {
  console.error('Failed to initialize on startup:', error);
});

console.log('Background worker loaded');