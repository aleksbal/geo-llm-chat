import express from 'express';
import ollama from 'ollama';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';

const OLLAMA_BASE_URL = 'http://localhost:11434';

async function createServer() {
  const app = express();
  
  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });

  // Store conversations in memory (in production, use a proper database)
  const conversations = new Map();

  app.use(express.json());

  // Handle streaming chat requests
  app.post('/api/chat', async (req, res) => {
    const { msg, conversationId = Date.now().toString() } = req.body;
    
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      // Get or initialize conversation context
      let context = conversations.get(conversationId) || null;
      let lastContext = null;
      let fullResponse = '';

      // try to replace with ollama api
      // try to receive the response and figure out if geoservice should be used
      // figure out how to send json response to the client
      const message = { role: 'user', content: msg }
      const response = await ollama.chat({ model: 'llama3.2', messages: [message], stream: true })

      /*
      const responsex = await ollama.chat({
        model: 'llama3.2',
        prompt: message,
        context,
        system: `You are an assistant task with answering all sorts of questions.
        Please ensure that your responses are socially unbiased and positive in nature.
        If a question does not make any sense, or is not factually coherent, explain why instead of answering something not correct. 
        If you don't know the answer, please don't share false information.
        
        If any geographical entity was subject of question, or if any appears in the response, 
        generate GeoJSON entity for each with coordinates like in this example:
        
        For exmample, use GeoJSON Point type:

          For points (e.g., landmarks, cities, mountain peaks etc.): 
          {
            "type": "FeatureCollection",
            "features": [{
              "type": "Feature",
              "geometry": {
                "type": "Point",
                "coordinates": [longitude, latitude]
              },
              "properties": {
                "name": "name here",
                "description": "brief description here"
              }
            }]
          }

          Include all GeoJSON features in a single GeoJSON FeatureCollection per output. 
          Add the FeatureCollection at the end of the output. Don't add anything to the oputput after FeatureCollection

          Important:
          - Always format coordinates as [longitude, latitude]
          - For polygons, first and last coordinates must be identical to close the shape
          - Keep responses concise and always provide GeoJSON for locations mentined in the answer
          - Ensure all coordinates are valid numbers only within range (-180 to 180 for longitude, -90 to 90 for latitude)
          - Put all geojson data into single Geojson object of FeatureCollection type. Individual geojson features shall be placed inside of attribute called features.
          - Maintain conversation context and refer back to previously discussed locations when relevant`,
        stream: true,
      }, {
        responseType: 'stream'
      });

      process.stdout.write(part.message.content)

*/
      for await (const data of response) {
      //process.stdout.write(data.message.content)
        try {
          //const data = JSON.parse(part);
          if (data.message.content) {
            fullResponse += data.response;
            res.write(`data: ${JSON.stringify({ response: data.response })}\n\n`);
          }
          if (data.context) {
            lastContext = data.context;
          }
          if (data.done) {
            // Store the final context for future messages
            if (lastContext) {
              conversations.set(conversationId, lastContext);
            }
            res.write(`data: ${JSON.stringify({ done: true, conversationId })}\n\n`);
            res.end();
          }
        } catch (e) {
          console.error('Error parsing streaming response:', e);
        }
      }
    } catch (error) {
      console.error('Ollama API error:', error);
      res.write(`data: ${JSON.stringify({ 
        error: 'Failed to generate response',
        details: error.message 
      })}\n\n`);
      res.end();
    }
  });

  // Health check endpoint for Ollama
  app.get('/api/health', async (req, res) => {
    try {
      const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
        timeout: 5000
      });
      res.json({ status: 'ok', models: response.data.models });
    } catch (error) {
      res.status(503).json({ 
        status: 'error',
        message: 'Ollama service unavailable'
      });
    }
  });

  // Use vite's connect instance as middleware
  app.use(vite.middlewares);

  app.listen(5173, () => {
    console.log('Server running at http://localhost:5173');
  });
}

createServer();