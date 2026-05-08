use anchor_lang::prelude::*;

#[error_code]
pub enum EvidenceError {
    #[msg("IPFS CID exceeds maximum length")]
    CidTooLong,

    #[msg("Incident ID exceeds maximum length")]
    IncidentIdTooLong,

    #[msg("Flag reason exceeds maximum length")]
    ReasonTooLong,

    #[msg("Metadata URI exceeds maximum length")]
    UriTooLong,

    #[msg("Evidence has already been flagged")]
    AlreadyFlagged,

    #[msg("Evidence is already confirmed")]
    AlreadyConfirmed,

    #[msg("Witness has already submitted evidence for this incident")]
    DuplicateSubmission,

    #[msg("Unauthorized: only the authority can perform this action")]
    Unauthorized,

    #[msg("Invalid badge type")]
    InvalidBadgeType,

    #[msg("Badge already minted for this witness")]
    BadgeAlreadyMinted,
}
