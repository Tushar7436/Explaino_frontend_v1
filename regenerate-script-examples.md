# Example API Requests for Regenerate Script Endpoint

## Using cURL

### Regenerate Script
```bash
curl -X POST http://localhost:8080/api/regenerate-script \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "your-session-id-here"
  }'
```

### Expected Response
```json
{
  "success": true,
  "data": {
    "sessionId": "your-session-id-here",
    "narrations": [
      {
        "windowIndex": 0,
        "start": 0.48,
        "end": 2.56,
        "text": "Meet Reversal: Your Dashboard",
        "musicStyle": "tech",
        "speed": 1.0
      },
      {
        "windowIndex": 1,
        "start": 2.80,
        "end": 5.20,
        "text": "Creating projects is simple and intuitive",
        "musicStyle": "tech",
        "speed": 1.0
      }
    ],
    "message": "Script regenerated successfully",
    "regeneratedAt": "2026-01-12T16:45:00Z"
  }
}
```

## Using JavaScript/Fetch

```javascript
async function regenerateScript(sessionId) {
  try {
    const response = await fetch('http://localhost:8080/api/regenerate-script', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId: sessionId
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Script regenerated successfully!');
      console.log('New narrations:', result.data.narrations);
      return result.data.narrations;
    } else {
      console.error('Failed to regenerate script:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Error calling regenerate-script endpoint:', error);
    return null;
  }
}

// Usage
const sessionId = 'abc123';
const newNarrations = await regenerateScript(sessionId);
```

## Using Axios

```javascript
import axios from 'axios';

async function regenerateScript(sessionId) {
  try {
    const response = await axios.post('http://localhost:8080/api/regenerate-script', {
      sessionId: sessionId
    });

    console.log('Script regenerated successfully!');
    console.log('New narrations:', response.data.data.narrations);
    return response.data.data.narrations;
  } catch (error) {
    if (error.response) {
      // Server responded with error
      console.error('Server error:', error.response.data);
      
      if (error.response.status === 429) {
        console.error('Gemini API quota exceeded. Please wait a few minutes.');
      }
    } else {
      console.error('Network error:', error.message);
    }
    return null;
  }
}

// Usage
const sessionId = 'abc123';
const newNarrations = await regenerateScript(sessionId);
```

## WebSocket Integration

To receive real-time progress updates while regenerating:

```javascript
// Connect to WebSocket
const ws = new WebSocket(`ws://localhost:8080/ws/${sessionId}`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'progress':
      console.log(`Progress: ${data.progress}% - ${data.message}`);
      break;
    case 'instructions':
      console.log('New narrations received via WebSocket:', data.narrations);
      break;
    case 'error':
      console.error('Error:', data.message);
      break;
  }
};

// Then call the regenerate endpoint
await regenerateScript(sessionId);
```

## Error Responses

### Session Not Found (404)
```json
{
  "success": false,
  "error": {
    "code": 404,
    "message": "Session not found"
  }
}
```

### No Transcription Data (400)
```json
{
  "success": false,
  "error": {
    "code": 400,
    "message": "No transcription data found for session"
  }
}
```

### Gemini API Quota Exceeded (429)
```json
{
  "success": false,
  "error": {
    "code": 429,
    "message": "Gemini API quota exceeded. Please wait a few minutes or check your billing."
  }
}
```

### LLM Failure (500)
```json
{
  "success": false,
  "error": {
    "code": 500,
    "message": "LLM script regeneration failed"
  }
}
```

## Complete Workflow Example

```javascript
// 1. Process initial session
const processResponse = await fetch('/api/process-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId: 'abc123' })
});

const initialData = await processResponse.json();
console.log('Initial narrations:', initialData.data.narrations);

// 2. User decides they want different narrations
// Regenerate the script
const regenerateResponse = await fetch('/api/regenerate-script', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId: 'abc123' })
});

const regeneratedData = await regenerateResponse.json();
console.log('Regenerated narrations:', regeneratedData.data.narrations);

// 3. Generate audio from the new narrations
const speechResponse = await fetch('/api/generate-speech', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId: 'abc123' })
});

const speechData = await speechResponse.json();
console.log('Audio generated:', speechData.data.processedAudioUrl);
```

## Notes

- The endpoint requires an active session with Deepgram transcription
- Each regeneration may produce different narrations due to LLM variability
- The endpoint only regenerates text; use `/generate-speech` to create audio
- WebSocket connection is recommended for real-time progress updates
- The regenerated narrations are automatically saved to `instructions.json`
