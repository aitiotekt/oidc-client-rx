import { Injectable, inject } from 'injection-js';
import { BehaviorSubject, type Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { CryptoService } from '../utils/crypto/crypto.service';
import { MockUtil } from '../utils/reflect';

@Injectable()
export class JwtWindowCryptoService {
  private readonly cryptoService = inject(CryptoService);

  @MockUtil({ implementation: () => new BehaviorSubject(undefined) })
  generateCodeChallenge(codeVerifier: string): Observable<string> {
    return this.calcHash(codeVerifier).pipe(
      map((challengeRaw: string) => this.base64UrlEncode(challengeRaw))
    );
  }

  generateAtHash(accessToken: string, algorithm: string): Observable<string> {
    return this.calcHash(accessToken, algorithm).pipe(
      map((tokenHash) => {
        const substr: string = tokenHash.substr(0, tokenHash.length / 2);
        const tokenHashBase64: string = btoa(substr);

        return tokenHashBase64
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '');
      })
    );
  }

  private calcHash(
    valueToHash: string,
    algorithm = 'SHA-256'
  ): Observable<string> {
    const msgBuffer: Uint8Array = new TextEncoder().encode(valueToHash);

    return from(
      this.cryptoService.getCrypto().subtle.digest(algorithm, msgBuffer)
    ).pipe(
      map((hashBuffer: unknown) => {
        const buffer = hashBuffer as ArrayBuffer;
        const hashArray: number[] = Array.from(new Uint8Array(buffer));

        return this.toHashString(hashArray);
      })
    );
  }

  private toHashString(byteArray: number[]): string {
    let result = '';

    for (const e of byteArray) {
      result += String.fromCharCode(e);
    }

    return result;
  }

  private base64UrlEncode(str: string): string {
    const base64: string = btoa(str);

    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
}
