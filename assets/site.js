/* SNS Institutions homepage scripts (moved out of index.html, 2026-11-17) */

/* ================= DESKTOP ================= */

// Alumni Carousel Navigation
function scrollAlumni(direction) {
  const carousel = document.getElementById('alumniCarousel');
  const scrollAmount = carousel.offsetWidth;
  carousel.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
}

// FAQ Toggle Function
function toggleFaq(button) {
  const content = button.nextElementSibling;
  const icon = button.querySelector('i');
  const allContents = document.querySelectorAll('.faq-content');
  const allIcons = document.querySelectorAll('.faq-toggle i');
  allContents.forEach(c => { if (c !== content) { c.classList.add('hidden'); } });
  allIcons.forEach(i => { if (i !== icon) { i.style.transform = 'rotate(0deg)'; } });
  content.classList.toggle('hidden');
  icon.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
}

function closeBanner() {
  const banner = document.getElementById('announcementBanner');
  const nav = document.getElementById('mainNav');
  if (!banner || !nav) return;
  banner.style.transform = 'translateY(-100%)';
  banner.style.opacity = '0';
  setTimeout(() => { banner.style.display = 'none'; nav.style.top = '0'; }, 300);
}

// Mandatory Disclosure now lives on its own page
function showDisclosure(e) {
  if (e) e.preventDefault();
  window.location.href = '/mandatory-disclosure/';
}

// Mobile Menu Toggle (Protected)
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');
if (mobileMenuBtn && mobileMenu) {
  mobileMenuBtn.addEventListener('click', () => { mobileMenu.classList.toggle('hidden'); });
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => { mobileMenu.classList.add('hidden'); });
  });
}

// Scroll Animation
const scrollAnimateElements = document.querySelectorAll('.scroll-animate');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); } });
}, { threshold: 0.1 });
scrollAnimateElements.forEach(el => observer.observe(el));

/* ---------- Salary Distribution Component ---------- */
class SalaryDistributionComponent {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.data = [
      { range: '₹53L+', count: '1', width: '8%', color1: '#f43f5e', color2: '#fb7185', labelClass: 'text-rose-400' },
      { range: '₹24L+', count: '1', width: '8%', color1: '#06b6d4', color2: '#22d3ee', labelClass: 'text-cyan-400' },
      { range: '₹10L+', count: '160+', width: '12%', color1: '#f59e0b', color2: '#fbbf24', labelClass: 'text-amber-400' },
      { range: '₹7L+', count: '400+', width: '31%', color1: '#10b981', color2: '#34d399', labelClass: 'text-green-400' },
      { range: '₹5L+', count: '700+', width: '54%', color1: '#3b82f6', color2: '#60a5fa', labelClass: 'text-blue-400' },
      { range: '₹4L+', count: '1300+', width: '100%', color1: '#8b5cf6', color2: '#a78bfa', labelClass: 'text-purple-400' },
      { range: '₹3L+', count: '788+', width: '64%', color1: '#ec4899', color2: '#f472b6', labelClass: 'text-pink-400' }
    ];
    if (this.container) {
      try { this.render(); this.initAnimation(); } catch (e) { console.error('SalaryDist error:', e); }
    }
  }
  render() {
    this.container.innerHTML = this.data.map(item => `
      <div class="flex items-center gap-4 group mb-4">
        <div class="w-20 md:w-24 text-right shrink-0">
          <span class="${item.labelClass} font-bold text-sm md:text-base tracking-tight transition-transform group-hover:scale-105 inline-block origin-right">${item.range}</span>
        </div>
        <div class="flex-1 bg-white/10 backdrop-blur-md rounded-full h-9 overflow-hidden relative border border-white/5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
          <div class="salary-fill-bar absolute left-0 top-0 h-full rounded-full flex items-center justify-end pr-4 shadow-xl"
               style="width: 0%; background: linear-gradient(to right, ${item.color1}, ${item.color2}); transition: width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);"
               data-final-width="${item.width}">
            <span class="text-[10px] md:text-xs font-black text-white drop-shadow-md opacity-0 transition-opacity duration-300">${item.count}</span>
          </div>
        </div>
        <div class="w-20 md:w-24 text-gray-400 text-[10px] md:text-xs font-semibold uppercase tracking-widest shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"></div>
      </div>
    `).join('');
  }
  initAnimation() {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const fills = entry.target.querySelectorAll('.salary-fill-bar');
          fills.forEach((fill, idx) => {
            setTimeout(() => {
              if (fill.dataset.finalWidth) {
                fill.style.setProperty('width', fill.dataset.finalWidth, 'important');
                const label = fill.querySelector('span');
                if (label) label.style.opacity = '1';
              }
            }, idx * 100);
          });
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    obs.observe(this.container);
  }
}
(function () {
  const initComp = () => new SalaryDistributionComponent('salary-distribution-root');
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initComp); } else { initComp(); }
})();

