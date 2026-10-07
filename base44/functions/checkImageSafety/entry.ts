import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const image_url = body.image_url;
    if (!image_url) return Response.json({ error: 'image_url required' }, { status: 400 });

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: 'Does this image contain explicit, nude, sexual, or graphic content? Answer ONLY JSON: {"explicit": true/false, "reason": "short reason"}.',
      file_urls: [image_url],
      response_json_schema: {
        type: 'object',
        properties: { explicit: { type: 'boolean' }, reason: { type: 'string' } },
        required: ['explicit', 'reason']
      }
    });

    return Response.json({ explicit: !!result.explicit, reason: result.reason || '' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}