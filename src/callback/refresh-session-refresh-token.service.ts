import { Injectable, inject } from 'injection-js';
import { type Observable, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import type { OpenIdConfiguration } from '../config/openid-configuration';
import type { CallbackContext } from '../flows/callback-context';
import { FlowsService } from '../flows/flows.service';
import { ResetAuthDataService } from '../flows/reset-auth-data.service';
import { LoggerService } from '../logging/logger.service';
import { IntervalService } from './interval.service';

@Injectable()
export class RefreshSessionRefreshTokenService {
  private readonly loggerService = inject(LoggerService);

  private readonly resetAuthDataService = inject(ResetAuthDataService);

  private readonly flowsService = inject(FlowsService);

  private readonly intervalService = inject(IntervalService);

  refreshSessionWithRefreshTokens(
    config: OpenIdConfiguration,
    allConfigs: OpenIdConfiguration[],
    customParamsRefresh?: { [key: string]: string | number | boolean }
  ): Observable<CallbackContext> {
    this.loggerService.logDebug(config, 'BEGIN refresh session Authorize');
    let refreshTokenFailed = false;

    return this.flowsService
      .processRefreshToken(config, allConfigs, customParamsRefresh)
      .pipe(
        catchError((error) => {
          this.resetAuthDataService.resetAuthorizationData(config, allConfigs);
          refreshTokenFailed = true;

          return throwError(() => new Error(error));
        }),
        finalize(
          () =>
            refreshTokenFailed && this.intervalService.stopPeriodicTokenCheck()
        )
      );
  }
}
