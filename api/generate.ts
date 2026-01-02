import { VercelRequest, VercelResponse } from '@vercel/node';
import generateSite from '../src/generator';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt } = req.body as { prompt: string };
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await generateSite(prompt);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error generating site:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
