// Global state
let appData = {};
const state = {
    lesson: '4',
    mode: 'kanji',
    cardIndex: 0,
    flashcards: [],
    starredCards: JSON.parse(localStorage.getItem('jpd123_starred')) || [],
    starredIndex: 0
};

// Keywords for vocabulary categorization
const CATEGORY_TIME_KEYWORDS = ['Số', 'Thời gian', 'Thời lượng', 'Đếm', 'tháng', 'năm', 'tuần', 'ngày', 'giờ', 'phút'];

// Initialize app
async function startApp() {
    try {
        const response = await fetch('data.txt');
        if (!response.ok) throw new Error("Data file not found");
        appData = await response.json();
        renderCurrentView();
    } catch (err) {
        displayErrorMessage("Error: Could not load data.txt. Please check the JSON format.");
    }
}

// Update UI based on mode
function renderCurrentView() {
    const lessonData = appData[state.lesson];
    if (!lessonData) return;

    if (state.mode === 'kanji') {
        state.flashcards = [...lessonData.kanji];
        updateFlashcardContent();
        updateStarredSection(); 
    } else {
        renderQAList(lessonData.qa, lessonData.vocab);
        document.getElementById('starred-section').classList.add('hidden');
    }
}

// Save starred cards to LocalStorage
function saveStarred() {
    localStorage.setItem('jpd123_starred', JSON.stringify(state.starredCards));
}

// Toggle star (bookmark)
function toggleStar(event) {
    if(event) event.stopPropagation();
    
    const currentCard = state.flashcards[state.cardIndex];
    const existingIndex = state.starredCards.findIndex(c => c.kanji === currentCard.kanji);

    if (existingIndex >= 0) {
        state.starredCards.splice(existingIndex, 1);
    } else {
        state.starredCards.push({...currentCard});
    }
    
    saveStarred();
    updateFlashcardContent(); 
    updateStarredSection();   
}

// Remove card from starred section
function removeStarredCard(event) {
    if(event) event.stopPropagation();
    
    state.starredCards.splice(state.starredIndex, 1);
    saveStarred();
    
    if (state.starredIndex >= state.starredCards.length) {
        state.starredIndex = Math.max(0, state.starredCards.length - 1);
    }
    
    updateFlashcardContent(); 
    updateStarredSection();
}

// Update starred section display
function updateStarredSection() {
    const section = document.getElementById('starred-section');
    section.style.display = ''; 

    if (state.starredCards.length === 0) {
        section.classList.add('hidden');
        return;
    }
    
    section.classList.remove('hidden');

    const card = state.starredCards[state.starredIndex];
    if (!card) return;

    document.getElementById('star-display-kanji').textContent = card.kanji;
    document.getElementById('star-display-hiragana').textContent = card.hiragana;
    document.getElementById('star-display-hanviet').textContent = card.hanviet;
    document.getElementById('star-display-meaning').textContent = card.meaning;
    document.getElementById('starred-counter').textContent = `${state.starredIndex + 1} / ${state.starredCards.length}`;
    document.getElementById('starred-card').classList.remove('flipped');
}

// Navigate starred cards (Left/Right)
function navigateStarredCard(direction) {
    if (state.starredCards.length === 0) return;
    state.starredIndex = (state.starredIndex + direction + state.starredCards.length) % state.starredCards.length;
    updateStarredSection();
}

// Flip starred card
function toggleStarredCardFlip() {
    document.getElementById('starred-card').classList.toggle('flipped');
}

// Shuffle starred cards
function shuffleStarredCards() {
    state.starredCards.sort(() => Math.random() - 0.5);
    state.starredIndex = 0;
    saveStarred();
    updateStarredSection();
}

// Update main Kanji card content
function updateFlashcardContent() {
    const card = state.flashcards[state.cardIndex];
    if (!card) return;

    document.getElementById('display-kanji').textContent = card.kanji;
    document.getElementById('display-hiragana').textContent = card.hiragana;
    document.getElementById('display-hanviet').textContent = card.hanviet;
    document.getElementById('display-meaning').textContent = card.meaning;
    document.getElementById('card-counter').textContent = `${state.cardIndex + 1} / ${state.flashcards.length}`;
    document.getElementById('kanji-card').classList.remove('flipped');

    const isStarred = state.starredCards.some(c => c.kanji === card.kanji);
    const starBtns = document.querySelectorAll('#kanji-card .star-btn i');
    starBtns.forEach(icon => {
        if (isStarred) {
            icon.className = "fa-solid fa-star text-yellow-400";
        } else {
            icon.className = icon.closest('.flip-card-front') 
                ? "fa-regular fa-star text-slate-300 hover:text-yellow-400" 
                : "fa-regular fa-star text-indigo-300 hover:text-yellow-400";
        }
    });
}

