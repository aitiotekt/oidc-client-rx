import "@abraham/reflection"; // or 'reflect-metadata' | 'core-js/es7/reflect'
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { type Injector, ReflectiveInjector } from "injection-js";
import {
	LogLevel,
	OidcSecurityService,
	provideAuth,
	withDefaultFeatures,
} from "oidc-client-rx";
import { withTanstackRouter } from "oidc-client-rx/adapters/@tanstack/react-router";
import {
	InjectorContextVoidInjector,
	InjectorProvider,
} from "oidc-client-rx/adapters/react";
import React from "react";
import ReactDOM from "react-dom/client";
import { routeTree } from "./routeTree.gen";

import "./style.css";

// Set up a Router instance
const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	scrollRestoration: true,
	context: {
		injector: InjectorContextVoidInjector,
		oidcSecurityService: {} as OidcSecurityService,
	},
});

// Register things for typesafety
declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const injector = ReflectiveInjector.resolveAndCreate(
	provideAuth(
		{
			config: {
				authority: "https://k9bor3.logto.app/oidc",
				redirectUrl: `${window.location.origin}/auth/callback`,
				postLogoutRedirectUri: window.location.origin,
				clientId: "zz5vo27wtvtjf36srwtbp",
				scope: "openid offline_access",
				responseType: "code",
				silentRenew: true,
				useRefreshToken: true,
				logLevel: LogLevel.Debug,
				autoUserInfo: true,
				renewUserInfoAfterTokenRenew: true,
				customParamsAuthRequest: {
					prompt: "consent",
				},
			},
		},
		withDefaultFeatures(
			// the after feature will replace the before same type feature
			// so the following line can be ignored
			{ router: { enabled: false } },
		),
		withTanstackRouter(router),
	),
) as Injector;

// if needed, check when init
const oidcSecurityService = injector.get(OidcSecurityService);
oidcSecurityService.checkAuth().subscribe();

const rootEl = document.getElementById("root");

if (rootEl) {
	const root = ReactDOM.createRoot(rootEl);

	root.render(
		<React.StrictMode>
			<InjectorProvider injector={injector}>
				<RouterProvider
					router={router}
					context={{ injector, oidcSecurityService }}
				/>
			</InjectorProvider>
		</React.StrictMode>,
	);
}
