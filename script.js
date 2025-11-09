// Update difficulty display based on slider
const difficultySlider = document.getElementById('difficultySlider');
const difficultyValue = document.getElementById('difficultyValue');
const languageSelect = document.getElementById('languageSelect');
const difficultyIndicators = document.getElementById('difficultyIndicators').querySelectorAll('.level-indicator');

// CEFR levels
const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

let difficultyTracker = 0;
difficultyTracker = difficultySlider.value
function updateDifficultyDisplay() {
    const levelIndex = parseInt(difficultySlider.value)-1;
    const language = languageSelect.options[languageSelect.selectedIndex].text;
    difficultyValue.textContent = `${language} - ${cefrLevels[levelIndex]}`;
    // Update active level indicator
    difficultyIndicators.forEach((indicator, index) => {
        if (index === levelIndex) {
            indicator.classList.add('active-level');
        } else {
            indicator.classList.remove('active-level');
        }
    });
    chrome.storage.sync.get('difficultyLevel', (data) => {
        const previousLevel = data.difficultyLevel;
        chrome.storage.sync.set({
            difficultyLevel: levelIndex,
            selectedLanguage: language
        });
        if (previousLevel !== undefined && levelIndex < previousLevel) {
            console.log('Reloading the page because easier level selected');
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        func: () => location.reload()
                    });
                }
            });
        }
    });
}

difficultySlider.addEventListener('input', updateDifficultyDisplay);
languageSelect.addEventListener('change', updateDifficultyDisplay);

// Update volume display based on slider
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
const volumeIndicators = document.getElementById('volumeIndicators').querySelectorAll('.level-indicator');

function updateVolumeDisplay() {
    const volume = parseInt(volumeSlider.value);
    volumeValue.textContent = `${volume}%`;

    // Update active level indicator based on closest percentage
    const percentages = [0, 25, 50, 75, 100];
    const closest = percentages.reduce((prev, curr) => {
        return (Math.abs(curr - volume) < Math.abs(prev - volume) ? curr : prev);
    });

    volumeIndicators.forEach((indicator, index) => {
        if (percentages[index] === closest) {
            indicator.classList.add('active-level');
        } else {
            indicator.classList.remove('active-level');
        }
    });
}

volumeSlider.addEventListener('input', updateVolumeDisplay);

// Page navigation
const pages = {
    main: document.getElementById('mainPage'),
    flashcards: document.getElementById('flashcardsPage'),
    quiz: document.getElementById('quizPage'),
    badges: document.getElementById('badgesPage')
};

function showPage(pageName) {
    // Hide all pages
    Object.values(pages).forEach(page => page.classList.remove('active'));
    // Show the requested page
    pages[pageName].classList.add('active');
}

// Button event listeners
document.getElementById('flashcardsButton').addEventListener('click', () => showPage('flashcards'));
document.getElementById('quizButton').addEventListener('click', () => showPage('quiz'));
document.getElementById('badgesButton').addEventListener('click', () => showPage('badges'));

document.getElementById('backFromFlashcards').addEventListener('click', () => showPage('main'));
document.getElementById('backFromQuiz').addEventListener('click', () => showPage('main'));
document.getElementById('backFromBadges').addEventListener('click', () => showPage('main'));

// Flashcard flip functionality
const flashcard = document.getElementById('flashcard');
const flashcardContent = document.getElementById('flashcardContent');
let isFlipped = false;

flashcard.addEventListener('click', function () {
    isFlipped = !isFlipped;
    if (isFlipped) {
        flashcardContent.textContent = 'Hello';
        flashcard.style.backgroundColor = '#E6F7F7';
    } else {
        flashcardContent.textContent = 'Bonjour';
        flashcard.style.backgroundColor = 'white';
    }
});

// Add click handlers for buttons
document.querySelectorAll('.action-button, .progress-badges').forEach(button => {
    button.addEventListener('click', function () {
        // Add a subtle animation on click
        this.style.transform = 'scale(0.98)';
        setTimeout(() => {
            this.style.transform = '';
        }, 150);
    });
});

// Initialize displays
// Restore saved difficulty and language settings
chrome.storage.sync.get(['difficultyLevel', 'selectedLanguage', 'extensionEnabled'], (data) => {
    if (data.difficultyLevel !== undefined) {
        difficultySlider.value = data.difficultyLevel; // adjust for index offset
    }
    if (data.selectedLanguage) {
        [...languageSelect.options].forEach((option, i) => {
            if (option.text === data.selectedLanguage) {
                languageSelect.selectedIndex = i;
            }
        });
    }
    updateDifficultyDisplay();

    // Set toggle state
    document.getElementById('extensionToggle').addEventListener('change', function () {
    const isEnabled = this.checked;
    chrome.storage.sync.set({ extensionEnabled: isEnabled });

    // Reload the current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: () => location.reload()
            });
        }
    });
});
});

updateVolumeDisplay();

// Toggle functionality
document.getElementById('extensionToggle').addEventListener('change', function () {
    const isEnabled = this.checked;
    chrome.storage.sync.set({ extensionEnabled: isEnabled });
});

updateVolumeDisplay();

console.log("Ran scriptjs")