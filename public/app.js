const burger = document.getElementById('burger');
const nav = document.getElementById('nav');

if (burger && nav) {
  burger.addEventListener('click', () => {
    nav.classList.toggle('open');
  });

  window.addEventListener('scroll', () => {
    nav.classList.remove('open');
  });
}
document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>nav?.classList.remove('open')));
async function postJSON(url,data){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Erreur');return j;}
document.querySelectorAll('.pay-btn').forEach(btn=>btn.addEventListener('click',async()=>{btn.disabled=true;const old=btn.textContent;btn.textContent='Redirection...';try{const data=await postJSON('/api/checkout/fixed',{offerId:btn.dataset.offer});location.href=data.url;}catch(e){alert(e.message);btn.disabled=false;btn.textContent=old;}}));
const contactForm=document.getElementById('contactForm');if(contactForm)contactForm.addEventListener('submit',async(e)=>{e.preventDefault();const status=document.getElementById('contactStatus');status.textContent='Envoi en cours...';try{await postJSON('/api/contact',Object.fromEntries(new FormData(contactForm)));contactForm.reset();status.textContent='Demande envoyée. Vous recevrez une réponse rapidement.';}catch(err){status.textContent=err.message;}});

const galleryImages = [
  "/gallery/mapping_1.jpg",
  "/gallery/mapping_2.jpg",
  "/gallery/mapping_3.jpg",
  "/gallery/mapping_4.jpg",
  "/gallery/mapping_5.jpg",
  "/gallery/mapping_6.jpg",
  "/gallery/mapping_7.jpg",
  "/gallery/mapping_8.jpg",
  "/gallery/mapping_9.jpg"
];

const galleryMainImage = document.getElementById("galleryMainImage");
const galleryPrev = document.getElementById("galleryPrev");
const galleryNext = document.getElementById("galleryNext");
const galleryThumbs = document.getElementById("galleryThumbs");
const galleryLightbox = document.getElementById("galleryLightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxClose = document.getElementById("lightboxClose");

let galleryIndex = 0;

function updateGallery(index) {
  if (!galleryMainImage || !galleryThumbs) return;

  galleryIndex = (index + galleryImages.length) % galleryImages.length;
  galleryMainImage.src = galleryImages[galleryIndex];

  galleryThumbs.querySelectorAll("img").forEach((thumb, i) => {
    thumb.classList.toggle("active", i === galleryIndex);
  });
}

if (galleryMainImage && galleryPrev && galleryNext && galleryThumbs) {
  galleryPrev.addEventListener("click", () => {
    updateGallery(galleryIndex - 1);
  });

  galleryNext.addEventListener("click", () => {
    updateGallery(galleryIndex + 1);
  });

  galleryThumbs.querySelectorAll("img").forEach((thumb, i) => {
    thumb.addEventListener("click", () => {
      updateGallery(i);
    });
  });

  galleryMainImage.addEventListener("click", () => {
    lightboxImage.src = galleryMainImage.src;
    galleryLightbox.classList.remove("hidden");
  });
}

if (lightboxClose && galleryLightbox) {
  lightboxClose.addEventListener("click", () => {
    galleryLightbox.classList.add("hidden");
    lightboxImage.src = "";
  });

  galleryLightbox.addEventListener("click", (e) => {
    if (e.target === galleryLightbox) {
      galleryLightbox.classList.add("hidden");
      lightboxImage.src = "";
    }
  });
        updateGallery(0);
}

setInterval(() => {
  updateGallery(galleryIndex + 1);
}, 6000);