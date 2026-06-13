// Global state
let sessionId = null;
let currentScreen = 1;
let selectedLanguage = null;
let recognition = null;
let isListening = false;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupSpeechRecognition();
    setupEventListeners();
});

// Initialize app
async function initializeApp() {
    try {
        const response = await fetch('/api/start-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        sessionId = data.session_id;
        console.log('Session started:', sessionId);
    } catch (error) {
        console.error('Failed to start session:', error);
    }
}

// Setup speech recognition
function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        console.warn('Speech Recognition not supported');
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'hi-IN'; // Default to Hindi

    recognition.onstart = function() {
        isListening = true;
        updateMicButtonUI();
    };

    recognition.onend = function() {
        isListening = false;
        updateMicButtonUI();
    };

    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        alert('Error: ' + event.error);
        isListening = false;
        updateMicButtonUI();
    };
}

// Update microphone button UI based on listening state
function updateMicButtonUI() {
    const allMicBtns = document.querySelectorAll('.mic-button');
    allMicBtns.forEach(btn => {
        if (isListening) {
            btn.classList.add('listening');
        } else {
            btn.classList.remove('listening');
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Language selection
    document.querySelectorAll('.language-btn').forEach(btn => {
        btn.addEventListener('click', handleLanguageSelection);
    });

    // Doctor input microphone
    const doctorMicBtn = document.getElementById('mic-btn');
    if (doctorMicBtn) {
        doctorMicBtn.addEventListener('click', startDoctorMicrophone);
    }

    // Proceed button for screen 2 - use both direct assignment and event listener
    const proceedBtn2 = document.getElementById('proceed-btn-2');
    if (proceedBtn2) {
        proceedBtn2.addEventListener('click', function(e) {
            e.preventDefault();
            proceedToPatientExplanation();
        });
        // Also set onclick as fallback
        proceedBtn2.onclick = function(e) {
            e.preventDefault();
            proceedToPatientExplanation();
        };
    }

    // Understood button for screen 3
    const understoodBtn = document.getElementById('understood-btn');
    if (understoodBtn) {
        understoodBtn.addEventListener('click', proceedToQuestions);
    }

    // Patient microphone
    const patientMicBtn = document.getElementById('patient-mic-btn');
    if (patientMicBtn) {
        patientMicBtn.addEventListener('click', startPatientMicrophone);
    }

    // Ask button
    const askBtn = document.getElementById('ask-btn');
    if (askBtn) {
        askBtn.addEventListener('click', submitPatientQuestion);
    }

    // Play audio button
    const playAudioBtn = document.getElementById('play-audio-btn');
    if (playAudioBtn) {
        playAudioBtn.addEventListener('click', playExplanationAudio);
    }

    // Setup diagnosis change listener for tooth diagram updates
    setupDiagnosisListener();
}

// Handle language selection
async function handleLanguageSelection(e) {
    selectedLanguage = e.target.dataset.lang;
    
    // Update UI
    document.querySelectorAll('.language-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    e.target.classList.add('active');

    // Save to backend
    try {
        await fetch('/api/select-language', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_id: sessionId,
                language: selectedLanguage
            })
        });

        // Move to next screen after a short delay
        setTimeout(() => goToScreen(2), 500);
    } catch (error) {
        console.error('Failed to select language:', error);
        alert('Error selecting language');
    }
}

// Start doctor microphone
function startDoctorMicrophone() {
    if (!recognition) {
        alert('Speech recognition not supported in your browser');
        return;
    }

    if (isListening) {
        recognition.abort();
        isListening = false;
        updateMicButtonUI();
        return;
    }

    // Set language to English for doctor input
    recognition.lang = 'en-US';
    
    recognition.onresult = function(event) {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        
        // Parse the transcript and fill form
        parseAndFillDoctorForm(transcript);
    };

    recognition.start();
}

// Parse doctor input and fill form
async function parseAndFillDoctorForm(transcript) {
    // Try to parse the transcript using AI
    if (!transcript.trim()) return;
    
    try {
        const response = await fetch('/api/parse-doctor-input', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                transcript: transcript
            })
        });

        if (response.ok) {
            const data = await response.json();
            
            // Fill form fields with parsed data
            if (data.chief_complaint) {
                const field = document.getElementById('chief-complaint');
                field.value = (field.value ? field.value + ' ' : '') + data.chief_complaint;
            }
            if (data.diagnosis) {
                const field = document.getElementById('diagnosis');
                field.value = (field.value ? field.value + ' ' : '') + data.diagnosis;
            }
            if (data.treatment) {
                const field = document.getElementById('treatment');
                field.value = (field.value ? field.value + ' ' : '') + data.treatment;
            }
            if (data.cost) {
                document.getElementById('cost').value = data.cost;
            }
            if (data.appointments) {
                document.getElementById('appointments').value = data.appointments;
            }
            if (data.medications) {
                const field = document.getElementById('medications');
                field.value = (field.value ? field.value + ' ' : '') + data.medications;
            }
            if (data.follow_up) {
                const field = document.getElementById('follow-up');
                field.value = (field.value ? field.value + ' ' : '') + data.follow_up;
            }
        } else {
            // Fallback: just add to chief complaint if parsing fails
            const field = document.getElementById('chief-complaint');
            field.value = (field.value ? field.value + ' ' : '') + transcript;
        }
    } catch (error) {
        console.error('Error parsing doctor input:', error);
        // Fallback: just add to chief complaint if API call fails
        const field = document.getElementById('chief-complaint');
        field.value = (field.value ? field.value + ' ' : '') + transcript;
    }
}

