import { state } from '../state';

export function renderHeader(): string {
  const lang = state.getLang();
  const settings = state.getSettings();
  const cartCount = state.getCartCount();
  const wishlistCount = state.getWishlist().length;
  const brandName = lang === 'ar' ? settings.brandNameAr || settings.brandName : settings.brandName;
  const announcement = lang === 'ar' ? settings.announcementBarTextAr : settings.announcementBarText;

  return `
    ${settings.announcementBarActive ? `
      <div class="announcement-bar" style="background-color: ${settings.announcementBarBgColor || '#0f172a'};">
        <span>✦</span>
        <span>${announcement}</span>
        <span>✦</span>
      </div>
    ` : ''}

    <header class="site-header">
      <div class="container header-container">
        <!-- Mobile Menu Toggle -->
        <button id="mobile-menu-toggle" class="icon-btn md-hidden" aria-label="Menu" style="display: none;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>

        <!-- Brand Logo -->
        <a href="#home" class="header-logo">
          ${brandName}
        </a>

        <!-- Main Navigation -->
        <nav class="header-nav">
          <a href="#home" class="nav-link" data-route="home">${state.t('home')}</a>
          <a href="#shop" class="nav-link" data-route="shop">${state.t('shop')}</a>
          <a href="#shop?filter=new" class="nav-link">${state.t('newArrivals')}</a>
          <a href="#shop?filter=bestseller" class="nav-link">${state.t('bestSellers')}</a>
          <a href="#page/about" class="nav-link">${state.t('about')}</a>
        </nav>

        <!-- Header Actions -->
        <div class="header-actions">
          <!-- Language Switcher -->
          <button id="lang-switch-btn" class="btn btn-sm btn-ghost" title="تغيير اللغة / Switch Language" style="font-weight: 600; font-size: 11px; letter-spacing: 0.05em; padding: 6px 10px;">
            ${lang === 'ar' ? 'English (EN)' : 'العربية (AR)'}
          </button>

          <!-- Search Button -->
          <a href="#shop" class="icon-btn" title="${state.t('searchPlaceholder')}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </a>

          <!-- Wishlist Button -->
          <a href="#account?tab=wishlist" class="icon-btn" title="${state.t('wishlist')}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            ${wishlistCount > 0 ? `<span class="badge-count">${wishlistCount}</span>` : ''}
          </a>

          <!-- Account Portal -->
          <a href="#account" class="icon-btn" title="${state.t('account')}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </a>

          <!-- Shopping Bag Drawer Trigger -->
          <button id="open-cart-drawer-btn" class="icon-btn" title="${state.t('cart')}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
            ${cartCount > 0 ? `<span class="badge-count">${cartCount}</span>` : ''}
          </button>
        </div>
      </div>
    </header>
  `;
}

export function setupHeaderEvents() {
  const langBtn = document.getElementById('lang-switch-btn');
  if (langBtn) {
    langBtn.onclick = () => {
      const current = state.getLang();
      state.setLang(current === 'ar' ? 'en' : 'ar');
    };
  }

  const openCartBtn = document.getElementById('open-cart-drawer-btn');
  if (openCartBtn) {
    openCartBtn.onclick = () => {
      const drawer = document.getElementById('cart-drawer');
      if (drawer) drawer.classList.add('open');
    };
  }
}
