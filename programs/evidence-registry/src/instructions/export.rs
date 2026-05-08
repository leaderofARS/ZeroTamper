use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
#[instruction(incident_id: String)]
pub struct ExportEvidence<'info> {
    #[account(
        seeds = [b"evidence", evidence_owner.key().as_ref(), incident_id.as_bytes()],
        bump = evidence_record.bump,
    )]
    pub evidence_record: Account<'info, EvidenceRecord>,

    /// CHECK: Owner of the evidence PDA — used to reconstruct seeds.
    pub evidence_owner: AccountInfo<'info>,

    /// Authorized exporter (legal API service or law enforcement wallet).
    pub exporter: Signer<'info>,
}

pub fn handler(ctx: Context<ExportEvidence>, _incident_id: String) -> Result<()> {
    let record = &ctx.accounts.evidence_record;
    let clock = Clock::get()?;

    emit!(EvidenceExported {
        incident_id: record.incident_id.clone(),
        exported_by: ctx.accounts.exporter.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
