import { state } from '../state';

export function renderHeader(): string {
  const lang = state.getLang();
  const settings = state.getSettings();
  const cartCount = state.getCartCount();
  const wishlistCount = state.getWishlist().length;
  const brandName = lang === 'ar' ? settings.brandNameAr || settings.brandName : settings.brandName;
  const announcement = lang === 'ar' ? settings.announcementBarTextAr : settings.announcementBarText;
  const currentHash = window.location.hash.slice(1) || 'home';

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
        <!-- Mobile Menu Toggle Button (Visible on mobile/tablet) -->
        <button id="mobile-menu-toggle" class="icon-btn mobile-menu-btn" aria-label="Open Navigation Menu" title="القائمة الرئيسية">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>

        <!-- Brand Logo -->
        <a href="#home" class="header-logo" style="text-decoration: none;">
          <img src="/assets/logo-icon.png" alt="EIGHTY-EIGHT" class="header-logo-img" />
          <span class="header-brand-title">EIGHTY-EIGHT</span>
        </a>

        <!-- Main Desktop Navigation -->
        <nav class="header-nav">
          <a href="#home" class="nav-link ${currentHash === 'home' || currentHash === '' ? 'active' : ''}">${state.t('home')}</a>
          <a href="#shop" class="nav-link ${currentHash === 'shop' ? 'active' : ''}">${state.t('shop')}</a>
          <a href="#shop?filter=new" class="nav-link">${state.t('newArrivals')}</a>
          <a href="#shop?filter=bestseller" class="nav-link">${state.t('bestSellers')}</a>
          <a href="#track" class="nav-link ${currentHash.startsWith('track') ? 'active' : ''}">📦 ${state.t('trackOrder')}</a>
          <a href="#page/about" class="nav-link">${state.t('about')}</a>
        </nav>

        <!-- Header Actions -->
        <div class="header-actions">
          <!-- Language Switcher (Desktop) -->
          <button id="lang-switch-btn" class="btn btn-sm btn-ghost desktop-only-action" title="تغيير اللغة / Switch Language" style="font-weight: 700; font-size: 11px; letter-spacing: 0.05em; padding: 6px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-full);">
            ${lang === 'ar' ? 'English' : 'العربية'}
          </button>

          <!-- Search Button -->
          <a href="#shop" class="icon-btn" title="${state.t('searchPlaceholder')}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </a>

          <!-- Wishlist Button (Desktop) -->
          <a href="#account?tab=wishlist" class="icon-btn desktop-only-action" title="${state.t('wishlist')}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            ${wishlistCount > 0 ? `<span class="badge-count">${wishlistCount}</span>` : ''}
          </a>

          <!-- Account Portal (Desktop) -->
          <a href="#account" class="icon-btn desktop-only-action" title="${state.t('account')}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </a>

          <!-- Shopping Cart Drawer Trigger -->
          <button id="open-cart-drawer-btn" class="icon-btn cart-header-trigger" title="${state.t('cart')}">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
            ${cartCount > 0 ? `<span class="badge-count">${cartCount}</span>` : ''}
          </button>
        </div>
      </div>
    </header>

    <!-- Mobile Navigation Drawer Overlay & Panel -->
    <div id="mobile-nav-backdrop" class="mobile-nav-backdrop"></div>
    <aside id="mobile-nav-drawer" class="mobile-nav-drawer" aria-label="Mobile Navigation">
      <div class="mobile-nav-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="/assets/logo-icon.png" alt="EIGHTY-EIGHT" style="height: 30px; width: auto;" />
          <div>
            <div style="font-weight: 800; font-size: 16px; color: #0f172a; letter-spacing: 0.05em;">EIGHTY-EIGHT</div>
            <div style="font-size: 11px; color: #64748b; font-weight: 600;">ستريت وير مصري معاصر</div>
          </div>
        </div>
        <button id="mobile-nav-close-btn" class="icon-btn" aria-label="Close Navigation">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div class="mobile-nav-content">
        <!-- Main Route Links -->
        <div class="mobile-nav-section">
          <span class="mobile-nav-section-title">${lang === 'ar' ? 'التنقل الرئيسي' : 'Navigation'}</span>
          <nav class="mobile-nav-links">
            <a href="#home" class="mobile-nav-link ${currentHash === 'home' || currentHash === '' ? 'active' : ''}">
              <span class="mobile-nav-link-icon">🏠</span>
              <span>${state.t('home')}</span>
            </a>
            <a href="#shop" class="mobile-nav-link ${currentHash === 'shop' ? 'active' : ''}">
              <span class="mobile-nav-link-icon">🛍️</span>
              <span>${state.t('shop')} (كافة القطع)</span>
            </a>
            <a href="#shop?filter=new" class="mobile-nav-link">
              <span class="mobile-nav-link-icon">✨</span>
              <span>${state.t('newArrivals')}</span>
            </a>
            <a href="#shop?filter=bestseller" class="mobile-nav-link">
              <span class="mobile-nav-link-icon">🔥</span>
              <span>${state.t('bestSellers')}</span>
            </a>
            <a href="#track" class="mobile-nav-link ${currentHash.startsWith('track') ? 'active' : ''}">
              <span class="mobile-nav-link-icon">📦</span>
              <span>${state.t('trackOrder')}</span>
            </a>
          </nav>
        </div>

        <!-- Quick Categories -->
        <div class="mobile-nav-section">
          <span class="mobile-nav-section-title">${lang === 'ar' ? 'أقسام الكولكشن' : 'Collections'}</span>
          <div class="mobile-category-tags">
            <a href="#shop" class="mobile-cat-pill">الكل</a>
            <a href="#shop" class="mobile-cat-pill">هوديز وسويت شيرت</a>
            <a href="#shop" class="mobile-cat-pill">تيشيرتات وبولو</a>
            <a href="#shop" class="mobile-cat-pill">بنطلونات وكارجو</a>
            <a href="#shop" class="mobile-cat-pill">كابات وإكسسوارات</a>
          </div>
        </div>

        <!-- Customer Care & Policies -->
        <div class="mobile-nav-section">
          <span class="mobile-nav-section-title">${lang === 'ar' ? 'خدمة العملاء وحسابي' : 'Customer Care'}</span>
          <nav class="mobile-nav-links">
            <a href="#account" class="mobile-nav-link">
              <span class="mobile-nav-link-icon">👤</span>
              <span>${state.t('account')}</span>
            </a>
            <a href="#account?tab=wishlist" class="mobile-nav-link">
              <span class="mobile-nav-link-icon">❤️</span>
              <span>${state.t('wishlist')} ${wishlistCount > 0 ? `(${wishlistCount})` : ''}</span>
            </a>
            <a href="#page/size-guide" class="mobile-nav-link">
              <span class="mobile-nav-link-icon">📏</span>
              <span>${state.t('sizeGuide')}</span>
            </a>
            <a href="#page/shipping-policy" class="mobile-nav-link">
              <span class="mobile-nav-link-icon">🚚</span>
              <span>${lang === 'ar' ? 'الشحن والتوصيل للمحافظات' : 'Shipping Policy'}</span>
            </a>
            <a href="#page/returns-policy" class="mobile-nav-link">
              <span class="mobile-nav-link-icon">🔄</span>
              <span>${lang === 'ar' ? 'الاسترجاع والاستبدال (14 يوم)' : 'Returns & Exchange'}</span>
            </a>
            <a href="#page/about" class="mobile-nav-link">
              <span class="mobile-nav-link-icon">✦</span>
              <span>${state.t('about')}</span>
            </a>
          </nav>
        </div>

        <!-- Bottom Actions (Language switch + WhatsApp) -->
        <div style="margin-top: auto; padding-top: var(--space-lg); border-top: 1px solid var(--color-border); display: flex; flex-direction: column; gap: var(--space-sm);">
          <button id="mobile-lang-switch-btn" class="btn btn-secondary btn-full" style="justify-content: center; font-size: 13px; font-weight: 700;">
            🌐 ${lang === 'ar' ? 'Switch to English' : 'التحويل إلى العربية'}
          </button>
          
          <a href="https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}" target="_blank" rel="noopener" class="btn btn-gold btn-full" style="justify-content: center; font-size: 13px; font-weight: 700; background: #25d366; color: #ffffff;">
            <span>💬</span>
            <span>تواصل معنا واتساب مباشر</span>
          </a>
        </div>
      </div>
    </aside>

    <!-- Mobile Bottom Navigation Bar (Thumb-friendly mobile app UX) -->
    <nav class="mobile-bottom-nav" aria-label="Mobile Quick Bar">
      <a href="#home" class="mobile-bottom-item ${currentHash === 'home' || currentHash === '' ? 'active' : ''}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        <span>الرئيسية</span>
      </a>

      <a href="#shop" class="mobile-bottom-item ${currentHash === 'shop' ? 'active' : ''}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        <span>المتجر</span>
      </a>

      <a href="#track" class="mobile-bottom-item ${currentHash.startsWith('track') ? 'active' : ''}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
        <span>تتبع الشحنة</span>
      </a>

      <a href="#account" class="mobile-bottom-item ${currentHash.startsWith('account') ? 'active' : ''}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        <span>حسابي</span>
      </a>

      <button id="mobile-bottom-cart-btn" class="mobile-bottom-item" style="background: none; border: none; cursor: pointer; position: relative;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
        ${cartCount > 0 ? `<span class="badge-count bottom-badge">${cartCount}</span>` : ''}
        <span>السلة</span>
      </button>
    </nav>
  `;
}

export function setupHeaderEvents() {
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
