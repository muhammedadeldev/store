import { state } from '../state';

export function renderHeader(): string {
  return `
    <header class="site-header site-header-image-only">
      <div class="container header-container">
        <a href="#home" class="header-logo" aria-label="EIGHTY-EIGHT home">
          <img src="/assets/logo-icon.png" alt="EIGHTY-EIGHT" class="header-logo-img" />
        </a>
      </div>
    </header>
  `;
}

export function setupHeaderEvents() {
  // Optional legacy header controls (kept safe for existing routes).
  // Desktop language switcher
  const langBtn = document.getElementById('lang-switch-btn');
  if (langBtn) {
    langBtn.onclick = () => {
      const current = state.getLang();
      state.setLang(current === 'ar' ? 'en' : 'ar');
    };
  }

  // Mobile language switcher
  const mobileLangBtn = document.getElementById('mobile-lang-switch-btn');
  if (mobileLangBtn) {
    mobileLangBtn.onclick = () => {
      const current = state.getLang();
      state.setLang(current === 'ar' ? 'en' : 'ar');
    };
  }

  // Shopping cart drawer triggers
  const openCartBtn = document.getElementById('open-cart-drawer-btn');
  if (openCartBtn) {
    openCartBtn.onclick = () => {
      const drawer = document.getElementById('cart-drawer');
      if (drawer) drawer.classList.add('open');
    };
  }

  const mobileBottomCartBtn = document.getElementById('mobile-bottom-cart-btn');
  if (mobileBottomCartBtn) {
    mobileBottomCartBtn.onclick = () => {
      const drawer = document.getElementById('cart-drawer');
      if (drawer) drawer.classList.add('open');
    };
  }

  // Mobile drawer open / close handlers
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const mobileNavDrawer = document.getElementById('mobile-nav-drawer');
  const mobileNavBackdrop = document.getElementById('mobile-nav-backdrop');
  const mobileNavCloseBtn = document.getElementById('mobile-nav-close-btn');

  function openMobileNav() {
    if (mobileNavDrawer && mobileNavBackdrop) {
      mobileNavDrawer.classList.add('open');
      mobileNavBackdrop.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeMobileNav() {
    if (mobileNavDrawer && mobileNavBackdrop) {
      mobileNavDrawer.classList.remove('open');
      mobileNavBackdrop.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  if (mobileMenuToggle) {
    mobileMenuToggle.onclick = openMobileNav;
  }

  if (mobileNavCloseBtn) {
    mobileNavCloseBtn.onclick = closeMobileNav;
  }

  if (mobileNavBackdrop) {
    mobileNavBackdrop.onclick = closeMobileNav;
  }

  // Close drawer when any link inside it is clicked
  if (mobileNavDrawer) {
    const navLinks = mobileNavDrawer.querySelectorAll('a');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        closeMobileNav();
      });
    });
  }
}
