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
        <span><i class="fa-solid fa-star" aria-hidden="true"></i></span>
        <span>${announcement}</span>
        <span><i class="fa-solid fa-star" aria-hidden="true"></i></span>
      </div>
    ` : ''}

    <header class="site-header">
      <div class="container header-container">
        <!-- Mobile Menu Toggle Button (Visible on mobile/tablet) -->
        <button id="mobile-menu-toggle" class="icon-btn mobile-menu-btn" aria-label="Open Navigation Menu" title="القائمة الرئيسية">
          <i class="fa-solid fa-bars" aria-hidden="true" style="font-size: 24px;"></i>
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
          <a href="#track" class="nav-link ${currentHash.startsWith('track') ? 'active' : ''}"><i class="fa-solid fa-box" aria-hidden="true"></i> ${state.t('trackOrder')}</a>
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
            <i class="fa-solid fa-magnifying-glass" aria-hidden="true" style="font-size: 20px;"></i>
          </a>

          <!-- Wishlist Button (Desktop) -->
          <a href="#account?tab=wishlist" class="icon-btn desktop-only-action" title="${state.t('wishlist')}">
            <i class="fa-solid fa-heart" aria-hidden="true" style="font-size: 20px;"></i>
            ${wishlistCount > 0 ? `<span class="badge-count">${wishlistCount}</span>` : ''}
          </a>

          <!-- Account Portal (Desktop) -->
          <a href="#account" class="icon-btn desktop-only-action" title="${state.t('account')}">
            <i class="fa-solid fa-user" aria-hidden="true" style="font-size: 20px;"></i>
          </a>

          <!-- Shopping Cart Drawer Trigger -->
          <button id="open-cart-drawer-btn" class="icon-btn cart-header-trigger" title="${state.t('cart')}">
            <i class="fa-solid fa-bag-shopping" aria-hidden="true" style="font-size: 21px;"></i>
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
          <i class="fa-solid fa-xmark" aria-hidden="true" style="font-size: 22px;"></i>
        </button>
      </div>

      <div class="mobile-nav-content">
        <!-- Main Route Links -->
        <div class="mobile-nav-section">
          <span class="mobile-nav-section-title">${lang === 'ar' ? 'التنقل الرئيسي' : 'Navigation'}</span>
          <nav class="mobile-nav-links">
            <a href="#home" class="mobile-nav-link ${currentHash === 'home' || currentHash === '' ? 'active' : ''}">
              <span class="mobile-nav-link-icon"><i class="fa-solid fa-house" aria-hidden="true"></i></span>
              <span>${state.t('home')}</span>
            </a>
            <a href="#shop" class="mobile-nav-link ${currentHash === 'shop' ? 'active' : ''}">
              <span class="mobile-nav-link-icon"><i class="fa-solid fa-bag-shopping" aria-hidden="true"></i></span>
              <span>${state.t('shop')} (كافة القطع)</span>
            </a>
            <a href="#shop?filter=new" class="mobile-nav-link">
              <span class="mobile-nav-link-icon"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i></span>
              <span>${state.t('newArrivals')}</span>
            </a>
            <a href="#shop?filter=bestseller" class="mobile-nav-link">
              <span class="mobile-nav-link-icon"><i class="fa-solid fa-fire" aria-hidden="true"></i></span>
              <span>${state.t('bestSellers')}</span>
            </a>
            <a href="#track" class="mobile-nav-link ${currentHash.startsWith('track') ? 'active' : ''}">
              <span class="mobile-nav-link-icon"><i class="fa-solid fa-box" aria-hidden="true"></i></span>
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
              <span class="mobile-nav-link-icon"><i class="fa-solid fa-user" aria-hidden="true"></i></span>
              <span>${state.t('account')}</span>
            </a>
            <a href="#account?tab=wishlist" class="mobile-nav-link">
              <span class="mobile-nav-link-icon"><i class="fa-solid fa-heart" aria-hidden="true"></i></span>
              <span>${state.t('wishlist')} ${wishlistCount > 0 ? `(${wishlistCount})` : ''}</span>
            </a>
            <a href="#page/size-guide" class="mobile-nav-link">
              <span class="mobile-nav-link-icon"><i class="fa-solid fa-ruler-combined" aria-hidden="true"></i></span>
              <span>${state.t('sizeGuide')}</span>
            </a>
            <a href="#page/shipping-policy" class="mobile-nav-link">
              <span class="mobile-nav-link-icon"><i class="fa-solid fa-truck" aria-hidden="true"></i></span>
              <span>${lang === 'ar' ? 'الشحن والتوصيل للمحافظات' : 'Shipping Policy'}</span>
            </a>
            <a href="#page/returns-policy" class="mobile-nav-link">
              <span class="mobile-nav-link-icon"><i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i></span>
              <span>${lang === 'ar' ? 'الاسترجاع والاستبدال (14 يوم)' : 'Returns & Exchange'}</span>
            </a>
            <a href="#page/about" class="mobile-nav-link">
              <span class="mobile-nav-link-icon"><i class="fa-solid fa-star" aria-hidden="true"></i></span>
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
            <span><i class="fa-solid fa-comment" aria-hidden="true"></i></span>
            <span>تواصل معنا واتساب مباشر</span>
          </a>
        </div>
      </div>
    </aside>

    <!-- Mobile Bottom Navigation Bar (Thumb-friendly mobile app UX) -->
    <nav class="mobile-bottom-nav" aria-label="Mobile Quick Bar">
      <a href="#home" class="mobile-bottom-item ${currentHash === 'home' || currentHash === '' ? 'active' : ''}">
        <i class="fa-solid fa-house" aria-hidden="true" style="font-size: 20px;"></i>
        <span>الرئيسية</span>
      </a>

      <a href="#shop" class="mobile-bottom-item ${currentHash === 'shop' ? 'active' : ''}">
        <i class="fa-solid fa-table-cells-large" aria-hidden="true" style="font-size: 20px;"></i>
        <span>المتجر</span>
      </a>

      <a href="#track" class="mobile-bottom-item ${currentHash.startsWith('track') ? 'active' : ''}">
        <i class="fa-solid fa-boxes-stacked" aria-hidden="true" style="font-size: 20px;"></i>
        <span>تتبع الشحنة</span>
      </a>

      <a href="#account" class="mobile-bottom-item ${currentHash.startsWith('account') ? 'active' : ''}">
        <i class="fa-solid fa-user" aria-hidden="true" style="font-size: 20px;"></i>
        <span>حسابي</span>
      </a>

      <button id="mobile-bottom-cart-btn" class="mobile-bottom-item" style="background: none; border: none; cursor: pointer; position: relative;">
        <i class="fa-solid fa-bag-shopping" aria-hidden="true" style="font-size: 20px;"></i>
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
