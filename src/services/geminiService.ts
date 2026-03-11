import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const MODEL_NAME = "gemini-3.1-flash-lite-preview";

export interface Message {
  role: "user" | "model";
  content: string;
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

  async sendMessage(history: Message[], message: string) {
    const chat = this.ai.chats.create({
      model: MODEL_NAME,
      config: {
        systemInstruction: "You are Pufuatara AI, a helpful, friendly, and intelligent AI assistant. You provide concise yet comprehensive answers. Your tone is professional but approachable.",
      },
      // Convert history to the format expected by the SDK if needed, 
      // but sendMessage usually handles the current turn.
      // For full history management, we'd pass it to create().
    });

    // The SDK expects history in the create call for persistent context
    const formattedHistory = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    const session = this.ai.chats.create({
      model: MODEL_NAME,
      history: formattedHistory,
      config: {
        systemInstruction: "You are Pufuatara AI, a helpful, friendly, and intelligent AI assistant.",
      }
    });

    return session.sendMessageStream({ message });
  }
}

export const geminiService = new GeminiService();
