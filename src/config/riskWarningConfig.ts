/**
 * PrimePipFX Tactical Risk Warning Configuration
 * 
 * You can edit all risk warning copy, threshold limits, and advisory messaging
 * directly from this configuration file.
 */

export interface RiskWarningConfig {
  /**
   * Title displayed on risk advisory notifications
   */
  title: string;

  /**
   * Default message when trade risk exceeds recommended threshold (1.0%)
   */
  thresholdExceededMessage: string;

  /**
   * Default message when daily trade count limit is exceeded
   */
  dailyTradeLimitMessage: string;

  /**
   * Default message when both risk % and daily trade count are exceeded
   */
  combinedExceededMessage: string;

  /**
   * General non-blocking advisory note for risk awareness
   */
  advisoryDisclaimer: string;

  /**
   * Recommended risk threshold percentage
   */
  recommendedMaxRiskPercent: number;

  /**
   * Recommended maximum daily trades guideline
   */
  recommendedMaxDailyTrades: number;
}

export const RISK_WARNING_CONFIG: RiskWarningConfig = {
  title: 'RISK ADVISORY NOTICE',
  thresholdExceededMessage:
    'Risk Warning: Selected risk exceeds the maximum 1.0% risk per trade allowed under disciplined rules. Exceeding this parameter violates tactical risk rules.',
  dailyTradeLimitMessage:
    'Trade Limit Notice: Daily trade count exceeds the maximum 2 trades per day allowed under disciplined rules. Exceeding this parameter violates overtrading discipline rules.',
  combinedExceededMessage:
    'Tactical Risk Warning: Both parameters violated — Maximum 1.0% risk per trade and Maximum 2 trades per day allowed. Please review your trade plan before continuing.',
  advisoryDisclaimer:
    'Maximum 1.0% risk per trade and Maximum 2 trades per day allowed under disciplined rules. Exceeding these parameters violates risk management rules. This advisory is educational to protect trader psychology and capital preservation.',
  recommendedMaxRiskPercent: 1.0,
  recommendedMaxDailyTrades: 2,
};
