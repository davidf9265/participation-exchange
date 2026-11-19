/**
 * This exercise has no authentication. Every request is served on behalf of a
 * single credit union, the one whose portfolio you see.
 */
/** Must match VIEWER_CU_ID in api/src/viewer.ts. Display and UI checks only. */
export const VIEWER_CU_ID = 'cu-riverbend';

export const VIEWER_CU = {
  name: 'Riverbend Federal Credit Union',
  shortName: 'Riverbend FCU',
  initials: 'RF',
  desk: 'Treasury desk',
};
