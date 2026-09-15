export type LeagueDocument = {id:string; title:string; description:string; filename:string; mime:string; size:number; visible:number; sort_order:number; updated_at:string};
export const DOCUMENT_LIMIT = 10 * 1024 * 1024;
export const documentMime: Record<string,string> = {pdf:"application/pdf",doc:"application/msword",docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",xls:"application/vnd.ms-excel",xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"};
