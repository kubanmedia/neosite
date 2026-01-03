export function generateSite(prompt: string): Promise<any> {
  console.log('Generating site for prompt:', prompt);
  
  // Remove unused encodeBase64 or use it
  const encodeBase64 = (data: Uint8Array) => {
    return Buffer.from(data).toString('base64');
  };

  return Promise.resolve({
    success: true,
    message: `Generated site for: ${prompt}`,
    url: 'https://example.com',
    timestamp: new Date().toISOString(),
    encoded: encodeBase64(new TextEncoder().encode(prompt))
  });
}