// Navigate main Kanji cards
function navigateCard(direction) {
    state.cardIndex = (state.cardIndex + direction + state.flashcards.length) % state.flashcards.length;
    updateFlashcardContent();
}

// Flip main Kanji card
function toggleCardFlip() {
    document.getElementById('kanji-card').classList.toggle('flipped');
}

// Shuffle main Kanji cards
function shuffleFlashcards() {
    state.flashcards.sort(() => Math.random() - 0.5);
    state.cardIndex = 0;
    updateFlashcardContent();
}

// Japanese text-to-speech
function speakJapanese(event, customText = null, isFromStarred = false) {
    if(event) event.stopPropagation();
    
    let textToSpeak = customText;
    if (!textToSpeak) {
        const card = isFromStarred ? state.starredCards[state.starredIndex] : state.flashcards[state.cardIndex];
        if (!card) return;
        textToSpeak = card.kanji;
    }

    window.speechSynthesis.cancel(); 
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    
    const voices = window.speechSynthesis.getVoices();
    const googleVoice = voices.find(voice => voice.name.includes('Google') && voice.lang === 'ja-JP');
    if (googleVoice) {
        utterance.voice = googleVoice;
    }
    
    utterance.lang = 'ja-JP';
    utterance.rate = 0.85; 

    window.speechSynthesis.speak(utterance);
}

// Render Q&A list
function renderQAList(questions, lessonVocab) {
    const container = document.getElementById('qa-container');
    container.innerHTML = '';

    questions.forEach((item, index) => {
        const vocabSection = createVocabSection(item.vocabTags, lessonVocab, index);
        
        let conjugationSection = '';
        if (item.conjugation) {
            const rulesHtml = item.conjugation.rules.map(rule => `<li class="flex items-start gap-2"><i class="fa-solid fa-arrow-right text-rose-400 mt-1 text-xs"></i><span>${rule}</span></li>`).join('');
            conjugationSection = `
                <div class="mt-4 border border-rose-100 bg-rose-50/30 rounded-xl p-4">
                    <button onclick="toggleVisibility('conj-${index}')" class="text-sm font-bold text-rose-600 flex items-center gap-2 hover:text-rose-700 transition w-full text-left">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Cheat Sheet: ${item.conjugation.title}
                    </button>
                    <div id="conj-${index}" class="hidden mt-3 pt-3 border-t border-rose-100">
                        <ul class="space-y-2 text-sm text-slate-700">
                            ${rulesHtml}
                        </ul>
                    </div>
                </div>
            `;
        }

        const card = document.createElement('div');
        card.className = "bg-white rounded-2xl p-6 shadow-sm border border-slate-200";
        card.innerHTML = `
            <div class="flex items-center gap-3 mb-6">
                <span class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">${index + 1}</span>
                <h3 class="text-lg font-bold text-slate-800">${item.type}</h3>
            </div>
            <div class="space-y-4 text-sm sm:text-base">
                <div class="flex flex-col sm:flex-row"><div class="sm:w-1/4 text-slate-500 font-semibold">Question:</div><div class="sm:w-3/4 font-bold text-indigo-900">${item.question}</div></div>
                <div class="flex flex-col sm:flex-row"><div class="sm:w-1/4 text-slate-500 font-semibold">Sign:</div><div class="sm:w-3/4 text-orange-600 italic">${item.sign}</div></div>
                <div class="flex flex-col sm:flex-row"><div class="sm:w-1/4 text-slate-500 font-semibold">Answer:</div><div class="sm:w-3/4 text-emerald-700 font-medium">${item.answer}</div></div>
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 italic text-slate-600">${item.example}</div>
            </div>
            ${conjugationSection}
            ${vocabSection}
        `;
        container.appendChild(card);
    });
}

// Switch vocabulary tab (General / Time)
window.switchTab = function(btn, showId, hideId) {
    const nav = btn.parentElement;
    nav.querySelectorAll('button').forEach(b => {
        b.classList.remove('border-indigo-600', 'text-indigo-600');
        b.classList.add('border-transparent', 'text-slate-500');
    });
    btn.classList.replace('border-transparent', 'border-indigo-600');
    btn.classList.replace('text-slate-500', 'text-indigo-600');

    document.getElementById(showId).classList.remove('hidden');
    document.getElementById(hideId).classList.add('hidden');
}

