export function visibleTournamentTab(role:string,id:string,publicCompetition=false){
 if(role==='organizer')return true;
 if(role==='referee')return id==='ref'||id==='schedule';
 return (publicCompetition?['home','overview','schedule','table','bracket','teams','support','registrations']:['home','teams','support','registrations']).includes(id);
}
export function canExportTournament(role:string){return role==='organizer'}
