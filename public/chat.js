// JavaScript for Salesforce Chat Panel

class EinsteinChatPanel {
    constructor() {
        this.accessToken = null;
        this.agentId = '0XxHs000000nOofKAE';
        this.domainUrl = 'ae1739511925513.my.salesforce.com';
        this.sessionId = null;
        this.sequenceId = 1;
        this.messages = [];
        this.userMessage = '';
        this.isLoading = false;

        // Voice-to-Text Variables
        this.recognition = null;
        this.finalTranscript = '';
        this.isRecording = false;
        this.errorMessage = '';

        // Speech Variables
        this.speechSynthesis = window.speechSynthesis;
        this.currentUtterance = null;
        this.isPlaying = false;
    }

    async fetchAccessToken() {
        console.log("Fetching Access Token...");
        const clientId = '3MVG9HB6vm3GZZR8rU6FN2o4pMQikeZkDrJVzRE.kMarNkMatHe7XbmOxAD_IigHjCTxyF5QZa3LYNRpt4Hb7';
        const clientSecret = '4CD2B194FDC34647ED7EECBC0799241BF7F93AABA52396FCDF82772FA5B7A204';
        const tokenUrl = `https://${this.domainUrl}/services/oauth2/token`;

        try {
            const response = await fetch(tokenUrl, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    grant_type: "client_credentials",
                    client_id: clientId,
                    client_secret: clientSecret
                }).toString()
            });

            if (!response.ok) {
                throw new Error(`HTTP Error! Status: ${response.status} - ${await response.text()}`);
            }

            const data = await response.json();
            console.log("Access Token Retrieved:", data);
            if (data.access_token) {
                this.accessToken = `Bearer ${data.access_token}`;
                this.createSession();
            } else {
                throw new Error("Invalid response format: Missing access_token");
            }
        } catch (error) {
            console.error("Error Fetching Token:", error.message);
        }
    }

    async createSession() {
        if (!this.accessToken) {
            console.error("Access Token is missing!");
            return;
        }
        console.log("Creating session...");
        const sessionUrl = `https://api.salesforce.com/einstein/ai-agent/v1/agents/${this.agentId}/sessions`;
        const randomUUID = crypto.randomUUID();
        const payload = {
            externalSessionKey: randomUUID,
            instanceConfig: { endpoint: `https://${this.domainUrl}` },
            streamingCapabilities: { chunkTypes: ["Text"] },
            bypassUser: true
        };

        try {
            const response = await fetch(sessionUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": this.accessToken
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP Error! Status: ${response.status} - ${await response.text()}`);
            }

            const data = await response.json();
            this.sessionId = data.sessionId;
            console.log("Session Created:", data);
        } catch (error) {
            console.error("Error Creating Session:", error.message);
        }
    }

    async sendMessage() {
        if (!this.sessionId) {
            console.error("No active session found!");
            return;
        }
        if (!this.userMessage.trim()) {
            console.error("Cannot send an empty message!");
            return;
        }

        this.isLoading = true;
        const messageUrl = `https://api.salesforce.com/einstein/ai-agent/v1/sessions/${this.sessionId}/messages`;
        const payload = {
            message: {
                sequenceId: this.sequenceId.toString(),
                type: "Text",
                text: this.userMessage
            }
        };

        try {
            const response = await fetch(messageUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": this.accessToken
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status} - ${await response.text()}`);
            }

            const data = await response.json();
            const botResponse = data.messages[0]?.message || 'No response received';

            const newMessage = {
                sender: 'Einstein AI',
                text: botResponse,
                timestamp: new Date().toLocaleTimeString(),
                cssClass: 'bot-message'
            };

            this.messages.push(newMessage);
            this.speakResponse(botResponse);
            console.log("Response from Einstein:", botResponse);
            this.sequenceId++;
            this.userMessage = '';
            this.updateUI();
        } catch (error) {
            console.error("Error Sending Message:", error.message);
        } finally {
            this.isLoading = false;
        }
    }

    updateUI() {
        const messageContainer = document.getElementById('messageContainer');
        messageContainer.innerHTML = ''; // Clear existing messages

        this.messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add(msg.cssClass);
            messageDiv.innerHTML = `<strong>${msg.sender}</strong>: ${msg.text} <span>(${msg.timestamp})</span>`;
            messageContainer.appendChild(messageDiv);
        });
    }

    speakResponse(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        this.speechSynthesis.speak(utterance);
    }
}

// Initialize the chat panel
const chatPanel = new EinsteinChatPanel();

document.getElementById('createSessionBtn').addEventListener('click', () => chatPanel.fetchAccessToken());
document.getElementById('sendMessageBtn').addEventListener('click', () => {
    chatPanel.userMessage = document.getElementById('userMessageInput').value;
    chatPanel.sendMessage();
});
