use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;
pub mod errors;

use instructions::*;

declare_id!("AnUPkBodvjwk4XZorYm8MtgJ9jy9E9VzJwG8GJfTvYnS");

#[program]
pub mod evidence_registry {
    use super::*;

    /// Submit a new piece of evidence for an incident.
    /// Creates a PDA keyed by [b"evidence", wallet, incident_id].
    pub fn submit_evidence(
        ctx: Context<SubmitEvidence>,
        sha256_hash: [u8; 32],
        ipfs_cid: String,
        incident_id: String,
        latitude: i64,
        longitude: i64,
    ) -> Result<()> {
        instructions::submit::handler(ctx, sha256_hash, ipfs_cid, incident_id, latitude, longitude)
    }

    /// Corroborate an existing incident — increments corroboration_count.
    /// If count reaches CORROBORATION_THRESHOLD, status is set to Confirmed.
    pub fn corroborate_evidence(
        ctx: Context<CorroborateEvidence>,
        incident_id: String,
    ) -> Result<()> {
        instructions::corroborate::handler(ctx, incident_id)
    }

    /// Flag evidence as potentially manipulated (ML service or authority).
    pub fn flag_evidence(
        ctx: Context<FlagEvidence>,
        incident_id: String,
        reason: String,
    ) -> Result<()> {
        instructions::flag::handler(ctx, incident_id, reason)
    }

    /// Read-only export — emits a FlaggedExport event with full provenance.
    pub fn export_evidence(
        ctx: Context<ExportEvidence>,
        incident_id: String,
    ) -> Result<()> {
        instructions::export::handler(ctx, incident_id)
    }

    /// Mint a soul-bound NFT badge for a witness.
    pub fn mint_badge(
        ctx: Context<MintBadge>,
        badge_type: u8,
        metadata_uri: String,
    ) -> Result<()> {
        instructions::mint_badge::handler(ctx, badge_type, metadata_uri)
    }

    /// Update the witness score on-chain (called by the backend service).
    pub fn update_witness_score(
        ctx: Context<UpdateWitnessScore>,
        delta: i64,
    ) -> Result<()> {
        instructions::update_score::handler(ctx, delta)
    }
}
