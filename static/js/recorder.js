/**
 * Audio recorder functionality with continuous listening capabilities
 */
class AudioRecorder {
    constructor() {
        this.audioContext = null;
        this.stream = null;
        this.recorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.recognition = null;
        this.isContinuousListening = false;
        this.processingAudio = false;
    }

    /**
     * Initialize the audio recorder
     */
    async init() {
        try {
            // Request microphone access
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create a MediaRecorder instance
            this.recorder = new MediaRecorder(this.stream);
            
            // Set up event handlers
            this.recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.audioChunks.push(e.data);
                }
            };
            
            // Initialize speech recognition
            if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
                this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
                this.recognition.continuous = true;
                this.recognition.interimResults = false;
                this.recognition.lang = 'en-US'; // Default to English
                
                this.recognition.onresult = async (event) => {
                    if (this.processingAudio) return;
                    
                    let transcript = '';
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        if (event.results[i].isFinal) {
                            transcript += event.results[i][0].transcript.trim() + ' ';
                        }
                    }
                    
                    if (transcript.trim().length > 0) {
                        this.processingAudio = true;
                        
                        // Stop recording to get the audio for processing
                        const audioBlob = await this.stopRecording();
                        
                        // Trigger the audio processing callback
                        if (this.onSpeechDetected) {
                            await this.onSpeechDetected(audioBlob, transcript);
                        }
                        
                        // If continuous listening is enabled, restart recording
                        if (this.isContinuousListening) {
                            this.startRecording();
                            this.startRecognition();
                        }
                        
                        this.processingAudio = false;
                    }
                };
                
                this.recognition.onend = () => {
                    // Restart recognition if continuous listening is enabled and not processing
                    if (this.isContinuousListening && !this.processingAudio) {
                        this.recognition.start();
                    }
                };
                
                this.recognition.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    
                    // Restart recognition on error if continuous listening is enabled
                    if (this.isContinuousListening && !this.processingAudio) {
                        setTimeout(() => {
                            try {
                                this.recognition.start();
                            } catch (e) {
                                console.error('Failed to restart recognition after error:', e);
                            }
                        }, 1000);
                    }
                };
            } else {
                console.warn('Speech Recognition API not supported in this browser');
            }
            
            console.log('Audio recorder initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing audio recorder:', error);
            return false;
        }
    }

    /**
     * Set speech detected callback
     * @param {Function} callback - Function to call when speech is detected
     */
    setSpeechDetectedCallback(callback) {
        this.onSpeechDetected = callback;
    }

    /**
     * Start recording audio
     */
    startRecording() {
        if (this.recorder && this.recorder.state !== 'recording') {
            this.audioChunks = [];
            this.recorder.start();
            this.isRecording = true;
            console.log('Recording started');
        }
    }

    /**
     * Start speech recognition
     */
    startRecognition() {
        if (this.recognition) {
            try {
                this.recognition.start();
                console.log('Speech recognition started');
            } catch (e) {
                console.error('Error starting speech recognition:', e);
            }
        }
    }

    /**
     * Stop recording audio
     * @returns {Promise<Blob>} Audio blob
     */
    stopRecording() {
        return new Promise((resolve, reject) => {
            if (this.recorder && this.recorder.state === 'recording') {
                this.recorder.onstop = () => {
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                    this.isRecording = false;
                    resolve(audioBlob);
                };
                this.recorder.stop();
                console.log('Recording stopped');
            } else {
                reject('Recorder is not recording');
            }
        });
    }

    /**
     * Stop speech recognition
     */
    stopRecognition() {
        if (this.recognition) {
            try {
                this.recognition.stop();
                console.log('Speech recognition stopped');
            } catch (e) {
                console.error('Error stopping speech recognition:', e);
            }
        }
    }

    /**
     * Start continuous listening mode
     * @param {string} lang - Language code for speech recognition
     */
    startContinuousListening(lang = 'en-US') {
        if (!this.isContinuousListening) {
            this.isContinuousListening = true;
            
            if (this.recognition) {
                this.recognition.lang = lang;
            }
            
            this.startRecording();
            this.startRecognition();
            console.log('Continuous listening started');
        }
    }

    /**
     * Stop continuous listening mode
     */
    stopContinuousListening() {
        if (this.isContinuousListening) {
            this.isContinuousListening = false;
            this.stopRecording();
            this.stopRecognition();
            console.log('Continuous listening stopped');
        }
    }

    /**
     * Set language for speech recognition
     * @param {string} lang - Language code (e.g., 'en-US', 'es-ES')
     */
    setLanguage(lang) {
        if (this.recognition) {
            this.recognition.lang = lang;
            console.log(`Speech recognition language set to: ${lang}`);
        }
    }

    /**
     * Clean up resources
     */
    cleanup() {
        this.stopContinuousListening();
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
        this.recorder = null;
        this.stream = null;
        this.audioContext = null;
        this.recognition = null;
    }
}

// Export the AudioRecorder class
window.AudioRecorder = AudioRecorder;