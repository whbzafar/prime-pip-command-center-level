// PrimePipFX Autonomous Security Agent
// Strict AST and static pattern auditor enforcing Section 12: Autonomous Code Safety & Elevated Guardrails

import {
  ChangeRiskClassification,
  ElevatedProtectedDomain,
  SafeChangeCategory,
} from './evolutionTypes.js';

export interface ComprehensiveSecurityAudit {
  passed: boolean;
  status: 'PASSED' | 'BLOCKED_CRITICAL' | 'ELEVATION_REQUIRED';
  changeType: ChangeRiskClassification;
  category?: SafeChangeCategory;
  protectedDomain?: ElevatedProtectedDomain;
  checksPassed: string[];
  violations: string[];
  authBoundaryIntact: boolean;
  riskBoundaryIntact: boolean;
  elevationRequired: boolean;
  auditedAt: number;
}

export class SecurityAgent {
  // Absolute Zero-Tolerance RCE & Untrusted Code Patterns
  private forbiddenPatterns = [
    { regex: /eval\s*\(/, name: 'Banned eval() execution' },
    { regex: /new\s+Function\s*\(/, name: 'Banned dynamic Function() constructor' },
    { regex: /child_process|exec\s*\(|spawn\s*\(|fork\s*\(/, name: 'Banned shell & process execution' },
    { regex: /import\s*\(\s*[^'"`]/, name: 'Banned dynamic arbitrary module import' },
    { regex: /<script\b[^>]*>/i, name: 'Banned raw HTML script tag injection' },
    { regex: /dangerouslySetInnerHTML/, name: 'Banned unvalidated HTML injection' },
    { regex: /process\.env\.(AWS|SECRET|DATABASE|GEMINI_API_KEY)/, name: 'Protected secret key exfiltration' },
    { regex: /isAdmin\s*=\s*true/, name: 'Unauthorized admin privilege escalation' },
    { regex: /localStorage\.setItem\(['"]user_password['"]/, name: 'Plaintext credential storage' },
    { regex: /fetch\s*\(\s*['"]https?:\/\/(?!localhost|127\.0\.0\.1|api\.frankfurter|api\.coingecko)/, name: 'Untrusted external network egress' },
  ];

  // Elevated Protected Domains that require strict human admin authorization
  private elevatedDomainKeywords: Array<{
    domain: ElevatedProtectedDomain;
    patterns: RegExp[];
    description: string;
  }> = [
    {
      domain: 'AUTHENTICATION',
      patterns: [/jwt\.sign/i, /bcrypt/i, /verifyPassword/i, /role\s*:\s*['"]ADMIN['"]/i, /requireDeveloper/i],
      description: 'System authentication, token generation, or privilege verification routines',
    },
    {
      domain: 'PAYMENTS',
      patterns: [/stripe/i, /checkout/i, /deposit/i, /withdrawal/i, /paymentIntent/i],
      description: 'Payment gateway gateways, financial deposits, or withdrawals',
    },
    {
      domain: 'FINANCIAL_CALCULATIONS',
      patterns: [/martingale/i, /doubleLot/i, /pipValue\s*=/i, /marginRequired\s*=/i, /unrealizedPnL\s*=/i],
      description: 'Core financial formulas, pip valuation, or position sizing math',
    },
    {
      domain: 'RISK_LIMITS',
      patterns: [/maxDailyDrawdown\s*=/i, /maxRiskPercent\s*=/i, /bypassStopLoss/i, /disableRiskCheck/i],
      description: 'Trading risk limits, max drawdown invariants, or stop-loss controls',
    },
    {
      domain: 'CUSTOMER_ISOLATION',
      patterns: [/tenantId\s*=/i, /accountOwnerId\s*=/i, /where.*userId.*undefined/i, /allAccountsAcrossUsers/i],
      description: 'Customer data multi-tenant boundary and account ownership isolation',
    },
  ];

  public auditCode(sourceCode: string, targetPath: string): ComprehensiveSecurityAudit {
    const violations: string[] = [];
    const checksPassed: string[] = [];
    let authBoundaryIntact = true;
    let riskBoundaryIntact = true;
    let elevationRequired = false;
    let protectedDomain: ElevatedProtectedDomain | undefined = undefined;

    // 1. Run zero-tolerance RCE & untrusted code pattern scans
    for (const pattern of this.forbiddenPatterns) {
      if (pattern.regex.test(sourceCode)) {
        violations.push(`Security Violation [CRITICAL]: ${pattern.name} detected in ${targetPath}`);
      } else {
        checksPassed.push(`Verified safe: ${pattern.name}`);
      }
    }

    // 2. Database command safety
    if (sourceCode.includes('DROP TABLE') || sourceCode.includes('TRUNCATE') || sourceCode.includes('rm -rf')) {
      violations.push('Data integrity violation [CRITICAL]: Destructive database or file commands detected.');
    } else {
      checksPassed.push('Verified safe: No destructive database or filesystem operations');
    }

    // 3. Elevated Protected Domain Assessment
    for (const item of this.elevatedDomainKeywords) {
      for (const rx of item.patterns) {
        if (rx.test(sourceCode)) {
          elevationRequired = true;
          protectedDomain = item.domain;
          violations.push(
            `Elevated Protection Triggered: Change affects protected domain [${item.domain}] (${item.description}). Requires Admin signature.`
          );
          if (item.domain === 'AUTHENTICATION' || item.domain === 'CUSTOMER_ISOLATION') {
            authBoundaryIntact = false;
          }
          if (item.domain === 'RISK_LIMITS' || item.domain === 'FINANCIAL_CALCULATIONS') {
            riskBoundaryIntact = false;
          }
          break;
        }
      }
    }

    // 4. Classify risk level
    const isCriticalViolation = violations.some((v) => v.includes('[CRITICAL]'));
    const isElevated = elevationRequired;
    const changeType: ChangeRiskClassification = isElevated || isCriticalViolation ? 'ELEVATED_CRITICAL' : 'SAFE_LOW_RISK';

    let status: 'PASSED' | 'BLOCKED_CRITICAL' | 'ELEVATION_REQUIRED' = 'PASSED';
    if (isCriticalViolation) {
      status = 'BLOCKED_CRITICAL';
    } else if (isElevated) {
      status = 'ELEVATION_REQUIRED';
    }

    // 5. If safe low risk, assign appropriate safe category
    let category: SafeChangeCategory = 'NON_CRITICAL_UX';
    if (targetPath.includes('psychology') || targetPath.includes('education')) {
      category = 'EDUCATIONAL_CONTENT';
    } else if (targetPath.includes('config') || targetPath.includes('theme')) {
      category = 'UI_CONFIGURATION';
    } else if (targetPath.includes('flag') || targetPath.includes('feature')) {
      category = 'FEATURE_FLAG';
    } else if (targetPath.includes('content') || targetPath.includes('text')) {
      category = 'CONTENT_IMPROVEMENT';
    }

    return {
      passed: status === 'PASSED',
      status,
      changeType,
      category: changeType === 'SAFE_LOW_RISK' ? category : undefined,
      protectedDomain,
      checksPassed,
      violations,
      authBoundaryIntact,
      riskBoundaryIntact,
      elevationRequired,
      auditedAt: Date.now(),
    };
  }
}

