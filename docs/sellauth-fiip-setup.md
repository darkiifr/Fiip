# SellAuth Fiip - configuration rapide

## IDs publics deja crees

Ces IDs ne sont pas des secrets.

| Plan | Product ID | Slug |
| --- | ---: | --- |
| Basic | `782696` | `fiip-basic` |
| Pro | `782704` | `fiip-pro` |
| AI | `782706` | `fiip-ai` |
| Family Pro | `782707` | `fiip-family-pro` |

Shop SellAuth : `130522`.

Theme SellAuth actuel : `192854`.

## Ou mettre les IDs

### Netlify, site public

Dans Netlify > Site configuration > Environment variables :

```env
VITE_SELLAUTH_SHOP_URL=https://vinsstudio.mysellauth.com
VITE_SELLAUTH_BASIC_PRODUCT_PATH=fiip-basic
VITE_SELLAUTH_PRO_PRODUCT_PATH=fiip-pro
VITE_SELLAUTH_AI_PRODUCT_PATH=fiip-ai
VITE_SELLAUTH_FAMILY_PRO_PRODUCT_PATH=fiip-family-pro
VITE_SELLAUTH_BASIC_MONTHLY_PRODUCT_ID=782696
VITE_SELLAUTH_BASIC_YEARLY_PRODUCT_ID=782696
VITE_SELLAUTH_PRO_MONTHLY_PRODUCT_ID=782704
VITE_SELLAUTH_PRO_YEARLY_PRODUCT_ID=782704
VITE_SELLAUTH_AI_MONTHLY_PRODUCT_ID=782706
VITE_SELLAUTH_AI_YEARLY_PRODUCT_ID=782706
VITE_SELLAUTH_FAMILY_PRO_MONTHLY_PRODUCT_ID=782707
VITE_SELLAUTH_FAMILY_PRO_YEARLY_PRODUCT_ID=782707
```

Les `VITE_SELLAUTH_*_VARIANT_ID` peuvent rester vides. Le site ouvre les pages produit avec `?variant=Mensuel` ou `?variant=Annuel`.

### Supabase Edge Functions

Dans Supabase, mets ces valeurs avec `supabase secrets set`.

```powershell
supabase link --project-ref fqouvzkovppyqocfxanl
supabase secrets set SELLAUTH_BASIC_MONTHLY_PRODUCT_ID="782696"
supabase secrets set SELLAUTH_BASIC_YEARLY_PRODUCT_ID="782696"
supabase secrets set SELLAUTH_PRO_MONTHLY_PRODUCT_ID="782704"
supabase secrets set SELLAUTH_PRO_YEARLY_PRODUCT_ID="782704"
supabase secrets set SELLAUTH_AI_MONTHLY_PRODUCT_ID="782706"
supabase secrets set SELLAUTH_AI_YEARLY_PRODUCT_ID="782706"
supabase secrets set SELLAUTH_FAMILY_PRO_MONTHLY_PRODUCT_ID="782707"
supabase secrets set SELLAUTH_FAMILY_PRO_YEARLY_PRODUCT_ID="782707"
```

Les variant IDs peuvent rester vides. La fonction reconnait maintenant le plan par Product ID, puis la duree par le nom de variante `Mensuel` ou `Annuel`.

## Cles restantes a configurer

### Obligatoires pour vendre une licence automatiquement

Dans Supabase secrets :

```powershell
supabase secrets set SUPABASE_URL="https://fqouvzkovppyqocfxanl.supabase.co"
supabase secrets set SUPABASE_ANON_KEY="..."
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="..."
supabase secrets set KEYAUTH_SELLER_KEY="..."
supabase secrets set KEYAUTH_SELLER_API_URL="https://keyauth.win/api/seller/"
supabase secrets set SELLAUTH_WEBHOOK_SECRET="..."
supabase secrets set MAIL_FROM="Fiip <licences@fiip.fr>"
supabase secrets set MAIL_REPLY_TO="support@fiip.fr"
```

`SELLAUTH_WEBHOOK_SECRET` doit etre la meme valeur cote SellAuth si la signature est activee.

### Obligatoires pour le site/logiciel

Dans Netlify et GitHub Actions secrets :

```env
VITE_SUPABASE_URL=https://fqouvzkovppyqocfxanl.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_KEYAUTH_NAME=Fiip
VITE_KEYAUTH_OWNERID=...
VITE_KEYAUTH_SECRET=...
VITE_KEYAUTH_APIURL=https://keyauth.win/api/1.2/
```

### Optionnelles selon les fonctions activees

```powershell
supabase secrets set RESEND_API_KEY="..."
supabase secrets set OPENROUTER_API_KEY="..."
supabase secrets set KEYAUTH_WEBHOOK_SECRET="..."
```

`RESEND_API_KEY` sert aux e-mails transactionnels. Sans domaine valide, utilise seulement une adresse autorisee par Resend en test.

`OPENROUTER_API_KEY` sert au proxy IA. Tant qu’il n’est pas pret, garde l’IA limitee/desactivee en production.

`KEYAUTH_WEBHOOK_SECRET` sert uniquement si tu appelles la fonction `keyauth-webhook`.

## SellAuth Theme CLI

Le CLI installe la commande `sellauth-theme`.

```powershell
npm install -g sellauth-theme-cli
sellauth-theme login
sellauth-theme list-ids
sellauth-theme pull --theme 192854 --shop 130522
```

L’API key SellAuth se trouve dans SellAuth Dashboard > Account > API Access.
Ne la mets jamais dans le repo et ne la poste pas dans un chat.

Apres modification locale du theme complet :

```powershell
sellauth-theme push --theme 192854 --shop 130522
```

Ne pousse pas un dossier partiel comme theme complet. Fais d’abord un `pull`, modifie les fichiers recuperes, puis `push`.
