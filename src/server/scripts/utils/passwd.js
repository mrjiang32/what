import crypto from "crypto";

export function generateSalt(len = 16) {
  return crypto.randomBytes(len).toString("base64");
}

export function hashPassword(password, salt) {
  const ITERATIONS = 9178; 
  const KEYLEN = 32; 
  const DIGEST = "sha256";

  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString("base64");
}

export function verifyPassword(inputPassword, salt, shadow) {
  const ITERATIONS = 9178;
  const KEYLEN = 32;
  const DIGEST = "sha256";

  const calc = crypto.pbkdf2Sync(inputPassword, salt, ITERATIONS, KEYLEN, DIGEST).toString("base64");
  const bufA = Buffer.from(calc);
  const bufB = Buffer.from(shadow);
  if(bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
