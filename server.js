require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const Stripe = require('stripe');
const admin = require('firebase-admin');

const app = express();
const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;
const PORT = process.env.PORT || 3000;
const SITE_URL = process.env.SITE_URL || `http://localhost:${PORT}`;
const QUOTES_FILE = path.join(__dirname, 'data', 'quotes.json');
const REQUESTS_FILE = path.join(__dirname, 'data', 'requests.json');
let serviceAccount;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} 
  else {
    serviceAccount = require('./config/firebase.json');
}

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const DATA_DIR = path.join(__dirname, 'data');

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(REQUESTS_FILE)) {
    fs.writeFileSync(REQUESTS_FILE, '[]', 'utf8');
  }

  if (!fs.existsSync(QUOTES_FILE)) {
    fs.writeFileSync(QUOTES_FILE, '[]', 'utf8');
  }
}

ensureDataFiles();

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/stripe/webhook', express.raw({ type:'application/json' }), async (req,res)=>{
  if (!stripe) return res.status(500).send('Stripe non configuré.');

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Erreur webhook Stripe:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    if (session.metadata?.type === 'quote' && session.metadata?.quoteId) {
      const quoteId = session.metadata.quoteId;
      const quotes = await readQuotes();
      const quote = quotes.find(q => q.id === quoteId);

        if (quote) {
          quote.status = 'paid';
          quote.paidAt = new Date().toISOString();
          quote.stripeSessionId = session.id;
          await writeQuote(quote);

          await notifyDiscord({
          username:'DayZ Mapping Lab',
          embeds:[{
            title:`Paiement reçu — ${quoteId}`,
            color:0x22c55e,
            fields:[
              { name:'Client', value:quote.customerName || 'Non renseigné', inline:true },
              { name:'Email', value:quote.email || 'Non renseigné', inline:true },
              { name:'Montant', value:`${quote.amount}€`, inline:true },
              { name:'Service', value:quote.service || 'Non renseigné' }
            ],
            timestamp:new Date().toISOString()
          }]
        });

        console.log(`Devis ${quoteId} marqué comme payé.`);
      }
    }
  }

  res.json({ received:true });
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const fixedOffers = {
  premium: { name: 'Accès PREMIUM — mensuel', price: 15, priceEnv: 'STRIPE_PRICE_PREMIUM_MONTHLY', mode: 'subscription' },
  bot_basic: { name: 'Bot Discord Basique', price: 35, priceEnv: 'STRIPE_PRICE_BOT_BASIC', mode: 'payment' },
  bot_premium: { name: 'Bot Discord Premium', price: 65, priceEnv: 'STRIPE_PRICE_BOT_PREMIUM', mode: 'payment' },
  bot_ultra: { name: 'Bot Discord Ultra', price: 120, priceEnv: 'STRIPE_PRICE_BOT_ULTRA', mode: 'payment' },
  mapping_small: { name: 'Mapping Small', price: 20, priceEnv: 'STRIPE_PRICE_MAPPING_SMALL', mode: 'payment' },
  mapping_medium: { name: 'Mapping Medium', price: 50, priceEnv: 'STRIPE_PRICE_MAPPING_MEDIUM', mode: 'payment' },
  mapping_large: { name: 'Mapping Large', price: 100, priceEnv: 'STRIPE_PRICE_MAPPING_LARGE', mode: 'payment' },
  discord_setup: { name: 'Création serveur Discord complet', price: 69, priceEnv: 'STRIPE_PRICE_DISCORD_SETUP', mode: 'payment' }
};

async function getCollection(name) {
  const snapshot = await db.collection(name).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function saveDoc(collection, id, data) {
  await db.collection(collection).doc(id).set(data, { merge: true });
}

async function deleteDoc(collection, id) {
  await db.collection(collection).doc(id).delete();
}

async function readQuotes() {
  return await getCollection('quotes');
}

async function writeQuote(quote) {
  await saveDoc('quotes', quote.id, quote);
}

async function deleteQuote(id) {
  await deleteDoc('quotes', id);
}

async function readRequests() {
  return await getCollection('requests');
}

async function writeRequest(request) {
  await saveDoc('requests', request.id, request);
}

async function deleteRequest(id) {
  await deleteDoc('requests', id);
}

async function nextQuoteId(){
  const quotes = await readQuotes();
  const nums = quotes.map(q => Number(String(q.id||'').replace('DML-',''))).filter(Boolean);
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `DML-${String(next).padStart(4,'0')}`;
}

async function nextRequestId(){
  const requests = await readRequests();
  const nums = requests.map(r => Number(String(r.id||'').replace('REQ-',''))).filter(Boolean);
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `REQ-${String(next).padStart(4,'0')}`;
}
function sign(value){
  return crypto.createHmac('sha256', process.env.ADMIN_SESSION_SECRET || 'dev-secret').update(value).digest('hex');
}
function setAdminCookie(res){
  const value = `admin:${Date.now()}`;
  res.cookie('dml_admin', `${value}.${sign(value)}`, { httpOnly: true, sameSite: 'lax', secure: SITE_URL.startsWith('https'), maxAge: 1000*60*60*8 });
}
function isAdmin(req){
  const raw = req.cookies.dml_admin;
  if (!raw || !raw.includes('.')) return false;
  const idx = raw.lastIndexOf('.');
  const value = raw.slice(0, idx);
  const sig = raw.slice(idx+1);
  return sig === sign(value);
}
function requireAdmin(req,res,next){ if (!isAdmin(req)) return res.status(401).json({ error:'Non autorisé' }); next(); }
async function notifyDiscord(payload){
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url || url.includes('XXXX')) return;
  await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) }).catch(()=>{});
}

