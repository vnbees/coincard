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
}

export const analyzeMoneyInImage = functions
  .region('us-central1')
  .runWith({
    memory: '1GB',
    timeoutSeconds: 300,
  })
  .https.onRequest(async (request: functions.Request, response: functions.Response<SuccessResponse | ErrorResponse>) => {
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

      console.log('Initializing Vertex AI model...');
      const model = vertexAI.preview.getGenerativeModel({
        model: "gemini-2.0-flash-001",
      });

      const prompt = "Analyze this image and tell me how much money is shown in the image. Please respond in Vietnamese language.";

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

      console.log('Received response from Vertex AI:', result);

      if (!result?.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error("Invalid response structure from Vertex AI");
      }

      const generatedText = result.response.candidates[0].content.parts[0].text;
      response.status(200).send({ result: generatedText });
      
    } catch (error) {
      console.error("Detailed error in Vertex AI call:", error);
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