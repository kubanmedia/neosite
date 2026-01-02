// ... (other existing imports in your generator.ts)
// ADD THIS HELPER FUNCTION
export function pollinationsImage(prompt, seed = 42) {
    const url = `https://image.pollinations.ai/prompt/` +
        encodeURIComponent(prompt) +
        `?width=768&height=512&seed=${seed}`;
    return {
        Key: "hero",
        Alt: prompt,
        url
    };
}
// REPLACE ALL INSTANCES OF Buffer.from(...).toString("base64")
// WITH encodeBase64(...)
// ADD THIS ENCODING FUNCTION
const encodeBase64 = (data) => btoa(String.fromCharCode(...data));
// ... (rest of your generator.ts file, ensure you replace the Buffer usage)
// For example, if you have a function that creates a ZIP:
// const zipData = ...; 
// const zipBase64 = encodeBase64(zipData);
