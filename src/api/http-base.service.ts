import { Injectable, inject } from 'injection-js';
import type { Observable } from 'rxjs';
import { HTTP_CLIENT, type HttpHeaders, type HttpParams } from '../http';

@Injectable()
export class HttpBaseService {
  private readonly http = inject(HTTP_CLIENT);

  get<T>(
    url: string,
    options: { headers?: HttpHeaders; params?: HttpParams } = {}
  ): Observable<T> {
    return this.http.get<T>(url, {
      ...options,
      params: options.params?.toNgify(),
    });
  }

  post<T>(
    url: string,
    body: unknown,
    options: { headers?: HttpHeaders; params?: HttpParams } = {}
  ): Observable<T> {
    return this.http.post<T>(url, body as any, {
      ...options,
      params: options.params?.toNgify(),
    });
  }
}