// Build HTML for related vocabulary section
function createVocabSection(tags, library, qId) {
    if (!tags || tags.length === 0) return '';
    const matched = library.filter(v => tags.includes(v.category));
    if (matched.length === 0) return '';

    const timeBased = matched.filter(v => CATEGORY_TIME_KEYWORDS.some(k => v.category.includes(k)));
    const general = matched.filter(v => !timeBased.includes(v));

    let html = '';
    if (general.length > 0 && timeBased.length > 0) {
        html = `
            <div class="flex gap-4 border-b border-slate-200 mb-4 overflow-x-auto scrollbar-hide">
                <button class="px-4 py-2 border-b-2 border-indigo-600 text-indigo-600 font-semibold transition whitespace-nowrap" onclick="switchTab(this, 'v-gen-${qId}', 'v-time-${qId}')">General Vocab</button>
                <button class="px-4 py-2 border-b-2 border-transparent text-slate-500 font-medium transition whitespace-nowrap" onclick="switchTab(this, 'v-time-${qId}', 'v-gen-${qId}')">Numbers & Time</button>
            </div>
            <div id="v-gen-${qId}">${createVocabTable(general)}</div>
            <div id="v-time-${qId}" class="hidden">${createVocabTable(timeBased)}</div>
        `;
    } else {
        html = createVocabTable(matched);
    }

    return `
        <div class="mt-6 border-t pt-4">
            <button onclick="toggleVisibility('vbox-${qId}')" class="text-sm font-bold text-indigo-600 flex items-center gap-2">
                <i class="fa-solid fa-book"></i> View related vocabulary
            </button>
            <div id="vbox-${qId}" class="hidden mt-4">${html}</div>
        </div>
    `;
}

// Build HTML table for vocabulary list
function createVocabTable(data) {
    return `
        <div class="overflow-x-auto border rounded-xl">
            <table class="w-full text-left text-xs sm:text-sm">
                <thead class="bg-indigo-50 text-indigo-800">
                    <tr><th class="p-2 w-1/4">Category</th><th class="p-2 w-2/4">Vocabulary</th><th class="p-2 w-1/4">Meaning</th></tr>
                </thead>
                <tbody>
                    ${data.map(v => {
                        const wordToSpeak = v.word.split('/')[0].trim();
                        return `<tr class="border-t">
                            <td class="p-2 text-slate-400">${v.category}</td>
                            <td class="p-2 font-bold text-indigo-700">
                                <div class="flex items-center gap-2">
                                    <span>${v.word}</span>
                                    <button onclick="speakJapanese(event, '${wordToSpeak}')" class="text-slate-400 hover:text-indigo-600 transition p-1" title="Listen to pronunciation">
                                        <i class="fa-solid fa-volume-high"></i>
                                    </button>
                                </div>
                            </td>
                            <td class="p-2">${v.meaning}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Handle lesson change (Navbar)
function handleLessonChange(num) {
    state.lesson = num;
    state.cardIndex = 0;
    document.querySelectorAll('.lesson-btn').forEach(b => {
        const active = b.dataset.lesson === num;
        b.className = active ? "lesson-btn px-4 py-1.5 rounded-full font-semibold bg-indigo-600 text-white shadow-md" : "lesson-btn px-4 py-1.5 rounded-full font-medium text-slate-500 hover:bg-indigo-50";
    });
    // Note: If you want to translate "Bài" to "Lesson" in index.html as well, change the string below.
    document.getElementById('label-lesson-kanji').textContent = `Lesson ${num}`;
    document.getElementById('label-lesson-qa').textContent = `Lesson ${num}`;
    renderCurrentView();
}

// Handle mode change (Kanji/Q&A)
function handleModeChange(mode) {
    state.mode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => {
        const active = b.dataset.mode === mode;
        b.className = active ? "mode-btn py-3 border-b-2 border-indigo-600 text-indigo-600 flex items-center gap-2" : "mode-btn py-3 border-b-2 border-transparent text-slate-500 hover:text-indigo-600 flex items-center gap-2";
    });
    document.getElementById('kanji-section').classList.toggle('hidden', mode !== 'kanji');
    document.getElementById('qa-section').classList.toggle('hidden', mode !== 'qa');
    renderCurrentView();
}

// Toggle UI element visibility
function toggleVisibility(id) {
    document.getElementById(id).classList.toggle('hidden');
}

// Display error message box
function displayErrorMessage(msg) {
    const err = document.getElementById('error-display');
    err.classList.remove('hidden');
    err.textContent = msg;
}

// Listen for keyboard events
document.addEventListener('keydown', (e) => {
    if (state.mode !== 'kanji') return;
    if (e.key === 'ArrowRight') navigateCard(1);
    if (e.key === 'ArrowLeft') navigateCard(-1);
    if (e.key === ' ') { e.preventDefault(); toggleCardFlip(); }
    if (e.key.toLowerCase() === 's') speakJapanese();
});

// Run app
window.onload = startApp;