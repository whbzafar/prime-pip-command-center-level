import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDbClient } from '../shared/db.js';
import { logger } from '../shared/logger.js';

export function getCanonicalConfigString(configObj: any): string {
  // Sort keys recursively for deterministic hash
  return JSON.stringify(configObj, Object.keys(configObj).sort());
}

export function computeConfigFileHash(configFilePath?: string): { hash: string; config: any } {
  const filePath = configFilePath || path.resolve(process.cwd(), 'backend', 'scoring', 'config', 'model-v0.1.json');
  if (!fs.existsSync(filePath)) {
    throw new Error(`Model config file not found at ${filePath}`);
  }
  const rawText = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(rawText);
  const canonical = getCanonicalConfigString(parsed);
  const hash = crypto.createHash('sha256').update(canonical).digest('hex');
  return { hash, config: parsed };
}

export async function publishModelConfig(configFilePath?: string): Promise<{
  modelVersion: string;
  configHash: string;
}> {
  const { hash, config } = computeConfigFileHash(configFilePath);
  const modelVersion = config.modelVersion || 'v0.1-initial';

  logger.info(`[PublishModelConfig] Publishing model configuration for ${modelVersion} (Hash: ${hash.slice(0, 12)}...)...`);

  const db = getDbClient();

  const { error } = await db.from('model_versions').upsert(
    {
      id: modelVersion,
      version_label: modelVersion,
      description: config.description || 'Pro Fundamentals Quantitative Scoring Model',
      config: config,
      config_hash: hash,
      is_active: true,
    },
    { onConflict: 'id' }
  );

  if (error) {
    throw new Error(`Failed to publish model config into Supabase: ${error.message}`);
  }

  logger.info(`[PublishModelConfig] Successfully published version ${modelVersion} with verified config_hash ${hash}.`);
  return { modelVersion, configHash: hash };
}

if (process.argv[1]?.endsWith('publishModelConfig.ts') || process.argv[1]?.endsWith('publishModelConfig.js')) {
  publishModelConfig()
    .then((res) => {
      console.log(`[PUBLISHED] Version ${res.modelVersion} active with hash ${res.configHash}`);
    })
    .catch((err) => {
      console.error('[ERROR] Publishing model config failed:', err?.message || err);
      process.exitCode = 1;
    });
}