// Proceed to patient explanation
async function proceedToPatientExplanation() {
    // Validate form - at least chief complaint and diagnosis are required
    const chiefComplaint = document.getElementById('chief-complaint').value.trim();
    const diagnosis = document.getElementById('diagnosis').value.trim();
    const treatment = document.getElementById('treatment').value.trim();
    const cost = document.getElementById('cost').value.trim();
    const appointments = document.getElementById('appointments').value;
    
    // Get medications based on toggle
    let medications = '';
    const medicationSelect = document.getElementById('medications-needed');
    if (medicationSelect && medicationSelect.value === 'needed') {
        medications = document.getElementById('medications').value.trim();
    } else {
        medications = 'Not Needed';
    }

    if (!chiefComplaint) {
        alert('Please enter chief complaint');
        return;
    }
    if (!diagnosis) {
        alert('Please enter diagnosis');
        return;
    }
    if (!treatment) {
        alert('Please enter treatment plan');
        return;
    }
    if (!cost) {
        alert('Please enter treatment cost');
        return;
    }
    if (!appointments) {
        alert('Please enter number of appointments');
        return;
    }

    // Show loading state
    const proceedBtn = document.getElementById('proceed-btn-2');
    const originalText = proceedBtn.textContent;
    proceedBtn.disabled = true;
    proceedBtn.textContent = 'Processing...';

    // Save doctor input
    try {
        const response = await fetch('/api/doctor-input', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_id: sessionId,
                chief_complaint: chiefComplaint,
                diagnosis: diagnosis,
                treatment: treatment,
                cost: cost,
                appointments: appointments,
                medications: medications,
                follow_up: document.getElementById('follow-up').value
            })
        });

        if (!response.ok) {
            throw new Error('Failed to save doctor input');
        }

        // Generate and display explanation
        await generateAndDisplayExplanation();
        
        // Move to screen 3
        goToScreen(3);
    } catch (error) {
        console.error('Error in proceedToPatientExplanation:', error);
        alert('Error: ' + error.message);
    } finally {
        proceedBtn.disabled = false;
        proceedBtn.textContent = originalText;
    }
}

// Generate and display patient explanation
async function generateAndDisplayExplanation() {
    const explanationBox = document.getElementById('explanation-box');
    explanationBox.innerHTML = '<div class="loading">Generating explanation in ' + selectedLanguage.toUpperCase() + '...</div>';

    try {
        const response = await fetch('/api/generate-explanation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_id: sessionId
            })
        });

        const data = await response.json();

        if (data.success) {
            explanationBox.innerHTML = `<div>${escapeHtml(data.explanation)}</div>`;
            
            // Update tooth diagram based on diagnosis
            const diagText = document.getElementById('diagnosis').value.toLowerCase();
const treatText = document.getElementById('treatment').value.toLowerCase();
updateToothDiagramFromText(diagText + ' ' + treatText);;
            
            // Set greeting
            const greetingDiv = document.getElementById('greeting');
            const greetings = {
                'hindi': 'नमस्ते! आपके इलाज को समझने के लिए यहाँ है विस्तृत जानकारी:',
                'marathi': 'नमस्कार! आपल्या उपचारास समजून घेण्यासाठी येथे विस्तृत माहिती आहे:',
                'punjabi': 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਆਪਣੇ ਇਲਾਜ ਨੂੰ ਸਮਝਣ ਲਈ ਇੱਥੇ ਵਿਸਤ੍ਰਿਤ ਜਾਣਕਾਰੀ ਹੈ:',
                'telugu': 'నమస్కారం! మీ చికిత్సను అర్థం చేసుకోవడానికి ఇక్కడ వివరణ ఉంది:',
                'tamil': 'வணக்கம்! உங்கள் சிகிச்சையை புரிந்துகொள்ள இங்கு விவரம் உள்ளது:',
                'bengali': 'নমস্কার! আপনার চিকিৎসা বুঝতে এখানে বিস্তারিত তথ্য রয়েছে:'
            };
            greetingDiv.textContent = greetings[selectedLanguage] || 'Here is your treatment explanation:';
        } else {
            explanationBox.innerHTML = `<div class="error">Error: ${data.error}</div>`;
        }
    } catch (error) {
        console.error('Error generating explanation:', error);
        explanationBox.innerHTML = '<div class="error">Failed to generate explanation. Please try again.</div>';
    }
}

