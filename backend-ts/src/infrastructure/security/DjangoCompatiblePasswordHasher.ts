import { pbkdf2, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { PasswordHasher } from '../../application/ports/services';

const pbkdf2Async = promisify(pbkdf2);
const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

const safeEqual = (a: Buffer, b: Buffer) => a.length === b.length && timingSafeEqual(a, b);

/**
 * Verifica hashes `pbkdf2_sha256$...` generados por Django (para reutilizar usuarios existentes)
 * y genera/verifica hashes propios `scrypt$salt$hash` para los usuarios nuevos.
 */
export class DjangoCompatiblePasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    const salt = randomBytes(16);
    const derived = await scryptAsync(plain, salt, 32);
    return `scrypt$${salt.toString('base64')}$${derived.toString('base64')}`;
  }

  async verify(plain: string, stored: string | null): Promise<boolean> {
    if (!stored) return false;
    const [algorithm, ...rest] = stored.split('$');

    if (algorithm === 'scrypt') {
      const [salt, hash] = rest;
      const derived = await scryptAsync(plain, Buffer.from(salt, 'base64'), 32);
      return safeEqual(derived, Buffer.from(hash, 'base64'));
    }

    if (algorithm === 'pbkdf2_sha256') {
      const [iterations, salt, hash] = rest;
      const expected = Buffer.from(hash, 'base64');
      const derived = await pbkdf2Async(plain, salt, Number(iterations), expected.length, 'sha256');
      return safeEqual(derived, expected);
    }

    return false;
  }
}
