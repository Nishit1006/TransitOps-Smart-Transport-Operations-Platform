const OTP_LENGTH = 6;
export const OTP_VALIDITY_MINUTES = 10;

export const generateOtp = () => {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
};

export const getOtpExpiry = () => new Date(Date.now() + OTP_VALIDITY_MINUTES * 60 * 1000);
