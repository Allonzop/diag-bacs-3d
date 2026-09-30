import { creerEquipement, creerLocal, creerNiveau, creerProjet, creerZone, rectangle } from './projet';
import type { Projet } from './types';

/**
 * Projet démo synthétique : une petite école fictive. Aucune donnée client.
 * Identifiants et coordonnées fixes pour que les tests de non-régression des métrés soient déterministes.
 * Sert aussi de projet d'exemple dans l'app (« Charger le projet démo »).
 */
export function projetDemo(versionsReferentiels: Record<string, string>, coefficientCheminement: number): Projet {
  const p = creerProjet({
    id: 'p_demo',
    reference: 'DEMO-0001',
    nom: 'École des Tilleuls (démo)',
    adresse: '12 rue des Tilleuls',
    codePostal: '44000',
    zoneClimatique: 'H2b',
    coefficientCheminement,
    versionsReferentiels,
    date: '2026-09-30T08:00:00.000Z',
  });

  const zone = creerZone('Bâtiment principal', 'z_principal');
  p.zones.push(zone);

  const rdc = creerNiveau(zone.id, 'RDC', 0, 3.2, 0, 'n_rdc');
  const r1 = creerNiveau(zone.id, 'R+1', 3.5, 2.8, 1, 'n_r1');
  p.niveaux.push(rdc, r1);

  // RDC : chaufferie 6×5 en haut à gauche, hall, deux salles, bureau.
  const chaufferie = creerLocal(zone.id, rdc.id, 'Chaufferie', rectangle(0, 0, 6, 5), 'technique', 'l_chaufferie');
  const hall = creerLocal(zone.id, rdc.id, 'Hall', rectangle(6, 0, 8, 5), 'circulation', 'l_hall');
  const salle1 = creerLocal(zone.id, rdc.id, 'Salle 1', rectangle(0, 5, 7, 8), 'enseignement', 'l_salle1');
  const salle2 = creerLocal(zone.id, rdc.id, 'Salle 2', rectangle(7, 5, 7, 8), 'enseignement', 'l_salle2');
  // Bureau en L : 14×13 moins un carré 4×4 en bas à droite.
  const bureau = creerLocal(
    zone.id,
    rdc.id,
    'Bureau direction',
    [
      { x: 14, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 13 },
      { x: 16, y: 13 },
      { x: 16, y: 9 },
      { x: 14, y: 9 },
    ],
    'bureau',
    'l_bureau',
  );
  // R+1 : local technique CTA, deux salles, couloir.
  const localCta = creerLocal(zone.id, r1.id, 'Local technique CTA', rectangle(0, 0, 6, 5), 'technique', 'l_cta');
  const couloir = creerLocal(zone.id, r1.id, 'Couloir', rectangle(6, 0, 14, 5), 'circulation', 'l_couloir');
  const salle3 = creerLocal(zone.id, r1.id, 'Salle 3', rectangle(0, 5, 10, 8), 'enseignement', 'l_salle3');
  const salle4 = creerLocal(zone.id, r1.id, 'Salle 4', rectangle(10, 5, 10, 8), 'enseignement', 'l_salle4');
  p.locaux.push(chaufferie, hall, salle1, salle2, bureau, localCta, couloir, salle3, salle4);

  const poser = (
    e: ReturnType<typeof creerEquipement>,
    niveauId: string,
    localId: string | null,
    x: number,
    y: number,
    z: number,
  ) => {
    e.niveauId = niveauId;
    e.localId = localId;
    e.position = { x, y, z };
    return e;
  };

  const automate = poser(
    creerEquipement(zone.id, 'boitier', 'Automate chaufferie', { fabricant: 'Démo', modele: 'AUT-1', protocoles: 'Modbus', capaciteES: '16 E / 8 S' }, 'e_automate'),
    rdc.id,
    chaufferie.id,
    1,
    1,
    1.5,
  );
  const chaudiere = poser(
    creerEquipement(zone.id, 'generation', 'Chaudière gaz', { energie: 'Gaz', type: 'chaudiere', puissanceChaudKw: 120, puissanceFroidKw: 0, quantite: 1, annee: 2008 }, 'e_chaudiere'),
    rdc.id,
    chaufferie.id,
    3,
    2,
    0.5,
  );
  chaudiere.lieA = automate.id;
  const departRad = poser(
    creerEquipement(zone.id, 'distribution', 'Départ radiateurs', { generationMere: 'Chaudière gaz', destination: 'Radiateurs', loiEau: '70/50', vanne3Voies: true }, 'e_depart_rad'),
    rdc.id,
    chaufferie.id,
    4,
    1,
    1.8,
  );
  departRad.lieA = automate.id;
  const departCta = poser(
    creerEquipement(zone.id, 'distribution', 'Départ CTA', { generationMere: 'Chaudière gaz', destination: 'CTA', loiEau: '60/40', vanne3Voies: true }, 'e_depart_cta'),
    rdc.id,
    chaufferie.id,
    5,
    1,
    1.8,
  );
  departCta.lieA = automate.id;
  const ecs = poser(creerEquipement(zone.id, 'ecs', 'Ballon ECS', { energie: 'Électricité', puissanceKw: 3, volumeBallonL: 300, pompeBouclage: false }, 'e_ecs'), rdc.id, chaufferie.id, 1, 4, 0.5);
  const compteurGaz = poser(creerEquipement(zone.id, 'compteur', 'Compteur gaz', { energie: 'Gaz', communicant: false }, 'e_compteur_gaz'), rdc.id, bureau.id, 19, 12, 1);
  compteurGaz.lieA = automate.id; // loin → radio
  const compteurElec = poser(creerEquipement(zone.id, 'compteur', 'Compteur électrique (PDL)', { energie: 'Électricité', numeroPdl: '00000000000000', communicant: true, protocole: 'TIC' }, 'e_compteur_elec'), rdc.id, hall.id, 13, 1, 1.5);
  const tableau = poser(creerEquipement(zone.id, 'tableau', 'TGBT', { designation: 'Tableau général' }, 'e_tgbt'), rdc.id, hall.id, 12, 1, 1.5);
  const rad1 = poser(creerEquipement(zone.id, 'emetteur', 'Radiateurs salle 1', { sourceChaud: 'Départ radiateurs', quantite: 3, regulateur: 'Robinet thermostatique' }, 'e_rad1'), rdc.id, salle1.id, 3, 12, 0.6);
  const rad2 = poser(creerEquipement(zone.id, 'emetteur', 'Radiateurs salle 2', { sourceChaud: 'Départ radiateurs', quantite: 3, regulateur: 'Robinet thermostatique' }, 'e_rad2'), rdc.id, salle2.id, 10, 12, 0.6);
  const ecl1 = poser(creerEquipement(zone.id, 'eclairage', 'Éclairage salle 1', { zoneDesservie: 'Salle 1', type: 'LED', commande: 'Interrupteur' }, 'e_ecl1'), rdc.id, salle1.id, 3.5, 9, 3);
  const sondeExt = poser(creerEquipement(zone.id, 'capteur', 'Sonde extérieure', { grandeur: 'Température extérieure' }, 'e_sonde_ext'), rdc.id, null, 0, 2.5, 2.5);
  sondeExt.lieA = automate.id;

  const boitierCta = poser(creerEquipement(zone.id, 'boitier', 'Boîtier CTA', { fabricant: 'Démo', modele: 'CTA-REG', protocoles: 'Modbus' }, 'e_boitier_cta'), r1.id, localCta.id, 1, 1, 1.5);
  const cta = poser(creerEquipement(zone.id, 'cta', 'CTA double flux', { puissanceThermiqueMaxKw: 30, batterieChaude: true, batterieFroide: false, flux: 'double' }, 'e_cta'), r1.id, localCta.id, 4, 3, 0.3);
  cta.lieA = boitierCta.id;
  boitierCta.lieA = automate.id; // change de niveau → radio
  const rad3 = poser(creerEquipement(zone.id, 'emetteur', 'Radiateurs salle 3', { sourceChaud: 'Départ radiateurs', quantite: 4 }, 'e_rad3'), r1.id, salle3.id, 5, 12, 0.6);
  const rad4 = poser(creerEquipement(zone.id, 'emetteur', 'Radiateurs salle 4', { sourceChaud: 'Départ radiateurs', quantite: 4 }, 'e_rad4'), r1.id, salle4.id, 15, 12, 0.6);

  // Deux équipements encore dans le bac « À placer ».
  const eclCouloir = creerEquipement(zone.id, 'eclairage', 'Éclairage couloir R+1', { zoneDesservie: 'Couloir', type: 'Tubes fluo', commande: 'Détection' }, 'e_ecl_couloir');
  const compteurEau = creerEquipement(zone.id, 'compteur', "Compteur d'eau", { energie: 'Eau', communicant: false }, 'e_compteur_eau');

  p.equipements.push(
    automate,
    chaudiere,
    departRad,
    departCta,
    ecs,
    compteurGaz,
    compteurElec,
    tableau,
    rad1,
    rad2,
    ecl1,
    sondeExt,
    boitierCta,
    cta,
    rad3,
    rad4,
    eclCouloir,
    compteurEau,
  );
  return p;
}
