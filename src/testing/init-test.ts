import { DOCUMENT } from "oidc-client-rx/dom";
import { TestBed } from "@/testing/testbed";
import "reflect-metadata";

// First, initialize the Angular testing environment.
TestBed.initTestEnvironment([
	{
		provide: DOCUMENT,
		useValue: document,
	},
]);
