// Update difficulty display based on slider
const difficultySlider = document.getElementById('difficultySlider');
const difficultyValue = document.getElementById('difficultyValue');
const languageSelect = document.getElementById('languageSelect');
const difficultyIndicators = document.getElementById('difficultyIndicators').querySelectorAll('.level-indicator');
const languageContainer = document.querySelector('.language-selector');
const levelSliderContainer = document.getElementById('difficultySliderContainer');
const volumeSliderContainer = document.getElementById('volumeSliderContainer');
const containers = [languageContainer, levelSliderContainer, volumeSliderContainer]
// CEFR levels
const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function updateDifficulty() {
    const levelIndex = parseInt(difficultySlider.value);
    const language = languageSelect.options[languageSelect.selectedIndex].text;
    chrome.storage.sync.set({
        difficultyLevel: levelIndex,
        selectedLanguage: language
    });
    console.log('Reloading the page because level changed');
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: () => location.reload()
            });
        }
    });
};

function updateDifficultyUI() {
    const levelIndex = parseInt(difficultySlider.value);
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
}
difficultySlider.addEventListener('input', updateDifficultyUI)
languageSelect.addEventListener('input', updateDifficultyUI);

difficultySlider.addEventListener('change', updateDifficulty);
languageSelect.addEventListener('change', updateDifficulty);

// Update volume display based on slider
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
const volumeIndicators = document.getElementById('volumeIndicators').querySelectorAll('.level-indicator');

function updateVolume() {
    const volume = parseInt(volumeSlider.value);
    // Save volume to chrome.storage.sync (mimic difficulty saving)
    chrome.storage.sync.set({ volumeLevel: volume });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: () => location.reload()
            });
        }
    });
}
function updateVolumeUI() {
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
volumeSlider.addEventListener('input', updateVolumeUI)
volumeSlider.addEventListener('change', updateVolume);

const extensionToggle = document.getElementById('extensionToggle');

extensionToggle.addEventListener('input', () => {
    const enabled = extensionToggle.checked;
    chrome.storage.sync.set({ extensionEnabled: enabled });
    if (enabled) {
        containers.forEach(container => {
            container.style.display = "block";
        })
    }
    else {
        containers.forEach(container => {
            container.style.display = "none";
        })
    }

    // Optionally reload page when turning on/off
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: () => location.reload()
            });
        }
    });
});

// Initialize displays
// Restore saved difficulty and language settings
// Initialize displays
// Restore saved difficulty and language settings
chrome.storage.sync.get(['difficultyLevel', 'volumeLevel', 'selectedLanguage', 'extensionEnabled'], (data) => {
    if (data.difficultyLevel !== undefined) {
        difficultySlider.value = data.difficultyLevel;
    }
    if (data.volumeLevel !== undefined) {
        volumeSlider.value = data.volumeLevel;
    }
    if (data.selectedLanguage) {
        [...languageSelect.options].forEach((option, i) => {
            if (option.text === data.selectedLanguage) {
                languageSelect.selectedIndex = i;
            }
        });
    }

    // Set toggle state
    if (data.extensionEnabled !== undefined) {
        document.getElementById('extensionToggle').checked = data.extensionEnabled;
        if (data.extensionEnabled) {
            containers.forEach(container => {
                container.style.display = "block";
            })
        }
        else {
            containers.forEach(container => {
                container.style.display = "none";
            })
        }
    }

    // Just update the display, don't reload
    const levelIndex = parseInt(difficultySlider.value);
    const language = languageSelect.options[languageSelect.selectedIndex].text;
    difficultyValue.textContent = `${language} - ${cefrLevels[levelIndex]}`;

    difficultyIndicators.forEach((indicator, index) => {
        if (index === levelIndex) {
            indicator.classList.add('active-level');
        } else {
            indicator.classList.remove('active-level');
        }
    });
    const volume = parseInt(volumeSlider.value);
    volumeValue.textContent = `${volume}%`;

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
});