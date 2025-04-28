import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { VertexAI } from '@google-cloud/vertexai';

// Initialize Firebase Admin
admin.initializeApp();

const projectId = "coincard-bd6c8";
const location = "us-central1";

const vertexAI = new VertexAI({
  project: projectId,
  location: location,
  apiEndpoint: `${location}-aiplatform.googleapis.com`
});

interface ErrorResponse {
  error: string;
  details?: string;
}

interface SuccessResponse {
  result: string;
  timing?: {
    totalTime: number;
    vertexAiProcessingTime: number;
  };
}

export const analyzeMoneyInImage = functions
  .region('us-central1')
  .runWith({
    memory: '1GB',
    timeoutSeconds: 300,
  })
  .https.onRequest(async (request: functions.Request, response: functions.Response<SuccessResponse | ErrorResponse>) => {
    const startTime = Date.now();
    console.log('Function started at:', new Date(startTime).toISOString());
    
    try {
      response.set('Access-Control-Allow-Origin', '*');
      response.set('Access-Control-Allow-Methods', 'GET, POST');
      response.set('Access-Control-Allow-Headers', 'Content-Type');

      if (request.method === 'OPTIONS') {
        response.status(204).send({ result: '' });
        return;
      }

      const imageBase64 = request.body.image;
      if (!imageBase64) {
        response.status(400).send({ error: "Please provide an image in base64 format." });
        return;
      }

      const modelInitStart = Date.now();
      console.log('Initializing Vertex AI model...');
      const model = vertexAI.preview.getGenerativeModel({
        model: "gemini-2.0-flash-001",
      });
      console.log('Model initialization time:', Date.now() - modelInitStart, 'ms');

      const prompt = "Analyze this image and tell me: 1. How much money is shown in the image? 2. Are there any names visible that could be the recipient or sender? Please respond in Vietnamese language and format the response as 'Amount: [amount], Recipient: [name]' or 'Amount: [amount], Recipient: Not found' if no name is visible.";

      const aiRequestStart = Date.now();
      console.log('Sending request to Vertex AI...');
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
            ]
          }
        ],
      });
      console.log('Vertex AI processing time:', Date.now() - aiRequestStart, 'ms');

      console.log('Received response from Vertex AI:', result);

      if (!result?.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error("Invalid response structure from Vertex AI");
      }

      const generatedText = result.response.candidates[0].content.parts[0].text;
      const totalTime = Date.now() - startTime;
      console.log('Total function execution time:', totalTime, 'ms');
      
      response.status(200).send({ 
        result: generatedText,
        timing: {
          totalTime,
          vertexAiProcessingTime: Date.now() - aiRequestStart,
        }
      });
      
    } catch (error) {
      const errorTime = Date.now() - startTime;
      console.error(`Error occurred after ${errorTime}ms:`, error);
      let errorMessage = 'Unknown error occurred';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error('Error stack:', error.stack);
      }

      response.status(500).send({ 
        error: `Server error: ${errorMessage}`,
        details: error instanceof Error ? error.stack : undefined
      });
    }
});