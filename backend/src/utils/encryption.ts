import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';

if (!ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('ENCRYPTION_KEY is required in production');
}

export class Encryption {
  /**
   * Encrypt sensitive data (like LinkedIn cookies)
   */
  static encrypt(data: string): string {
    if (!ENCRYPTION_KEY) {
      throw new Error('Encryption key not configured');
    }
    return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData: string): string {
    if (!ENCRYPTION_KEY) {
      throw new Error('Encryption key not configured');
    }
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Hash data (for one-way encryption like passwords)
   */
  static hash(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }

  /**
   * Generate a random token
   */
  static generateToken(length: number = 32): string {
    return CryptoJS.lib.WordArray.random(length).toString();
  }
}
