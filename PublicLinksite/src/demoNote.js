export const DEMO_PUBLIC_NOTE = {
  title: 'Carnet de lancement Fiip',
  author_username: 'Equipe Fiip',
  updated_at: '2026-06-27T09:30:00Z',
  updatedAt: new Date('2026-06-27T09:30:00Z').getTime(),
  badges: [
    { name: 'Produit' },
    { name: 'Partage' },
    { name: 'Capture web' },
  ],
  content: `
## Synthèse

Fiip centralise les notes importantes, les captures web et les pièces jointes sans casser la lecture publique. Cette note de démonstration montre le rendu partagé : titres nets, blocs respirants, tâches lisibles et exports disponibles.

## Points à suivre

- Finaliser la fiche Chrome Web Store avec captures d'écran.
- Ajouter les consignes d'installation manuelle Edge après validation Chrome.
- Vérifier que les liens publics restent lisibles sur mobile.
- Conserver les notes protégées hors partage public.

## Exemple de compte rendu

La réunion produit confirme trois priorités : garder une prise de notes rapide, rendre les exports utiles, et proposer une page publique propre pour les lecteurs externes. Les pièces jointes restent affichées seulement quand leurs URLs sont sûres.

> Une note partagée doit être agréable à lire même pour quelqu'un qui n'a pas encore installé l'application.

## Prochaine action

Préparer une capture de la popup Fiip Clipper, une capture d'une note créée depuis une page web, puis publier les liens Store dans la configuration du site.
`,
  attachments: [
    {
      type: 'file',
      name: 'Plan-de-publication.pdf',
      url: 'https://example.com/fiip-plan-publication.pdf',
    },
  ],
};
