export const formatDateTime = (dateString: string, userTimezone: string = 'Europe/Paris') => {
  const date = new Date(dateString);
  return date.toLocaleString('fr-FR', {
    timeZone: userTimezone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDateOnly = (dateString: string, userTimezone: string = 'Europe/Paris') => {
  const date = new Date(dateString);
  return date.toLocaleString('fr-FR', {
    timeZone: userTimezone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

// Returns the YYYY-MM-DD date string for an ISO timestamp interpreted in the given timezone.
// Useful for bucketing events by "day in user's timezone" — e.g. comparing a lead's created_at
// to a date range picked on a calendar without timezone drift.
export const getDateKey = (dateString: string, userTimezone: string = 'Europe/Paris'): string => {
  const date = new Date(dateString);
  // en-CA locale produces YYYY-MM-DD natively, safe for lexicographic comparison
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: userTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};
