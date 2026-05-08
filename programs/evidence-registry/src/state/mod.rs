use anchor_lang::prelude::*;

/// Maximum length for IPFS CID strings (CIDv1 base32 ~59 chars, give headroom).
pub const MAX_CID_LEN: usize = 64;
/// Maximum length for incident_id (UUID v4 = 36 chars).
pub const MAX_INCIDENT_ID_LEN: usize = 40;
/// Maximum length for flag reason text.
pub const MAX_REASON_LEN: usize = 200;
/// Maximum length for metadata URI (badge minting).
pub const MAX_URI_LEN: usize = 200;
/// Minimum number of independent witnesses to auto-confirm an incident.
pub const CORROBORATION_THRESHOLD: u8 = 3;

// ─────────────────────────────────────────────
//  EvidenceRecord — PDA per (wallet, incident)
// ─────────────────────────────────────────────

#[account]
#[derive(Default)]
pub struct EvidenceRecord {
    /// Submitting wallet public key.
    pub witness: Pubkey,
    /// SHA-256 hash of the media file, computed on-device before upload.
    pub sha256_hash: [u8; 32],
    /// IPFS content identifier where the media is pinned.
    pub ipfs_cid: String,
    /// UUID v4 that identifies the incident cluster this evidence belongs to.
    pub incident_id: String,
    /// GPS latitude × 10^7 (stored as integer to avoid floats).
    pub latitude: i64,
    /// GPS longitude × 10^7.
    pub longitude: i64,
    /// Block-level Unix timestamp set at submission time.
    pub timestamp: i64,
    /// Number of independent witnesses who corroborated this incident.
    pub corroboration_count: u8,
    /// Current evidence status.
    pub status: EvidenceStatus,
    /// PDA bump seed.
    pub bump: u8,
}

impl EvidenceRecord {
    pub const LEN: usize = 8            // discriminator
        + 32                            // witness pubkey
        + 32                            // sha256_hash [u8;32]
        + 4 + MAX_CID_LEN              // ipfs_cid (length prefix + bytes)
        + 4 + MAX_INCIDENT_ID_LEN      // incident_id
        + 8                             // latitude
        + 8                             // longitude
        + 8                             // timestamp
        + 1                             // corroboration_count
        + 1                             // status enum
        + 1;                            // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Default)]
pub enum EvidenceStatus {
    #[default]
    Pending,    // < CORROBORATION_THRESHOLD witnesses
    Confirmed,  // >= CORROBORATION_THRESHOLD independent witnesses
    Flagged,    // ML or authority flagged as potentially manipulated
}

// ─────────────────────────────────────────────
//  WitnessProfile — PDA per wallet
// ─────────────────────────────────────────────

#[account]
#[derive(Default)]
pub struct WitnessProfile {
    /// Wallet this profile belongs to.
    pub wallet: Pubkey,
    /// Cumulative witness score (can be updated by authority).
    pub score: i64,
    /// Total submissions ever made.
    pub submission_count: u32,
    /// Total confirmed incidents contributed to.
    pub confirmed_count: u32,
    /// Bitfield of earned badge types (bit i = badge type i earned).
    pub badge_bitfield: u64,
    /// PDA bump seed.
    pub bump: u8,
}

impl WitnessProfile {
    pub const LEN: usize = 8   // discriminator
        + 32                    // wallet
        + 8                     // score
        + 4                     // submission_count
        + 4                     // confirmed_count
        + 8                     // badge_bitfield
        + 1;                    // bump
}

// ─────────────────────────────────────────────
//  On-chain events (emitted for indexers)
// ─────────────────────────────────────────────

#[event]
pub struct EvidenceSubmitted {
    pub witness: Pubkey,
    pub incident_id: String,
    pub ipfs_cid: String,
    pub timestamp: i64,
}

#[event]
pub struct EvidenceCorroborated {
    pub incident_id: String,
    pub corroboration_count: u8,
    pub status: u8, // 0=Pending,1=Confirmed,2=Flagged
}

#[event]
pub struct EvidenceFlagged {
    pub incident_id: String,
    pub reason: String,
    pub flagged_by: Pubkey,
}

#[event]
pub struct EvidenceExported {
    pub incident_id: String,
    pub exported_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct BadgeMinted {
    pub recipient: Pubkey,
    pub badge_type: u8,
    pub mint: Pubkey,
}

#[event]
pub struct WitnessScoreUpdated {
    pub wallet: Pubkey,
    pub new_score: i64,
}