/* ---------- Certification bars (desktop) ---------- */
const otherSalaryBars = document.querySelectorAll('.salary-bar:not(.salary-fill-bar)');
if (otherSalaryBars.length > 0) {
  const salaryObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = entry.target;
        const width = target.getAttribute('data-width');
        target.style.setProperty('width', '0', 'important');
        setTimeout(() => { void target.offsetWidth; target.style.setProperty('width', width, 'important'); }, 100);
        salaryObserver.unobserve(target);
      }
    });
  }, { threshold: 0.1 });
  otherSalaryBars.forEach(bar => salaryObserver.observe(bar));
}

/* ---------- Program Tabs (desktop) ---------- */
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    tabBtns.forEach(b => { b.classList.remove('active'); b.classList.add('bg-gray-200', 'hover:bg-gray-300'); });
    btn.classList.add('active');
    btn.classList.remove('bg-gray-200', 'hover:bg-gray-300');
    tabContents.forEach(content => { content.classList.add('hidden'); });
    document.getElementById(tab + '-tab').classList.remove('hidden');
    document.getElementById(tab + '-tab').querySelectorAll('.scroll-animate').forEach(el => {
      el.classList.remove('visible');
      setTimeout(() => el.classList.add('visible'), 50);
    });
  });
});

// Navbar background on scroll
window.addEventListener('scroll', () => {
  const nav = document.querySelector('nav');
  if (!nav) return;
  if (window.scrollY > 50) { nav.classList.add('shadow-md'); } else { nav.classList.remove('shadow-md'); }
});

// Hash link handler (offset for fixed header)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const targetId = this.getAttribute('href').substring(1);
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      e.preventDefault();
      const offset = 100;
      const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: targetPosition, behavior: 'smooth' });
      if (mobileMenu) mobileMenu.classList.add('hidden');
    }
  });
});

/* ================= MOBILE ================= */
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');

