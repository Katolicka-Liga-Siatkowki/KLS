interface Fetcher {fetch(request: Request): Promise<Response>}
interface D1Result {meta:{changes:number}}
interface D1PreparedStatement {bind(...values:unknown[]):D1PreparedStatement;first<T=Record<string,unknown>>():Promise<T|null>;all<T=Record<string,unknown>>():Promise<{results:T[]}>;run():Promise<D1Result>}
interface D1Database {batch(statements:D1PreparedStatement[]):Promise<D1Result[]>;prepare(query:string):D1PreparedStatement}
declare module 'cloudflare:workers' {export const env:{DB:D1Database;INITIAL_ADMIN_EMAIL?:string;ADMIN_PASSWORD?:string;REFEREE_PASSWORD?:string}}
