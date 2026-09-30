import { describe, expect, it } from 'vitest';
import { projetDemo } from '../src/modele/demo';
import { creerProjet, departementDe } from '../src/modele/projet';
import { ErreurSchema, migrerProjet } from '../src/modele/schema';
import { SCHEMA_VERSION } from '../src/modele/types';
import { referentielMetres, versionsReferentiels, zoneClimatiqueDuDepartement } from '../src/referentiels';

describe('schéma et migrations', () => {
  it('un projet courant passe la migration sans changement', () => {
    const p = projetDemo(versionsReferentiels(), referentielMetres.coefficientCheminementDefaut);
    expect(migrerProjet(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });
  it('un projet sans schemaVersion (v0) reçoit les champs manquants', () => {
    const brut = { id: 'x', reference: 'R', nom: 'N', zones: [], niveaux: [], locaux: [], equipements: [] };
    const p = migrerProjet(brut);
    expect(p.schemaVersion).toBe(SCHEMA_VERSION);
    expect(p.parametres.coefficientCheminement).toBe(1.2);
    expect(p.scenarios).toEqual([]);
  });
  it('un schéma futur est refusé', () => {
    const p = { ...projetDemo(versionsReferentiels(), 1.2), schemaVersion: SCHEMA_VERSION + 1 };
    expect(() => migrerProjet(p)).toThrow(ErreurSchema);
  });
  it('une structure incomplète est refusée', () => {
    expect(() => migrerProjet({ id: 'x' })).toThrow(ErreurSchema);
    expect(() => migrerProjet('texte')).toThrow(ErreurSchema);
  });
  it('creerProjet enregistre les versions des référentiels', () => {
    const p = creerProjet({ reference: 'R', nom: 'N', coefficientCheminement: 1.2, versionsReferentiels: versionsReferentiels() });
    expect(p.versionsReferentiels.points).toBeDefined();
    expect(p.schemaVersion).toBe(SCHEMA_VERSION);
  });
});

describe('zone climatique', () => {
  it('département déduit du code postal', () => {
    expect(departementDe('44000')).toBe('44');
    expect(departementDe('20000')).toBe('2A');
    expect(departementDe('20200')).toBe('2B');
    expect(departementDe('97100')).toBe('971');
    expect(departementDe('4400')).toBeNull();
  });
  it('zone climatique du référentiel', () => {
    expect(zoneClimatiqueDuDepartement('44')).toBe('H2b');
    expect(zoneClimatiqueDuDepartement('75')).toBe('H1a');
    expect(zoneClimatiqueDuDepartement('971')).toBeNull();
    expect(zoneClimatiqueDuDepartement(null)).toBeNull();
  });
});
