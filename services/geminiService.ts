import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { SummaryResult } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelName = 'gemini-2.5-flash';

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A concise, descriptive title for the meeting based on its content.",
    },
    shortSummary: {
      type: Type.STRING,
      description: "A concise, one-paragraph summary of the entire meeting.",
    },
    detailedSummary: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A detailed summary of the meeting, broken down into bullet points covering the main topics discussed.",
    },
    actionItems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          task: {
            type: Type.STRING,
            description: "A specific action item or task that was agreed upon.",
          },
          assignee: {
            type: Type.STRING,
            description: "The name of the person responsible for the action item. If no one is assigned, this should be 'Unassigned'.",
          },
          priority: {
            type: Type.STRING,
            description: "The priority of the action item, which must be one of the following values: 'High', 'Medium', or 'Low'.",
          },
          dueDate: {
            type: Type.STRING,
            description: "The due date for the action item in YYYY-MM-DD format. If a date is mentioned (e.g., 'by Friday', 'end of next week'), infer the date. If not specified, leave as an empty string.",
          },
        },
        required: ['task', 'assignee', 'priority', 'dueDate'],
      },
      description: "A list of all action items identified in the meeting.",
    },
    discussionBreakdown: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          speaker: {
            type: Type.STRING,
            description: "The identified speaker (e.g., 'Speaker 1', 'Jane Doe'). Group all points from the same speaker together.",
          },
          points: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of key points, arguments, or statements made by this speaker.",
          },
        },
        required: ['speaker', 'points'],
      },
      description: "A breakdown of the discussion, summarized by each speaker.",
    },
  },
  required: ['title', 'shortSummary', 'detailedSummary', 'actionItems', 'discussionBreakdown'],
};


export const summarizeTranscript = async (transcript: string, userTitle?: string): Promise<SummaryResult> => {
    try {
        const prompt = `
        Analyze the following meeting transcript. Your task is to perform the following actions:
        1.  Identify the different speakers in the transcript. If names are mentioned, use them. Otherwise, use generic labels like 'Speaker 1', 'Speaker 2', etc.
        2.  Create a concise title for the meeting. ${userTitle ? `The user has suggested "${userTitle}", which you can use or improve.` : ''}
        3.  Write a brief, one-paragraph summary of the entire meeting.
        4.  Create a bulleted list of the main topics discussed (detailed summary).
        5.  Summarize the key points for each identified speaker in a structured breakdown.
        6.  Extract all specific action items, including who is assigned, the priority, and the due date in YYYY-MM-DD format.

        Please provide the output in a valid JSON format that adheres to the provided schema. Ensure all fields are populated correctly. Ignore any timestamps or transcription artifacts.

        Transcript:
        ---
        ${transcript}
        ---
        `;

        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText) as SummaryResult;
        
        // Fallback for fields if model omits them
        if (result.actionItems) {
          result.actionItems.forEach(item => {
            if (!item.priority) item.priority = 'Medium';
            if (item.dueDate === undefined) item.dueDate = '';
          });
        }
        if (!result.discussionBreakdown) {
            result.discussionBreakdown = [];
        }

        return result;

    } catch (error) {
        console.error("Error calling Gemini API for summary:", error);
        throw new Error("Failed to get summary from AI. Please check the transcript and try again.");
    }
};

export const transcribeAudio = async (audioBase64: string, mimeType: string): Promise<string> => {
    try {
        const audioPart = {
            inlineData: {
                mimeType,
                data: audioBase64,
            },
        };

        const textPart = {
            text: "You are an expert audio transcription service. Transcribe the following audio recording. Provide only the text of the transcription, without any extra commentary, formatting, or labels like 'Speaker 1'. Focus on accurately converting speech to text."
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts: [textPart, audioPart] },
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error calling Gemini API for transcription:", error);
        throw new Error("Failed to transcribe audio. The file may be too large or in an unsupported format. Please try again.");
    }
};

export const generateSpeech = async (text: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data received from API.");
        }
        return base64Audio;

    } catch (error) {
        console.error("Error calling Gemini API for TTS:", error);
        throw new Error("Failed to generate speech. Please try again.");
    }
};