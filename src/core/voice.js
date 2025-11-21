export class VoiceManager {
    constructor(onCommand) {
        this.recognition = null;
        this.isListening = false;
        this.onCommand = onCommand; // Callback function
        
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new window.webkitSpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            
            this.recognition.onresult = (event) => {
                const last = event.results.length - 1;
                const command = event.results[last][0].transcript.trim();
                if(this.onCommand) this.onCommand(command);
            };

            this.recognition.onend = () => {
                if (this.isListening) this.recognition.start(); // Auto-restart
            };
        }
    }

    start() {
        if (this.recognition && !this.isListening) {
            this.recognition.start();
            this.isListening = true;
            return true;
        }
        return false;
    }

    stop() {
        if (this.recognition && this.isListening) {
            this.isListening = false;
            this.recognition.stop();
        }
    }
    
    isSupported() {
        return !!this.recognition;
    }
}