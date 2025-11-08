// Update difficulty display based on slider
const difficultySlider = document.getElementById('difficultySlider');
const difficultyValue = document.getElementById('difficultyValue');
const languageSelect = document.getElementById('languageSelect');
const difficultyIndicators = document.getElementById('difficultyIndicators').querySelectorAll('.level-indicator');

// CEFR levels
const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function updateDifficultyDisplay() {
    const levelIndex = parseInt(difficultySlider.value) - 1;
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

    chrome.storage.sync.set({
        difficultyLevel: levelIndex,
        selectedLanguage: language
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

flashcard.addEventListener('click', function() {
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
    button.addEventListener('click', function() {
        // Add a subtle animation on click
        this.style.transform = 'scale(0.98)';
        setTimeout(() => {
            this.style.transform = '';
        }, 150);
    });
});

// Initialize displays
updateDifficultyDisplay();
updateVolumeDisplay();

console.log("Ran scriptjs")