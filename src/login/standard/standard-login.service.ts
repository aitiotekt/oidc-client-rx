import { Injectable, inject } from 'injection-js';
import { type Observable, map, of, switchMap } from 'rxjs';
import type { AuthOptions } from '../../auth-options';
import { AuthWellKnownService } from '../../config/auth-well-known/auth-well-known.service';
import type { OpenIdConfiguration } from '../../config/openid-configuration';
import { FlowsDataService } from '../../flows/flows-data.service';
import { LoggerService } from '../../logging/logger.service';
import { RedirectService } from '../../utils/redirect/redirect.service';
import { UrlService } from '../../utils/url/url.service';
import { ResponseTypeValidationService } from '../response-type-validation/response-type-validation.service';

@Injectable()
export class StandardLoginService {
  private readonly loggerService = inject(LoggerService);

  private readonly responseTypeValidationService = inject(
    ResponseTypeValidationService
  );

  private readonly urlService = inject(UrlService);

  private readonly redirectService = inject(RedirectService);

  private readonly authWellKnownService = inject(AuthWellKnownService);

  private readonly flowsDataService = inject(FlowsDataService);

  loginStandard(
    configuration: OpenIdConfiguration,
    authOptions?: AuthOptions
  ): Observable<undefined> {
    if (
      !this.responseTypeValidationService.hasConfigValidResponseType(
        configuration
      )
    ) {
      this.loggerService.logError(configuration, 'Invalid response type!');

      return of(undefined);
    }

    this.loggerService.logDebug(
      configuration,
      'BEGIN Authorize OIDC Flow, no auth data'
    );
    this.flowsDataService.setCodeFlowInProgress(configuration);

    return this.authWellKnownService
      .queryAndStoreAuthWellKnownEndPoints(configuration)
      .pipe(
        switchMap(() => {
          this.flowsDataService.resetSilentRenewRunning(configuration);

          return this.urlService.getAuthorizeUrl(configuration, authOptions);
        }),
        map((url) => {
          const { urlHandler } = authOptions || {};
          if (!url) {
            this.loggerService.logError(
              configuration,
              'Could not create URL',
              url
            );

            return;
          }

          if (urlHandler) {
            urlHandler(url);
          } else {
            this.redirectService.redirectTo(url);
          }
          return undefined;
        })
      );
  }
}
