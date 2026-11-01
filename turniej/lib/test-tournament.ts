import {initial,letters,mutate,type State} from './tournament';
import {addDemoTeams,clearDemoTeams,completeDemoEliminations} from './demo-teams';
// This state is used only in the organizer's browser. Never send it to the API.
export function createTestTournament():State{
 const state=initial();state.title='TEST · Przykładowy turniej';
 Object.assign(state.settings,{early:5,quarter:5,late:5,tie:3,win20:3,win21:2,loss12:1,loss02:0,draw11:1,confirmed:true});
 addDemoTeams(state);state.teams.forEach((team,i)=>mutate(state,{type:'assign',letter:letters[i],teamId:team.id},true));return state;
}
export function runTestAction(state:State,action:any):State{
 const copy=structuredClone(state);
 if(action.type==='complete-demo')completeDemoEliminations(copy);
 else if(action.type==='clear-demo')clearDemoTeams(copy);
 else if(action.type==='new-tournament'||action.type==='setup')throw Error('W trybie testowym użyj przycisku „Test od nowa”.');
 else mutate(copy,action,true);
 return copy;
}
