use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::*;
use crate::errors::EvidenceError;

/// Maximum badge type value (0-based index, 4 = City Sentinel).
pub const MAX_BADGE_TYPE: u8 = 4;

#[derive(Accounts)]
#[instruction(badge_type: u8, metadata_uri: String)]
pub struct MintBadge<'info> {
    #[account(
        mut,
        seeds = [b"profile", recipient.key().as_ref()],
        bump = witness_profile.bump,
    )]
    pub witness_profile: Account<'info, WitnessProfile>,

    /// The badge mint — one per badge_type per wallet.
    #[account(
        init,
        payer = authority,
        mint::decimals = 0,
        mint::authority = authority,
        mint::freeze_authority = authority,
        seeds = [b"badge", recipient.key().as_ref(), &[badge_type]],
        bump,
    )]
    pub badge_mint: Account<'info, Mint>,

    /// ATA that receives exactly 1 token.
    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = badge_mint,
        associated_token::authority = recipient,
    )]
    pub recipient_ata: Account<'info, TokenAccount>,

    /// CHECK: Just a pubkey, no on-chain data needed.
    pub recipient: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<MintBadge>, badge_type: u8, _metadata_uri: String) -> Result<()> {
    require!(badge_type <= MAX_BADGE_TYPE, EvidenceError::InvalidBadgeType);

    let profile = &mut ctx.accounts.witness_profile;
    let badge_bit: u64 = 1 << badge_type;
    require!(profile.badge_bitfield & badge_bit == 0, EvidenceError::BadgeAlreadyMinted);

    // Mint exactly 1 soul-bound token
    token::mint_to(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                mint: ctx.accounts.badge_mint.to_account_info(),
                to: ctx.accounts.recipient_ata.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ),
        1,
    )?;

    // Freeze the ATA — soul-bound: cannot be transferred
    token::freeze_account(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::FreezeAccount {
                account: ctx.accounts.recipient_ata.to_account_info(),
                mint: ctx.accounts.badge_mint.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ),
    )?;

    profile.badge_bitfield |= badge_bit;

    emit!(BadgeMinted {
        recipient: ctx.accounts.recipient.key(),
        badge_type,
        mint: ctx.accounts.badge_mint.key(),
    });

    Ok(())
}