// Proceed to questions screen
function proceedToQuestions() {
    goToScreen(4);
}

// Start patient microphone
function startPatientMicrophone() {
    if (!recognition) {
        alert('Speech recognition not supported in your browser');
        return;
    }

    if (isListening) {
        recognition.abort();
        isListening = false;
        updateMicButtonUI();
        return;
    }

    // Set language based on patient's language
    const langMap = {
        'hindi': 'hi-IN',
        'marathi': 'mr-IN',
        'punjabi': 'pa-IN',
        'telugu': 'te-IN',
        'tamil': 'ta-IN',
        'bengali': 'bn-IN'
    };
    
    recognition.lang = langMap[selectedLanguage] || 'hi-IN';
    
    recognition.onresult = function(event) {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        
        // Fill the question field
        document.getElementById('patient-question').value = transcript;
    };

    recognition.start();
}

// Submit patient question
async function submitPatientQuestion() {
    const question = document.getElementById('patient-question').value.trim();

    if (!question) {
        alert('Please enter or speak a question');
        return;
    }

    const askBtn = document.getElementById('ask-btn');
    askBtn.disabled = true;
    askBtn.textContent = 'Processing...';

    try {
        const response = await fetch('/api/patient-question', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_id: sessionId,
                question: question
            })
        });

        const data = await response.json();

        if (data.success) {
            // Add Q&A to history
            addQAToHistory(question, data.answer);
            
            // Clear input
            document.getElementById('patient-question').value = '';
            
            // Update counter
            const remainingCount = data.questions_remaining;
            document.getElementById('questions-remaining').textContent = remainingCount;

            // Check if all questions asked
            if (remainingCount === 0) {
                document.getElementById('question-input-area').style.display = 'none';
                document.getElementById('qa-complete-msg').classList.remove('hidden');
                
                // Auto-generate closing message
                await generateClosingMessage();
            }
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        console.error('Error submitting question:', error);
        alert('Error submitting question');
    } finally {
        askBtn.disabled = false;
        askBtn.textContent = 'Ask Question';
    }
}

// Add Q&A to history
function addQAToHistory(question, answer) {
    const qaHistory = document.getElementById('qa-history');
    
    const qaDiv = document.createElement('div');
    qaDiv.innerHTML = `
        <div class="qa-item question">
            <div class="qa-label">Your Question:</div>
            <div class="qa-text">${escapeHtml(question)}</div>
        </div>
        <div class="qa-item answer">
            <div class="qa-label">Doctor's Answer:</div>
            <div class="qa-text">${escapeHtml(answer)}</div>
        </div>
    `;
    
    qaHistory.appendChild(qaDiv);
    qaHistory.scrollTop = qaHistory.scrollHeight;
}

// Generate closing message
async function generateClosingMessage() {
    const closingDiv = document.getElementById('closing-message');
    closingDiv.innerHTML = '<div class="loading">Generating closing message...</div>';

    try {
        const response = await fetch('/api/closing-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_id: sessionId
            })
        });

        const data = await response.json();

        if (data.success) {
            closingDiv.innerHTML = `<div>${escapeHtml(data.message)}</div>`;
        } else {
            closingDiv.innerHTML = '<div>Thank you for your consultation!</div>';
        }
    } catch (error) {
        console.error('Error generating closing message:', error);
        closingDiv.innerHTML = '<div>Thank you for your consultation!</div>';
    }
}

