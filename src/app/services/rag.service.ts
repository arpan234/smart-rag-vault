import { Injectable, inject } from '@angular/core';
import { SettingsService } from './settings.service';
import { VectorDbService, SearchResult } from './vector-db.service';
import { EmbeddingService } from './embedding.service';

export interface RagResult {
  query: string;
  response: string;
  retrievedChunks: SearchResult[];
  promptSent: string;
}

@Injectable({
  providedIn: 'root'
})
export class RagService {
  private readonly settingsService = inject(SettingsService);
  private readonly vectorDbService = inject(VectorDbService);
  private readonly embeddingService = inject(EmbeddingService);

  private readonly DEFAULT_SYSTEM_PROMPT = `You are a helpful, expert AI assistant for Smart RAG Vault.
You will answer the user's question based strictly on the provided Context Chunks from the user's uploaded documents.

Instructions:
1. Try to answer using ONLY the context provided.
2. If the answer is found in the context, synthesize it clearly and cite the sources. Use the format "[Source File (Chunk X)]" matching the exact chunk metadata.
3. If the context does not contain enough information to answer the question, clearly state: "I couldn't find this information in the uploaded documents." After stating this, you may answer the question using your general knowledge, but clearly prepend that part with "Based on my general knowledge...".
4. Keep your answer clear, concise, and structured in Markdown.
`;

  /**
   * Generates the prompt template incorporating system prompt, chunks, and query.
   */
  buildPrompt(query: string, chunks: SearchResult[]): string {
    let contextText = '';
    if (chunks.length === 0) {
      contextText = 'No relevant document chunks found in the database.';
    } else {
      chunks.forEach((chunk, index) => {
        contextText += `\n--- CHUNK ${index + 1} ---
Source Document: ${chunk.documentName}
Chunk Index: ${chunk.index}
Similarity Score: ${(chunk.similarity * 100).toFixed(1)}%
Content:
${chunk.text}
----------------------\n`;
      });
    }

    return `${this.DEFAULT_SYSTEM_PROMPT}

--- CONTEXT CHUNKS ---
${contextText}

User Question: ${query}
`;
  }

  /**
   * Executes the full RAG cycle.
   */
  async generateResponse(
    query: string,
    onStream?: (chunkText: string) => void
  ): Promise<RagResult> {
    const k = this.settingsService.topK();
    const threshold = this.settingsService.similarityThreshold();

    // 1. Embed query
    let queryVector: number[];
    try {
      queryVector = await this.embeddingService.getEmbedding(query);
    } catch (e) {
      throw new Error(`Embedding generation failed: ${(e as Error).message}`);
    }

    // 2. Vector Search
    const retrievedChunks = await this.vectorDbService.searchSimilarChunks(queryVector, k, threshold);

    // 3. Assemble Prompt
    const promptSent = this.buildPrompt(query, retrievedChunks);

    // 4. Call LLM
    const apiKey = this.settingsService.apiKey();
    if (!apiKey) {
      throw new Error('API Key is required to chat with LLM. Please open Settings and enter your key.');
    }

    const provider = this.settingsService.provider();
    const model = this.settingsService.model();

    let response = '';

    if (provider === 'gemini') {
      response = await this.callGeminiChat(promptSent, model, apiKey, onStream);
    } else {
      response = await this.callOpenAiChat(promptSent, model, apiKey, onStream);
    }

    return {
      query,
      response,
      retrievedChunks,
      promptSent
    };
  }

  private async callGeminiChat(
    prompt: string,
    model: string,
    apiKey: string,
    onStream?: (text: string) => void
  ): Promise<string> {
    // If streaming callback is provided, use streamGenerateContent
    if (onStream) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3 }
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Gemini API Error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let fullText = '';

      if (!reader) throw new Error('Response body reader is not available');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep trailing incomplete line

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const dataObj = JSON.parse(dataStr);
              const textChunk = dataObj.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (textChunk) {
                fullText += textChunk;
                onStream(textChunk);
              }
            } catch (e) {
              // Ignore partial JSON parsing errors during stream splits
            }
          }
        }
      }
      return fullText;
    } else {
      // Standard fetch
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3 }
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Gemini API Error: ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) throw new Error('Empty response from Gemini API.');
      return text;
    }
  }

  private async callOpenAiChat(
    prompt: string,
    model: string,
    apiKey: string,
    onStream?: (text: string) => void
  ): Promise<string> {
    const url = 'https://api.openai.com/v1/chat/completions';
    const isStream = !!onStream;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        stream: isStream
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `OpenAI API Error: ${response.statusText}`);
    }

    if (isStream) {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let fullText = '';

      if (!reader) throw new Error('Response body reader is not available');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanedLine = line.trim();
          if (cleanedLine.startsWith('data: ')) {
            const dataStr = cleanedLine.substring(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const dataObj = JSON.parse(dataStr);
              const textChunk = dataObj.choices?.[0]?.delta?.content || '';
              if (textChunk) {
                fullText += textChunk;
                onStream(textChunk);
              }
            } catch (e) {
              // Ignore partial parsing errors
            }
          }
        }
      }
      return fullText;
    } else {
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';
      if (!text) throw new Error('Empty response from OpenAI API.');
      return text;
    }
  }
}
