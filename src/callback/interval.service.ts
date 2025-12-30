import { Injectable } from "injection-js";
import { interval, type Observable, type Subscription } from "rxjs";

@Injectable()
export class IntervalService {
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
