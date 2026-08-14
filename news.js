import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const OLLAMA_HOST = 'http://localhost:11434';
const DEFAULT_MODEL = 'huihui_ai/gemma-4-abliterated:latest';
const FALLBACK_MODEL = 'gemma4:e4b';

export async function ensureOllamaRunning() {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) return true;
  } catch (err) {
  }

  console.log('[Ollama] Starting local Ollama server...');
  const proc = spawn('ollama', ['serve'], {
    detached: true,
    stdio: 'ignore'
  });
  proc.unref();

  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 600));
    try {
      const res = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        console.log('[Ollama] Server is live.');
        return true;
      }
    } catch (_) { }
  }
  throw new Error('Could not connect to Ollama server at ' + OLLAMA_HOST);
}

export async function fetchLiveCryptoHeadlines() {
  const query = encodeURIComponent('crypto OR bitcoin OR ethereum OR solana OR SEC OR ETF OR fed');
  const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();

    const titles = [];
    const itemRegex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && titles.length < 15) {
      let title = match[1]
        .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();

      if (title) titles.push(title);
    }

    return titles;
  } catch (err) {
    console.warn('[News] RSS fetch warning, using fallback headlines:', err.message);
    return [
      "Bitcoin consolidates near institutional pivot as ETF inflows stabilize",
      "Ethereum staking yields and Layer 2 gas throughput expand following upgrade",
      "Solana decentralized exchange volume hits multi-week high against BTC",
      "SEC clarifies crypto derivatives custody rules for institutional prime brokers",
      "Federal Reserve signals cautious interest rate trajectory amid macro data"
    ];
  }
}

export async function updateResearchNews(model = DEFAULT_MODEL) {
  await ensureOllamaRunning();

  console.log('[News] Fetching latest market headlines...');
  const headlines = await fetchLiveCryptoHeadlines();
  console.log(`[News] Ingested ${headlines.length} live headlines.`);

  const prompt = `You are an elite quantitative crypto research analyst. 
Analyze these latest market headlines:
${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}

Synthesize the fundamental motives into a clean JSON object with this EXACT structure:
{
  "regime_title": "Short title of current macro theme (e.g. Institutional ETF Inflows vs Altcoin Rotation)",
  "summary": "Brief 1-sentence overview of the current institutional liquidity & crypto macro regime",
  "key_drivers": [
    { "title": "Driver 1 Title (e.g. BTC Institutional ETF Absorption)", "description": "1-2 sentences on macro impact." },
    { "title": "Driver 2 Title (e.g. Ethereum & Solana DeFi Velocity)", "description": "1-2 sentences on altcoin impact." },
    { "title": "Driver 3 Title (e.g. Regulatory & Macro Liquidity Dynamics)", "description": "1-2 sentences on risk backdrop." }
  ],
  "invalidation_triggers": [
    "Technical/macro condition 1 that invalidates this regime",
    "Technical/macro condition 2 that invalidates this regime",
    "Technical/macro condition 3 that invalidates this regime"
  ]
}

Return ONLY valid JSON. Do not include extra commentary or Markdown wrappers.`;

  console.log(`[Ollama] Querying model: ${model}...`);

  let responseText = '';
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.2,
          top_p: 0.9
        }
      })
    });

    if (!res.ok) {
      console.warn(`[Ollama] Model ${model} failed, trying fallback ${FALLBACK_MODEL}...`);
      const fbRes = await fetch(`${OLLAMA_HOST}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: FALLBACK_MODEL,
          prompt: prompt,
          stream: false,
          format: 'json'
        })
      });
      const fbJson = await fbRes.json();
      responseText = fbJson.response;
    } else {
      const data = await res.json();
      responseText = data.response;
    }
  } catch (err) {
    throw new Error('Ollama generation failed: ' + err.message);
  }

  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch (err) {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Could not parse JSON from model output: ' + responseText);
    }
  }

  const filePath = path.resolve('regime_research.json');
  fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), 'utf-8');
  console.log(`[✓] regime_research.json updated successfully with ${parsed.key_drivers.length} drivers!`);
  return parsed;
}

if (process.argv[1] && process.argv[1].endsWith('news.js')) {
  const modelArg = process.argv[2] || DEFAULT_MODEL;
  updateResearchNews(modelArg)
    .then(res => console.log('Result:\n', JSON.stringify(res, null, 2)))
    .catch(err => { console.error('Error:', err.message); process.exit(1); });
}
