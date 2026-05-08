import axios from "axios";
import FormData from "form-data";

const PINATA_JWT = process.env.PINATA_JWT!;
const PINATA_API = "https://api.pinata.cloud";

export interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

/**
 * Upload a Buffer to IPFS via Pinata.
 * Returns the IPFS CID (v0 "Qm..." or v1).
 */
export async function uploadToIPFS(
  buffer: Buffer,
  filename: string,
  metadata?: Record<string, string>
): Promise<string> {
  const form = new FormData();
  form.append("file", buffer, { filename });

  if (metadata) {
    form.append(
      "pinataMetadata",
      JSON.stringify({ name: filename, keyvalues: metadata })
    );
  }

  const { data } = await axios.post<PinataResponse>(
    `${PINATA_API}/pinning/pinFileToIPFS`,
    form,
    {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      maxBodyLength: Infinity,
    }
  );

  return data.IpfsHash;
}

/**
 * Pin a JSON object to IPFS via Pinata (useful for metadata bundles).
 */
export async function pinJSONToIPFS(
  json: Record<string, unknown>,
  name: string
): Promise<string> {
  const { data } = await axios.post<PinataResponse>(
    `${PINATA_API}/pinning/pinJSONToIPFS`,
    { pinataContent: json, pinataMetadata: { name } },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PINATA_JWT}`,
      },
    }
  );

  return data.IpfsHash;
}

/** Check whether a CID is pinned and accessible. */
export async function isCIDPinned(cid: string): Promise<boolean> {
  try {
    const { data } = await axios.get(`${PINATA_API}/data/pinList`, {
      params: { hashContains: cid, status: "pinned" },
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
    });
    return data.count > 0;
  } catch {
    return false;
  }
}
