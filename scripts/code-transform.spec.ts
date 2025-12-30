import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Biome, Distribution } from "@biomejs/js-api";
import { rewriteObservableSubscribeTofirstValueFrom } from "./code-transform";

describe("rewriteSpecObservableSubscribeTofirstValueFrom", () => {
	it("should transform simple example valid string", async () => {
		const actual = await rewriteObservableSubscribeTofirstValueFrom(
			"index.ts",
			`refreshSessionIframeService
              .refreshSessionWithIframe(allConfigs[0]!, allConfigs)
              .subscribe((result) => {
                  expect(
                  result
                  ).toHaveBeenCalledExactlyOnceWith(
                  'a-url',
                  allConfigs[0]!,
                  allConfigs
                  );
              });`,
		);

		const expect = `const result = await firstValueFrom(refreshSessionIframeService.refreshSessionWithIframe(allConfigs[0]!, allConfigs));
      expect(result).toHaveBeenCalledExactlyOnceWith('a-url',allConfigs[0]!,allConfigs);`;

		const biome = await Biome.create({
			distribution: Distribution.NODE,
		});

		assert.equal(
			biome.formatContent(actual, { filePath: "index.ts" }).content,
			biome.formatContent(expect, { filePath: "index.ts" }).content,
		);
	});

	it("should rewrite complex exmaple to valid string", async () => {
		const actual = await rewriteObservableSubscribeTofirstValueFrom(
			"index.ts",
			`codeFlowCallbackService
          .authenticatedCallbackWithCode('some-url4', config, [config])
          .subscribe({
            error: (err: any) => {
              expect(resetSilentRenewRunningSpy).toHaveBeenCalled();
              expect(resetCodeFlowInProgressSpy).toHaveBeenCalled();
              expect(stopPeriodicallTokenCheckSpy).toHaveBeenCalled();
              expect(err).toBeTruthy();
            },
            next: (abc) => {
              expect(abc).toBeTruthy();
            },
            complete () {
              expect.fail('complete')
            }
          });`,
		);

		const expect = `
  try {
    const abc = await firstValueFrom(codeFlowCallbackService.authenticatedCallbackWithCode('some-url4', config, [config]));
    expect(abc).toBeTruthy();
  } catch (err: any) {
    if (err instanceof EmptyError) {
      expect.fail('complete')
    } else {
    expect(resetSilentRenewRunningSpy).toHaveBeenCalled();
    expect(resetCodeFlowInProgressSpy).toHaveBeenCalled();
    expect(stopPeriodicallTokenCheckSpy).toHaveBeenCalled();
    expect(err).toBeTruthy();
    }
  }
      `;

		const biome = await Biome.create({
			distribution: Distribution.NODE,
		});

		assert.equal(
			biome.formatContent(actual, { filePath: "index.ts" }).content,
			biome.formatContent(expect, { filePath: "index.ts" }).content,
		);
	});
});
