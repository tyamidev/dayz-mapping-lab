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

  galleryMainImage.style.opacity = "0.35";
  galleryMainImage.style.transform = "scale(1.02)";

  setTimeout(() => {
    galleryIndex = (index + galleryImages.length) % galleryImages.length;

    galleryMainImage.src = galleryImages[galleryIndex];

    galleryThumbs.querySelectorAll("img").forEach((thumb, i) => {
      thumb.classList.toggle("active", i === galleryIndex);
    });

    galleryMainImage.style.opacity = "1";
    galleryMainImage.style.transform = "scale(1)";
  }, 220);
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

async function loadReviews() {
  const grid = document.getElementById("reviewsGrid");
  if (!grid) return;

  try {
    const res = await fetch("/api/reviews");
    const reviews = await res.json();

    if (!reviews.length) {
      grid.innerHTML = `<p class="muted">Aucun avis pour le moment.</p>`;
      return;
    }

    grid.innerHTML = reviews.map(review => `
      <article class="review-card">
        <div class="review-stars">${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</div>
        <h3>${review.name}</h3>
        <small>${review.service || "Service DayZ Mapping Lab"}</small>
        <p>${review.message}</p>
      </article>
    `).join("");
  } catch {
    grid.innerHTML = `<p class="muted">Impossible de charger les avis.</p>`;
  }
}

const reviewForm = document.getElementById("reviewForm");

if (reviewForm) {
  reviewForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const status = document.getElementById("reviewStatus");
    status.textContent = "Envoi en cours...";

    try {
      await postJSON("/api/reviews", Object.fromEntries(new FormData(reviewForm)));
      reviewForm.reset();
      status.textContent = "Merci ! Votre avis a été envoyé et sera publié après validation.";
      loadReviews();
    } catch (err) {
      status.textContent = err.message;
    }
  });
}

loadReviews();