/**
 * Parsing-related constants for the chat phase.
 *
 * Most structured data now comes from the form (the app owns it). The chat
 * only contributes the open-ended problem statement and the summary prose, plus
 * a re-rate directive. So the parser surface is small.
 */

export const PARSING = {
  MARKERS: {
    INTERVIEW_COMPLETE: '###INTERVIEW_COMPLETE###',
    FIELDS: '###FIELDS###',
  },
} as const;

export const INTERVIEW_COMPLETE_MARKER = PARSING.MARKERS.INTERVIEW_COMPLETE;
export const FIELDS_MARKER = PARSING.MARKERS.FIELDS;

/** Which DVI component a re-rate directive targets. */
export type RerateComponent = 'cost' | 'technical' | 'localization' | 'uvp';

/** Matches a single re-rate directive, e.g. [[RERATE:cost]]. */
export const RERATE_PATTERN = /\[\[RERATE:(cost|technical|localization|uvp)\]\]/i;
/** Global variant for stripping all directives from displayed text. */
export const RERATE_PATTERN_GLOBAL = /\[\[RERATE:(cost|technical|localization|uvp)\]\]/gi;
