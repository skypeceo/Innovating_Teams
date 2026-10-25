import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { Clock, Randomizer, TokenGenerator } from '../../application/ports/services';

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class CryptoTokenGenerator implements TokenGenerator {
  generate(): string {
    return randomBytes(20).toString('hex');
  }
}

export class CryptoRandomizer implements Randomizer {
  int(min: number, max: number): number {
    return randomInt(min, max + 1);
  }

  shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = randomInt(0, i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  uuid(): string {
    return randomUUID();
  }
}
