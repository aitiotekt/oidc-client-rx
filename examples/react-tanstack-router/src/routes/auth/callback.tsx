import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/callback")({
	component: AuthCallbackComponent,
});

function AuthCallbackComponent() {
	return (
		<div className="p-2">
			<h3>Auth Callback: validating...</h3>
		</div>
	);
}
