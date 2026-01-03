import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generate } from "../src/generator";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await generate(req.body);
    res.status(200).json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