function navigateToPage(pageId) {
  navItems.forEach(item => { item.dataset.page === pageId ? item.classList.add('active') : item.classList.remove('active'); });
  pages.forEach(page => { page.id === `${pageId}Page` ? page.classList.add('active') : page.classList.remove('active'); });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
navItems.forEach(item => { item.addEventListener('click', () => { navigateToPage(item.dataset.page); }); });
document.addEventListener('click', e => {
  const target = e.target.closest('[data-navigate]');
  if (target) { navigateToPage(target.dataset.navigate); }
});

const recruiters = [
  { name: 'Yugabyte', bg: '#eff6ff', color: '#1e40af' },
  { name: 'Juspay', bg: '#fff7ed', color: '#ea580c' },
  { name: 'Vivonation', bg: '#fef2f2', color: '#dc2626' },
  { name: 'Meetmux', bg: '#eff6ff', color: '#1d4ed8' },
  { name: 'Taylor & Francis', bg: '#f0f9ff', color: '#0369a1' },
  { name: 'Wyreflow Tech', bg: '#f5f3ff', color: '#7c3aed' },
  { name: 'IBM', bg: '#eff6ff', color: '#1e40af' },
  { name: 'embedUR systems', bg: '#f5f3ff', color: '#6d28d9' },
  { name: 'Zoho', bg: '#ecfeff', color: '#0891b2' },
  { name: 'Kaar Tech', bg: '#fef2f2', color: '#dc2626' },
  { name: 'SNS Ihub', bg: '#ecfeff', color: '#0891b2' },
  { name: 'Wisework /Hue Tech', bg: '#f0fdf4', color: '#15803d' },
  { name: 'rt Camp', bg: '#f5f3ff', color: '#6d28d9' },
  { name: 'Accenture', bg: '#eff6ff', color: '#2563eb' },
  { name: 'CTS', bg: '#f8fafc', color: '#1e3a8a' },
  { name: 'Genpact', bg: '#eff6ff', color: '#1e40af' },
  { name: 'Hexaware', bg: '#f0fdf4', color: '#15803d' },
  { name: 'Infosys', bg: '#f5f3ff', color: '#7c3aed' },
  { name: 'Capgemini', bg: '#eff6ff', color: '#1d4ed8' },
  { name: 'TCS', bg: '#f8fafc', color: '#1e3a8a' },
  { name: 'Wipro', bg: '#fff7ed', color: '#ea580c' },
  { name: 'Deloitte', bg: '#fef2f2', color: '#dc2626' },
  { name: 'EY', bg: '#eff6ff', color: '#4285F4' },
  { name: 'Pwc', bg: '#f0f9ff', color: '#0284c7' },
  { name: 'Six Senses', bg: '#ecfeff', color: '#0891b2' },
  { name: 'Intellipaat', bg: '#eff6ff', color: '#1d4ed8' },
  { name: 'Cadence', bg: '#f0f9ff', color: '#0284c7' },
  { name: 'Sobha Construction LLP', bg: '#fffbeb', color: '#b45309' },
  { name: 'AFFORD Medical Technologies', bg: '#fef2f2', color: '#dc2626' }
];

const portals = [
  { title: 'SNS DNA', subtitle: 'DESIGN THINKING LAB', description: 'A dedicated digital hub for Design Thinking, Innovation, and Entrepreneurship at SNS Institutions. Explore student projects, innovation showcases, creative labs, and design thinking applications across the SNS ecosystem.', url: 'https://dna.snsgroups.com/', icon: 'fa-solid fa-dna', color: '#d97706', bg: '#fffbeb' },
  { title: 'Alumni Network', subtitle: 'snsalumni.in', description: 'Connect with 40K+ alumni worldwide. Networking, mentorship, and career opportunities.', url: 'https://snsalumni.in/', icon: 'school', color: '#7c3aed', bg: '#f5f3ff' },
  { title: 'Internships & Jobs', subtitle: 'Career Opportunities', description: 'Find internships and job opportunities with top companies. Work-while-learn programs available.', url: 'https://main.snsgroups.com/placement-internships/', icon: 'work', color: '#16a34a', bg: '#f0fdf4' },
  { title: 'Learning Community', subtitle: 'snscourseware.org', description: 'Access course materials, resources, and online learning content. Continuous learning platform.', url: 'https://snscourseware.org/', icon: 'menu_book', color: '#2563eb', bg: '#eff6ff' },
  { title: 'SPINE', subtitle: 'snsspine.in', description: 'Student Activity Center. Youth leadership, clubs, events, and extracurricular activities hub.', url: 'https://snsspine.in/', icon: 'people', color: '#ec4899', bg: '#fdf2f8' },
  { title: 'SNS iHub', subtitle: 'snsihub.ai', description: 'Innovation & Incubation Hub. Startup support, AI/GenAI initiatives, and entrepreneurship ecosystem.', url: 'https://snsihub.ai/', icon: 'lightbulb', color: '#f59e0b', bg: '#fffbeb' },
  { title: 'IIPC Portal', subtitle: 'iipc.snsgroups.com', description: 'Industry partnerships, placement records, and corporate connections. Training & development programs.', url: 'https://iipc.snsgroups.com/', icon: 'business', color: '#06b6d4', bg: '#ecfeff' },
  { title: 'Helpdesk Portal', subtitle: 'helpdesk.snsgroups.com', description: 'Centralized support system for managing queries, resolving issues, and providing quick assistance across all SNS platforms.', url: 'https://helpdesk.snsgroups.com/', icon: 'fa-solid fa-headset', color: '#6366f1', bg: '#e0e7ff', actionText: 'Get Support' },
  { title: 'Mandatory Disclosure', subtitle: 'Transparency & Compliance', description: 'Official documents, legal information, and mandatory public disclosures as per CBSE / AICTE norms.', url: '#', icon: 'file_copy', color: '#b45309', bg: '#fffbeb', isDisclosure: true }
];

function renderRecruiters() {
  const container = document.getElementById('recruitersGrid');
  if (container) {
    container.innerHTML = recruiters.map(r => `
      <div class="recruiter-card" style="background:${r.bg}; color:${r.color}; border: 1px solid ${r.color}15;">${r.name}</div>
    `).join('');
  }
}

function renderPortals() {
  const container = document.getElementById('portalsSection');
  if (!container) return;
  container.innerHTML = portals.map(p => {
    const isFontAwesome = p.icon.startsWith('fa-');
    const iconHtml = isFontAwesome
      ? `<i class="${p.icon}" style="font-size: 24px; color:${p.color};"></i>`
      : `<span class="material-symbols-rounded" style="color:${p.color};">${p.icon}</span>`;
    const onClickAction = p.isDisclosure ? `showDisclosure(event)` : `window.open('${p.url}','_blank')`;
    return `
      <div class="portal-card" onclick="${onClickAction}">
        <div class="portal-header">
          <div class="portal-icon" style="background:${p.bg}; color:${p.color};">${iconHtml}</div>
          <div class="portal-info">
            <h3 style="font-size:16px;font-weight:700;color:#1f2937;margin-bottom:2px;">${p.title}</h3>
            <div class="portal-subtitle" style="text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; font-weight: 700; color: #64748b;">${p.subtitle}</div>
          </div>
        </div>
        <p class="portal-description">${p.description}</p>
        <div style="margin-top: 16px; display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700; color: ${p.color};">
          ${p.actionText || 'Visit ' + p.title} <span class="material-symbols-rounded" style="font-size: 18px;">arrow_forward</span>
        </div>
      </div>`;
  }).join('');

  const verify = [
    ['SNSCT', '#fef2f2', '#dc2626', 'https://snsinstitutions.directverify.in/'],
    ['SNSCE', '#fffbeb', '#d97706', 'mailto:office@snsce.ac.in'],
    ['Arts', '#f0fdf4', '#16a34a', 'https://drsnsrcas.directverify.in'],
    ['Paramedical', '#ecfeff', '#0891b2', 'https://www.tnmgrmu.ac.in/index.php/apply-online.html']
  ];
  container.innerHTML += `
    <div class="portal-card" style="padding-bottom: 12px;">
      <div class="portal-header" style="margin-bottom: 12px;">
        <div class="portal-icon" style="background:#ecfeff; color:#0891b2;"><i class="fa-solid fa-certificate" style="font-size: 24px;"></i></div>
        <div class="portal-info">
          <h3 style="font-size:16px;font-weight:700;color:#1f2937;margin-bottom:2px;">Certificate Verification</h3>
          <div class="portal-subtitle" style="text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; font-weight: 700; color: #64748b;">Verify student certificates</div>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
        ${verify.map(([name, bg, color, url]) => `
        <div onclick="window.open('${url}','_blank')" style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #f8fafc; border-radius: 12px; transition: all 0.2s ease; cursor: pointer;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 28px; height: 28px; border-radius: 6px; background: ${bg}; color: ${color}; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-certificate" style="font-size: 12px;"></i></div>
            <div style="font-size: 13px; font-weight: 700; color: #1e293b;">${name}</div>
          </div>
          <div style="font-size: 12px; font-weight: 700; color: ${color}; display: flex; align-items: center; gap: 4px;">Verify Now <span class="material-symbols-rounded" style="font-size: 16px;">arrow_forward</span></div>
        </div>`).join('')}
      </div>
    </div>`;
}

function initScrollAnimations() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.style.opacity = '1'; entry.target.style.transform = 'translateY(0)'; }
    });
  }, { threshold: .1, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.stat-card, .pillar-card, .track-card, .portal-card, .program-category, .focus-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    obs.observe(card);
  });
}

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

