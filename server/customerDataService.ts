import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

function getCustomerFile(userId: string): string {
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(DATA_DIR, `customer_${safeId}.json`);
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
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const file = getCustomerFile(userId);
  if (!fs.existsSync(file)) {
    return getDefaultCustomerData();
  }
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...getDefaultCustomerData(),
      ...parsed,
    };
  } catch (err) {
    console.error('Error reading customer data:', err);
    return getDefaultCustomerData();
  }
}

export function saveCustomerData(userId: string, data: any): boolean {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const file = getCustomerFile(userId);
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving customer data:', err);
    return false;
  }
}
