/** Identifiants courts, uniques dans un projet. Non séquentiels pour survivre aux fusions d'import. */
export function nouvelId(prefixe = 'o'): string {
  const alea =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefixe}_${alea}`;
}
