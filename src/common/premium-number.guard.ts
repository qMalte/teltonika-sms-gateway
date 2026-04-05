import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';

interface SmsRequest {
  body?: { number?: string };
  query?: { number?: string };
}

// Premium- und Mehrwertnummern-Präfixe
const PREMIUM_PREFIXES = [
  // === DEUTSCHLAND ===
  // 0900 - Premium-Dienste (bis 3€/Min oder 10€/Anruf)
  '0900',
  '+49900',
  '0049900',
  // 0137 - Massenverkehrsdienste (Voting, Gewinnspiele)
  '0137',
  '+49137',
  '0049137',
  // 0180 - Service-Dienste (geteilte Kosten)
  '0180',
  '+49180',
  '0049180',
  // 0190 - Alte Premium-Nummern (sollten nicht mehr existieren)
  '0190',
  '+49190',
  '0049190',
  // 118 - Auskunftsdienste
  '118',
  '+49118',
  '0049118',

  // === ÖSTERREICH ===
  '0900',
  '+43900',
  '0043900',
  '0901',
  '+43901',
  '0043901',
  '0930',
  '+43930',
  '0043930',
  '0931',
  '+43931',
  '0043931',
  '0939',
  '+43939',
  '0043939',

  // === SCHWEIZ ===
  '0900',
  '+41900',
  '0041900',
  '0901',
  '+41901',
  '0041901',
  '0906',
  '+41906',
  '0041906',

  // === UK ===
  // 09 - Premium Rate
  '09',
  '+4409',
  '004409',
  // 118 - Directory Enquiries
  '+44118',
  '0044118',
  // 070 - Personal Numbers (oft Betrug)
  '+4470',
  '004470',

  // === BEKANNTE PING-CALL LÄNDER ===
  // Diese Länder werden häufig für Ping-Calls/Callback-Betrug genutzt

  // Tunesien (+216)
  '+216',
  '00216',
  // Burundi (+257)
  '+257',
  '00257',
  // Komoren (+269)
  '+269',
  '00269',
  // Seychellen (+248)
  '+248',
  '00248',
  // Tschad (+235)
  '+235',
  '00235',
  // Liberia (+231)
  '+231',
  '00231',
  // Sierra Leone (+232)
  '+232',
  '00232',
  // Somalia (+252)
  '+252',
  '00252',
  // Sao Tome (+239)
  '+239',
  '00239',
  // Ascension (+247)
  '+247',
  '00247',
  // Diego Garcia (+246)
  '+246',
  '00246',
  // Guinea (+224)
  '+224',
  '00224',
  // Mauretanien (+222)
  '+222',
  '00222',
  // Nauru (+674)
  '+674',
  '00674',
  // Vanuatu (+678)
  '+678',
  '00678',
  // Salomonen (+677)
  '+677',
  '00677',
  // Kiribati (+686)
  '+686',
  '00686',
  // Tuvalu (+688)
  '+688',
  '00688',
  // Cookinseln (+682)
  '+682',
  '00682',

  // === SATELLITEN-/SPEZIAL-NUMMERN ===
  // Iridium (+8816, +8817)
  '+8816',
  '+8817',
  '008816',
  '008817',
  // Globalstar (+8818, +8819)
  '+8818',
  '+8819',
  '008818',
  '008819',
  // Thuraya (+88216)
  '+88216',
  '0088216',
  // Inmarsat (+870)
  '+870',
  '00870',

  // === WEITERE EUROPÄISCHE PREMIUM-NUMMERN ===
  // Niederlande - 0906, 0909
  '+31906',
  '0031906',
  '+31909',
  '0031909',
  // Belgien - 0900, 0903, 0904, 0905
  '+32900',
  '0032900',
  '+32903',
  '0032903',
  '+32904',
  '0032904',
  '+32905',
  '0032905',
  // Frankreich - 089
  '+3389',
  '003389',
  // Spanien - 803, 806, 807, 905
  '+34803',
  '0034803',
  '+34806',
  '0034806',
  '+34807',
  '0034807',
  '+34905',
  '0034905',
  // Italien - 892, 899
  '+39892',
  '0039892',
  '+39899',
  '0039899',
  // Polen - 0700, 0400 (häufig Spam-Quelle)
  '+48700',
  '0048700',
  '+48400',
  '0048400',
];

// Kurzwahlnummern für Gewinnspiele, Voting, Premium-Dienste (4-6 Ziffern)
const BLOCKED_SHORT_CODES = [
  // Bekannte Gewinnspiel-/Voting-Nummern Deutschland
  '11111',
  '22022',
  '22033',
  '22044',
  '22222',
  '33333',
  '44344',
  '44444',
  '44455',
  '44544',
  '44545',
  '44555',
  '44844',
  '44888',
  '44899',
  '44900',
  '44999',
  '55555',
  '55655',
  '55755',
  '55855',
  '66666',
  '66866',
  '77777',
  '80000',
  '80808',
  '81818',
  '82222',
  '82828',
  '83333',
  '84848',
  '85555',
  '86868',
  '88888',
  '99999',
  // Weitere bekannte Premium-Kurzwahlen
  '3333',
  '4444',
  '5555',
  '6666',
  '7777',
  '8888',
  '9999',
  '54321',
  '12345',
  '50000',
  '50505',
  '60000',
  '70000',
  '72727',
  '78787',
  '79797',
  '87654',
];

// Blockierte Test-/Beispielnummern
const BLOCKED_TEST_NUMBERS = [
  // Swagger/Dokumentation Beispielnummern
  '+491234567890',
  '00491234567890',
  '01234567890',
  // Weitere typische Testnummern
  '+49123456789',
  '+491111111111',
  '+490000000000',
];

@Injectable()
export class PremiumNumberGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<SmsRequest>();
    const number = request.body?.number ?? request.query?.number;

    if (!number || typeof number !== 'string') {
      return true;
    }

    const normalizedNumber = this.normalizeNumber(number);

    // Testnummern blockieren
    for (const testNumber of BLOCKED_TEST_NUMBERS) {
      if (normalizedNumber === this.normalizeNumber(testNumber)) {
        throw new BadRequestException(
          `Testnummern sind nicht erlaubt: ${number}`,
        );
      }
    }

    // Kurzwahlnummern blockieren (4-6 Ziffern ohne Ländervorwahl)
    if (this.isShortCode(normalizedNumber)) {
      if (BLOCKED_SHORT_CODES.includes(normalizedNumber)) {
        throw new BadRequestException(
          `Kurzwahlnummern sind nicht erlaubt: ${number}`,
        );
      }
      // Alle Kurzwahlnummern generell blockieren
      throw new BadRequestException(
        `Kurzwahlnummern (${normalizedNumber.length} Ziffern) sind nicht erlaubt: ${number}`,
      );
    }

    // Premium-Präfixe prüfen
    for (const prefix of PREMIUM_PREFIXES) {
      const normalizedPrefix = this.normalizeNumber(prefix);
      if (normalizedNumber.startsWith(normalizedPrefix)) {
        throw new BadRequestException(
          `Premium-/Mehrwertnummern sind nicht erlaubt: ${number}`,
        );
      }
    }

    return true;
  }

  private normalizeNumber(number: string): string {
    return number.replace(/[\s\-()]/g, '');
  }

  private isShortCode(number: string): boolean {
    // Kurzwahlnummern sind 4-6 Ziffern ohne Ländervorwahl
    const digitsOnly = number.replace(/\D/g, '');
    return digitsOnly.length >= 4 && digitsOnly.length <= 6;
  }
}
