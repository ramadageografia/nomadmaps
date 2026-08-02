import { GoogleGenAI } from "@google/genai";
import { Festival } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getNomadAdvice(prompt: string, festivals: Festival[]) {
  const festivalContext = festivals.map(f => `${f.nome} (${f.país}): ${f.descrição} - Vertentes: ${f.vertentes.join(', ')}`).join('\n');
  
  const systemInstruction = `Você é o "Oráculo do Nomad", um guia espiritual e especialista em festivais psytrance ao redor do mundo.
Sua missão é ajudar viajantes a encontrar a experiência perfeita baseada em seus gostos musicais e vibe desejada.
Use uma linguagem mística, psicodélica e acolhedora.
Você tem acesso a esta lista de festivais:
${festivalContext}

Responda sempre em Português. Seja conciso mas inspirador.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
      },
    });
    
    return response.text;
  } catch (error) {
    console.error("Gemini API error:", error);
    return "As energias estão turvas no momento... Tente novamente quando os astros se alinharem.";
  }
}
