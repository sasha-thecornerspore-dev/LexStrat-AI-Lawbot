
import { GoogleGenAI, Modality } from "@google/genai";
import { SYSTEM_INSTRUCTION } from '../constants';
import { Fact, ProposedLead, AnalysisResult, FileIndexItem } from '../types';

export type AIModelMode = 'tactical' | 'deep_think' | 'pro' | 'blitz' | 'web_search';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing");
    throw new Error("API_KEY is required");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateStrategyResponse = async (
  history: { role: string; content: string }[],
  userMessage: string,
  mode: AIModelMode = 'tactical',
  repositoryContext?: { driveUrl: string, evidenceMap: any, fileIndex?: FileIndexItem[] }
): Promise<{ text: string, groundingMetadata?: any }> => {
  const ai = getAiClient();
  
  let modelName = 'gemini-2.5-flash';
  let finalInstruction = SYSTEM_INSTRUCTION;

  // Inject repository context if available
  if (repositoryContext) {
    finalInstruction += `\n\n### LIVE REPOSITORY CONTEXT
    DRIVE URL: ${repositoryContext.driveUrl || "Not Linked"}
    EVIDENCE LOGS: ${JSON.stringify(repositoryContext.evidenceMap || {})}
    LOCAL FILE INDEX: ${JSON.stringify(repositoryContext.fileIndex || [])}
    
    Use this data to reference specific user notes or files in your strategy.
    `;
  }

  let config: any = {
    systemInstruction: finalInstruction,
  };

  // Configuration based on selected mode
  switch (mode) {
    case 'blitz':
      modelName = 'gemini-2.5-flash-lite-preview-02-05'; // Fast AI responses
      config.maxOutputTokens = 4096;
      break;
    case 'deep_think':
      modelName = 'gemini-3-pro-preview'; // Use Pro for complex reasoning
      // Max thinking budget for Gemini 3 Pro, DO NOT set maxOutputTokens
      config.thinkingConfig = { thinkingBudget: 32768 }; 
      break;
    case 'pro':
      modelName = 'gemini-3-pro-preview';
      config.maxOutputTokens = 8192;
      break;
    case 'web_search':
      modelName = 'gemini-2.5-flash';
      config.tools = [{ googleSearch: {} }]; // Search Grounding
      config.maxOutputTokens = 4096;
      break;
    case 'tactical':
    default:
      modelName = 'gemini-2.5-flash';
      config.temperature = 0.7;
      config.maxOutputTokens = 4096;
      break;
  }

  // Construct the full conversation history
  const chat = ai.chats.create({
    model: modelName,
    config: config,
    history: history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    })),
  });

  try {
    const result = await chat.sendMessage({ message: userMessage });
    return {
        text: result.text || "Error: No response generated.",
        groundingMetadata: result.candidates?.[0]?.groundingMetadata
    };
  } catch (error: any) {
    if (error.message?.includes('403') || error.toString().includes('Permission denied')) {
        // Fallback if search grounding or specific model is restricted
        if (mode === 'web_search') {
            console.warn("Web Search 403. Retrying without tools.");
            // Recursive retry with tactical mode
            return generateStrategyResponse(history, userMessage + " (Search unavailable, answer from knowledge base)", 'tactical', repositoryContext);
        }
        return { text: "Critical Error: API Permission Denied (403). Check API Key privileges." };
    }
    throw error;
  }
};

