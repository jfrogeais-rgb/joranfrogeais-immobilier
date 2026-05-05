# Joran Frogeais — Conseiller immobilier Efficity

Site web statique du conseiller immobilier indépendant Efficity, basé à Rennes / Betton.

## Stack

- HTML / CSS / JS vanille (zéro framework)
- Hébergement : Cloudflare Pages
- Backend dynamique : workflows n8n via webhooks (`/crm-ingest`, `/estim-form`, `/list-mandats-public`)

## Pages

- `index.html` — accueil
- `vendre.html` — proposition de service vendeur (méthode + tableau comparatif vs agence)
- `acheter.html` — service acquéreur
- `biens.html` — vitrine dynamique des mandats actifs (scrape efficity.com/jfrogeais)
- `estimation.html` — formulaire d'estimation gratuite
- `recherche.html` — formulaire acquéreur
- `a-propos.html` — parcours, méthode, garanties
- `conseils.html` — articles + 4 sous-pages
- `temoignages.html` — retours clients
- `contact.html` — formulaire contact
- `rejoindre.html` — Effistart parrainage
- `mentions-legales.html` / `confidentialite.html`

## Déploiement

Push sur la branche `main` → Cloudflare Pages redéploie automatiquement.

## Modifs / dev local

Servir en local :
```bash
node _serve.js   # http://localhost:8080
```
