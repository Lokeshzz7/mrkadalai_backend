
export const getCurrentISTAsUTC = () => {
  const now = new Date();
  // IST is UTC + 5:30
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  return new Date(now.getTime() + istOffset);
};


export const convertUTCToIST = (utcDate) => {
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  return new Date(utcDate.getTime() + istOffset);
};


export const convertISTToUTC = (istDate) => {
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  return new Date(istDate.getTime() - istOffset);
};


export const isCurrentISTBetweenUTCDates = (validFromUTC, validUntilUTC) => {
  const currentISTAsUTC = getCurrentISTAsUTC();
  return currentISTAsUTC >= validFromUTC && currentISTAsUTC <= validUntilUTC;
};

export const formatDateForIST = (date) => {
  const istDate = convertUTCToIST(date);
  return {
    iso: istDate.toISOString(),
    readable: istDate.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  };
};


export const getTimezoneInfo = () => {
  return {
    timezone: 'IST',
    offset: '+05:30',
    description: 'Indian Standard Time (UTC+5:30)'
  };
};