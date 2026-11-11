import { PART1 } from './part1';
import { PART2 } from './part2';
import { PART3 } from './part3';
import { PART4 } from './part4';
import { PART5 } from './part5';
export * from './types';

export const DIVISIONS = [...PART1, ...PART2, ...PART3, ...PART4, ...PART5];
export const TOPIC_COUNT = DIVISIONS.reduce((n, d) => n + d.topics.length, 0);
