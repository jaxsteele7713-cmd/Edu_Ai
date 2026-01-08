
import { 
  GoogleGenAI, 
  GenerateContentResponse,
  Type,
  Modality,
  SchemaType
} from "@google/genai";
import { Flashcard, QuizQuestion } from "../types";

// --- Initialization ---
// Helper to create a fresh instance with the most up-to-date API_KEY
const createAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Image Generation ---
export const generateCoverImage = async (prompt: string): Promise<string | null> => {
  const ai = createAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: "3:4",
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Cover generation failed:", error);
    return null;
  }
};

// --- Course Content Generation ---
export const generateCourseContent = async (
  topic: string, 
  level: string,
  type: string,
  duration: string,
  speed: string
): Promise<any> => {
  const ai = createAI();
  const prompt = `
    You are the LUMI AI Curriculum Architect. Create a comprehensive, interactive course.
    
    TOPIC: ${topic}
    LEVEL: ${level}
    FORMAT: ${type}
    ESTIMATED DURATION: ${duration}
    LEARNING PACE: ${speed} (Adjust depth vs breadth accordingly)
    
    REQUIRED JSON OUTPUT STRUCTURE:
    {
      "title": "A sophisticated academic title",
      "description": "An evocative dark academia style description",
      "roadmap": ["Step 1: Introduction to...", "Step 2: Analysis of...", "Step 3: Advanced Concepts in..."],
      "flashcards": [
        { "front": "High-level concept", "back": "Clear explanation" },
        ... generate at least 8-10 cards
      ],
      "quiz": [
        { 
          "question": "A challenging question based on the content", 
          "options": ["Option A", "Option B", "Option C", "Option D"], 
          "answer": 0 
        },
        ... generate 3-5 questions
      ]
    }
    
    Ensure the content is intellectually stimulating and fits the "${level}" academic rigor.
    Return ONLY the raw JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 4000 }
      }
    });
    
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Course gen failed:", error);
    return null;
  }
};

// --- Personalization (Rewrite) ---
export const personalizeFlashcards = async (
  cards: Flashcard[], 
  interest: string
): Promise<Flashcard[] | null> => {
  const ai = createAI();
  const prompt = `
    Rewrite the 'back' (explanation) of the following flashcards to explain the technical concept using an analogy related to: "${interest}".
    Keep the 'front' (term/question) exactly as it is.
    Keep the explanation accurate but use the theme to make it memorable.
    
    Input Cards: ${JSON.stringify(cards)}
    
    Return JSON array of Flashcards.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Personalization failed:", error);
    return null;
  }
};

// --- Level 2: Quiz Generation (Fallback) ---
export const generateQuiz = async (topic: string, cards: Flashcard[]): Promise<QuizQuestion[]> => {
    const ai = createAI();
    const prompt = `
      Create 3 multiple choice questions to test knowledge on: ${topic}.
      Based on these concepts: ${JSON.stringify(cards.slice(0, 5))}.
      
      Return JSON array:
      [{ "question": "...", "options": ["A","B","C","D"], "answer": 0 }] (answer is index 0-3)
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "[]");
    } catch (e) {
        return [];
    }
};

// --- Level 3: Application Insight ---
export const generateApplicationInsight = async (topic: string): Promise<string> => {
    const ai = createAI();
    const prompt = `
      Explain the practical, real-world application of "${topic}". 
      How is this knowledge used in industry, nature, or society today?
      Provide a concrete case study or example.
      Tone: Professional, insightful, slightly academic.
      Length: Around 100-150 words.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });
        return response.text || "The practical applications are vast but currently obscured.";
    } catch (e) {
        return "Could not retrieve application data.";
    }
};

// --- Level 4: Deep Dive ---
export const generateDeepDive = async (topic: string): Promise<string> => {
    const ai = createAI();
    const prompt = `
      Provide a philosophical, theoretical, or advanced "Deep Dive" into "${topic}".
      Connect it to broader universal concepts, history, or future implications.
      Tone: Dark Academia, profound, esoteric, inspiring.
      Length: Around 100-150 words.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });
        return response.text || "The deeper mysteries remain hidden.";
    } catch (e) {
        return "Could not retrieve deep dive data.";
    }
};


// --- Battle Arena AI (Standard) ---

export const generateBattleRound = async (topic: string, mode: string): Promise<string> => {
  const ai = createAI();
  const prompt = `
    Generate a single, provocative, open-ended debate question/prompt about: "${topic}".
    Mode: ${mode === 'rapid' ? 'Rapid Fire (Short, punchy, controversial)' : 'Friendly Debate (Deep, philosophical)'}.
    The question should require critical thinking, not just facts.
    Return ONLY the question text string.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text?.trim() || "Analyze the significance of this topic.";
  } catch (e) {
    return `Discuss the implications of ${topic}.`;
  }
};

export const simulateOpponentTurn = async (question: string, persona: string): Promise<string> => {
  const ai = createAI();
  const prompt = `
    You are participating in a debate. 
    Question: "${question}"
    Your Persona: ${persona}.
    
    Write a short, 1-2 sentence argument answering the question in your persona's voice.
    Keep it under 30 words.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text?.trim() || "I must contemplate this further.";
  } catch (e) {
    return "An interesting point.";
  }
};

export const judgeBattleRound = async (
  question: string, 
  answers: { user: string, answer: string }[]
): Promise<Array<{ user: string, score: number, feedback: string }>> => {
  const ai = createAI();
  const prompt = `
    You are the Grand Arbiter of the Debate Hall.
    Question: "${question}"
    
    Evaluate these answers:
    ${JSON.stringify(answers)}
    
    Assign a score (0-100) and brief feedback (max 10 words, strict & witty dark academia style) for each.
    
    Return JSON structure:
    [
      { "user": "username", "score": 85, "feedback": "Insightful, though verbose." },
      ...
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error(e);
    return answers.map(a => ({ user: a.user, score: 50, feedback: "The wind whispers silence." }));
  }
};

