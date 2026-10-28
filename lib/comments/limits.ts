/**
 * Length limits shared by the composer, the validator and the format encoder.
 *
 * Kept free of server imports so the client bundle can size its counter
 * without pulling `server-only` modules.
 */

/** Notion's hard limit for one comment's rich text. */
export const NOTION_COMMENT_LIMIT = 2000;
/** What a visitor may actually type. */
export const COMMENT_MIN_LENGTH = 3;
export const COMMENT_MAX_LENGTH = 1000;
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 60;
/** Page size for the feed. */
export const COMMENTS_PAGE_SIZE = 25;
