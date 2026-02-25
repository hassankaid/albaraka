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
