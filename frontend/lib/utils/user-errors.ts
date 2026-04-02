/**
 * Maps internal API error codes to plain-English user-facing messages.
 * Use toUserError() in detect pages instead of surfacing raw error codes.
 */
const USER_FRIENDLY_ERRORS: Record<string, string> = {
  ANALYSIS_FAILED:          'Something went wrong during analysis. Please try again.',
  NO_KEY:                   'Upload failed. Please try selecting your file again.',
  NO_FILE:                  'No file was received. Please try uploading again.',
  NO_FILENAME:              'File name is missing. Please try uploading again.',
  NO_FILESIZE:              'File size is missing. Please try uploading again.',
  TOO_LARGE:                'Your file is too large. Please use a smaller file.',
  INVALID_TYPE:             'This file type is not supported. Please check the accepted formats.',
  R2_UNAVAILABLE:           'File storage is temporarily unavailable. Please try again in a moment.',
  RATE_LIMIT:               "You're scanning too quickly. Please wait 60 seconds and try again.",
  FRAME_EXTRACTION_REQUIRED:'Video analysis requires Chrome or Edge. Please open aiscern.com/detect/video in a supported browser.',
  TOO_SHORT:                'Please provide more content — at least 50 characters for text analysis.',
  TOO_MANY_FRAMES:          'Too many video frames submitted. Please try a shorter clip.',
  AUTH_ERROR:               'Please sign in to use this feature.',
  NETWORK_ERROR:            'Network error. Please check your connection and try again.',
  NO_INPUT:                 'Please provide content to analyse — a file or text is required.',
  PARSE_ERROR:              'Could not read the file. It may be corrupted or in an unsupported format.',
  CREDIT_LIMIT:             "You've reached your daily scan limit. It resets at midnight UTC.",
}

/**
 * Returns a user-friendly error string for a given internal code.
 * Falls back to `fallback` if provided, or a generic message.
 */
export function toUserError(code?: string, fallback?: string): string {
  if (code && USER_FRIENDLY_ERRORS[code]) return USER_FRIENDLY_ERRORS[code]
  if (fallback && fallback.length < 120) return fallback   // short API messages are safe to show
  return 'An unexpected error occurred. Please try again.'
}
