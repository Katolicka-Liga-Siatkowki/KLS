interface Fetcher {fetch(request: Request): Promise<Response>}
interface D1Result {meta:{changes:number}}
interface D1PreparedStatement {bind(...values:unknown[]):D1PreparedStatement;first<T=Record<string,unknown>>():Promise<T|null>;run():Promise<D1Result>}
interface D1Database {prepare(query:string):D1PreparedStatement}
declare module 'cloudflare:workers' {export const env:{DB:D1Database;INITIAL_ADMIN_EMAIL?:string;ADMIN_PASSWORD?:string;REFEREE_PASSWORD?:string}}
