import sharp from "sharp";

/** pHash block size — 8x8 DCT blocks give 64-bit hash */
const HASH_SIZE = 8;
const SAMPLE_SIZE = 32; // intermediate resize

/**
 * Compute a perceptual hash (difference hash) of an image.
 * Returns a 64-bit hex string (16 hex characters).
 *
 * The dHash algorithm:
 *   1. Resize to (HASH_SIZE+1) x HASH_SIZE grayscale
 *   2. Compute gradient: is pixel[x] > pixel[x+1] for each row
 *   3. Pack bits into a BigInt and return as hex
 */
export async function computePHash(imageBuffer: Buffer): Promise<string> {
  const width  = HASH_SIZE + 1;
  const height = HASH_SIZE;

  const { data } = await sharp(imageBuffer)
    .resize(width, height)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let bits = 0n;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < HASH_SIZE; col++) {
      const left  = data[row * width + col];
      const right = data[row * width + col + 1];
      bits = (bits << 1n) | (left > right ? 1n : 0n);
    }
  }

  return bits.toString(16).padStart(16, "0");
}

/**
 * Hamming distance between two pHash strings (hex).
 * Returns the number of differing bits (0 = identical, 64 = max different).
 */
export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return 64;

  const aInt = BigInt("0x" + a);
  const bInt = BigInt("0x" + b);
  let xor  = aInt ^ bInt;
  let dist = 0;

  while (xor > 0n) {
    dist += Number(xor & 1n);
    xor >>= 1n;
  }

  return dist;
}

/**
 * Returns true if two pHashes are considered duplicates (Hamming distance ≤ threshold).
 */
export function isDuplicate(a: string, b: string, threshold = 10): boolean {
  return hammingDistance(a, b) <= threshold;
}