export const generateDocument = async (
  docType: string,
  specificFocus: string
): Promise<string> => {
  const ai = getAiClient();
  
  const prompt = `
    GENERATE A FORMAL LEGAL DOCUMENT.
    TYPE: ${docType}
    FOCUS: ${specificFocus}
    
    Ensure the output acts as a full "Speaking Motion" compliant with Maryland Rules. 
    Include a Caption, Statement of Facts (incorporating the Unchangeable Facts), Argument, and Conclusion.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Using 3.0 Pro for high quality document generation
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.4,
      }
    });

    return response.text || "Error: Could not generate document.";
  } catch (e: any) {
    console.error("Document Generation Failed", e);
    if (e.message?.includes('403')) {
        return "Error: Permission Denied (403). Gemini 3 Pro is not enabled for this API key. Please try a different task.";
    }
    return "Error: Document generation failed.";
  }
};

// --- VISUAL FORENSICS & ANALYSIS ---

export type AspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '9:16' | '16:9' | '21:9';

export const generateExhibitImage = async (
  prompt: string, 
  size: '1K' | '2K' | '4K' = '1K',
  aspectRatio: AspectRatio = '16:9'
): Promise<string> => {
  const ai = getAiClient();
  // Using Gemini 3 Pro Image for high fidelity exhibits
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          imageSize: size,
          aspectRatio: aspectRatio
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated");
  } catch (e: any) {
    console.error("Image Generation Failed", e);
    if (e.message?.includes('403')) {
        throw new Error("Permission Denied (403). Image generation model access restricted.");
    }
    throw e;
  }
};

export const editEvidenceImage = async (imageBase64: string, prompt: string): Promise<string> => {
  const ai = getAiClient();
  
  // 1. Extract clean base64 and basic MIME type check
  const matches = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  
  let mimeType = 'image/png'; // Default
  let cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  if (matches && matches.length === 3) {
      mimeType = matches[1];
      cleanBase64 = matches[2];
  }

  try {
    // Gemini 2.5 Flash Image for editing
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: "Edit this image: " + prompt }, 
          {
            inlineData: {
              mimeType: mimeType, 
              data: cleanBase64
            }
          }
        ]
      }
    });

    // Check for Image Response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    // Fallback: Check if the model returned text explaining why it couldn't edit
    const textResponse = response.text;
    if (textResponse) {
        throw new Error(`Model refused edit: ${textResponse}`);
    }

    throw new Error("No edited image or text explanation returned.");

  } catch (e: any) {
    console.error("Image Edit Failed", e);
    if (e.message?.includes('403')) {
        throw new Error("Permission Denied (403). Image editing model access restricted.");
    }
    throw e; 
  }
};

export const analyzeMedia = async (mediaBase64: string, mimeType: string, prompt: string, facts?: Fact[]): Promise<string> => {
  const ai = getAiClient();
  const cleanBase64 = mediaBase64.replace(/^data:.*;base64,/, "");
  
  const factsContext = facts 
    ? facts.map(f => `FACT: ${f.title} - ${f.fullDetail}`).join('\n') 
    : "No specific case facts provided.";

  const fullPrompt = `
    CONTEXT: You are analyzing forensic evidence for a legal case.
    KNOWN FACTS: 
    ${factsContext}

    USER QUERY: ${prompt}
    
    Analyze the provided media closely. Flag any inconsistencies with the Known Facts.
  `;
  
  // Using Gemini 3 Pro for deep understanding of Images and Video
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
        parts: [
            {
            inlineData: {
                mimeType: mimeType,
                data: cleanBase64
            }
            },
            { text: fullPrompt }
        ]
        },
        config: {
        systemInstruction: "You are a forensic analyst reviewing evidence. Be extremely detailed and compare against known case facts.",
        }
    });
    return response.text || "Analysis inconclusive.";
  } catch (error: any) {
      if (error.message?.includes('403')) {
          return "Analysis Failed: 403 Permission Denied. Your API Key may not support 'gemini-3-pro-preview'.";
      }
      throw error;
  }
};

export const generateReconstructionVideo = async (prompt: string, imageBase64?: string, aspectRatio: '16:9' | '9:16' = '16:9'): Promise<string> => {
  // Veo requires user-selected API Key
  if (window.aistudio && window.aistudio.hasSelectedApiKey) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await window.aistudio.openSelectKey();
    }
  }

  // Re-init client to pick up selected key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let request: any = {
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p', // Fast generate supports 720p
      aspectRatio: aspectRatio
    }
  };

  if (imageBase64) {
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    request.image = {
      imageBytes: cleanBase64,
      mimeType: 'image/png'
    };
  }

  try {
    let operation = await ai.models.generateVideos(request);

    // Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation failed");

    // Append key for download
    return `${videoUri}&key=${process.env.API_KEY}`;
  } catch (e: any) {
    console.error("Video Generation Failed", e);
    if (e.message?.includes('403')) {
        throw new Error("Permission Denied (403). Video generation unavailable.");
    }
    throw e;
  }
};

// --- AUDIO CAPABILITIES ---

export const generateSpeech = async (text: string): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
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
    if (!base64Audio) throw new Error("TTS generation failed");
    return base64Audio;
  } catch (e: any) {
    console.error("TTS Failed", e);
    // Note: TTS often uses a different model/quota, 403 is common if not enabled
    if (e.message?.includes('403')) {
       console.warn("TTS Permission Denied. Skipping audio playback.");
       throw new Error("TTS Permission Denied");
    }
    throw e;
  }
};

export const transcribeAudio = async (audioBase64: string): Promise<string> => {
  const ai = getAiClient();
  const cleanBase64 = audioBase64.replace(/^data:.*;base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Flash is efficient for audio understanding
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "audio/wav", // Assuming WAV from recording
              data: cleanBase64
            }
          },
          { text: "Transcribe this audio exactly." }
        ]
      }
    });

    return response.text || "";
  } catch (e: any) {
      console.error("Transcription Failed", e);
      if (e.message?.includes('403')) return "Error: Transcription Permission Denied.";
      return "Error: Could not transcribe.";
  }
};

// --- VENUE INTELLIGENCE ---

export const queryVenueIntelligence = async (prompt: string, facts: Fact[]): Promise<{ text: string, mapChunks: any[] }> => {
  const ai = getAiClient();
  
  const factsContext = facts.map(f => `${f.title}: ${f.shortDesc}`).join('; ');
  const enhancedPrompt = `
    CONTEXT: The user is a Pro Se Defendant in a foreclosure case (Case 24-C-10-005521).
    KNOWN FACTS: ${factsContext}
    
    USER QUERY: ${prompt}
    
    TASK: Use Google Maps to identify locations relevant to the User Query. If the user asks for "important locations", look for the Courthouse, Trustee's Office, and the Deutsche Bank Vault location if inferable.
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: enhancedPrompt,
        config: {
        tools: [{ googleMaps: {} }],
        },
    });

    const text = response.text || "No intelligence found.";
    const mapChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return { text, mapChunks };
  } catch (e: any) {
      console.error("Venue Query Failed", e);
      if (e.message?.includes('403')) {
          return { text: "Venue Intelligence Unavailable: Permission Denied (403). Maps Grounding is not enabled for this API Key.", mapChunks: [] };
      }
      throw e;
  }
};

