use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::EvidenceError;

#[derive(Accounts)]
#[instruction(incident_id: String)]
pub struct FlagEvidence<'info> {
    #[account(
        mut,
        seeds = [b"evidence", evidence_owner.key().as_ref(), incident_id.as_bytes()],
        bump = evidence_record.bump,
    )]
    pub evidence_record: Account<'info, EvidenceRecord>,

    /// CHECK: Owner of the evidence PDA — used to reconstruct seeds.
    pub evidence_owner: AccountInfo<'info>,

    /// The authority flagging the evidence (ML service wallet or law enforcement).
    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<FlagEvidence>, _incident_id: String, reason: String) -> Result<()> {
    require!(reason.len() <= MAX_REASON_LEN, EvidenceError::ReasonTooLong);

    let record = &mut ctx.accounts.evidence_record;
    require!(record.status != EvidenceStatus::Flagged, EvidenceError::AlreadyFlagged);

    record.status = EvidenceStatus::Flagged;

    emit!(EvidenceFlagged {
        incident_id: record.incident_id.clone(),
        reason,
        flagged_by: ctx.accounts.authority.key(),
    });

    Ok(())
}
