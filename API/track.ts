export const config = { runtime: "edge" };

let memoryStats = {
  Generates: 0,
  lastUsed: null as string | null
};

export default async function handler(req: Request) {
  if (req.method === "POST") {
    memoryStats.generates += 1;
    memoryStats.lastUsed = new Date().toISOString();
  }

  return new Response(JSON.stringify(memoryStats), {
    headers: { "Content-Type": "application/json" }
  });
}