// --- INTELLIGENCE GRAPH & SCOUTING ---

export const extractCaseIntelligence = async (narrative: string): Promise<any> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Extract case intelligence from this narrative. Return strictly JSON.
      Narrative: ${narrative}
      Schema: { events: [{date, title, description, type}], nodes: [{id, label, type}], links: [{source, target, label}], citations: [{citation, summary, relevance}] }`,
      config: { responseMimeType: 'application/json' }
    });
    
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse intelligence graph", e);
    return { events: [], nodes: [], links: [], citations: [] };
  }
};

export const scoutForensicLeads = async (currentFacts: Fact[]): Promise<ProposedLead[]> => {
  const ai = getAiClient();
  const factsContext = currentFacts.map(f => `${f.title}: ${f.shortDesc}`).join('\n');
  
  const prompt = `
    You are a Forensic Scout. Review these active case facts:
    ${factsContext}
    
    TASK:
    1. Use Google Search to find corroborating information, definitions, or legal context for these facts.
    2. Look for "Deutsche Bank M116 code", "Wells Fargo Ginnie Mae buyout protocols", and "Maryland Rule 14-305(c) recent rulings".
    3. Propose NEW Leads (Facts) or Supporting Documents (Web Links) to add to the Evidence Vault.
    
    Return a JSON Array of objects:
    [{
      "id": "unique_id",
      "type": "NEW_FACT" or "SUPPORTING_DOC",
      "title": "Short Title",
      "description": "Why this is relevant",
      "url": "URL if found",
      "confidence": 0-100
    }]
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
        tools: [{ googleSearch: {} }],
        // Note: responseMimeType 'application/json' cannot be used with Tools.
        // We must parse the text response manually.
        }
    });

    let rawText = response.text || "[]";
    
    // ROBUST PARSING:
    // 1. Try to find JSON array brackets [ ... ] within the text
    const jsonArrayMatch = rawText.match(/\[[\s\S]*\]/);
    if (jsonArrayMatch) {
        rawText = jsonArrayMatch[0];
    } else {
        // 2. Fallback: Clean up markdown if no clear array brackets found
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    
    const raw = JSON.parse(rawText);
    // Ensure type safety on return
    return raw.map((item: any) => ({
      ...item,
      id: item.id || Date.now().toString() + Math.random(),
    }));

  } catch (e: any) {
    console.error("Scout parsing failed or Permission Denied", e);
    // If permission denied for Search tool, we return empty array instead of crashing
    return [];
  }
};

