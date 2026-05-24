// ==============================================
// e-colleague Portal — ユーティリティ
// ==============================================

function encryptText(plainText) {
  if (!ENCRYPTION_KEY || !plainText) return plainText;
  const cipher = new cCryptoGS.Cipher(ENCRYPTION_KEY, 'aes');
  return cipher.encrypt(plainText);
}

function decryptText(encryptedText) {
  if (!ENCRYPTION_KEY || !encryptedText) return encryptedText;
  const cipher = new cCryptoGS.Cipher(ENCRYPTION_KEY, 'aes');
  return cipher.decrypt(encryptedText);
}
