declare namespace Cloudflare {
  interface Env {
    ASSETS: Fetcher;
    DB: D1Database;
    BUCKET: R2Bucket;
    INITIAL_ADMIN_EMAIL?: string;
    ADMIN_PASSWORD?: string;
    SESSION_SECRET?: string;
    GOOGLE_MAIL_URL?: string;
    GOOGLE_MAIL_SECRET?: string;
  }
}
