const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = 3000;

let accessToken = null;
let sessionId = null;

const clientId = '3MVG9HB6vm3GZZR8rU6FN2o4pMQikeZkDrJVzRE.kMarNkMatHe7XbmOxAD_IigHjCTxyF5QZa3LYNRpt4Hb7';
const clientSecret = '4CD2B194FDC34647ED7EECBC0799241BF7F93AABA52396FCDF82772FA5B7A204';
const agentId = '0XxHs000000nOofKAE';
const domainUrl = 'ae1739511925513.my.salesforce.com';

app.use(express.json());
app.use(express.static('public')); // Serve the HTML file

// Fetch the access token
async function fetchAccessToken() {
    const tokenUrl = `https://${domainUrl}/services/oauth2/token`;

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
        }).toString(),
    });

    if (!response.ok) {
        throw new Error(`HTTP Error! Status: ${response.status}`);
    }

    const data = await response.json();
    accessToken = `Bearer ${data.access_token}`;
}

// Create a session for the agent
async function createSession() {
    const sessionUrl = `https://api.salesforce.com/einstein/ai-agent/v1/agents/${agentId}/sessions`;

    const payload = {
        externalSessionKey: 'random-session-key',
        instanceConfig: {
            endpoint: `https://${domainUrl}`,
        },
        streamingCapabilities: {
            chunkTypes: ['Text'],
        },
        bypassUser: true,
    };

    const response = await fetch(sessionUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: accessToken,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`Error creating session: ${response.status}`);
    }

    const data = await response.json();
    sessionId = data.sessionId;
}

// Handle sending a message to Einstein
async function sendMessage(userMessage) {
    const messageUrl = `https://api.salesforce.com/einstein/ai-agent/v1/sessions/${sessionId}/messages`;
    const payload = {
        message: {
            sequenceId: '1',
            type: 'Text',
            text: userMessage,
        },
    };

    const response = await fetch(messageUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: accessToken,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`Error sending message: ${response.status}`);
    }

    const data = await response.json();
    return data.messages[0]?.message || 'No response received';
}

// API routes
app.post('/send-message', async (req, res) => {
    if (!accessToken) {
        await fetchAccessToken();
    }
    if (!sessionId) {
        await createSession();
    }

    const userMessage = req.body.message;
    const botResponse = await sendMessage(userMessage);
    res.json({ botResponse });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
