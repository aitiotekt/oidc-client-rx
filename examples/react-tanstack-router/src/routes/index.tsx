import { createFileRoute } from "@tanstack/react-router";
import { useObservableEagerState } from "observable-hooks";
import { useOidcClient } from "oidc-client-rx/adapters/react";
import { useCallback } from "react";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	const { oidcSecurityService } = useOidcClient();

	const { isAuthenticated } = useObservableEagerState(
		oidcSecurityService.isAuthenticated$,
	);

	const handleLogin = useCallback(() => {
		oidcSecurityService.authorize().subscribe();
	}, [oidcSecurityService]);

	const handleLogout = useCallback(() => {
		oidcSecurityService.logoff().subscribe();
	}, [oidcSecurityService]);

	return (
		<div className="p-2 text-center">
			<h1>Welcome OIDC-CLIENT-RX DEMO of react-tanstack-router</h1>
			<p>Is authenticated? {isAuthenticated ? "True" : "False"}</p>
			{isAuthenticated ? (
				<button onClick={handleLogout} type="button">
					Click to Logout
				</button>
			) : (
				<button onClick={handleLogin} type="button">
					Click to Login
				</button>
			)}
		</div>
	);
}
