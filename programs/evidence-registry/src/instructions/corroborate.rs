use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::EvidenceError;

#[derive(Accounts)]
#[instruction(incident_id: String)]
pub struct CorroborateEvidence<'info> {
    /// The original evidence record to corroborate (owned by any prior witness).
    #[account(
        mut,
        seeds = [b"evidence", original_witness.key().as_ref(), incident_id.as_bytes()],
        bump = evidence_record.bump,
    )]
    pub evidence_record: Account<'info, EvidenceRecord>,

    /// CHECK: We only read the key to reconstruct the PDA seeds.
    pub original_witness: AccountInfo<'info>,

    /// The wallet doing the corroboration — must differ from the original witness.
    #[account(mut, constraint = corroborator.key() != original_witness.key())]
    pub corroborator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CorroborateEvidence>, _incident_id: String) -> Result<()> {
    let record = &mut ctx.accounts.evidence_record;

    require!(record.status != EvidenceStatus::Flagged, EvidenceError::AlreadyFlagged);

    record.corroboration_count = record.corroboration_count.saturating_add(1);

    if record.corroboration_count >= CORROBORATION_THRESHOLD
        && record.status == EvidenceStatus::Pending
    {
        record.status = EvidenceStatus::Confirmed;
    }

    let status_u8 = match record.status {
        EvidenceStatus::Pending => 0,
        EvidenceStatus::Confirmed => 1,
        EvidenceStatus::Flagged => 2,
    };

    emit!(EvidenceCorroborated {
        incident_id: record.incident_id.clone(),
        corroboration_count: record.corroboration_count,
        status: status_u8,
    });

    Ok(())
}
