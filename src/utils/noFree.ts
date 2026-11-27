/** The offer is never described as free or at no cost; viewers are sent to the link in the bio instead. Words like “free-flowing” and “timeframe” are kept. */
export const noFree = (t?: string): string => (t || '')
  .replace(/\b(?:bilkul |totally |completely |100% |absolutely )?free(?: of cost| of charge)?\b(?!-)/gi, '')
  .replace(/\b(?:at )?no cost\b/gi, '')
  .replace(/(?:بالکل )?(?:مفت|فری)(?!م)/g, '')
  .replace(/\s{2,}/g, ' ').replace(/\s+([.,!?:۔])/g, '$1').trim();
