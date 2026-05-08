use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
pub struct UpdateWitnessScore<'info> {
    #[account(
        mut,
        seeds = [b"profile", wallet.key().as_ref()],
        bump = witness_profile.bump,
    )]
    pub witness_profile: Account<'info, WitnessProfile>,

    /// CHECK: Only used as a seed — the wallet whose score is updated.
    pub wallet: AccountInfo<'info>,

    /// Authority allowed to update scores (the backend service wallet).
    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<UpdateWitnessScore>, delta: i64) -> Result<()> {
    let profile = &mut ctx.accounts.witness_profile;
    profile.score = profile.score.saturating_add(delta);

    emit!(WitnessScoreUpdated {
        wallet: profile.wallet,
        new_score: profile.score,
    });

    Ok(())
}
