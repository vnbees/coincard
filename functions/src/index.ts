import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { VertexAI } from '@google-cloud/vertexai';

// Initialize Firebase Admin
admin.initializeApp();

// Replace with your Vertex AI project information
const projectId = "coincard-bd6c8"; // Updated to match your Firebase project ID
const location = "us-central1"; // Updated to just the region name

// Initialize Vertex AI with more detailed configuration
const vertexAI = new VertexAI({
  project: projectId,
  location: location,
  apiEndpoint: `${location}-aiplatform.googleapis.com`
});

// interface GenerateContentResponse {
//   response?: {
//     candidates?: Array<{
//       content?: {
//         parts?: Array<{
//           text?: string;
//         }>;
//       };
//     }>;
//   };
// }

interface ErrorResponse {
  error: string;
  details?: string;
}

interface SuccessResponse {
  result: string;
}

/**
 * Firebase Function to call Vertex AI large language model.
 */
export const callVertexAI = functions
  .region('us-central1')
  .runWith({
    // Increase memory and timeout for Vertex AI calls
    memory: '1GB',
    timeoutSeconds: 300,
  })
  .https.onRequest(async (request: functions.Request, response: functions.Response<SuccessResponse | ErrorResponse>) => {
    try {
      // Enable CORS
      response.set('Access-Control-Allow-Origin', '*');
      response.set('Access-Control-Allow-Methods', 'GET, POST');
      response.set('Access-Control-Allow-Headers', 'Content-Type');

      // Handle preflight request
      if (request.method === 'OPTIONS') {
        response.status(204).send({ result: '' });
        return;
      }

      const prompt = request.query.prompt as string || request.body.prompt;

      if (!prompt) {
        response.status(400).send({ error: "Please provide a prompt." });
        return;
      }

      console.log('Initializing Vertex AI model...');
      const model = vertexAI.preview.getGenerativeModel({
        model: "gemini-2.0-flash-lite-001",
      });

      console.log('Sending request to Vertex AI with prompt:', prompt);
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
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