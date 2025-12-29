import { Injectable, inject } from 'injection-js';
import type { OpenIdConfiguration } from '../config/openid-configuration';
import { DOCUMENT } from '../dom';
import { LoggerService } from '../logging/logger.service';

@Injectable()
export class IFrameService {
  private readonly document = inject(DOCUMENT);

  private readonly loggerService = inject(LoggerService);

  getExistingIFrame(identifier: string): HTMLIFrameElement | null {
    const iFrameOnParent = this.getIFrameFromParentWindow(identifier);

    if (this.isIFrameElement(iFrameOnParent)) {
      return iFrameOnParent;
    }

    const iFrameOnSelf = this.getIFrameFromWindow(identifier);

    if (this.isIFrameElement(iFrameOnSelf)) {
      return iFrameOnSelf;
    }

    return null;
  }

  addIFrameToWindowBody(
    identifier: string,
    config: OpenIdConfiguration
  ): HTMLIFrameElement {
    const sessionIframe = this.document.createElement('iframe');

    sessionIframe.id = identifier;
    sessionIframe.title = identifier;
    this.loggerService.logDebug(config, sessionIframe);
    sessionIframe.style.display = 'none';
    this.document.body.appendChild(sessionIframe);

    return sessionIframe;
  }

  private getIFrameFromParentWindow(
    identifier: string
  ): HTMLIFrameElement | null {
    try {
      const iFrameElement =
        this.document.defaultView?.parent.document.getElementById(identifier);

      if (this.isIFrameElement(iFrameElement)) {
        return iFrameElement;
      }

      return null;
    } catch {
      return null;
    }
  }

  private getIFrameFromWindow(identifier: string): HTMLIFrameElement | null {
    const iFrameElement = this.document.getElementById(identifier);

    if (this.isIFrameElement(iFrameElement)) {
      return iFrameElement;
    }

    return null;
  }

  private isIFrameElement(
    element: HTMLElement | null | undefined
  ): element is HTMLIFrameElement {
    return !!element && element instanceof HTMLIFrameElement;
  }
}
