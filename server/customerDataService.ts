import { safeReadJsonFile, safeWriteJsonFile } from './dataPath.js';

function getCustomerFileName(userId: string): string {
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `customer_${safeId}.json`;
}

function getDefaultCustomerData() {
  return {
    accounts: [],
    trades: [],
    rules: [],
    goals: [],
    psychologySettings: {
      cooldownMinutes: 30,
      mandatoryCheckIn: true,
      audioAlertsEnabled: true,
      autoPromptRecoveryOnTilt: true,
      breathingPreset: 'BOX_4_4_4_4',
      maxConsecutiveLossesBeforeTilt: 2,
      tiltSensitivity: 'STRICT',
    },
    psychologyCheckIns: [],
    cbtRecords: [],
    actRecords: [],
    recoveryLogs: [],
  };
}

export function getCustomerData(userId: string): any {
  const fileName = getCustomerFileName(userId);
  const data = safeReadJsonFile<any>(fileName, null);
  if (!data) {
    return getDefaultCustomerData();
  }
  return {
    ...getDefaultCustomerData(),
    ...data,
  };
}

export function saveCustomerData(userId: string, data: any): boolean {
  const fileName = getCustomerFileName(userId);
  try {
    safeWriteJsonFile(fileName, data);
    return true;
  } catch (err) {
    console.error('Error saving customer data:', err);
    return false;
  }
}
