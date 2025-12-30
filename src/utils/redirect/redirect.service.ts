import { Injectable, inject } from "injection-js";
import { DOCUMENT } from "../../dom";

@Injectable()
export class RedirectService {
	private readonly document = inject<Document>(DOCUMENT);

	redirectTo(url: string): void {
		this.document.location.href = url;
	}
}
