// Basic base64 decoder
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Function to create a WAV file header and combine it with raw PCM data
function encodeWAV(samples: Uint8Array, sampleRate: number, numChannels: number, bitsPerSample: number): ArrayBuffer {
  const pcmData = samples.buffer;
  const buffer = new ArrayBuffer(44 + pcmData.byteLength);
  const view = new DataView(buffer);
  
  const blockAlign = numChannels * bitsPerSample / 8;
  const byteRate = sampleRate * blockAlign;

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.byteLength, true);
  writeString(view, 8, 'WAVE');
  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // audio format (1 = PCM)
  view.setUint16(22, numChannels, true); // num channels
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true); // byte rate
  view.setUint16(32, blockAlign, true); // block align
  view.setUint16(34, bitsPerSample, true); // bits per sample
  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.byteLength, true);

  // Write PCM data
  const pcmBytes = new Uint8Array(pcmData);
  for (let i = 0; i < pcmBytes.length; i++) {
    view.setUint8(44 + i, pcmBytes[i]);
  }

  return buffer;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Decodes a base64 string containing raw PCM audio data from the Gemini API
 * and creates a proper .wav file Blob.
 * @param base64Audio The base64 encoded audio string.
 * @returns A promise that resolves to a Blob of the .wav audio file.
 */
export async function decodeAndCreateWavBlob(base64Audio: string): Promise<Blob> {
  const pcmData = decode(base64Audio);
  
  // Gemini TTS API returns raw audio data with a sample rate of 24,000 Hz,
  // 16 bits per sample, and a single audio channel (mono).
  const sampleRate = 24000;
  const bitsPerSample = 16;
  const numChannels = 1;

  const wavBuffer = encodeWAV(pcmData, sampleRate, numChannels, bitsPerSample);
  
  return new Blob([wavBuffer], { type: 'audio/wav' });
}
