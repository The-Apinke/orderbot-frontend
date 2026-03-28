export function runAudit(systemPrompt, onEvent, onError) {
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  fetch(`${API}/audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system_prompt: systemPrompt }),
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop();
        for (const part of parts) {
          const line = part.trim();
          if (line.startsWith('data: ')) {
            try {
              onEvent(JSON.parse(line.slice(6)));
            } catch {
              // skip malformed event
            }
          }
        }
      }
    })
    .catch(onError);
}
