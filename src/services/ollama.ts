import axios from 'axios';

let currentConversationId: string | null = null;

export async function checkOllamaConnection(): Promise<boolean> {
  try {
    const response = await axios.get('/api/health', {
      timeout: 5000
    });
    return response.data.status === 'ok';
  } catch (error) {
    throw error;
  }
}

export async function generateResponse(
  prompt: string,
  onUpdate: (text: string) => void,
  onComplete: () => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: prompt,
        conversationId: currentConversationId
      })
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Process all complete lines
      buffer = lines.pop() || ''; // Keep the last incomplete line in buffer
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.error) {
              onError(data.error);
              return;
            }
            
            if (data.response) {
              onUpdate(data.response);
            }
            
            if (data.done) {
              currentConversationId = data.conversationId;
              onComplete();
              return;
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      onError(`Failed to generate response: ${error.message}`);
    } else {
      onError('Failed to generate response. Please ensure Ollama is running.');
    }
  }
}