function createRipple(e) {
  const target = e.currentTarget;
  const ripple = document.createElement('span');
  const size = Math.max(target.clientWidth, target.clientHeight);
  const radius = size / 2;
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${e.clientX - target.offsetLeft - radius}px`;
  ripple.style.top = `${e.clientY - target.offsetTop - radius}px`;
  ripple.classList.add('ripple');
  const oldRipple = target.getElementsByClassName('ripple')[0];
  if (oldRipple) oldRipple.remove();
  target.appendChild(ripple);
}
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `.btn,.nav-item{position:relative;overflow:hidden}.ripple{position:absolute;border-radius:50%;background:rgba(255,255,255,.6);transform:scale(0);animation:ripple-animation .6s ease-out;pointer-events:none}@keyframes ripple-animation{to{transform:scale(4);opacity:0}}`;
document.head.appendChild(rippleStyle);
document.querySelectorAll('.btn, .nav-item').forEach(el => el.addEventListener('click', createRipple));

function init3CCircles() {
  document.querySelectorAll('.c-circle, .three-c-icon').forEach(circle => {
    circle.addEventListener('mouseenter', function () { this.style.transform = 'scale(1.1) rotate(5deg)'; });
    circle.addEventListener('mouseleave', function () { this.style.transform = 'scale(1) rotate(0deg)'; });
  });
}

function initFloatingAnimation() {
  const banner = document.querySelector('.hot-event-banner');
  if (!banner) return;
  let angle = 0;
  setInterval(() => { angle += .5; banner.style.transform = `translateY(${3 * Math.sin(.05 * angle)}px)`; }, 50);
}

function createParticles() {
  const hero = document.querySelector('.hero-section');
  if (!hero) return;
  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.cssText = `position:absolute;width:${2 + 4 * Math.random()}px;height:${2 + 4 * Math.random()}px;background:rgba(255,255,255,${.2 + .5 * Math.random()});border-radius:50%;left:${100 * Math.random()}%;top:${100 * Math.random()}%;animation:float ${10 + 10 * Math.random()}s infinite ease-in-out;pointer-events:none`;
    hero.appendChild(particle);
  }
  const particleStyle = document.createElement('style');
  particleStyle.textContent = `@keyframes float{0%,100%{transform:translateY(0) translateX(0);opacity:0}10%{opacity:1}90%{opacity:1}50%{transform:translateY(-100px) translateX(${100 * Math.random() - 50}px)}}`;
  document.head.appendChild(particleStyle);
}

function initProgramTabs() {
  const triggers = document.querySelectorAll('.tab-trigger');
  const tabPages = document.querySelectorAll('.tab-page');
  triggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      triggers.forEach(t => t.classList.remove('active'));
      trigger.classList.add('active');
      tabPages.forEach(p => p.id === `${trigger.dataset.tab}-tab` ? p.classList.add('active') : p.classList.remove('active'));
      setTimeout(initCertAnimations, 100);
    });
  });
}

function initCertAnimations() {
  const fills = document.querySelectorAll('.cert-bar-fill');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const fill = entry.target;
        const targetWidth = fill.getAttribute('data-width') || fill.style.width;
        if (targetWidth) {
          fill.setAttribute('data-width', targetWidth);
          fill.style.width = '0';
          fill.offsetHeight;
          fill.style.setProperty('width', targetWidth, 'important');
          fill.classList.add('animated');
        }
        obs.unobserve(fill);
      }
    });
  }, { threshold: 0.1 });
  fills.forEach(fill => {
    if (!fill.getAttribute('data-width')) { fill.setAttribute('data-width', fill.style.width); }
    fill.style.setProperty('width', '0', 'important');
    obs.observe(fill);
  });
}

function init() {
  document.body.style.opacity = '0';
  setTimeout(() => { document.body.style.transition = 'opacity 0.5s ease'; document.body.style.opacity = '1'; }, 100);
  renderRecruiters();
  renderPortals();
  initScrollAnimations();
  init3CCircles();
  initFloatingAnimation();
  createParticles();
  initProgramTabs();
  initCertAnimations();
}
'loading' === document.readyState ? document.addEventListener('DOMContentLoaded', init) : init();

let lastTouchEnd = 0;
document.addEventListener('touchend', e => {
  const t = Date.now();
  t - lastTouchEnd <= 300 && e.preventDefault();
  lastTouchEnd = t;
}, false);

document.addEventListener('keydown', e => {
  const active = document.querySelector('.nav-item.active');
  if ('ArrowLeft' === e.key || 'ArrowRight' === e.key) {
    const items = Array.from(navItems);
    const idx = items.indexOf(active);
    const next = 'ArrowLeft' === e.key ? (idx > 0 ? idx - 1 : items.length - 1) : (idx < items.length - 1 ? idx + 1 : 0);
    items[next].click();
  }
});

window.SNSApp = { navigateToPage, renderRecruiters, renderPortals };