// --- Socratic Defense AI (Calculus Specific) ---

export const generateSocraticChallenge = async (topic: string): Promise<string> => {
  const ai = createAI();
  const prompt = `
    You are a Historical Skeptic (like Zeno or Bishop Berkeley) who doubts the validity of Calculus.
    Topic: ${topic} (Limits, Derivatives, or Integrals).
    
    State a short, 1-2 sentence paradox or objection to the very definition of this concept.
    Do not accept "it works" as an answer. Demand logical rigor.
    Tone: Arrogant, intellectual, challenging.
    Example for Limits: "How can you approach a destination without ever arriving? Is it there, or is it not?"
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text?.trim() || "Explain this concept to me, for I find it logically flawed.";
  } catch (e) {
    return "Why does this concept exist?";
  }
};

export const simulateSkepticTurn = async (history: {role: 'skeptic' | 'user', text: string}[]): Promise<string> => {
  const ai = createAI();
  const prompt = `
    You are a Logic Skeptic debating a student about Calculus.
    You must find the flaw, vagueness, or lack of rigor in their explanation.
    
    Conversation History:
    ${JSON.stringify(history)}
    
    Your goal: Ask a hard follow-up question or point out a contradiction.
    Keep it short (1-2 sentences).
    If they are vague (e.g. "it gets closer"), attack that vagueness ("How close? Does it touch?").
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text?.trim() || "Your definition lacks precision. Clarify.";
  } catch (e) {
    return "I remain unconvinced. Try again.";
  }
};

export const judgeSocraticRound = async (
  topic: string, 
  history: {role: 'skeptic' | 'user', text: string}[]
): Promise<{ pass: boolean, score: number, feedback: string }> => {
  const ai = createAI();
  const prompt = `
    You are the Grand Arbiter. 
    Topic: ${topic}
    Evaluate the student's defense against the Skeptic.
    
    Conversation:
    ${JSON.stringify(history)}
    
    Did the student demonstrate deep conceptual understanding? Did they avoid rote memorization?
    
    Return JSON:
    {
      "pass": boolean, (true if they explained it well)
      "score": number, (0-100)
      "feedback": "string" (Short, witty dark academia verdict)
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return { pass: false, score: 0, feedback: "The defense collapsed." };
  }
};

// --- Numerical Quiz AI ---

export const generateCalculusProblem = async (topic: string): Promise<{
  question: string,
  options: string[],
  correctIndex: number,
  explanation: string
} | null> => {
  const ai = createAI();
  const prompt = `
    Generate a specialized calculus multiple-choice problem.
    Topic: ${topic}
    Level: Early Undergraduate / High School AP Calculus.
    
    Requirements:
    1. The 'question' MUST be valid LaTeX code for the math expression (e.g. "\\frac{d}{dx}(x^2)"). 
    2. Provide 4 LaTeX options.
    3. Indicate the correct index (0-3).
    4. Provide a brief 1-sentence explanation.
    
    Output JSON format:
    {
      "question": "Latex string",
      "options": ["Latex A", "Latex B", "Latex C", "Latex D"],
      "correctIndex": 0,
      "explanation": "text"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "null");
  } catch (e) {
    console.error("Math Gen Error", e);
    return null;
  }
}


// --- Veo Video Generation ---
export const generateVideoIntro = async (prompt: string): Promise<string | null> => {
  const win = window as any;
  
  // Rule: Check if API key has been selected when using Veo.
  if (win.aistudio) {
    const hasKey = await win.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await win.aistudio.openSelectKey();
      // Proceed immediately after triggering the dialog as per guidelines to avoid race conditions.
    }
  }

  // Rule: Create a new instance right before the call to ensure the latest key is used.
  let ai = createAI();
  
  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    // Polling for the operation result
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      // Re-instantiate ai for the operation check as well to be safe with session/token updates
      ai = createAI();
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (videoUri) {
      const res = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
      if (!res.ok) throw new Error(`Video fetch failed: ${res.status}`);
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    }
    return null;
  } catch (error: any) {
    console.error("Video generation failed:", error);
    
    // Robust error checking for Veo permissions/availability
    // We check message, status, and the stringified object to cover different error formats
    const errorMsg = error.message || "";
    const errorStatus = error.status || "";
    const errorString = JSON.stringify(error);
    const combinedError = `${errorMsg} ${errorStatus} ${errorString}`;
    
    // Rule: If "Requested entity was not found" or 404 occurs, reset key state by opening the selector.
    if (combinedError.includes("Requested entity was not found") || combinedError.includes("404") || combinedError.includes("NOT_FOUND")) {
      console.warn("Veo entity not found (likely billing/key project issue). Opening key selector.");
      if (win.aistudio) {
        await win.aistudio.openSelectKey();
      }
    }
    return null;
  }
};

// --- Text-to-Speech ---
export const generateSpeech = async (text: string): Promise<ArrayBuffer | null> => {
    const ai = createAI();
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
        if (base64Audio) {
            const binaryString = atob(base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes.buffer;
        }
        return null;
    } catch (e) {
        console.error("TTS Failed", e);
        return null;
    }
};

export const encodeAudio = (bytes: Uint8Array) => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const decodeAudio = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
