import { Injectable, inject } from 'injection-js';
import { LoggerService } from '../../logging/logger.service';
import type { OpenIdConfiguration } from '../openid-configuration';
import type { Level, RuleValidationResult } from './rule';
import { allMultipleConfigRules, allRules } from './rules';

@Injectable()
export class ConfigValidationService {
  private readonly loggerService = inject(LoggerService);

  validateConfigs(passedConfigs: OpenIdConfiguration[]): boolean {
    return this.validateConfigsInternal(
      passedConfigs ?? [],
      allMultipleConfigRules
    );
  }

  validateConfig(passedConfig: OpenIdConfiguration): boolean {
    return this.validateConfigInternal(passedConfig, allRules);
  }

  private validateConfigsInternal(
    passedConfigs: OpenIdConfiguration[],
    allRulesToUse: ((
      passedConfig: OpenIdConfiguration[]
    ) => RuleValidationResult)[]
  ): boolean {
    if (passedConfigs.length === 0) {
      return false;
    }

    const allValidationResults = allRulesToUse.map((rule) =>
      rule(passedConfigs)
    );

    let overallErrorCount = 0;

    for (const passedConfig of passedConfigs) {
      const errorCount = this.processValidationResultsAndGetErrorCount(
        allValidationResults,
        passedConfig
      );

      overallErrorCount += errorCount;
    }

    return overallErrorCount === 0;
  }

  private validateConfigInternal(
    passedConfig: OpenIdConfiguration,
    allRulesToUse: ((
      passedConfig: OpenIdConfiguration
    ) => RuleValidationResult)[]
  ): boolean {
    const allValidationResults = allRulesToUse.map((rule) =>
      rule(passedConfig)
    );

    const errorCount = this.processValidationResultsAndGetErrorCount(
      allValidationResults,
      passedConfig
    );

    return errorCount === 0;
  }

  private processValidationResultsAndGetErrorCount(
    allValidationResults: RuleValidationResult[],
    config: OpenIdConfiguration
  ): number {
    const allMessages = allValidationResults.filter(
      (x) => x.messages.length > 0
    );
    const allErrorMessages = this.getAllMessagesOfType('error', allMessages);
    const allWarnings = this.getAllMessagesOfType('warning', allMessages);

    for (const message of allErrorMessages) {
      this.loggerService.logError(config, message);
    }
    for (const message of allWarnings) {
      this.loggerService.logWarning(config, message);
    }

    return allErrorMessages.length;
  }

  protected getAllMessagesOfType(
    type: Level,
    results: RuleValidationResult[]
  ): string[] {
    const allMessages = results
      .filter((x) => x.level === type)
      .map((result) => result.messages);

    return allMessages.reduce((acc, val) => acc.concat(val), []);
  }
}
