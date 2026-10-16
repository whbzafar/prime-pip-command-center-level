import { NormalizedSentimentItem, ProviderHealthStatus } from '../types.js';

export interface SentimentProvider {
  id: string;
  name: string;
  fetch(): Promise<NormalizedSentimentItem[]>;
  getStatus(): ProviderHealthStatus;
}