app.post('/api/contact', async (req,res)=>{
  const { name, email, discord, service, budget, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ error:'Nom, email et message obligatoires.' });
  const request = {
    id: await nextRequestId(),
    name: String(name).trim(),
    email: String(email).trim(),
    discord: discord ? String(discord).trim() : '',
    service: service ? String(service).trim() : 'Projet personnalisé',
    budget: budget ? String(budget).trim() : '',
    message: String(message).trim(),
    status: 'new',
    quoteId: '',
    createdAt: new Date().toISOString()
  };
  await writeRequest(request);
  await notifyDiscord({
    username: 'DayZ Mapping Lab',
    embeds: [{ title:`Nouvelle demande ${request.id}`, color: 0x36d399, fields:[
      { name:'Nom', value: request.name, inline:true },
      { name:'Email', value: request.email, inline:true },
      { name:'Discord', value: request.discord || 'Non renseigné', inline:true },
      { name:'Service', value: request.service, inline:true },
      { name:'Budget', value: request.budget || 'Non renseigné', inline:true },
      { name:'Message', value: request.message.slice(0,1000) }
    ], timestamp: request.createdAt }]
  });
  res.json({ ok:true, requestId: request.id });
});

app.post('/api/checkout/fixed', async (req,res)=>{
  if (!stripe) return res.status(500).json({ error:'Stripe non configuré.' });
  const offer = fixedOffers[req.body.offerId];
  if (!offer) return res.status(404).json({ error:'Offre introuvable.' });
  const priceId = process.env[offer.priceEnv];
  if (!priceId || priceId.includes('xxx')) return res.status(500).json({ error:`Price ID manquant pour ${offer.name}.` });
  const session = await stripe.checkout.sessions.create({
    mode: offer.mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_URL}/cancel.html`,
    metadata: { type:'fixed_offer', offerId: req.body.offerId, offerName: offer.name }
  });
  res.json({ url: session.url });
});

app.get('/api/quote/:id', async (req,res)=>{
  const quotes = await readQuotes();
  const quote = quotes.find(q => q.id.toUpperCase() === req.params.id.toUpperCase());
  if (!quote) return res.status(404).json({ error:'Devis introuvable.' });
  if (quote.status === 'paid') return res.status(400).json({ error:'Ce devis est déjà payé.' });
  if (quote.status === 'cancelled') return res.status(400).json({ error:'Ce devis a été annulé.' });
  res.json({ id:quote.id, customerName:quote.customerName, email:quote.email, service:quote.service, amount:quote.amount, description:quote.description, status:quote.status });
});

app.post('/api/checkout/quote', async (req,res)=>{
  if (!stripe) return res.status(500).json({ error:'Stripe non configuré.' });
  const quotes = await readQuotes();
  const quote = quotes.find(q => q.id.toUpperCase() === String(req.body.quoteId||'').toUpperCase());
  if (!quote) return res.status(404).json({ error:'Devis introuvable.' });
  if (quote.status !== 'pending') return res.status(400).json({ error:'Ce devis n’est pas payable actuellement.' });
  const session = await stripe.checkout.sessions.create({
    mode:'payment',
    customer_email: quote.email,
    line_items: [{
      price_data: { currency:'eur', unit_amount: Math.round(Number(quote.amount)*100), product_data:{ name:`Paiement devis ${quote.id}`, description: quote.service } },
      quantity: 1
    }],
    success_url: `${SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_URL}/cancel.html`,
    metadata: { type:'quote', quoteId: quote.id }
  });
  res.json({ url: session.url });
});

app.post('/api/admin/login', (req,res)=>{
  if (String(req.body.password || '') !== String(process.env.ADMIN_PASSWORD || 'admin')) return res.status(401).json({ error:'Mot de passe incorrect.' });
  setAdminCookie(res); res.json({ ok:true });
});
app.post('/api/admin/logout', (req,res)=>{ res.clearCookie('dml_admin'); res.json({ ok:true }); });
app.get('/api/admin/me', (req,res)=> res.json({ authenticated: isAdmin(req) }));

app.get('/api/admin/requests', requireAdmin, async (req,res)=> {
  const requests = await readRequests();
  res.json(requests.sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt)));
});
app.patch('/api/admin/requests/:id', requireAdmin, async (req,res)=>{
  const requests = await readRequests();
  const i = requests.findIndex(r=>r.id===req.params.id);

  if (i === -1) return res.status(404).json({ error:'Demande introuvable.' });

  const allowed = ['name','email','discord','service','budget','message','status','quoteId'];
  for (const key of allowed) {
    if (key in req.body) requests[i][key] = req.body[key];
  }

  await writeRequest(requests[i]);
  res.json(requests[i]);
});
app.delete('/api/admin/requests/:id', requireAdmin, async (req,res)=>{
  await deleteRequest(req.params.id);
  res.json({ ok:true });
});
app.post('/api/admin/requests/:id/create-quote', requireAdmin, async (req,res)=>{
  const requests = await readRequests();
  const i = requests.findIndex(r=>r.id===req.params.id);

  if (i === -1) return res.status(404).json({ error:'Demande introuvable.' });

  const request = requests[i];
  const { amount, description } = req.body;

  if (!amount) return res.status(400).json({ error:'Montant obligatoire.' });

  const quote = {
    id: await nextQuoteId(),
    customerName: request.name,
    email: request.email,
    service: request.service || 'Projet personnalisé',
    amount: Number(amount),
    description: description || request.message || '',
    status:'pending',
    requestId: request.id,
    createdAt: new Date().toISOString()
  };

  await writeQuote(quote);

  request.status = 'quoted';
  request.quoteId = quote.id;
  await writeRequest(request);

  await notifyDiscord({
    username:'DayZ Mapping Lab',
    embeds:[{
      title:`Devis créé ${quote.id}`,
      color:0xf59e0b,
      fields:[
        {name:'Demande', value:request.id, inline:true},
        {name:'Client', value:quote.customerName, inline:true},
        {name:'Montant', value:`${quote.amount}€`, inline:true},
        {name:'Lien paiement', value:`${SITE_URL}/payer-devis.html?id=${quote.id}`}
      ],
      timestamp:new Date().toISOString()
    }]
  });

  res.json(quote);
});

app.get('/api/admin/quotes', requireAdmin, async (req,res)=> {
  const quotes = await readQuotes();
  res.json(quotes.sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt)));
});
app.post('/api/admin/quotes', requireAdmin, async (req,res)=>{
  const { customerName, email, service, amount, description } = req.body;

if (!customerName || !amount) {
  return res.status(400).json({ error:'Nom client et montant obligatoires.' });
  }

  const quote = {
    id: await nextQuoteId(),
    customerName,
    email,
    service,
    amount: Number(amount),
    description: description || '',
    status:'pending',
    createdAt: new Date().toISOString()
  };

  await writeQuote(quote);

  await notifyDiscord({
    username:'DayZ Mapping Lab',
    embeds:[{
      title:`Devis créé ${quote.id}`,
      color:0xf59e0b,
      fields:[
        {name:'Client', value:quote.customerName, inline:true},
        {name:'Email', value:quote.email, inline:true},
        {name:'Montant', value:`${quote.amount}€`, inline:true},
        {name:'Service', value:quote.service},
        {name:'Lien paiement', value:`${SITE_URL}/payer-devis.html?id=${quote.id}`}
      ],
      timestamp:new Date().toISOString()
    }]
  });

  res.json(quote);
});
app.patch('/api/admin/quotes/:id', requireAdmin, async (req,res)=>{
  const quotes = await readQuotes();
  const quote = quotes.find(q=>q.id===req.params.id);

  if (!quote) return res.status(404).json({ error:'Devis introuvable.' });

  const allowed = ['customerName','email','service','amount','description','status'];

  for (const key of allowed) {
    if (key in req.body) {
      quote[key] = key === 'amount' ? Number(req.body[key]) : req.body[key];
    }
  }

  await writeQuote(quote);
  res.json(quote);
});
app.delete('/api/admin/quotes/:id', requireAdmin, async (req,res)=>{
  await deleteQuote(req.params.id);
  res.json({ ok:true });
});

app.post('/stripe/webhook', express.raw({ type:'application/json' }), async (req,res)=>{
  res.json({ received:true });
});

app.listen(PORT, ()=> console.log(`DayZ Mapping Lab lancé sur ${SITE_URL}`));
