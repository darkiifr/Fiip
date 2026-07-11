export const LEGAL_UPDATED_AT = '7 juillet 2026';

export const LEGAL_CONTACT_EMAIL = 'darkii_fr@hotmail.com';
export const LEGAL_DISCORD_URL = 'https://discord.gg/nghHqs2pvN';

export const LEGAL_OWNER_NAME = 'Vins Studio';

export const LEGAL_DOCS = {
  terms: {
    path: '/terms',
    title: 'Conditions generales d\'utilisation',
    shortTitle: 'CGU',
    intro: 'Ces conditions encadrent l’utilisation de Fiip, du site public, du portail de compte et des licences.',
    sections: [
      {
        heading: '1. Editeur du service',
        body: [
          `Fiip est edite par ${LEGAL_OWNER_NAME}.`,
          `Contact support : ${LEGAL_CONTACT_EMAIL}.`,
          `Serveur officiel de support : ${LEGAL_DISCORD_URL}.`,
        ],
      },
      {
        heading: '2. Objet',
        body: [
          'Fiip est une application de notes multi-plateforme avec synchronisation optionnelle, partage public de notes, licences premium, fonctions OCR locales et fonctions IA optionnelles selon le plan achete.',
          'Les pages publiques de notes restent accessibles sans compte lorsque l’utilisateur choisit explicitement de publier un lien public.',
        ],
      },
      {
        heading: '3. Compte et licence',
        body: [
          'Certaines fonctions necessitent un compte Fiip et/ou une licence active. L’utilisateur est responsable de la confidentialite de ses identifiants et de sa cle de licence.',
          'Une licence peut etre limitee par duree, nombre d’appareils, fonctions incluses, quota OCR ou budget IA selon le plan achete.',
        ],
      },
      {
        heading: '4. Usages interdits',
        body: [
          'Il est interdit d’utiliser Fiip pour publier, stocker ou transmettre des contenus illicites, frauduleux, portant atteinte aux droits de tiers, ou contenant des donnees que l’utilisateur n’a pas le droit de traiter.',
          'Toute tentative de contournement de licence, d’abus d’API, d’extraction massive ou d’attaque contre le service peut entrainer la suspension du compte ou de la licence.',
        ],
      },
      {
        heading: '5. IA et OCR',
        body: [
          'L’OCR est realise localement sur l’appareil lorsque la plateforme le permet. Aucune image n’est envoyee a un serveur externe pour l’OCR local.',
          'Si l’utilisateur active une fonction IA, le texte fourni peut etre traite par les services IA utilises par Fiip. L’utilisateur doit verifier les resultats avant utilisation.',
        ],
      },
      {
        heading: '6. Disponibilite et responsabilite',
        body: [
          'Fiip est fourni en l’etat, avec des efforts raisonnables de disponibilite. Certaines fonctions dependent de services tiers pour le paiement, l’hebergement, le compte, la licence ou l’IA.',
          'L’utilisateur doit conserver ses propres sauvegardes des notes importantes. Fiip ne remplace pas une solution d’archivage legal ou de sauvegarde professionnelle.',
        ],
      },
      {
        heading: '7. Modification des conditions',
        body: [
          'Les presentes conditions peuvent etre modifiees pour suivre l’evolution du produit, des offres ou des obligations legales. La version applicable est celle publiee sur cette page.',
        ],
      },
    ],
  },
  privacy: {
    path: '/privacy',
    title: 'Politique de confidentialite',
    shortTitle: 'Confidentialite',
    intro: 'Cette politique explique quelles donnees Fiip traite, pourquoi, et quels choix restent sous le controle de l’utilisateur.',
    sections: [
      {
        heading: '1. Responsable du traitement',
        body: [
          `Le responsable du traitement est ${LEGAL_OWNER_NAME}.`,
          `Contact donnees personnelles : ${LEGAL_CONTACT_EMAIL}.`,
        ],
      },
      {
        heading: '2. Donnees traitees',
        body: [
          'Fiip peut traiter l’adresse e-mail, les informations de compte, les informations de licence, le statut d’abonnement, les appareils synchronises, les journaux techniques de securite, et les notes que l’utilisateur choisit de synchroniser ou publier.',
          'Les notes locales restent sur l’appareil tant que la synchronisation ou le partage public ne sont pas actives.',
        ],
      },
      {
        heading: '3. Finalites',
        body: [
          'Les donnees sont traitees pour fournir le compte, synchroniser les notes, verifier les licences, livrer les achats, gerer les appareils, appliquer les quotas OCR/IA, assurer la securite et repondre au support.',
        ],
      },
      {
        heading: '4. Services tiers',
        body: [
          'Fiip utilise des services tiers pour l’authentification, la base de donnees, l’hebergement du site public, le checkout, les licences, les e-mails transactionnels et les fonctions IA lorsque l’utilisateur les active.',
        ],
      },
      {
        heading: '5. IA, OCR et contenu des notes',
        body: [
          'L’OCR local ne transmet pas l’image a un serveur externe. Le texte extrait peut etre insere dans une note.',
          'Les actions IA sont optionnelles. Lorsque l’utilisateur les lance, le texte demande peut etre transmis aux services IA utilises par Fiip afin de generer la reponse.',
        ],
      },
      {
        heading: '6. Duree de conservation',
        body: [
          'Les donnees de compte sont conservees pendant la duree d’utilisation du service. Les donnees de facturation et de preuve d’achat peuvent etre conservees selon les obligations legales applicables.',
          'Les notes synchronisees ou publiees sont conservees tant que l’utilisateur ne les supprime pas ou ne desactive pas leur publication, sous reserve des sauvegardes techniques temporaires.',
        ],
      },
      {
        heading: '7. Droits des utilisateurs',
        body: [
          'Conformement au RGPD, l’utilisateur peut demander l’acces, la rectification, l’effacement, la limitation, l’opposition ou la portabilite de ses donnees lorsque ces droits s’appliquent.',
          'L’utilisateur peut egalement introduire une reclamation aupres de la CNIL.',
        ],
      },
    ],
  },
  legalNotice: {
    path: '/legal',
    title: 'Mentions legales',
    shortTitle: 'Mentions legales',
    intro: 'Cette page rassemble les informations d’editeur, d’hebergement et de propriete intellectuelle de Fiip.',
    sections: [
      {
        heading: 'Editeur',
        body: [
          `Editeur : ${LEGAL_OWNER_NAME}.`,
          `E-mail : ${LEGAL_CONTACT_EMAIL}.`,
          `Serveur officiel de support : ${LEGAL_DISCORD_URL}.`,
        ],
      },
      {
        heading: 'Hebergement',
        body: [
          'Site public : Netlify.',
          'Compte et synchronisation : infrastructure cloud Fiip.',
          'Paiement et livraison de licence : SellAuth.',
          'Gestion des licences : système de licence Fiip.',
        ],
      },
      {
        heading: 'Propriete intellectuelle',
        body: [
          'Fiip, son interface, ses textes, ses logos, son code et ses elements graphiques sont proteges par le droit applicable, sauf mention contraire ou licence open source explicite.',
          'Les contenus crees par les utilisateurs restent sous leur responsabilite.',
        ],
      },
    ],
  },
  cookies: {
    path: '/cookies',
    title: 'Politique cookies',
    shortTitle: 'Cookies',
    intro: 'Cette page explique l’usage des cookies et technologies similaires sur le site et le portail Fiip.',
    sections: [
      {
        heading: 'Cookies necessaires',
        body: [
          'Fiip peut utiliser des cookies ou stockages locaux strictement necessaires pour la session, la securite, l’authentification et le fonctionnement du portail compte.',
        ],
      },
      {
        heading: 'Cookies non essentiels',
        body: [
          'Aucun cookie publicitaire ne doit etre depose sans consentement. Si des outils de mesure d’audience, publicite ou suivi sont ajoutes plus tard, un bandeau de consentement clair devra permettre d’accepter ou refuser avec la meme facilite.',
        ],
      },
      {
        heading: 'Gestion du choix',
        body: [
          'L’utilisateur peut supprimer les cookies depuis son navigateur. Si Fiip ajoute des cookies non essentiels, un centre de preferences devra permettre de retirer le consentement.',
        ],
      },
    ],
  },
  refunds: {
    path: '/refunds',
    title: 'Politique de remboursement',
    shortTitle: 'Remboursements',
    intro: 'Cette politique s’applique aux achats de licences numeriques Fiip.',
    sections: [
      {
        heading: '1. Produits numeriques',
        body: [
          'Conformement a l’article L.221-28 13° du Code de la consommation, le droit de retractation ne peut pas etre exerce pour les contrats de fourniture d’un contenu numerique sans support materiel lorsque l’execution a commence dans les conditions prevues par la loi, notamment apres accord prealable expres du consommateur et reconnaissance de la perte du droit de retractation lorsque cela est requis.',
          'Les licences Fiip sont des produits numeriques livres automatiquement apres paiement valide.',
        ],
      },
      {
        heading: '2. Aucune politique de remboursement',
        body: [
          'Du fait de la nature dematerialisee et irreversible des produits vendus, aucune demande de remboursement n’est acceptee une fois la cle de licence Fiip livree et/ou activee.',
          'Tout achat est ferme et definitif apres livraison de la cle, sous reserve des garanties legales applicables.',
        ],
      },
      {
        heading: '3. Exceptions pour raisons graves',
        body: [
          'Une demande de remboursement peut etre examinee au cas par cas uniquement dans des situations graves, notamment lorsque la cle de licence fournie est prouvee defectueuse ou invalide des l’origine, ou lorsque le produit n’a jamais ete livre suite a une erreur technique imputable a Fiip.',
          'Ces exceptions sont examinees sous reserve des garanties legales applicables, notamment la garantie des vices caches prevue aux articles 1641 et suivants du Code civil.',
          'L’incompatibilite materielle cote client, une erreur de choix de plan ou un changement d’avis ne constituent pas, a eux seuls, des motifs valables de remboursement.',
        ],
      },
      {
        heading: '4. Reclamation',
        body: [
          `Pour toute reclamation, contactez le support Fiip a ${LEGAL_CONTACT_EMAIL} ou via le serveur officiel de support : ${LEGAL_DISCORD_URL}.`,
          'La demande doit inclure le numero de commande, l’e-mail d’achat, le plan concerne, la cle de licence si disponible, et les preuves utiles.',
        ],
      },
    ],
  },
};

export const LEGAL_NAV_ITEMS = Object.values(LEGAL_DOCS).map((doc) => ({
  path: doc.path,
  label: doc.shortTitle,
}));
