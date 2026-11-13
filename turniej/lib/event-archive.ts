// These follow the existing archive/reset statements in the same D1 transaction.
// Only a history record inserted by this request can advance the event pointer.
export const linkEventArchiveSql='UPDATE tournament_history SET event_id=(SELECT event_id FROM tournament_event WHERE id=1) WHERE id=?';
export const rotateEventSql='UPDATE tournament_event SET event_id=? WHERE id=1 AND EXISTS (SELECT 1 FROM tournament_history WHERE id=? AND event_id=tournament_event.event_id)';
