// D1 batch executes these statements in one transaction. A stale revision
// inserts no archive and updates no tournament; a failure rolls back both.
export const archiveTournamentSql='INSERT INTO tournament_history (id,owner,source_revision,created_at,state) SELECT ?,owner,revision,?,state FROM tournament WHERE id=1 AND revision=? AND owner=?';
export const resetTournamentSql='UPDATE tournament SET state=?,revision=revision+1 WHERE id=1 AND revision=? AND owner=?';
