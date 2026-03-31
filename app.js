/**
 * Global App State
 */
let appData = {};
const state = {
    lesson: '4',
    mode: 'kanji',
    cardIndex: 0,
    flashcards: []
};

const CATEGORY_TIME_KEYWORDS = ['Số', 'Thời gian', 'Thời lượng', 'Đếm', 'tháng', 'năm', 'tuần', 'ngày', 'giờ', 'phút'];

/**
 * Entry point: Fetch local data and initialize UI
 */
async function startApp() {
    try {
        const response = await fetch('data.txt');
        if (!response.ok) throw new Error("Data file not found");
        appData = await response.json();
        renderCurrentView();
    } catch (err) {
        displayErrorMessage("Error: Could not load data.txt. Ensure JSON format is valid.");
    }
}

/**
 * Main render controller
 */
function renderCurrentView() {
    const lessonData = appData[state.lesson];
    if (!lessonData) return;

    if (state.mode === 'kanji') {
        state.flashcards = [...lessonData.kanji];
        updateFlashcardContent();
    } else {
        renderQAList(lessonData.qa, lessonData.vocab);
    }
}

// --- FLASHCARD ENGINE ---

function updateFlashcardContent() {
    const card = state.flashcards[state.cardIndex];
    if (!card) return;

    document.getElementById('display-kanji').textContent = card.kanji;
    document.getElementById('display-hiragana').textContent = card.hiragana;
    document.getElementById('display-hanviet').textContent = card.hanviet;
    document.getElementById('display-meaning').textContent = card.meaning;
    document.getElementById('card-counter').textContent = `${state.cardIndex + 1} / ${state.flashcards.length}`;
    document.getElementById('kanji-card').classList.remove('flipped');
}

function navigateCard(direction) {
    state.cardIndex = (state.cardIndex + direction + state.flashcards.length) % state.flashcards.length;
    updateFlashcardContent();
}

function toggleCardFlip() {
    document.getElementById('kanji-card').classList.toggle('flipped');
}

function shuffleFlashcards() {
    state.flashcards.sort(() => Math.random() - 0.5);
    state.cardIndex = 0;
    updateFlashcardContent();
}

/**
 * Voice synthesis for Japanese text
 * @param {Event} event - Mouse click event
 * @param {string} customText - Optional: Specific text to read (used for vocab table)
 */
