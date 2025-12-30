import { InjectionToken } from "injection-js";
import type { Observable } from "rxjs";

export type DestoryRef = Observable<void>;

export const DESTORY_REF = new InjectionToken<DestoryRef>("destoryRef");
