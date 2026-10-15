import { DataCollector } from './types.js';
import { FredCollector } from './fredCollector.js';
import { CftcCollector } from './cftcCollector.js';
import { EcbCollector } from './ecbCollector.js';

export * from './types.js';
export * from './fredCollector.js';
export * from './cftcCollector.js';
export * from './ecbCollector.js';

const collectorsRegistry = new Map<string, DataCollector>();

const fred = new FredCollector();
const cftc = new CftcCollector();
const ecb = new EcbCollector();

collectorsRegistry.set(fred.sourceId, fred);
collectorsRegistry.set(cftc.sourceId, cftc);
collectorsRegistry.set(ecb.sourceId, ecb);

/**
 * Retrieves the appropriate data collector instance for a given source ID.
 */
export function getCollectorForSource(sourceId: string): DataCollector | undefined {
  return collectorsRegistry.get(sourceId.toLowerCase());
}

/**
 * Lists all registered collectors.
 */
export function getAllRegisteredCollectors(): DataCollector[] {
  return Array.from(collectorsRegistry.values());
}
