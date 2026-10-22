export function visibleTournamentTab(role:string,id:string){
 if(role==='organizer')return true;
 if(role==='referee')return id==='ref'||id==='schedule';
 return ['overview','schedule','table','bracket','teams'].includes(id);
}
export function canExportTournament(role:string){return role==='organizer'}
