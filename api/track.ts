import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body as { userId: string };
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get current user stats
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('Generates, lastUsed')
      .eq('id', userId)
      .single();

    if (fetcrror && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    // Update or insert user stats
    const updates = {
      id: userId,
      Generates: (user?.Generates || 0) + 1,
      lastUsed: new Date().toISOString(),
    };

   const { error: upsertError } = await supabase
      .from('users')
      .upsert(updates);l

    if (upsertError) throw upsertError;

    res.status(200).json({ success: true, stats: updates });
  } catch (error) {
    console.error('Error tracking usage:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
