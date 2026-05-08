use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::EvidenceError;

#[derive(Accounts)]
#[instruction(sha256_hash: [u8; 32], ipfs_cid: String, incident_id: String)]
pub struct SubmitEvidence<'info> {
    #[account(
        init,
        payer = witness,
        space = EvidenceRecord::LEN,
        seeds = [b"evidence", witness.key().as_ref(), incident_id.as_bytes()],
        bump
    )]
    pub evidence_record: Account<'info, EvidenceRecord>,

    #[account(
        init_if_needed,
        payer = witness,
        space = WitnessProfile::LEN,
        seeds = [b"profile", witness.key().as_ref()],
        bump
    )]
    pub witness_profile: Account<'info, WitnessProfile>,

    #[account(mut)]
    pub witness: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<SubmitEvidence>,
    sha256_hash: [u8; 32],
    ipfs_cid: String,
    incident_id: String,
    latitude: i64,
    longitude: i64,
) -> Result<()> {
    require!(ipfs_cid.len() <= MAX_CID_LEN, EvidenceError::CidTooLong);
    require!(incident_id.len() <= MAX_INCIDENT_ID_LEN, EvidenceError::IncidentIdTooLong);

    let clock = Clock::get()?;
    let record = &mut ctx.accounts.evidence_record;

    record.witness = ctx.accounts.witness.key();
    record.sha256_hash = sha256_hash;
    record.ipfs_cid = ipfs_cid.clone();
    record.incident_id = incident_id.clone();
    record.latitude = latitude;
    record.longitude = longitude;
    record.timestamp = clock.unix_timestamp;
    record.corroboration_count = 1;
    record.status = EvidenceStatus::Pending;
    record.bump = ctx.bumps.evidence_record;

    // Update witness profile
    let profile = &mut ctx.accounts.witness_profile;
    if profile.wallet == Pubkey::default() {
        profile.wallet = ctx.accounts.witness.key();
        profile.bump = ctx.bumps.witness_profile;
    }
    profile.submission_count += 1;

    emit!(EvidenceSubmitted {
        witness: ctx.accounts.witness.key(),
        incident_id,
        ipfs_cid,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
