/**
 * Main application logic for the English conversation practice app
 * with continuous listening functionality
 */

// DOM elements
const levelSelection = document.getElementById('levelSelection');
const chatContainer = document.getElementById('chatContainer');
const controls = document.getElementById('controls');
const recordBtn = document.getElementById('recordBtn');
const endBtn = document.getElementById('endBtn');
const status = document.getElementById('status');
const loading = document.getElementById('loading');
const reportContainer = document.getElementById('reportContainer');
const reportContent = document.getElementById('reportContent');
const restartBtn = document.getElementById('restartBtn');

// State
let audioRecorder = null;
let selectedLevel = null;
let isContinuousListening = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Level selection buttons
    const levelButtons = levelSelection.querySelectorAll('.level-btn');
    levelButtons.forEach(button => {
        button.addEventListener('click', () => {
            selectedLevel = button.dataset.level;
            startConversation(selectedLevel);
        });
    });

    // Record button
    recordBtn.addEventListener('click', toggleContinuousListening);

    // End conversation button
    endBtn.addEventListener('click', endConversation);

    // Restart button
    restartBtn.addEventListener('click', restartConversation);
}

/**
 * Start a new conversation
 * @param {string} level - Selected English level
 */
async function startConversation(level) {
    showLoading(true);
    
    try {
        // Initialize audio recorder
        audioRecorder = new AudioRecorder();
        const initialized = await audioRecorder.init();
        
        if (!initialized) {
            showError('Could not access microphone. Please check your permissions.');
            return;
        }
        
        // Set up the callback for speech detection
        audioRecorder.setSpeechDetectedCallback(async (audioBlob, transcript) => {
            await processAudio(audioBlob, transcript);
        });
        
        // Set up the UI for conversation
        levelSelection.style.display = 'none';
        chatContainer.style.display = 'block';
        controls.style.display = 'flex';
        reportContainer.style.display = 'none';
        
        // Clear previous chat
        chatContainer.innerHTML = '';
        
        // Send level to the backend
        const response = await fetch('/set_level', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ level })
        });
        
        if (!response.ok) {
            throw new Error('Failed to start conversation');
        }
        
        const data = await response.json();
        
        // Add bot message to chat
        addMessage(data.response, 'bot');
        
        // Play audio response
        if (data.audio) {
            playAudio(data.audio);
        }
        
        setStatus(`Conversation started at ${level} level. Click the microphone button to start speaking.`);
    } catch (error) {
        console.error('Error starting conversation:', error);
        showError('Failed to start conversation. Please try again.');
    } finally {
        showLoading(false);
    }
}

/**
 * Toggle continuous listening mode
 */
function toggleContinuousListening() {
    if (!audioRecorder) return;
    
    if (isContinuousListening) {
        // Stop continuous listening
        audioRecorder.stopContinuousListening();
        recordBtn.classList.remove('recording');
        recordBtn.textContent = 'Press to Speak';
        setStatus('Microphone off. Press the button to start speaking.');
        isContinuousListening = false;
    } else {
        // Show language selection modal if needed
        // For simplicity, we'll just start with English (en-US)
        startContinuousListening('en-US');
    }
}

/**
 * Start continuous listening with the selected language
 * @param {string} language - Language code for speech recognition
 */
function startContinuousListening(language) {
    if (!audioRecorder) return;
    
    audioRecorder.setLanguage(language);
    audioRecorder.startContinuousListening(language);
    
    recordBtn.classList.add('recording');
    recordBtn.textContent = 'Listening... Click to Stop';
    setStatus('Microphone on. Speak naturally and pause when you finish a thought.');
    isContinuousListening = true;
}

/**
 * Process recorded audio
 * @param {Blob} audioBlob - Recorded audio blob
 * @param {string} transcript - Speech recognition transcript (optional)
 */
async function processAudio(audioBlob, transcript = null) {
    showLoading(true);
    setStatus('Processing your speech...');
    
    try {
        // Create form data
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');
        
        // If we have a transcript from the speech recognition API, add it to the form
        if (transcript) {
            formData.append('transcript', transcript);
        }
        
        // Send to server
        const response = await fetch('/process_audio', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Failed to process audio');
        }
        
        const data = await response.json();
        
        // Add user message to chat
        addMessage(data.transcription, 'user');
        
        // Add bot response to chat
        addMessage(data.response, 'bot');
        
        // Play audio response
        if (data.audio) {
            playAudio(data.audio);
        }
        
        setStatus(isContinuousListening ? 
            'Microphone still listening. Continue speaking when ready.' : 
            'Your turn. Press the button to speak.');
    } catch (error) {
        console.error('Error processing audio:', error);
        showError('Failed to process your speech. Please try again.');
    } finally {
        showLoading(false);
    }
}

/**
 * End the conversation and show evaluation
 */
async function endConversation() {
    showLoading(true);
    setStatus('Generating your evaluation...');
    
    try {
        // Stop continuous listening if active
        if (isContinuousListening && audioRecorder) {
            audioRecorder.stopContinuousListening();
            isContinuousListening = false;
        }
        
        // Clean up recorder
        if (audioRecorder) {
            audioRecorder.cleanup();
            audioRecorder = null;
        }
        
        // Request evaluation from server
        const response = await fetch('/end_conversation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate evaluation');
        }
        
        const data = await response.json();
        
        // Hide conversation UI
        chatContainer.style.display = 'none';
        controls.style.display = 'none';
        status.style.display = 'none';
        
        // Generate and show report
        reportContent.innerHTML = Report.generateReportHTML(data.report);
        reportContainer.style.display = 'block';
        
    } catch (error) {
        console.error('Error ending conversation:', error);
        showError('Failed to generate evaluation. Please try again.');
    } finally {
        showLoading(false);
    }
}

/**
 * Restart conversation from the beginning
 */
function restartConversation() {
    // Reset UI
    reportContainer.style.display = 'none';
    levelSelection.style.display = 'flex';
    status.style.display = 'block';
    setStatus('Select your English level to begin.');
    
    // Reset state
    selectedLevel = null;
    isContinuousListening = false;
    
    // Clean up recorder if it exists
    if (audioRecorder) {
        audioRecorder.cleanup();
        audioRecorder = null;
    }
}

/**
 * Add a message to the chat container
 * @param {string} text - Message text
 * @param {string} sender - Message sender ('user' or 'bot')
 */
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.textContent = text;
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

/**
 * Play audio from base64 string
 * @param {string} base64Audio - Base64 encoded audio
 */
function playAudio(base64Audio) {
    try {
        const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
        audio.play();
    } catch (error) {
        console.error('Error playing audio:', error);
    }
}

/**
 * Show or hide loading indicator
 * @param {boolean} show - Whether to show loading
 */
function showLoading(show) {
    loading.style.display = show ? 'block' : 'none';
}

/**
 * Set status message
 * @param {string} message - Status message
 */
function setStatus(message) {
    status.textContent = message;
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
    setStatus(`Error: ${message}`);
}