import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const image_url = body.image_url;
    const category = body.category;
    const tags = body.tags || [];

    if (!image_url || !category) {
      return Response.json({ error: 'image_url and category are required' }, { status: 400 });
    }

    const prompt = `You are a streetwear fashion critic. Look at this outfit photo and write a punchy style description (max 220 chars): garments, colors, silhouettes, fabrics, overall vibe, era. Then produce a 32-dimensional taste embedding (numbers between -1 and 1) capturing the style so similar outfits score high on cosine similarity. Respond ONLY as JSON: {"style_description": "...", "embedding": [32 numbers]}. Category: ${category}. Tags: ${tags.join(', ')}.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [image_url],
      response_json_schema: {
        type: 'object',
        properties: {
          style_description: { type: 'string' },
          embedding: { type: 'array', items: { type: 'number' } }
        },
        required: ['style_description', 'embedding']
      }
    });

    let style_description = result.style_description || 'A fresh fit with confident energy.';
    let embedding = result.embedding;
    if (!Array.isArray(embedding) || embedding.length !== 32) {
      embedding = Array.from({ length: 32 }, () => Math.random() * 2 - 1);
    }

    return Response.json({ style_description, embedding });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}