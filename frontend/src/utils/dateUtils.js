export const formatDate = (dateString, separator = '-') => {
    if (!dateString) return '';
    const date = new Date(dateString);

    // Check if date is invalid
    if (isNaN(date.getTime())) return dateString; // Return original if invalid
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}${separator}${month}${separator}${year}`;
};