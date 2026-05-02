# DayZ Mapping Lab — Site v4

Cette version contient :
- Site responsive PC / tablette / mobile
- Menu burger mobile
- Offres fixes avec Stripe Checkout
- Page de paiement de devis verrouillé
- Panneau admin pour créer et gérer les devis
- Formulaire de contact envoyé vers Discord
- Pages mentions légales / CGV

## Installation locale

1. Installer Node.js
2. Ouvrir le dossier dans VS Code
3. Renommer `.env.example` en `.env`
4. Remplir les valeurs Stripe, Discord et admin
5. Lancer :

```bash
npm install
npm start
```

Site : http://localhost:3000
Admin : http://localhost:3000/admin.html

## Panneau admin

Le mot de passe est défini avec :

```env
ADMIN_PASSWORD=ton-mot-de-passe
```

Depuis l’admin, tu peux :
- créer un devis
- obtenir un lien de paiement unique
- marquer un devis en attente / payé / annulé
- supprimer un devis

## Fonctionnement devis verrouillé

1. Tu crées un devis dans `/admin.html`
2. Le site génère un numéro du type `DML-0002`
3. Le client va sur `/payer-devis.html?id=DML-0002`
4. Le montant est lu depuis `data/quotes.json`
5. Le client ne peut pas modifier le prix
6. Stripe encaisse le montant exact

## Stripe

Crée un produit/prix dans Stripe pour chaque offre fixe, puis copie les `price_xxx` dans `.env`.

Pour les devis personnalisés, aucun Price ID n’est nécessaire : le serveur crée le montant dynamiquement au moment du paiement.

## Discord

Crée un webhook dans ton salon Discord, puis colle l’URL dans :

```env
DISCORD_WEBHOOK_URL=
```

## Important sécurité

Ne mets jamais tes clés Stripe ou ton webhook Discord dans le HTML public.
Elles doivent rester uniquement dans `.env` côté serveur.

## Hébergement conseillé

Ce site nécessite Node.js. Tu peux l’héberger sur Render, Railway, Fly.io, VPS, ou autre hébergement compatible Node.
