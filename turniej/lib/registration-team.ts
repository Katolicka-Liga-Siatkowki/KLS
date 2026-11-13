import {mutate,type State,type Team} from './tournament';
export function teamFromRegistration(state:State,id:string,name:string,roster:unknown,existingTeamId?:string):Team{
 if(state.matches.some(m=>m.status!=='waiting'))throw Error('Nie można dodawać drużyn po rozpoczęciu turnieju.');
 if(existingTeamId){const existing=state.teams.find(t=>t.id===existingTeamId);if(!existing)throw Error('Nie znaleziono wybranej drużyny.');if(existing.registrationId&&existing.registrationId!==id)throw Error('Ta drużyna jest już połączona z innym zgłoszeniem.');existing.registrationId=id;return existing}
 const players=typeof roster==='string'?roster.split('\n').map(p=>p.trim()).filter(Boolean):[];
 if(players.length>30||players.some(p=>p.length>100)||new Set(players).size!==players.length)throw Error('Podaj do 30 zawodników, po jednym w wierszu, bez duplikatów.');
 if(state.teams.some(t=>t.name.trim().toLocaleLowerCase('pl-PL')===name.trim().toLocaleLowerCase('pl-PL')))throw Error('Drużyna o tej nazwie już istnieje. Wybierz ją w polu połączenia zgłoszenia.');
 if(!name.trim()||name.length>100)throw Error('Nieprawidłowa nazwa drużyny.');
 const team={id:crypto.randomUUID(),name:name.trim(),players,registrationId:id};state.teams.push(team);return team;
}
export function removeRegisteredTeam(state:State,teamId:string){mutate(state,{type:'delete-team',teamId},true)}
export const updateApprovedStateSql='UPDATE tournament SET state=?,revision=revision+1,last_mutation=? WHERE id=1 AND revision=? AND EXISTS (SELECT 1 FROM event_registrations WHERE id=? AND event_id=? AND status=? AND team_id IS NULL) AND EXISTS (SELECT 1 FROM tournament_event WHERE id=1 AND event_id=?)';
export const approveRegistrationSql="UPDATE event_registrations SET status='accepted',team_id=?,withdrawn_at=NULL WHERE id=? AND event_id=? AND EXISTS (SELECT 1 FROM tournament WHERE id=1 AND last_mutation=?)";
export const removeStateSql='UPDATE tournament SET state=?,revision=revision+1,last_mutation=? WHERE id=1 AND revision=?';
export const unlinkRegistrationSql="UPDATE event_registrations SET status='rejected',team_id=NULL,withdrawn_at=? WHERE team_id=? AND event_id=(SELECT event_id FROM tournament_event WHERE id=1) AND EXISTS (SELECT 1 FROM tournament WHERE id=1 AND last_mutation=?)";