// Play explanation audio using text-to-speech
function playExplanationAudio() {
    let explanation = document.getElementById('explanation-box').textContent;
    
    if (!explanation || explanation.includes('Loading')) {
        alert('Please wait for the explanation to load first');
        return;
    }
    
    // Clean the text: remove markdown, emojis, and special formatting
    explanation = cleanTextForSpeech(explanation);
    
    // Use browser's Web Speech API for text-to-speech
    if ('speechSynthesis' in window) {
        const audioBtn = document.getElementById('play-audio-btn');
        
        // If already playing, stop it
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            audioBtn.textContent = '🔊 Listen in Your Language';
            audioBtn.classList.remove('playing');
            return;
        }
        
        const utterance = new SpeechSynthesisUtterance(explanation);
        
        // Set language based on patient's language
        const langMap = {
            'hindi': 'hi-IN',
            'marathi': 'mr-IN',
            'punjabi': 'pa-IN',
            'telugu': 'te-IN',
            'tamil': 'ta-IN',
            'bengali': 'bn-IN',
            'english': 'en-US'
        };
        
        utterance.lang = langMap[selectedLanguage] || 'en-US';
        utterance.rate = 0.9; // Slightly slower for clarity
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Important: set these to false to prevent looping
        utterance.continuous = false;
        
        // Update button state
        utterance.onstart = function() {
            audioBtn.textContent = '⏸ Stop Audio';
            audioBtn.classList.add('playing');
        };
        
        utterance.onend = function() {
            audioBtn.textContent = '🔊 Listen in Your Language';
            audioBtn.classList.remove('playing');
        };
        
        utterance.onerror = function(event) {
            console.error('Speech synthesis error:', event.error);
            audioBtn.textContent = '🔊 Listen in Your Language';
            audioBtn.classList.remove('playing');
        };
        
        // Cancel any previous speech before starting new one
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    } else {
        alert('Text-to-speech is not supported in your browser');
    }
}

// Clean text for speech: remove markdown, emojis, and special characters
function cleanTextForSpeech(text) {
    // Remove markdown headers (### becomes space)
    text = text.replace(/#+\s*/g, ' ');
    
    // Remove markdown bold (**text** becomes text)
    text = text.replace(/\*\*(.+?)\*\*/g, '$1');
    
    // Remove markdown italics (*text* becomes text)
    text = text.replace(/\*(.+?)\*/g, '$1');
    
    // Remove markdown links [text](url) becomes text
    text = text.replace(/\[(.+?)\]\(.+?\)/g, '$1');
    
    // Remove emoji and special characters
    text = text.replace(/[\u{1F300}-\u{1F9FF}]/gu, '');  // Emojis
    text = text.replace(/[^\w\s\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F\u0A80-\u0AFF\u0A00-\u0A7F\u0980-\u09FF.,?!:;\-()]/g, ' '); // Keep Indian script characters
    
    // Clean up extra spaces
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
}

// Go to specific screen
function goToScreen(screenNumber) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    // Show target screen
    const targetScreen = document.getElementById('screen-' + screenNumber);
    if (targetScreen) {
        targetScreen.classList.add('active');
        currentScreen = screenNumber;
        
        // If moving to screen 5, generate closing message
        if (screenNumber === 5) {
            generateClosingMessage();
        }
    }
}

