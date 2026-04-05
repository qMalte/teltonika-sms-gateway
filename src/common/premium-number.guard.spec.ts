import { ExecutionContext, BadRequestException } from '@nestjs/common';
import { PremiumNumberGuard } from './premium-number.guard';

describe('PremiumNumberGuard', () => {
  let guard: PremiumNumberGuard;

  beforeEach(() => {
    guard = new PremiumNumberGuard();
  });

  const createMockContext = (number?: string, source: 'body' | 'query' = 'body'): ExecutionContext => {
    const request = {
      body: source === 'body' ? { number } : {},
      query: source === 'query' ? { number } : {},
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  };

  describe('should allow valid numbers', () => {
    const validNumbers = [
      '+491761234567',
      '+4917612345678',
      '00491761234567',
      '+1234567890',
    ];

    validNumbers.forEach((number) => {
      it(`should allow ${number}`, () => {
        const context = createMockContext(number);
        expect(guard.canActivate(context)).toBe(true);
      });
    });
  });

  describe('should block premium numbers', () => {
    const premiumNumbers = [
      { number: '+49900123456', reason: 'German 0900' },
      { number: '0900123456', reason: 'German 0900 without country code' },
      { number: '+49137123456', reason: 'German 0137' },
      { number: '+49180123456', reason: 'German 0180' },
    ];

    premiumNumbers.forEach(({ number, reason }) => {
      it(`should block ${reason}: ${number}`, () => {
        const context = createMockContext(number);
        expect(() => guard.canActivate(context)).toThrow(BadRequestException);
      });
    });
  });

  describe('should block short codes', () => {
    const shortCodes = ['12345', '44344', '55555', '99999'];

    shortCodes.forEach((number) => {
      it(`should block short code ${number}`, () => {
        const context = createMockContext(number);
        expect(() => guard.canActivate(context)).toThrow(BadRequestException);
      });
    });
  });

  describe('should block ping call countries', () => {
    const pingCallNumbers = [
      { number: '+216123456', country: 'Tunisia' },
      { number: '+257123456', country: 'Burundi' },
      { number: '+248123456', country: 'Seychelles' },
    ];

    pingCallNumbers.forEach(({ number, country }) => {
      it(`should block ${country}: ${number}`, () => {
        const context = createMockContext(number);
        expect(() => guard.canActivate(context)).toThrow(BadRequestException);
      });
    });
  });

  describe('should block test numbers', () => {
    const testNumbers = ['+491234567890', '00491234567890', '+49123456789'];

    testNumbers.forEach((number) => {
      it(`should block test number ${number}`, () => {
        const context = createMockContext(number);
        expect(() => guard.canActivate(context)).toThrow(BadRequestException);
      });
    });
  });

  describe('edge cases', () => {
    it('should allow request without number', () => {
      const context = createMockContext(undefined);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should handle number from query params', () => {
      const context = createMockContext('+491761234567', 'query');
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should block premium number from query params', () => {
      const context = createMockContext('+49900123456', 'query');
      expect(() => guard.canActivate(context)).toThrow(BadRequestException);
    });
  });
});
