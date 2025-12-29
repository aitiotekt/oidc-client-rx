import { Injectable, inject } from 'injection-js';
import { type Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import type { OpenIdConfiguration } from '../config/openid-configuration';
import type { CallbackContext } from '../flows/callback-context';
import { FlowsDataService } from '../flows/flows-data.service';
import { FlowsService } from '../flows/flows.service';
import { injectAbstractType } from '../injection';
import { AbstractRouter } from '../router';
import { IntervalService } from './interval.service';

@Injectable()
export class ImplicitFlowCallbackService {
  private readonly flowsService = inject(FlowsService);

  private readonly router = injectAbstractType(AbstractRouter);

  private readonly flowsDataService = inject(FlowsDataService);

  private readonly intervalService = inject(IntervalService);

  authenticatedImplicitFlowCallback(
    config: OpenIdConfiguration,
    allConfigs: OpenIdConfiguration[],
    hash?: string
  ): Observable<CallbackContext> {
    const isRenewProcess = this.flowsDataService.isSilentRenewRunning(config);
    const triggerAuthorizationResultEvent = Boolean(
      config.triggerAuthorizationResultEvent
    );
    const postLoginRoute = config.postLoginRoute ?? '';
    const unauthorizedRoute = config.unauthorizedRoute ?? '';

    return this.flowsService
      .processImplicitFlowCallback(config, allConfigs, hash)
      .pipe(
        tap((callbackContext) => {
          if (
            !triggerAuthorizationResultEvent &&
            !callbackContext.isRenewProcess
          ) {
            this.router.navigateByUrl(postLoginRoute);
          }
        }),
        catchError((error) => {
          this.flowsDataService.resetSilentRenewRunning(config);
          this.intervalService.stopPeriodicTokenCheck();
          if (!triggerAuthorizationResultEvent && !isRenewProcess) {
            this.router.navigateByUrl(unauthorizedRoute);
          }

          return throwError(() => new Error(error));
        })
      );
  }
}