// --- DOCUMENT ANALYSIS & INTERROGATION ---

export const analyzeLegalDocument = async (
  fileBase64: string,
  mimeType: string,
  currentFacts: Fact[]
): Promise<AnalysisResult> => {
  const ai = getAiClient();
  const cleanBase64 = fileBase64.replace(/^data:.*;base64,/, "");
  
  const factsContext = currentFacts.map(f => `FACT: ${f.title} - ${f.fullDetail} (Ref: ${f.evidenceRef})`).join('\n');

  const prompt = `
    You are an aggressive Foreclosure Defense Analyst. 
    You are reviewing a document filed by the Plaintiff.
    
    YOUR MISSION:
    1. PERFORM OCR: Extract the verbatim text from the provided image/PDF. Store this in the 'extractedText' field.
    2. FORENSIC ANALYSIS: Compare the *visual* assertions in the document (layout, signatures, seals) and the *text* content against our ESTABLISHED FACTS (below).
    3. FLAGGING: Flag EVERY discrepancy, perjury, or procedural defect.
    4. PRIORITY: Specifically look for claims of "Possession", "No Transfers", or "Partial Claims" which contradict our records.
    
    IMPORTANT: Use the ORIGINAL IMAGE for analysis to ensure accuracy. Do not rely solely on your OCR output for the forensic check to avoid poisoning the results with OCR errors.
    
    ESTABLISHED FACTS:
    ${factsContext}
    
    OUTPUT FORMAT (JSON ONLY):
    {
      "summary": "Brief overview of the document's fraudulent nature",
      "extractedText": "FULL VERBATIM TEXT CONTENT HERE...",
      "discrepancies": [
        {
          "id": "1",
          "quote": "Exact text from doc",
          "issue": "Why this is false based on Facts",
          "severity": "POSSIBLE_PERJURY" | "CONTRADICTION" | "PROCEDURAL_ERROR",
          "rebuttalRef": "Which Fact ID or Title rebuts this"
        }
      ],
      "recommendedAction": "What motion to file or objection to raise"
    }
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', // Using Pro 3.0 for complex reasoning and multimodal analysis
        contents: {
        parts: [
            {
            inlineData: {
                mimeType: mimeType, // Supports PDF and Images
                data: cleanBase64
            }
            },
            { text: prompt }
        ]
        },
        config: {
        responseMimeType: "application/json"
        }
    });
    return JSON.parse(response.text || "{}");
  } catch (e: any) {
    console.error("Analysis failed", e);
    
    if (e.message?.includes('403')) {
        return {
            summary: "Analysis failed: Permission Denied (403). Your API Key may not have access to 'gemini-3-pro-preview'.",
            discrepancies: [],
            recommendedAction: "Upgrade API Key or use a standard model.",
            extractedText: ""
        };
    }

    return {
      summary: "Analysis failed or document was illegible.",
      discrepancies: [],
      recommendedAction: "Retry analysis with a clearer scan.",
      extractedText: ""
    };
  }
};

export const chatWithDocument = async (
    history: { role: string, content: string }[],
    userMessage: string,
    documentContext: { extractedText: string, summary: string },
    facts: Fact[]
  ): Promise<string> => {
    const ai = getAiClient();
    const factsContext = facts.map(f => `${f.title}`).join(', ');
  
    const systemInstruction = `
      ${SYSTEM_INSTRUCTION}
      
      ### DOCUMENT INTERROGATION MODE
      You are analyzing a specific legal document.
      
      DOCUMENT CONTEXT:
      SUMMARY: ${documentContext.summary}
      FULL TEXT: ${documentContext.extractedText.substring(0, 20000)}... (truncated if too long)
      
      KNOWN FACTS: ${factsContext}
      
      DIRECTIVES:
      1. Answer questions specifically about this document's text and validity.
      2. If the user gives a DIRECTIVE (e.g., "Draft a Motion to Strike this"), use the document text as the basis for the motion.
      3. Always highlight anomalies or contradictions with the Known Facts.
    `;
  
    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: systemInstruction,
      },
      history: history.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
    });
  
    try {
      const result = await chat.sendMessage({ message: userMessage });
      return result.text || "No response.";
    } catch (e: any) {
      console.error("Document Chat Failed", e);
      return "Error: Unable to interrogate document.";
    }
  };
