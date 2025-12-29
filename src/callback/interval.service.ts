import { Injectable, inject } from 'injection-js';
import { type Observable, type Subscription, interval } from 'rxjs';
import { DOCUMENT } from '../dom';

@Injectable()
export class IntervalService {
  private readonly document = inject(DOCUMENT);

  runTokenValidationRunning: Subscription | null = null;

  isTokenValidationRunning(): boolean {
    return Boolean(this.runTokenValidationRunning);
  }

  stopPeriodicTokenCheck(): void {
    if (this.runTokenValidationRunning) {
      this.runTokenValidationRunning.unsubscribe();
      this.runTokenValidationRunning = null;
    }
  }

  startPeriodicTokenCheck(repeatAfterSeconds: number): Observable<unknown> {
    const millisecondsDelayBetweenTokenCheck = repeatAfterSeconds * 1000;

    return interval(millisecondsDelayBetweenTokenCheck);
  }
}
