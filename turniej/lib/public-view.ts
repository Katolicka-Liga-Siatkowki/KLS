import type {State} from './tournament';
// Guests receive scores and team names, without rosters or individual MVP votes.
// Return a separate projection so public reads never alter the tournament data.
export function publicTournamentState(state:State):State {
 return {...state,refs:[],teams:state.teams.map(team=>({...team,players:[]})),matches:state.matches.map(match=>({...match,mvp:['','','']}))};
}
