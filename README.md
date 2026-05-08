# 🔗 WitnessChain
### Decentralized Bystander Evidence Network on Solana

> *"We turned civic evidence collection into a game — where every witness is a player, every recording is immutable, and justice has a leaderboard."*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built on Solana](https://img.shields.io/badge/Built%20on-Solana-9945FF?logo=solana)](https://solana.com)
[![IPFS](https://img.shields.io/badge/Storage-IPFS-65C2CB?logo=ipfs)](https://ipfs.tech)
[![NMIT Hacks 2026](https://img.shields.io/badge/NMIT%20Hacks-2026-orange)](https://nmithacks.com)

---

## 📌 Table of Contents

- [Problem Statement](#-problem-statement)
- [Proposed Solution](#-proposed-solution)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Smart Contract Design](#-smart-contract-design)
- [Gamification System](#-gamification-system)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [Roadmap](#-roadmap)
- [Team](#-team)
- [License](#-license)

---

## 🚨 Problem Statement

Every day in India, **53+ hit-and-run accidents** and countless street crimes go unpunished — not because no one witnessed them, but because evidence dies before it reaches justice.

| The Gap | Reality |
|---|---|
| Bystanders record everything | Video gets deleted under pressure or coercion |
| Evidence exists | Chain-of-custody cannot be proven in court |
| Witnesses are willing | Zero incentive to formally report |
| Authorities need proof | No tamper-proof submission channel exists |

Current systems rely on **centralized storage** — a single point of failure where evidence can be wiped, modified, or suppressed. There is no mechanism that makes tampering *mathematically impossible* from the moment of capture.

**The result:** Perpetrators walk free. Witnesses stay silent. Justice has no memory.

---

## 💡 Proposed Solution

**WitnessChain** is a decentralized civic evidence network that transforms every smartphone into a tamper-proof evidence terminal.

When a user captures an incident:

1. **Media is hashed instantly** (SHA-256) on-device before upload — the fingerprint is immutable from second zero
2. **Hash is anchored on Solana** via a Program Derived Address — timestamped permanently on-chain
3. **Media is stored on IPFS** via Pinata — decentralized, uncensorable, content-addressed
4. **Multi-witness corroboration** — when 3+ independent users hash the same incident window, evidence is auto-elevated to *"Confirmed"* status
5. **Legal export API** — authorities can pull tamper-proof evidence bundles with full provenance metadata
6. **Witness Score + Soul-bound NFT badges** — gamified reputation system that rewards honest civic participation

The cryptographic guarantee: if even one byte of evidence is altered after submission, the hash mismatch is immediately detectable. **Tampering becomes mathematically visible.**

---

## ✨ Key Features

### 🔐 Tamper-Proof Evidence Capture
- On-device SHA-256 hashing before any upload
- IPFS content-addressed storage (CID = fingerprint)
- Solana PDA anchoring with block timestamp
- Metadata bundle: GPS coordinates, device ID hash, timestamp, media CID

### 👥 Multi-Witness Corroboration
- Incident clustering by GPS radius + time window (configurable)
- Consensus threshold: 3 independent witnesses = "Confirmed" status
- Anti-Sybil: wallet-bound submissions, one submission per wallet per incident

### 🎮 Gamified Witness Reputation
- **Witness Score** — cumulative reputation metric
- **Soul-bound NFT Badges** — non-transferable, wallet-bound achievement tokens
  - 🥉 First Witness — submitted first evidence of an incident
  - 🥈 Corroborator — part of a confirmed multi-witness cluster
  - 🥇 Civic Guardian — 10+ confirmed submissions
  - 💎 Chain Anchor — evidence used in an active legal case
- **Leaderboard** — top witnesses in your city/district

### 🤖 Deepfake / Duplicate Flagging
- TensorFlow.js model flags AI-generated or manipulated media at submission
- Perceptual hash (pHash) deduplication to prevent spam submissions
- Confidence score surfaced to reviewing authorities

### 📤 Legal Export API
- Read-only REST endpoint for authorized law enforcement
- Returns: IPFS CID, Solana transaction signature, witness count, GPS metadata, timestamp
- Exportable as signed PDF evidence bundle

### 🗺️ Incident Heat Map
- Public dashboard showing anonymized incident clusters
- Filter by type, time, corroboration status
- City/district level granularity

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    WITNESS DEVICE                        │
│                                                          │
│  [Camera/Gallery] → [On-device SHA-256 Hash]            │
│        ↓                      ↓                          │
│  [Media Upload]         [Hash + Metadata]               │
└──────────┬────────────────────┬────────────────────────-┘
           │                    │
           ▼                    ▼
    ┌─────────────┐    ┌─────────────────────┐
    │    IPFS     │    │   Solana Blockchain  │
    │  (Pinata)   │    │                      │
    │             │    │  Program Derived     │
    │  Returns    │    │  Address (PDA)       │
    │    CID      │    │  anchors:            │
    │             │    │  - SHA-256 hash      │
    │             │    │  - IPFS CID          │
    │             │    │  - GPS metadata      │
    │             │    │  - Block timestamp   │
    └──────┬──────┘    └──────────┬───────────┘
           │                      │
           └──────────┬───────────┘
                      ▼
           ┌─────────────────────┐
           │   Node.js Backend   │
           │   + Supabase DB     │
           │                     │
           │  - Incident cluster │
           │  - Witness scoring  │
           │  - Corroboration    │
           │  - Legal export API │
           └──────────┬──────────┘
                      │
           ┌──────────┴──────────┐
           ▼                     ▼
    ┌─────────────┐    ┌──────────────────┐
    │  React Native│    │  Next.js Dashboard│
    │  Mobile App  │    │  (Public Heatmap  │
    │  (Witnesses) │    │   + Legal Portal) │
    └─────────────┘    └──────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Mobile** | React Native + Expo | Cross-platform witness app |
| **Blockchain** | Solana (Devnet → Mainnet) | Immutable hash anchoring |
| **Smart Contracts** | Anchor Framework (Rust) | PDA-based evidence registry |
| **Decentralized Storage** | IPFS via Pinata | Censorship-resistant media storage |
| **Backend** | Node.js + Express | API, clustering, scoring logic |
| **Database** | Supabase (PostgreSQL) | Incident metadata, user profiles |
| **Frontend Dashboard** | Next.js + Tailwind CSS | Heatmap, legal portal, leaderboard |
| **ML / AI** | TensorFlow.js | Deepfake detection, pHash dedup |
| **NFT Minting** | Metaplex (Soul-bound tokens) | Non-transferable witness badges |
| **Wallet** | Phantom / Solana Wallet Adapter | User authentication |
| **Maps** | Mapbox GL JS | Incident heatmap visualization |

---

## 📜 Smart Contract Design

### Evidence Registry Program (Anchor / Rust)

```rust
// Evidence Account PDA
// Seeds: ["evidence", wallet_pubkey, incident_id]

#[account]
pub struct EvidenceRecord {
    pub witness: Pubkey,          // Submitting wallet
    pub sha256_hash: [u8; 32],    // On-device computed hash
    pub ipfs_cid: String,         // IPFS content identifier
    pub incident_id: String,      // Clustered incident UUID
    pub latitude: i64,            // GPS lat * 1e7 (integer)
    pub longitude: i64,           // GPS lon * 1e7 (integer)
    pub timestamp: i64,           // Unix timestamp (on-chain)
    pub corroboration_count: u8,  // Number of matching witnesses
    pub status: EvidenceStatus,   // Pending / Confirmed / Flagged
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum EvidenceStatus {
    Pending,    // < 3 witnesses
    Confirmed,  // >= 3 independent witnesses
    Flagged,    // ML flagged as potentially manipulated
}

// Instructions:
// - submit_evidence(hash, cid, lat, lon, incident_id)
// - corroborate_evidence(incident_id)
// - flag_evidence(incident_id, reason)
// - export_evidence(incident_id) → read-only
```

---

## 🎮 Gamification System

### Witness Score Formula

```
WitnessScore = Σ (SubmissionWeight × CorroborationMultiplier × RecencyDecay)

Where:
  SubmissionWeight      = 10 (base) | 25 (first witness) | 5 (corroborator)
  CorroborationMultiplier = 1.0 (pending) | 2.5 (confirmed) | 0.0 (flagged)
  RecencyDecay          = e^(-0.01 × days_since_submission)
```

### Badge Tiers

| Badge | Trigger | Type |
|---|---|---|
| 🔍 First Witness | First to submit evidence of an incident | Soul-bound NFT |
| 🤝 Corroborator | Part of a 3+ witness confirmed cluster | Soul-bound NFT |
| 🛡️ Civic Guardian | 10+ confirmed submissions | Soul-bound NFT |
| ⚖️ Chain Anchor | Evidence used in an active legal export | Soul-bound NFT |
| 🏙️ City Sentinel | Top 10 witness score in your city | Soul-bound NFT |

All badges are **non-transferable** (soul-bound) — they cannot be bought, sold, or gamed.

---

## 🚀 Getting Started

### Prerequisites

```bash
node >= 18.0.0
npm >= 9.0.0
Rust + Cargo (for Anchor)
Solana CLI >= 1.18
Anchor CLI >= 0.30
Expo CLI (for mobile)
```

### Installation

```bash
# Clone the repository
git clone https://github.com/ZeroTamper/witnesschain.git
cd witnesschain

# Install root dependencies
npm install

# Install smart contract dependencies
cd programs/evidence-registry
cargo build

# Install mobile app dependencies
cd ../../apps/mobile
npm install

# Install dashboard dependencies
cd ../dashboard
npm install
```

### Environment Setup

```bash
# apps/mobile/.env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_PINATA_JWT=your_pinata_jwt
EXPO_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
EXPO_PUBLIC_PROGRAM_ID=your_deployed_program_id

# apps/dashboard/.env
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
LEGAL_API_SECRET=your_legal_api_secret
```

### Deploy Smart Contract

```bash
# Configure Solana CLI for devnet
solana config set --url devnet
solana airdrop 2

# Build and deploy
cd programs/evidence-registry
anchor build
anchor deploy

# Copy Program ID to your .env files
```

### Run Locally

```bash
# Start backend
cd apps/backend
npm run dev

# Start dashboard
cd apps/dashboard
npm run dev

# Start mobile (Expo)
cd apps/mobile
npx expo start
```

---

## 📁 Project Structure

```
witnesschain/
├── programs/
│   └── evidence-registry/        # Anchor smart contract (Rust)
│       ├── src/
│       │   ├── lib.rs            # Program entrypoint
│       │   ├── instructions/     # submit, corroborate, flag, export
│       │   └── state/            # EvidenceRecord, EvidenceStatus
│       └── Cargo.toml
│
├── apps/
│   ├── mobile/                   # React Native witness app
│   │   ├── src/
│   │   │   ├── screens/          # Capture, Submit, Profile, Leaderboard
│   │   │   ├── components/       # WitnessCard, BadgeDisplay, HeatMap
│   │   │   ├── hooks/            # useSolana, useIPFS, useWitnessScore
│   │   │   └── utils/            # sha256.ts, pHash.ts, cluster.ts
│   │   └── package.json
│   │
│   ├── dashboard/                # Next.js public dashboard + legal portal
│   │   ├── app/
│   │   │   ├── page.tsx          # Incident heatmap
│   │   │   ├── leaderboard/      # City witness rankings
│   │   │   └── legal/            # Authorized evidence export portal
│   │   └── package.json
│   │
│   └── backend/                  # Node.js API
│       ├── src/
│       │   ├── routes/           # /evidence, /incidents, /export, /score
│       │   ├── services/         # clustering, scoring, deepfake-flag
│       │   └── middleware/       # auth, rate-limit, legal-auth
│       └── package.json
│
├── ml/
│   └── deepfake-detector/        # TensorFlow.js model + pHash logic
│
├── tests/                        # Anchor program tests
├── README.md
└── package.json
```

---

## 📡 API Reference

### Submit Evidence
```http
POST /api/evidence/submit
Authorization: Bearer <wallet_signature>

{
  "sha256Hash": "abc123...",
  "ipfsCid": "QmXyz...",
  "incidentId": "uuid-v4",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "mediaType": "video/mp4",
  "deviceIdHash": "sha256_of_device_id"
}
```

### Get Incident Cluster
```http
GET /api/incidents/:incidentId

Response:
{
  "incidentId": "uuid-v4",
  "status": "Confirmed",
  "witnessCount": 4,
  "firstSeenAt": "2026-05-08T14:23:00Z",
  "location": { "lat": 12.9716, "lon": 77.5946 },
  "evidenceRecords": [ ... ],
  "solanaSignatures": [ "sig1...", "sig2..." ]
}
```

### Legal Export (Authorized Only)
```http
GET /api/export/:incidentId
Authorization: Bearer <legal_api_secret>

Response:
{
  "incidentId": "uuid-v4",
  "exportedAt": "2026-05-08T16:00:00Z",
  "evidenceBundle": [ ... ],
  "chainOfCustody": [ ... ],
  "verificationInstructions": "..."
}
```

---

## 🗺️ Roadmap

### Hackathon MVP (48 hours)
- [x] On-device SHA-256 hashing
- [x] IPFS upload via Pinata
- [x] Solana PDA anchoring (devnet)
- [x] Basic incident clustering
- [x] Witness Score calculation
- [x] Soul-bound NFT badge minting (1 badge type)
- [x] Public heatmap dashboard
- [x] Live demo flow end-to-end

### Post-Hackathon (Month 1–3)
- [ ] Deepfake detection ML model (production-grade)
- [ ] Full badge tier system (5 badge types)
- [ ] Legal export API with authentication
- [ ] Anti-Sybil improvements
- [ ] Multi-language support (Hindi, Kannada, Tamil)
- [ ] Mainnet deployment

### Scale (Month 3–6)
- [ ] MoU with state police departments
- [ ] Integration with DigiLocker for witness identity verification
- [ ] DAO governance for evidence dispute resolution
- [ ] iOS + Android app store release
- [ ] Partnership with road safety NGOs

---

## 👥 Team

**Team ZeroTamper** — NMIT Hacks 2026

| Name | Role |
|---|---|
| [Member 1] | Blockchain / Smart Contracts |
| [Member 2] | Mobile App / React Native |
| [Member 3] | Backend / ML |
| [Member 4] | Frontend / Design |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgements

- [Solana Foundation](https://solana.com) — blockchain infrastructure
- [Anchor Framework](https://anchor-lang.com) — smart contract development
- [Pinata](https://pinata.cloud) — IPFS pinning service
- [Metaplex](https://metaplex.com) — soul-bound NFT standard
- [NMIT Hacks 2026](https://nmithacks.com) — for the stage

---

<div align="center">

**Built in 48 hours at NMIT Hacks 2026 · Bengaluru, India**

*Every witness is a player. Every recording is immutable. Justice has a leaderboard.*

</div>