// Restart app
function restartApp() {
    location.reload();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Toggle medication field based on selection
function toggleMedicationField() {
    const medicationSelect = document.getElementById('medications-needed');
    const medicationField = document.getElementById('medications');
    
    if (medicationSelect.value === 'needed') {
        medicationField.style.display = 'block';
        medicationField.required = true;
    } else if (medicationSelect.value === 'not-needed') {
        medicationField.style.display = 'none';
        medicationField.value = 'Not Needed';
        medicationField.required = false;
    } else {
        medicationField.style.display = 'none';
        medicationField.value = '';
    }
}

// Update tooth diagram based on diagnosis - show before/after diagrams
function updateToothDiagram() {
    const diagnosis = document.getElementById('diagnosis').value.toLowerCase();
    const diagramLabel = document.getElementById('diagram-label');
    
    // Hide all diagrams first
    document.querySelectorAll('.tooth-diagram').forEach(diagram => {
        diagram.classList.remove('active');
    });
    
    // Show appropriate diagram based on diagnosis keywords
    let diagramToShow = null;
    
    if (diagnosis.includes('root canal') || diagnosis.includes('rct') || diagnosis.includes('pulpitis') || diagnosis.includes('irreversible') || diagnosis.includes('necrosis') || diagnosis.includes('periapical') || diagnosis.includes('pulp')) {
        diagramToShow = 'root-canal-diagram';
        diagramLabel.textContent = 'Root Canal Treatment: Infected pulp removed and sealed';
    } else if (diagnosis.includes('cavity') || diagnosis.includes('decay') || diagnosis.includes('caries') || diagnosis.includes('filling') || diagnosis.includes('composite') || diagnosis.includes('restoration') || diagnosis.includes('amalgam')) {
        diagramToShow = 'cavity-diagram';
        diagramLabel.textContent = 'Cavity Restoration: Decay removed and filled';
    } else if (diagnosis.includes('scaling') || diagnosis.includes('tartar') || diagnosis.includes('cleaning') || diagnosis.includes('calculus') || diagnosis.includes('gum') || diagnosis.includes('periodon')) {
        diagramToShow = 'scaling-diagram';
        diagramLabel.textContent = 'Scaling: Tartar and calculus removed for healthy gums';
    } else if (diagnosis.includes('extract') || diagnosis.includes('removal') || diagnosis.includes('remove')) {
        diagramToShow = 'extraction-diagram';
        diagramLabel.textContent = 'Extraction: Damaged tooth safely removed';
    } else if (diagnosis.includes('crown') || diagnosis.includes('cap') || diagnosis.includes('pfm') || diagnosis.includes('ceramic')) {
        diagramToShow = 'crown-diagram';
        diagramLabel.textContent = 'Crown: Damaged tooth covered with crown';
    } else if (diagnosis.includes('brace') || diagnosis.includes('orthodo') || diagnosis.includes('align') || diagnosis.includes('malocclusion')) {
        diagramToShow = 'braces-diagram';
        diagramLabel.textContent = 'Orthodontic Treatment: Teeth aligned with braces';
    } else if (diagnosis.includes('abscess') || diagnosis.includes('swelling') || diagnosis.includes('infection')) {
        diagramToShow = 'root-canal-diagram';
        diagramLabel.textContent = 'Infection Treatment: Infected area cleaned and sealed';
    }
    
    // Show selected diagram
    if (diagramToShow) {
        const diagram = document.getElementById(diagramToShow);
        if (diagram) {
            diagram.classList.add('active');
        }
    }
}

// Setup diagnosis change listener for diagram updates
function setupDiagnosisListener() {
    const diagnosisField = document.getElementById('diagnosis');
    if (diagnosisField) {
        diagnosisField.addEventListener('input', updateToothDiagram);
    }
}

// Set screen 1 as active on load
window.addEventListener('load', function() {
    goToScreen(1);
});function updateToothDiagramFromText(diagnosis) {
    document.querySelectorAll('.tooth-diagram').forEach(d => {
        d.style.display = 'none';
        d.classList.remove('active');
    });

    let id = null;
    if (diagnosis.includes('root canal') || diagnosis.includes('rct') || diagnosis.includes('pulpitis') || diagnosis.includes('irreversible') || diagnosis.includes('necrosis') || diagnosis.includes('periapical') || diagnosis.includes('pulp') || diagnosis.includes('abscess')) {
        id = 'root-canal-diagram';
    } else if (diagnosis.includes('cavity') || diagnosis.includes('decay') || diagnosis.includes('caries') || diagnosis.includes('filling') || diagnosis.includes('composite') || diagnosis.includes('restoration') || diagnosis.includes('amalgam')) {
        id = 'cavity-diagram';
    } else if (diagnosis.includes('scaling') || diagnosis.includes('tartar') || diagnosis.includes('cleaning') || diagnosis.includes('calculus') || diagnosis.includes('gum') || diagnosis.includes('periodon')) {
        id = 'scaling-diagram';
    } else if (diagnosis.includes('extract') || diagnosis.includes('removal') || diagnosis.includes('remove')) {
        id = 'extraction-diagram';
    } else if (diagnosis.includes('crown') || diagnosis.includes('cap') || diagnosis.includes('pfm') || diagnosis.includes('ceramic')) {
        id = 'crown-diagram';
    } else if (diagnosis.includes('brace') || diagnosis.includes('orthodo') || diagnosis.includes('align') || diagnosis.includes('malocclusion')) {
        id = 'braces-diagram';
    }

    if (id) {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'block';
            el.classList.add('active');
        }
    }
}
