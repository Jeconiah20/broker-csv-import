// Helper functions to convert different date formats to ISO 8601

/**
 * Convert DD-MM-YYYY format to ISO 8601 format
 * Example: "01-04-2026" → "2026-04-01T00:00:00Z"
 */
export function convertDDMMYYYYToISO(dateString: string): string | null {
  try {
    // Split the date string by "-"
    const parts = dateString.split('-');
    
    if (parts.length !== 3) {
      return null; // Invalid format
    }

    const day = parts[0];
    const month = parts[1];
    const year = parts[2];

    // Create ISO format: YYYY-MM-DDTHH:MM:SSZ
    const isoDate = `${year}-${month}-${day}T00:00:00Z`;

    // Check if the date is valid
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) {
      return null; // Invalid date
    }

    return isoDate;
  } catch (error) {
    return null; // Something went wrong
  }
}

/**
 * Convert MM/DD/YYYY format to ISO 8601 format
 * Example: "04/01/2026" → "2026-04-01T00:00:00Z"
 */
export function convertMMDDYYYYToISO(dateString: string): string | null {
  try {
    const parts = dateString.split('/');
    
    if (parts.length !== 3) {
      return null;
    }

    const month = parts[0];
    const day = parts[1];
    const year = parts[2];

    const isoDate = `${year}-${month}-${day}T00:00:00Z`;

    const date = new Date(isoDate);
    if (isNaN(date.getTime())) {
      return null;
    }

    return isoDate;
  } catch (error) {
    return null;
  }
}

/**
 * Check if a string is already in ISO 8601 format
 * Example: "2026-04-01T14:30:00Z" → true
 */
export function isValidISO8601(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch (error) {
    return false;
  }
}