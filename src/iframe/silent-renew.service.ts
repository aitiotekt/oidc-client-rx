import { Injectable, inject } from 'injection-js';
import { type Observable, Subject, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthStateService } from '../auth-state/auth-state.service';
import { ImplicitFlowCallbackService } from '../callback/implicit-flow-callback.service';
import { IntervalService } from '../callback/interval.service';
import type { OpenIdConfiguration } from '../config/openid-configuration';
import type { CallbackContext } from '../flows/callback-context';
import { FlowsDataService } from '../flows/flows-data.service';
import { FlowsService } from '../flows/flows.service';
import { ResetAuthDataService } from '../flows/reset-auth-data.service';
import { HttpParams } from '../http';
import { LoggerService } from '../logging/logger.service';
import { FlowHelper } from '../utils/flowHelper/flow-helper.service';
import { ValidationResult } from '../validation/validation-result';
import { IFrameService } from './existing-iframe.service';

const IFRAME_FOR_SILENT_RENEW_IDENTIFIER = 'myiFrameForSilentRenew';

@Injectable()
export class SilentRenewService {
  private readonly refreshSessionWithIFrameCompletedInternal$ =
    new Subject<CallbackContext | null>();

  get refreshSessionWithIFrameCompleted$(): Observable<CallbackContext | null> {
    return this.refreshSessionWithIFrameCompletedInternal$.asObservable();
  }

  private readonly loggerService = inject(LoggerService);

  private readonly iFrameService = inject(IFrameService);

  private readonly flowsService = inject(FlowsService);

  private readonly resetAuthDataService = inject(ResetAuthDataService);

  private readonly flowsDataService = inject(FlowsDataService);

  private readonly authStateService = inject(AuthStateService);

  private readonly flowHelper = inject(FlowHelper);

  private readonly implicitFlowCallbackService = inject(
    ImplicitFlowCallbackService
  );

  private readonly intervalService = inject(IntervalService);

  getOrCreateIframe(config: OpenIdConfiguration): HTMLIFrameElement {
    const existingIframe = this.getExistingIframe();

    if (!existingIframe) {
      return this.iFrameService.addIFrameToWindowBody(
        IFRAME_FOR_SILENT_RENEW_IDENTIFIER,
        config
      );
    }

    return existingIframe;
  }

  isSilentRenewConfigured(configuration: OpenIdConfiguration): boolean {
    const { useRefreshToken, silentRenew } = configuration;

    return !useRefreshToken && Boolean(silentRenew);
  }

  codeFlowCallbackSilentRenewIframe(
    urlParts: string[],
    config: OpenIdConfiguration,
    allConfigs: OpenIdConfiguration[]
  ): Observable<CallbackContext> {
    const params = new HttpParams({
      fromString: urlParts[1],
    });

    const errorParam = params.get('error');

    if (errorParam) {
      this.authStateService.updateAndPublishAuthState({
        isAuthenticated: false,
        validationResult: ValidationResult.LoginRequired,
        isRenewProcess: true,
      });
      this.resetAuthDataService.resetAuthorizationData(config, allConfigs);
      this.flowsDataService.setNonce('', config);
      this.intervalService.stopPeriodicTokenCheck();

      return throwError(() => new Error(errorParam));
    }

    const code = params.get('code') ?? '';
    const state = params.get('state') ?? '';
    const sessionState = params.get('session_state');

    const callbackContext: CallbackContext = {
      code,
      refreshToken: '',
      state,
      sessionState,
      authResult: null,
      isRenewProcess: true,
      jwtKeys: null,
      validationResult: null,
      existingIdToken: null,
    };

    return this.flowsService
      .processSilentRenewCodeFlowCallback(callbackContext, config, allConfigs)
      .pipe(
        catchError((error) => {
          this.intervalService.stopPeriodicTokenCheck();
          this.resetAuthDataService.resetAuthorizationData(config, allConfigs);

          return throwError(() => new Error(error));
        })
      );
  }

  silentRenewEventHandler(
    e: CustomEvent,
    config: OpenIdConfiguration,
    allConfigs: OpenIdConfiguration[]
  ): Observable<undefined> {
    this.loggerService.logDebug(config, 'silentRenewEventHandler');
    if (!e.detail) {
      return of(undefined);
    }

    let callback$: Observable<CallbackContext>;
    const isCodeFlow = this.flowHelper.isCurrentFlowCodeFlow(config);

    if (isCodeFlow) {
      const urlParts = e.detail.toString().split('?');

      callback$ = this.codeFlowCallbackSilentRenewIframe(
        urlParts,
        config,
        allConfigs
      );
    } else {
      callback$ =
        this.implicitFlowCallbackService.authenticatedImplicitFlowCallback(
          config,
          allConfigs,
          e.detail
        );
    }

    return callback$.pipe(
      map((callbackContext) => {
        this.refreshSessionWithIFrameCompletedInternal$.next(callbackContext);
        this.flowsDataService.resetSilentRenewRunning(config);
        return undefined;
      }),
      catchError((err: unknown) => {
        this.loggerService.logError(config, `Error: ${err}`);
        this.refreshSessionWithIFrameCompletedInternal$.next(null);
        this.flowsDataService.resetSilentRenewRunning(config);
        return of(undefined);
      })
    );
  }

  private getExistingIframe(): HTMLIFrameElement | null {
    return this.iFrameService.getExistingIFrame(
      IFRAME_FOR_SILENT_RENEW_IDENTIFIER
    );
  }
}
