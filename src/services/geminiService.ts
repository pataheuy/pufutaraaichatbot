import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const MODEL_NAME = "gemini-3.1-flash-lite-preview";

export interface MessagePart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface Message {
  role: "user" | "model";
  content: string;
  image?: {
    mimeType: string;
    data: string;
  };
}

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async sendMessage(history: Message[], message: string, image?: { mimeType: string; data: string }, modelName: string = MODEL_NAME) {
    const formattedHistory = history.map(msg => {
      const parts: any[] = [{ text: msg.content }];
      if (msg.image) {
        parts.push({
          inlineData: {
            mimeType: msg.image.mimeType,
            data: msg.image.data
          }
        });
      }
      return {
        role: msg.role,
        parts
      };
    });

    const session = this.ai.chats.create({
      model: modelName,
      history: formattedHistory,
      config: {
        systemInstruction: "You are Pufuatara AI, a helpful, friendly, and intelligent AI assistant. You can see and analyze images if provided.",
      }
    });

    if (image) {
      return session.sendMessageStream({
        message: [
          { text: message },
          {
            inlineData: {
              mimeType: image.mimeType,
              data: image.data
            }
          }
        ]
      });
    }

    return session.sendMessageStream({ message });
  }
}

export const geminiService = new GeminiService();
