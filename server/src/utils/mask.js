export const maskPhone = (phone) => {
  if (!phone || phone.length < 4) return phone;
  return `${phone.slice(0, 2)}XXXXXX${phone.slice(-2)}`;
};