function speakJapanese(event, customText = null) {
    if(event) event.stopPropagation();
    
    // Determine what to read: Custom text (from table) OR Current Kanji Card
    let textToSpeak = customText;
    if (!textToSpeak) {
        const card = state.flashcards[state.cardIndex];
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

// --- Q&A ENGINE ---

/**
 * Build and inject the Q&A list into the DOM
 */

function renderQAList(questions, lessonVocab) {
    const container = document.getElementById('qa-container');
    container.innerHTML = '';

    questions.forEach((item, index) => {
        const vocabSection = createVocabSection(item.vocabTags, lessonVocab, index);
        
        // --- TÍNH NĂNG MỚI: BẢNG CHIA ĐỘNG TỪ ---
        let conjugationSection = '';
        if (item.conjugation) {
            const rulesHtml = item.conjugation.rules.map(rule => `<li class="flex items-start gap-2"><i class="fa-solid fa-arrow-right text-rose-400 mt-1 text-xs"></i><span>${rule}</span></li>`).join('');
            conjugationSection = `
                <div class="mt-4 border border-rose-100 bg-rose-50/30 rounded-xl p-4">
                    <button onclick="toggleVisibility('conj-${index}')" class="text-sm font-bold text-rose-600 flex items-center gap-2 hover:text-rose-700 transition w-full text-left">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Bíp kíp: ${item.conjugation.title}
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
                <div class="flex flex-col sm:flex-row"><div class="sm:w-1/4 text-slate-500 font-semibold">Câu hỏi:</div><div class="sm:w-3/4 font-bold text-indigo-900">${item.question}</div></div>
                <div class="flex flex-col sm:flex-row"><div class="sm:w-1/4 text-slate-500 font-semibold">Nhận biết:</div><div class="sm:w-3/4 text-orange-600 italic">${item.sign}</div></div>
                <div class="flex flex-col sm:flex-row"><div class="sm:w-1/4 text-slate-500 font-semibold">Trả lời:</div><div class="sm:w-3/4 text-emerald-700 font-medium">${item.answer}</div></div>
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 italic text-slate-600">${item.example}</div>
            </div>
            ${conjugationSection}
            ${vocabSection}
        `;
        container.appendChild(card);
    });
}

/**
 * Dynamic tab switcher for Vocabulary
 */
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

/**
 * Logics to group vocabulary and return formatted HTML
 */
function createVocabSection(tags, library, qId) {
    if (!tags) return '';
    const matched = library.filter(v => tags.includes(v.category));
    if (matched.length === 0) return '';

    const timeBased = matched.filter(v => CATEGORY_TIME_KEYWORDS.some(k => v.category.includes(k)));
    const general = matched.filter(v => !timeBased.includes(v));

    let html = '';
    if (general.length > 0 && timeBased.length > 0) {
        html = `
            <div class="flex gap-4 border-b border-slate-200 mb-4 overflow-x-auto scrollbar-hide">
                <button class="px-4 py-2 border-b-2 border-indigo-600 text-indigo-600 font-semibold transition whitespace-nowrap" onclick="switchTab(this, 'v-gen-${qId}', 'v-time-${qId}')">Từ vựng chung</button>
                <button class="px-4 py-2 border-b-2 border-transparent text-slate-500 font-medium transition whitespace-nowrap" onclick="switchTab(this, 'v-time-${qId}', 'v-gen-${qId}')">Số đếm & Thời gian</button>
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
                <i class="fa-solid fa-book"></i> Xem từ vựng liên quan
            </button>
            <div id="vbox-${qId}" class="hidden mt-4">${html}</div>
        </div>
    `;
}

/**
 * Creates HTML Table for Vocabulary with Audio Button
 */
function createVocabTable(data) {
    return `
        <div class="overflow-x-auto border rounded-xl">
            <table class="w-full text-left text-xs sm:text-sm">
                <thead class="bg-indigo-50 text-indigo-800">
                    <tr><th class="p-2 w-1/4">Loại</th><th class="p-2 w-2/4">Từ vựng</th><th class="p-2 w-1/4">Nghĩa</th></tr>
                </thead>
                <tbody>
                    ${data.map(v => {
                        const wordToSpeak = v.word.split('/')[0].trim();
                        return `<tr class="border-t">
                            <td class="p-2 text-slate-400">${v.category}</td>
                            <td class="p-2 font-bold text-indigo-700">
                                <div class="flex items-center gap-2">
                                    <span>${v.word}</span>
                                    <button onclick="speakJapanese(event, '${wordToSpeak}')" class="text-slate-400 hover:text-indigo-600 transition p-1" title="Nghe phát âm">
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

// --- NAVIGATION HANDLERS ---

function handleLessonChange(num) {
    state.lesson = num;
    state.cardIndex = 0;
    document.querySelectorAll('.lesson-btn').forEach(b => {
        const active = b.dataset.lesson === num;
        b.className = active ? "lesson-btn px-4 py-1.5 rounded-full font-semibold bg-indigo-600 text-white shadow-md" : "lesson-btn px-4 py-1.5 rounded-full font-medium text-slate-500 hover:bg-indigo-50";
    });
    document.getElementById('label-lesson-kanji').textContent = `Bài ${num}`;
    document.getElementById('label-lesson-qa').textContent = `Bài ${num}`;
    renderCurrentView();
}

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

function toggleVisibility(id) {
    document.getElementById(id).classList.toggle('hidden');
}

function displayErrorMessage(msg) {
    const err = document.getElementById('error-display');
    err.classList.remove('hidden');
    err.textContent = msg;
}

// Global Keyboard Listeners
document.addEventListener('keydown', (e) => {
    if (state.mode !== 'kanji') return;
    if (e.key === 'ArrowRight') navigateCard(1);
    if (e.key === 'ArrowLeft') navigateCard(-1);
    if (e.key === ' ') { e.preventDefault(); toggleCardFlip(); }
    if (e.key.toLowerCase() === 's') speakJapanese();
});

window.onload = startApp;