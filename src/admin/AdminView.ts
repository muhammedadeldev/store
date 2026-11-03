/**
 * L'ÉTOILE Haute Couture & Fashion Platform
 * Admin Dashboard - Production Management System
 * Pure Vanilla JavaScript ES6+ & CSS3 with Cairo Typography & Full Arabic UI
 */

import { state, showToast, openModal, closeModal } from '../state';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db, auth, googleProvider } from '../firebase';
import { signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';

// Helper: Free image file upload to /api/upload
async function uploadImageFile(file: File): Promise<{ url: string; filename: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name,
            data: base64Data,
            type: file.type
          })
        });
        const resData = await res.json();
        if (resData.success) {
          resolve({ url: resData.url, filename: resData.filename });
        } else {
          reject(new Error(resData.message || 'فشل رفع الصورة'));
        }
      } catch (err: any) {
        reject(err);
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

interface AdminCache {
  timestamp: number;
  orders: any[];
  products: any[];
  categories: any[];
  returns: any[];
  coupons: any[];
  reviews: any[];
  shippingZones: any[];
  inventoryMovements: any[];
  mediaItems: any[];
  settings: any;
}
let adminCache: AdminCache | null = null;

export function invalidateAdminCache() {
  adminCache = null;
}

export async function renderAdminView(currentSection: string = 'overview'): Promise<string> {
  const isAdmin = state.isAdmin();

  // If user is not logged in as Admin, or explicitly at #admin/login, show the Admin Login Screen
  if (!isAdmin || currentSection === 'login') {
    return renderAdminLoginView();
  }

  let orders: any[] = [];
  let products: any[] = [];
  let categories: any[] = [];
  let returns: any[] = [];
  let coupons: any[] = [];
  let reviews: any[] = [];
  let shippingZones: any[] = [];
  let inventoryMovements: any[] = [];
  let mediaItems: any[] = [];
  let settings: any = state.getSettings();

  if (adminCache) {
    orders = adminCache.orders;
    products = adminCache.products;
    categories = adminCache.categories;
    returns = adminCache.returns;
    coupons = adminCache.coupons;
    reviews = adminCache.reviews;
    shippingZones = adminCache.shippingZones;
    inventoryMovements = adminCache.inventoryMovements;
    mediaItems = adminCache.mediaItems;
    settings = adminCache.settings;
  } else {
    try {
      // 1. Ultra-fast single call to backend unified data route
      const res = await fetch('/api/admin/data');
      const data = await res.json();
      if (data && data.success) {
        orders = data.orders || [];
        products = data.products || [];
        categories = data.categories || [];
        returns = data.returns || [];
        coupons = data.coupons || [];
        reviews = data.reviews || [];
        shippingZones = data.shippingZones || [];
        inventoryMovements = data.inventoryMovements || [];
        mediaItems = data.mediaItems || [];
        if (data.settings) settings = { ...settings, ...data.settings };
      }
    } catch (e) {
      console.warn('API admin data fetch error, attempting direct Firestore fallback', e);
      try {
        const [oSnap, pSnap, cSnap, rSnap, coupSnap, revSnap, zSnap, mSnap, medSnap, setSnap] = await Promise.all([
          getDocs(collection(db, 'orders')).catch(() => ({ docs: [] })),
          getDocs(collection(db, 'products')).catch(() => ({ docs: [] })),
          getDocs(collection(db, 'categories')).catch(() => ({ docs: [] })),
          getDocs(collection(db, 'returns')).catch(() => ({ docs: [] })),
          getDocs(collection(db, 'coupons')).catch(() => ({ docs: [] })),
          getDocs(collection(db, 'reviews')).catch(() => ({ docs: [] })),
          getDocs(collection(db, 'shippingZones')).catch(() => ({ docs: [] })),
          getDocs(query(collection(db, 'inventoryMovements'), limit(20))).catch(() => ({ docs: [] })),
          getDocs(collection(db, 'media')).catch(() => ({ docs: [] })),
          getDoc(doc(db, 'settings', 'store')).catch(() => null)
        ]);

        orders = (oSnap as any).docs?.map((d: any) => ({ id: d.id, ...d.data() })) || [];
        products = (pSnap as any).docs?.map((d: any) => ({ id: d.id, ...d.data() })) || [];
        categories = (cSnap as any).docs?.map((d: any) => ({ id: d.id, ...d.data() })) || [];
        returns = (rSnap as any).docs?.map((d: any) => ({ id: d.id, ...d.data() })) || [];
        coupons = (coupSnap as any).docs?.map((d: any) => ({ id: d.id, ...d.data() })) || [];
        reviews = (revSnap as any).docs?.map((d: any) => ({ id: d.id, ...d.data() })) || [];
        shippingZones = (zSnap as any).docs?.map((d: any) => ({ id: d.id, ...d.data() })) || [];
        inventoryMovements = (mSnap as any).docs?.map((d: any) => ({ id: d.id, ...d.data() })) || [];
        mediaItems = (medSnap as any).docs?.map((d: any) => ({ id: d.id, ...d.data() })) || [];
        if (setSnap && (setSnap as any).exists && (setSnap as any).exists()) {
          settings = { ...settings, ...(setSnap as any).data() };
        }
      } catch (err) {
        console.error('Direct Firestore admin data fallback error', err);
      }
    }

    mediaItems.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    // Cache in memory for instantaneous zero-latency navigation between tabs
    adminCache = {
      timestamp: Date.now(),
      orders,
      products,
      categories,
      returns,
      coupons,
      reviews,
      shippingZones,
      inventoryMovements,
      mediaItems,
      settings
    };
  }

  // Calculate Metrics
  const totalRevenue = orders.reduce((sum, o) => o.status !== 'cancelled' ? sum + (o.total || 0) : sum, 0);
  const activeOrdersCount = orders.filter(o => !['delivered', 'cancelled', 'returned'].includes(o.status)).length;
  const newOrdersCount = orders.filter(o => o.status === 'new').length;
  const lowStockProducts = products.filter(p => (p.totalStock !== undefined && p.totalStock <= 10));
  const avgOrderValue = orders.length > 0 ? (totalRevenue / orders.length).toFixed(1) : '0';

  const sectionTitles: Record<string, string> = {
    overview: 'نظرة عامة والمؤشرات',
    products: 'إدارة المنتجات والمتغيرات',
    categories: 'التصنيفات والمجموعات',
    inventory: 'المخزون وحركة القطع',
    orders: 'إدارة الطلبات والمبيعات',
    returns: 'المرتجعات والاستبدال',
    media: 'مكتبة الوسائط ورفع الصور المجانية',
    customers: 'قاعدة بيانات العملاء',
    coupons: 'الكوبونات والخصومات',
    cms: 'إدارة المحتوى والواجهة (CMS)',
    shipping: 'إعدادات الشحن والمناطق',
    reviews: 'مراجعة وتقييمات العملاء',
    reports: 'التقارير المالية والأرباح'
  };

  return `
    <div class="admin-layout" dir="rtl" style="font-family: 'Cairo', sans-serif;">
      
      <!-- Collapsible Admin Sidebar -->
      <aside class="admin-sidebar" id="admin-sidebar" style="font-family: 'Cairo', sans-serif;">
        <div class="admin-sidebar-header" style="direction: rtl;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="/assets/logo-icon-white.png" alt="EIGHTY-EIGHT" style="height: 28px; width: auto;" />
            <span style="font-weight: 800; letter-spacing: 0.05em; color: #ffffff; font-size: 16px;">EIGHTY-EIGHT</span>
          </div>
          <span style="font-size: 11px; background: #334155; color: #f8fafc; padding: 2px 8px; border-radius: 4px; font-weight: 700;">الإدارة</span>
        </div>

        <nav class="admin-nav" style="direction: rtl;">
          <a href="#admin/overview" class="admin-nav-item ${currentSection === 'overview' ? 'active' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            <span>نظرة عامة والمؤشرات</span>
          </a>

          <a href="#admin/products" class="admin-nav-item ${currentSection === 'products' ? 'active' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line></svg>
            <span>إدارة المنتجات والمتغيرات</span>
            <span style="margin-right: auto; font-size: 11px; background: #1e293b; padding: 2px 6px; border-radius: 4px;">${products.length}</span>
          </a>

          <a href="#admin/media" class="admin-nav-item ${currentSection === 'media' ? 'active' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            <span>مكتبة الوسائط ورفع الصور</span>
            <span style="margin-right: auto; font-size: 10px; background: #15803d; color: #fff; padding: 2px 6px; border-radius: 4px;">مجاني</span>
          </a>

          <a href="#admin/categories" class="admin-nav-item ${currentSection === 'categories' ? 'active' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
            <span>التصنيفات والمجموعات</span>
            <span style="margin-right: auto; font-size: 11px; background: #1e293b; padding: 2px 6px; border-radius: 4px;">${categories.length}</span>
          </a>

          <a href="#admin/inventory" class="admin-nav-item ${currentSection === 'inventory' ? 'active' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            <span>المخزون وحركة القطع</span>
            ${lowStockProducts.length > 0 ? `<span style="margin-right: auto; font-size: 11px; background: #b91c1c; color: #fff; padding: 2px 6px; border-radius: 4px;">${lowStockProducts.length} منخفض</span>` : ''}
          </a>

          <a href="#admin/orders" class="admin-nav-item ${currentSection === 'orders' ? 'active' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            <span>إدارة الطلبات</span>
            ${newOrdersCount > 0 ? `<span style="margin-right: auto; font-size: 11px; background: #2563eb; color: #fff; padding: 2px 6px; border-radius: 4px;">${newOrdersCount} جديد</span>` : ''}
          </a>

          <a href="#admin/returns" class="admin-nav-item ${currentSection === 'returns' ? 'active' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>
            <span>المرتجعات والاستبدال</span>
            <span style="margin-right: auto; font-size: 11px; background: #1e293b; padding: 2px 6px; border-radius: 4px;">${returns.length}</span>
          </a>

          <a href="#admin/customers" class="admin-nav-item ${currentSection === 'customers' ? 'active' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span>قاعدة العملاء</span>
          </a>

          <a href="#admin/coupons" class="admin-nav-item ${currentSection === 'coupons' ? 'active' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg>
            <span>الكوبونات والعروض</span>
            <span style="margin-right: auto; font-size: 11px; background: #1e293b; padding: 2px 6px; border-radius: 4px;">${coupons.length}</span>
          </a>

          <a href="#admin/cms" class="admin-nav-item ${currentSection === 'cms' ? 'active' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
            <span>إدارة المحتوى والواجهة (CMS)</span>
          </a>

          <a href="#admin/shipping" class="admin-nav-item ${currentSection === 'shipping' ? 'active' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
            <span>إعدادات الشحن والمناطق</span>
          </a>

          <a href="#admin/reviews" class="admin-nav-item ${currentSection === 'reviews' ? 'active' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <span>مراجعة التقييمات</span>
          </a>

          <a href="#admin/reports" class="admin-nav-item ${currentSection === 'reports' ? 'active' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            <span>التقارير المالية والأرباح</span>
          </a>
        </nav>

        <div style="padding: var(--space-md); border-top: 1px solid #1e293b;">
          <a href="#home" class="btn btn-secondary btn-full btn-sm" style="color: #ffffff; border-color: #334155; font-size: 12px; font-weight: 600;">
            ← العودة لواجهة المتجر للعملاء
          </a>
        </div>
      </aside>

      <!-- Main Admin Content Area -->
      <div class="admin-main">
        
        <!-- Header -->
        <header class="admin-header">
          <div style="display: flex; align-items: center; gap: var(--space-md);">
            <button id="admin-sidebar-toggle" class="icon-btn" style="border: 1px solid #e2e8f0;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <h2 style="font-size: 20px; font-weight: 700; color: #0f172a;">
              ${sectionTitles[currentSection] || 'لوحة التحكم الإدارية'}
            </h2>
          </div>

          <div style="display: flex; align-items: center; gap: var(--space-md);">
            <!-- Instant Refresh Data Button -->
            <button id="admin-refresh-data-btn" class="btn btn-sm btn-secondary" style="font-size: 12px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; font-weight: 600;">
              <span>⟳</span>
              <span>تحديث البيانات</span>
            </button>

            <!-- Admin Profile Badge -->
            <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #334155;">
              <div style="width: 34px; height: 34px; border-radius: 50%; background: #0f172a; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px;">
                م
              </div>
              <div style="line-height: 1.2;">
                <div style="font-weight: 700;">${state.getUser()?.email || 'muhammedadel.dev@gmail.com'}</div>
                <div style="font-size: 11px; color: #16a34a; font-weight: 600;">سوبر أدمن (مدير عام المتجر)</div>
              </div>
            </div>

            <!-- Admin Sign Out Button -->
            <button id="admin-logout-btn" class="btn btn-sm btn-ghost" style="color: #b91c1c; border: 1px solid #fecaca; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 9999px;" title="تسجيل الخروج من لوحة الإدارة">
              تسجيل الخروج ⏻
            </button>
          </div>
        </header>

        <!-- Dynamic Admin Content Body -->
        <main class="admin-content">
          ${renderAdminSection(currentSection, {
            orders,
            products,
            categories,
            returns,
            coupons,
            reviews,
            shippingZones,
            inventoryMovements,
            mediaItems,
            settings,
            totalRevenue,
            activeOrdersCount,
            newOrdersCount,
            lowStockProducts,
            avgOrderValue
          })}
        </main>

      </div>
    </div>
  `;
}

// Arabic Section Renderer
function renderAdminSection(section: string, data: any): string {
  const { orders, products, categories, returns, coupons, reviews = [], shippingZones, inventoryMovements, mediaItems, totalRevenue, activeOrdersCount, newOrdersCount, lowStockProducts, avgOrderValue, settings } = data;

  switch (section) {
    case 'overview':
      return `
        <!-- KPI Cards Grid -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-lg); margin-bottom: var(--space-2xl);" class="kpi-grid">
          <div class="admin-card" style="padding: var(--space-lg); margin-bottom: 0;">
            <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">إجمالي المبيعات والإيرادات</span>
            <div style="font-size: 28px; font-weight: 700; color: #0f172a; margin-top: 4px; font-family: 'Cairo', sans-serif;">${state.formatPrice(totalRevenue)}</div>
            <div style="font-size: 12px; color: #16a34a; margin-top: 4px;">✓ مزامنة فورية مع فايربيز Firestore</div>
          </div>

          <div class="admin-card" style="padding: var(--space-lg); margin-bottom: 0;">
            <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">إجمالي الطلبات المسجلة</span>
            <div style="font-size: 28px; font-weight: 700; color: #0f172a; margin-top: 4px; font-family: 'Cairo', sans-serif;">${orders.length}</div>
            <div style="font-size: 12px; color: #2563eb; margin-top: 4px;">${newOrdersCount} طلب بانتظار المراجعة والاعتماد</div>
          </div>

          <div class="admin-card" style="padding: var(--space-lg); margin-bottom: 0;">
            <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">متوسط قيمة الطلب (AOV)</span>
            <div style="font-size: 28px; font-weight: 700; color: #0f172a; margin-top: 4px; font-family: 'Cairo', sans-serif;">${state.formatPrice(avgOrderValue)}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">معدل سلة الشراء لمنتجات الكوتور</div>
          </div>

          <div class="admin-card" style="padding: var(--space-lg); margin-bottom: 0;">
            <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">تنبيهات المخزون الحرج</span>
            <div style="font-size: 28px; font-weight: 700; color: ${lowStockProducts.length > 0 ? '#b91c1c' : '#0f172a'}; margin-top: 4px; font-family: 'Cairo', sans-serif;">${lowStockProducts.length}</div>
            <div style="font-size: 12px; color: ${lowStockProducts.length > 0 ? '#b91c1c' : '#16a34a'}; margin-top: 4px;">${lowStockProducts.length > 0 ? 'يتطلب إعادة التوريد من ورشة الخياطة' : 'المخزون بوضع ممتاز'}</div>
          </div>
        </div>

        <!-- Recent Orders Table -->
        <div class="admin-card">
          <div class="admin-card-header">
            <div>
              <h3 style="font-size: 17px; font-weight: 700;">أحدث طلبات العملاء المباشرة</h3>
              <p style="font-size: 12px; color: #64748b;">سجلات الشراء الحية المسجلة عبر واجهة المتجر</p>
            </div>
            <a href="#admin/orders" class="btn btn-secondary btn-sm" style="font-size: 12px;">عرض كافة الطلبات (${orders.length}) ←</a>
          </div>

          <table class="admin-table">
            <thead>
              <tr>
                <th>رقم الطلب</th>
                <th>اسم العميل</th>
                <th>رقم الجوال</th>
                <th>عدد القطع</th>
                <th>الإجمالي</th>
                <th>طريقة الدفع</th>
                <th>حالة الطلب</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              ${orders.length === 0 ? `
                <tr><td colspan="8" style="text-align: center; padding: 24px;">لا توجد طلبات مسجلة حتى الآن.</td></tr>
              ` : orders.slice(0, 5).map((o: any) => `
                <tr>
                  <td><strong>${o.orderNumber}</strong></td>
                  <td>${o.customerName}</td>
                  <td>${o.customerPhone}</td>
                  <td>${(o.items || []).length} قطع</td>
                  <td><strong>${state.formatPrice(o.total)}</strong></td>
                  <td>${o.paymentMethod === 'cod' ? 'الدفع عند الاستلام' : (o.paymentMethod?.toUpperCase() || 'دفع إلكتروني')}</td>
                  <td><span class="status-pill ${o.status}">${getStatusArabic(o.status)}</span></td>
                  <td>
                    <button class="open-order-details-btn btn btn-ghost btn-sm" data-id="${o.id}" style="font-size: 12px; text-decoration: underline; color: #2563eb;">
                      فحص وإدارة
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

    case 'products':
      return `
        <div class="admin-card">
          <div class="admin-card-header">
            <div>
              <h3 style="font-size: 17px; font-weight: 700;">كتالوج الأزياء والقطع الفاخرة (${products.length})</h3>
              <p style="font-size: 12px; color: #64748b;">إدارة التصاميم، الأسعار، المقاسات، الألوان، صور المنتجات، والمخزون</p>
            </div>
            <div style="display: flex; gap: 8px;">
              <button id="admin-add-product-btn" class="btn btn-primary btn-sm" style="font-size: 12px;">
                + إضافة قطعة أزياء جديدة
              </button>
            </div>
          </div>

          <table class="admin-table">
            <thead>
              <tr>
                <th>القطعة والصورة</th>
                <th>كود SKU</th>
                <th>التصنيف</th>
                <th>السعر الأساسي</th>
                <th>المتغيرات والمخزون</th>
                <th>حالة النشر</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${products.map((p: any) => `
                <tr>
                  <td style="display: flex; align-items: center; gap: 10px;">
                    <img src="${(p.images && p.images[0]) || ''}" alt="" style="width: 44px; height: 56px; object-fit: cover; border-radius: 4px; border: 1px solid #e2e8f0;" />
                    <div>
                      <strong style="font-size: 14px;">${p.nameAr || p.name}</strong>
                      <div style="font-size: 12px; color: #64748b;">${p.name || ''}</div>
                    </div>
                  </td>
                  <td><code>${p.sku || '—'}</code></td>
                  <td>${p.categoryName || 'كوتور'}</td>
                  <td><strong>${state.formatPrice(p.salePrice || p.price)}</strong></td>
                  <td>
                    <span style="font-weight: 700; color: ${p.totalStock <= 5 ? '#b91c1c' : '#0f172a'};">${p.totalStock ?? 0} قطعة بالمخزون</span>
                    <div style="font-size: 11px; color: #64748b;">${(p.variants || []).length} مقاس ولون</div>
                  </td>
                  <td>
                    <span class="status-pill ${p.isPublished ? 'delivered' : 'cancelled'}">
                      ${p.isPublished ? 'منشور بالمتجر' : 'مسودة مخفية'}
                    </span>
                  </td>
                  <td>
                    <div style="display: flex; gap: 6px;">
                      <button class="admin-edit-prod-btn btn btn-ghost btn-sm" data-id="${p.id}" style="color: #2563eb; font-size: 12px; font-weight: 600;">تعديل</button>
                      <button class="admin-del-prod-btn btn btn-ghost btn-sm" data-id="${p.id}" style="color: #b91c1c; font-size: 12px; font-weight: 600;">حذف</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

    // FREE MEDIA LIBRARY SECTION
    case 'media':
      return `
        <!-- Media Library Header & Upload Box -->
        <div class="admin-card" style="padding: var(--space-xl);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-lg); flex-wrap: wrap; gap: var(--space-md);">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <h3 style="font-size: 18px; font-weight: 700; margin: 0;">مكتبة الوسائط ورفع الصور المجانية</h3>
                <span style="background: #15803d; color: #ffffff; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px;">100% مجاناً بدون وسيلة دفع</span>
              </div>
              <p style="font-size: 13px; color: #64748b; margin-top: 4px;">
                ارفع صور منتجاتك والبانرات مباشرة من جهازك (كمبيوتر أو هاتف) بدون الحاجة لحساب فايربيز مدفوع أو بطاقة بنكية.
              </p>
            </div>

            <!-- Upload Button -->
            <label class="btn btn-gold btn-sm" style="cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; padding: 10px 18px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              <span>+ رفع صور من جهازك</span>
              <input type="file" id="media-bulk-upload-input" accept="image/*" multiple style="display: none;" />
            </label>
          </div>

          <!-- Drag and drop zone -->
          <div id="media-dropzone" style="border: 2px dashed #cbd5e1; border-radius: 8px; padding: 32px 20px; text-align: center; background: #f8fafc; transition: all 0.2s; cursor: pointer;">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(197, 160, 89, 0.15); color: var(--color-brand-gold); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            </div>
            <h4 style="font-size: 15px; font-weight: 700; margin-bottom: 4px;">اسحب الصور وأفلتها هنا أو اضغط للاختيار من جهازك</h4>
            <p style="font-size: 12px; color: #64748b; margin: 0;">
              يدعم صيغ JPG، PNG، WEBP، GIF (حجم غير محدود ومجاني بالكامل)
            </p>
          </div>
        </div>

        <!-- Uploaded Images Grid -->
        <div class="admin-card" style="padding: var(--space-xl);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-lg);">
            <h3 style="font-size: 16px; font-weight: 700;">الصور المرفوعة في النظام (${mediaItems.length})</h3>
            <span style="font-size: 12px; color: #64748b;">تُخزن الصور تلقائياً في السيرفر وتتاح فوراً للاستخدام بالمنتجات</span>
          </div>

          ${mediaItems.length === 0 ? `
            <div style="text-align: center; padding: 48px 20px; color: #64748b;">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px; opacity: 0.5;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              <p style="font-size: 14px; font-weight: 600;">لم يتم رفع أي صور بعد.</p>
              <p style="font-size: 12px;">اضغط على زر "رفع صور من جهازك" أعلاه لبدء رفع صور تصاميمك وملابسك مجاناً.</p>
            </div>
          ` : `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--space-lg);" id="media-grid">
              ${mediaItems.map((m: any) => `
                <div class="media-card" style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background: #ffffff; display: flex; flex-direction: column;">
                  <div style="position: relative; padding-top: 120%; background: #f1f5f9; overflow: hidden;">
                    <img src="${m.url}" alt="${m.originalName || ''}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s;" />
                  </div>
                  <div style="padding: 12px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                      <div style="font-size: 12px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${m.originalName || m.filename}">
                        ${m.originalName || m.filename}
                      </div>
                      <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                        ${(m.size ? (m.size / 1024).toFixed(1) + ' KB' : 'صورة')} • ${new Date(m.createdAt || Date.now()).toLocaleDateString('ar-EG')}
                      </div>
                    </div>
                    
                    <div style="display: flex; gap: 6px; margin-top: 10px;">
                      <button class="btn btn-secondary btn-sm admin-copy-url-btn" data-url="${m.url}" style="flex: 1; font-size: 11px; padding: 4px 8px;" title="نسخ الرابط المباشر">
                        📋 نسخ الرابط
                      </button>
                      <button class="btn btn-ghost btn-sm admin-del-media-btn" data-id="${m.id}" style="color: #b91c1c; font-size: 11px; padding: 4px 8px;" title="حذف الصورة">
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;

    case 'orders':
      return `
        <div class="admin-card">
          <div class="admin-card-header">
            <div>
              <h3 style="font-size: 17px; font-weight: 700;">دورة حياة الطلبات وإدارة الشحن (${orders.length})</h3>
              <p style="font-size: 12px; color: #64748b;">تأكيد المدفوعات، تحديث حالات الشحن، إصدار بوليصات التتبع، وإدارة الإلغاء</p>
            </div>
          </div>

          <table class="admin-table">
            <thead>
              <tr>
                <th>رقم الطلب</th>
                <th>تاريخ الطلب</th>
                <th>بيانات العميل</th>
                <th>منطقة التوصيل</th>
                <th>الإجمالي</th>
                <th>الحالة الحالية</th>
                <th>رقم التتبع</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map((o: any) => `
                <tr>
                  <td><strong>${o.orderNumber}</strong></td>
                  <td>${new Date(o.createdAt).toLocaleDateString('ar-EG')}</td>
                  <td>
                    <div style="font-weight: 700;">${o.customerName}</div>
                    <div style="font-size: 11px; color: #64748b;">${o.customerPhone}</div>
                  </td>
                  <td>${o.shippingZoneName || o.shippingAddress?.city || 'شحن قياسي'}</td>
                  <td><strong>${state.formatPrice(o.total)}</strong></td>
                  <td><span class="status-pill ${o.status}">${getStatusArabic(o.status)}</span></td>
                  <td><code>${o.trackingNumber || 'لم يُحدد'}</code></td>
                  <td>
                    <button class="open-order-details-btn btn btn-primary btn-sm" data-id="${o.id}" style="font-size: 12px; padding: 4px 12px;">
                      إدارة الطلب
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

    case 'inventory':
      return `
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: var(--space-xl);">
          <!-- Live Inventory Table -->
          <div class="admin-card">
            <div class="admin-card-header">
              <h3 style="font-size: 17px; font-weight: 700;">مصفوفة مخزون المقاسات والألوان الحية</h3>
              <button id="admin-adjust-stock-btn" class="btn btn-primary btn-sm" style="font-size: 12px;">+ تعديل المخزون يدوياً</button>
            </div>
            <table class="admin-table">
              <thead>
                <tr>
                  <th>القطعة</th>
                  <th>كود SKU</th>
                  <th>اللون / المقاس</th>
                  <th>الكمية المتاحة</th>
                </tr>
              </thead>
              <tbody>
                ${products.flatMap((p: any) => (p.variants || []).map((v: any) => `
                  <tr>
                    <td><strong>${p.nameAr || p.name}</strong></td>
                    <td><code>${v.sku}</code></td>
                    <td>${v.color} • ${v.size}</td>
                    <td>
                      <span style="font-weight: 700; color: ${v.stock <= 3 ? '#b91c1c' : '#15803d'};">
                        ${v.stock} قطعة
                      </span>
                    </td>
                  </tr>
                `)).join('')}
              </tbody>
            </table>
          </div>

          <!-- Movement History Audit Trail -->
          <div class="admin-card">
            <div class="admin-card-header">
              <h3 style="font-size: 17px; font-weight: 700;">سجل حركة وسحب المخزون</h3>
            </div>
            <div style="padding: var(--space-md); display: flex; flex-direction: column; gap: 10px; max-height: 500px; overflow-y: auto;">
              ${inventoryMovements.length === 0 ? `
                <p style="font-size: 12px; color: #64748b;">لا توجد حركات مسجلة مؤخراً.</p>
              ` : inventoryMovements.map((m: any) => `
                <div style="padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px;">
                  <div style="display: flex; justify-content: space-between; font-weight: 700;">
                    <span>${m.type === 'checkout_deduction' ? 'خصم مبيعات' : 'تعديل مخزني'}</span>
                    <span style="color: ${m.quantityDelta > 0 ? '#16a34a' : '#b91c1c'};">${m.quantityDelta > 0 ? '+' : ''}${m.quantityDelta}</span>
                  </div>
                  <div style="color: #64748b; margin-top: 2px;">SKU: ${m.sku}</div>
                  <div style="color: #475569; margin-top: 2px;">${m.reason || ''}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;

    case 'categories':
      return `
        <div class="admin-card">
          <div class="admin-card-header">
            <div>
              <h3 style="font-size: 17px; font-weight: 700;">إدارة الأقسام وتصنيفات الأزياء (${categories.length})</h3>
              <p style="font-size: 12px; color: #64748b;">تنظيم أقسام المعاطف، الفساتين، ملابس السهرة، والأزياء الراقية</p>
            </div>
            <button id="admin-add-category-btn" class="btn btn-primary btn-sm" style="font-size: 12px;">+ إضافة قسم جديد</button>
          </div>
          <table class="admin-table">
            <thead>
              <tr>
                <th>القسم والصورة</th>
                <th>الرابط (Slug)</th>
                <th>ترتيب العرض</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${categories.map((c: any) => `
                <tr>
                  <td style="display: flex; align-items: center; gap: 10px;">
                    <img src="${c.imageUrl}" alt="" style="width: 44px; height: 44px; object-fit: cover; border-radius: 4px; border: 1px solid #e2e8f0;" />
                    <div>
                      <strong style="font-size: 14px;">${c.nameAr || c.name}</strong>
                      <div style="font-size: 11px; color: #64748b;">${c.name || ''}</div>
                    </div>
                  </td>
                  <td><code>${c.slug}</code></td>
                  <td>${c.sortOrder || 1}</td>
                  <td><span class="status-pill ${c.isActive ? 'delivered' : 'cancelled'}">${c.isActive ? 'مفعل بالمتجر' : 'مخفي'}</span></td>
                  <td>
                    <button class="admin-del-cat-btn btn btn-ghost btn-sm" data-id="${c.id}" style="color: #b91c1c; font-size: 12px; font-weight: 600;">حذف</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

    case 'returns':
      return `
        <div class="admin-card">
          <div class="admin-card-header">
            <div>
              <h3 style="font-size: 17px; font-weight: 700;">طلبات الإرجاع والاستبدال من العملاء (${returns.length})</h3>
              <p style="font-size: 12px; color: #64748b;">فحص حالة القطعة المسترجعة، إعادة المخزون، واعتماد الاستبدال أو رد الأموال</p>
            </div>
          </div>
          <table class="admin-table">
            <thead>
              <tr>
                <th>رقم الطلب</th>
                <th>العميل</th>
                <th>نوع الطلب</th>
                <th>السبب</th>
                <th>ملاحظات العميل</th>
                <th>حالة المعالجة</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              ${returns.length === 0 ? `
                <tr><td colspan="7" style="text-align: center; padding: 24px;">لا توجد طلبات إرجاع واردة.</td></tr>
              ` : returns.map((r: any) => `
                <tr>
                  <td><strong>${r.orderNumber}</strong></td>
                  <td>${r.customerEmail}</td>
                  <td><code>${r.type === 'exchange' ? 'استبدال مقاس' : 'استرجاع'}</code></td>
                  <td>${r.reason}</td>
                  <td style="font-size: 12px; color: #64748b;">${r.detailedReason || '—'}</td>
                  <td><span class="status-pill ${r.status}">${r.status}</span></td>
                  <td>
                    <button class="admin-process-return-btn btn btn-secondary btn-sm" data-id="${r.id}" style="font-size: 12px;">
                      معالجة واتخاذ قرار
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

    case 'coupons':
      return `
        <div class="admin-card">
          <div class="admin-card-header">
            <div>
              <h3 style="font-size: 17px; font-weight: 700;">كوبونات الخصم والعروض الترويجية (${coupons.length})</h3>
              <p style="font-size: 12px; color: #64748b;">إنشاء رموز الخصم بنسبة مئوية أو مبلغ ثابت وتحديد الحد الأدنى للشراء</p>
            </div>
            <button id="admin-add-coupon-btn" class="btn btn-primary btn-sm" style="font-size: 12px;">+ إنشاء كود خصم جديد</button>
          </div>
          <table class="admin-table">
            <thead>
              <tr>
                <th>رمز الكوبون</th>
                <th>قيمة الخصم</th>
                <th>الحد الأدنى للطلب</th>
                <th>عدد مرات الاستخدام</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${coupons.map((cp: any) => `
                <tr>
                  <td><strong style="letter-spacing: 0.1em; color: var(--color-brand); font-size: 14px;">${cp.code}</strong></td>
                  <td><strong>${cp.discountType === 'percentage' ? `خصم ${cp.discountValue}%` : `خصم ${state.formatPrice(cp.discountValue)} ثابت`}</strong></td>
                  <td>${state.formatPrice(cp.minOrderValue || 0)}</td>
                  <td>${cp.usageCount || 0} / ${cp.usageLimit || 'غير محدود'}</td>
                  <td><span class="status-pill ${cp.isActive ? 'delivered' : 'cancelled'}">${cp.isActive ? 'مفعل' : 'معطل'}</span></td>
                  <td>
                    <button class="admin-toggle-coupon-btn btn btn-ghost btn-sm" data-id="${cp.id}" data-active="${cp.isActive}" style="font-size: 12px; font-weight: 600;">
                      ${cp.isActive ? 'تعطيل الكوبون' : 'تفعيل الكوبون'}
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

    case 'cms':
      return `
        <div class="admin-card" style="padding: var(--space-xl);">
          <h3 style="font-size: 18px; font-weight: 700; margin-bottom: var(--space-lg); border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
            تخصيص هوية المتجر والواجهة الرئيسية (CMS)
          </h3>

          <form id="admin-settings-form" style="display: flex; flex-direction: column; gap: var(--space-lg);">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
              <div class="form-group">
                <label class="form-label">اسم البراند (بالعربية) *</label>
                <input type="text" id="set-brand-ar" class="form-input" value="${settings.brandNameAr || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">اسم البراند (بالإنجليزية) *</label>
                <input type="text" id="set-brand-en" class="form-input" value="${settings.brandName || ''}" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
              <div class="form-group">
                <label class="form-label">عنوان البانر الرئيسي Hero (بالعربية)</label>
                <input type="text" id="set-hero-title-ar" class="form-input" value="${settings.heroTitleAr || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">عنوان البانر الرئيسي Hero (بالإنجليزية)</label>
                <input type="text" id="set-hero-title-en" class="form-input" value="${settings.heroTitle || ''}" />
              </div>
            </div>

            <!-- Free upload for hero image -->
            <div class="form-group">
              <label class="form-label">صورة البانر الرئيسي Hero (رفع مجاني من جهازك أو رابط) *</label>
              <div style="display: flex; gap: 8px;">
                <input type="url" id="set-hero-img" class="form-input" style="flex: 1;" value="${settings.heroImageUrl || ''}" />
                <label class="btn btn-secondary btn-sm" style="cursor: pointer; display: flex; align-items: center; gap: 4px; white-space: nowrap;">
                  <span>📁 رفع من جهازك</span>
                  <input type="file" id="set-hero-file-upload" accept="image/*" style="display: none;" />
                </label>
              </div>
              <div id="set-hero-preview-box" style="margin-top: 8px;">
                <img id="set-hero-preview-img" src="${settings.heroImageUrl || ''}" style="height: 100px; border-radius: 4px; border: 1px solid #cbd5e1; object-fit: cover;" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
              <div class="form-group">
                <label class="form-label">شريط الإعلانات العلوي Announcement Bar (بالعربية)</label>
                <input type="text" id="set-ann-ar" class="form-input" value="${settings.announcementBarTextAr || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">شريط الإعلانات العلوي Announcement Bar (بالإنجليزية)</label>
                <input type="text" id="set-ann-en" class="form-input" value="${settings.announcementBarText || ''}" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-md);">
              <div class="form-group">
                <label class="form-label">حد الشحن المجاني (ج.م)</label>
                <input type="number" id="set-free-ship" class="form-input" value="${settings.freeShippingThreshold || 1500}" />
              </div>
              <div class="form-group">
                <label class="form-label">رقم واتساب خدمة العملاء Concierge</label>
                <input type="text" id="set-whatsapp" class="form-input" value="${settings.whatsappNumber || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">نسبة الضريبة المضافة (%)</label>
                <input type="number" id="set-tax" class="form-input" value="${settings.taxPercentage || 5}" />
              </div>
            </div>

            <button type="submit" class="btn btn-primary" style="align-self: flex-start; padding: 12px 28px; font-weight: 700;">
              حفظ وتطبيق إعدادات المتجر في فايربيز
            </button>
          </form>
        </div>
      `;

    case 'customers': {
      const customersMap = new Map();
      orders.forEach((o: any) => {
        const key = o.customerPhone || o.customerEmail || o.customerName;
        if (!key) return;
        if (!customersMap.has(key)) {
          customersMap.set(key, {
            name: o.customerName,
            phone: o.customerPhone,
            email: o.customerEmail,
            city: o.shippingAddress?.city || o.shippingZoneName || 'القاهرة',
            ordersCount: 0,
            totalSpent: 0,
            lastOrderDate: o.createdAt
          });
        }
        const c = customersMap.get(key);
        c.ordersCount += 1;
        c.totalSpent += (o.total || 0);
        if (new Date(o.createdAt) > new Date(c.lastOrderDate)) {
          c.lastOrderDate = o.createdAt;
        }
      });
      const customersList = Array.from(customersMap.values());

      return `
        <div class="admin-card">
          <div class="admin-card-header">
            <div>
              <h3 style="font-size: 17px; font-weight: 700;">قاعدة بيانات العملاء المسجلين (${customersList.length})</h3>
              <p style="font-size: 12px; color: #64748b;">سجلات الشراء، بيانات الاتصال، وإجمالي الإنفاق للعملاء</p>
            </div>
          </div>
          <table class="admin-table">
            <thead>
              <tr>
                <th>اسم العميل</th>
                <th>رقم الهاتف</th>
                <th>البريد الإلكتروني</th>
                <th>المنطقة / المحافظة</th>
                <th>عدد الطلبات</th>
                <th>إجمالي المشتريات</th>
                <th>آخر طلب</th>
                <th>تواصل</th>
              </tr>
            </thead>
            <tbody>
              ${customersList.length === 0 ? `
                <tr><td colspan="8" style="text-align: center; padding: 24px;">لا يوجد عملاء مسجلين حتى الآن.</td></tr>
              ` : customersList.map((c: any) => `
                <tr>
                  <td><strong>${c.name}</strong></td>
                  <td><code>${c.phone}</code></td>
                  <td>${c.email || '—'}</td>
                  <td>${c.city}</td>
                  <td><span style="font-weight: 700; color: #0f172a;">${c.ordersCount} طلبات</span></td>
                  <td><strong style="color: #15803d;">${state.formatPrice(c.totalSpent)}</strong></td>
                  <td style="font-size: 12px; color: #64748b;">${new Date(c.lastOrderDate).toLocaleDateString('ar-EG')}</td>
                  <td>
                    ${c.phone ? `
                      <a href="https://wa.me/${c.phone.replace(/[^0-9]/g, '')}" target="_blank" class="btn btn-ghost btn-sm" style="color: #16a34a; font-weight: 700; font-size: 12px;">
                        واتساب ↗
                      </a>
                    ` : '—'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    case 'shipping':
      return `
        <div class="admin-card">
          <div class="admin-card-header">
            <div>
              <h3 style="font-size: 17px; font-weight: 700;">مناطق وأسعار الشحن في مصر (${shippingZones.length})</h3>
              <p style="font-size: 12px; color: #64748b;">إدارة تكلفة التوصيل، مدة الشحن المتوقعة، وتفعيل المناطق</p>
            </div>
            <button id="admin-add-zone-btn" class="btn btn-primary btn-sm" style="font-size: 12px;">+ إضافة منطقة جديدة</button>
          </div>
          <table class="admin-table">
            <thead>
              <tr>
                <th>المنطقة والمحافظات</th>
                <th>الاسم الإنجليزي</th>
                <th>تكلفة التوصيل</th>
                <th>مدة التوصيل المتوقعة</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${shippingZones.length === 0 ? `
                <tr><td colspan="6" style="text-align: center; padding: 24px;">لا توجد مناطق شحن مسجلة.</td></tr>
              ` : shippingZones.map((z: any) => `
                <tr>
                  <td><strong>${z.nameAr || z.name}</strong></td>
                  <td style="color: #64748b;">${z.name}</td>
                  <td><strong style="color: #0f172a;">${state.formatPrice(z.cost)}</strong></td>
                  <td>${z.estimatedDaysAr || z.estimatedDays || '1-3 أيام'}</td>
                  <td><span class="status-pill ${z.isActive !== false ? 'delivered' : 'cancelled'}">${z.isActive !== false ? 'مفعل' : 'معطل'}</span></td>
                  <td>
                    <button class="admin-toggle-zone-btn btn btn-ghost btn-sm" data-id="${z.id}" data-active="${z.isActive !== false}" style="font-size: 12px; font-weight: 600;">
                      ${z.isActive !== false ? 'تعطيل' : 'تفعيل'}
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

    case 'reviews':
      return `
        <div class="admin-card">
          <div class="admin-card-header">
            <div>
              <h3 style="font-size: 17px; font-weight: 700;">تقييمات وآراء العملاء (${reviews.length})</h3>
              <p style="font-size: 12px; color: #64748b;">مراجعة واعتماد تعليقات المشترين قبل ظهورها على صفحة المنتج</p>
            </div>
          </div>
          <table class="admin-table">
            <thead>
              <tr>
                <th>اسم العميل</th>
                <th>التقييم</th>
                <th>التعليق والملاحظات</th>
                <th>التاريخ</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${reviews.length === 0 ? `
                <tr><td colspan="6" style="text-align: center; padding: 24px;">لا توجد تقييمات واردة حتى الآن.</td></tr>
              ` : reviews.map((rv: any) => `
                <tr>
                  <td>
                    <strong>${rv.customerName}</strong>
                    <div style="font-size: 11px; color: #64748b;">${rv.customerEmail || ''}</div>
                  </td>
                  <td>
                    <span style="color: #eab308; font-size: 14px;">${'★'.repeat(rv.rating || 5)}</span>
                  </td>
                  <td style="max-width: 320px; font-size: 13px;">
                    <div style="font-weight: 600; color: #0f172a;">${rv.title || ''}</div>
                    <div style="color: #475569; margin-top: 2px;">${rv.comment}</div>
                  </td>
                  <td style="font-size: 12px; color: #64748b;">${new Date(rv.createdAt || Date.now()).toLocaleDateString('ar-EG')}</td>
                  <td><span class="status-pill ${rv.isApproved ? 'delivered' : 'new'}">${rv.isApproved ? 'معتمد ومنشور' : 'بانتظار المراجعة'}</span></td>
                  <td>
                    <div style="display: flex; gap: 6px;">
                      <button class="admin-toggle-review-btn btn btn-ghost btn-sm" data-id="${rv.id}" data-approved="${rv.isApproved}" style="color: #2563eb; font-size: 12px; font-weight: 600;">
                        ${rv.isApproved ? 'إلغاء النشر' : 'اعتماد ونشر'}
                      </button>
                      <button class="admin-del-review-btn btn btn-ghost btn-sm" data-id="${rv.id}" style="color: #b91c1c; font-size: 12px; font-weight: 600;">حذف</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

    case 'reports': {
      const codOrders = orders.filter((o: any) => o.paymentMethod === 'cod');
      const vfOrders = orders.filter((o: any) => o.paymentMethod === 'vodafone_cash');
      const totalUnitsSold = orders.reduce((sum: number, o: any) => sum + (o.items || []).reduce((isum: number, i: any) => isum + (i.quantity || 1), 0), 0);

      return `
        <!-- Reports KPI Strip -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-lg); margin-bottom: var(--space-2xl);" class="kpi-grid">
          <div class="admin-card" style="padding: var(--space-lg); margin-bottom: 0;">
            <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">إجمالي المبيعات المحققة</span>
            <div style="font-size: 26px; font-weight: 700; color: #0f172a; margin-top: 4px;">${state.formatPrice(totalRevenue)}</div>
            <div style="font-size: 12px; color: #16a34a; margin-top: 4px;">صافي الطلبات غير الملغاة</div>
          </div>

          <div class="admin-card" style="padding: var(--space-lg); margin-bottom: 0;">
            <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">إجمالي القطع المباعة</span>
            <div style="font-size: 26px; font-weight: 700; color: #0f172a; margin-top: 4px;">${totalUnitsSold} قطعة</div>
            <div style="font-size: 12px; color: #2563eb; margin-top: 4px;">عبر واجهة المتجر الإلكتروني</div>
          </div>

          <div class="admin-card" style="padding: var(--space-lg); margin-bottom: 0;">
            <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">الدفع عند الاستلام (COD)</span>
            <div style="font-size: 26px; font-weight: 700; color: #0f172a; margin-top: 4px;">${codOrders.length} طلب</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${state.formatPrice(codOrders.reduce((s: number, o: any) => s + (o.total || 0), 0))}</div>
          </div>

          <div class="admin-card" style="padding: var(--space-lg); margin-bottom: 0;">
            <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">محافظ إلكترونية / فودافون كاش</span>
            <div style="font-size: 26px; font-weight: 700; color: #0f172a; margin-top: 4px;">${vfOrders.length} طلب</div>
            <div style="font-size: 12px; color: #16a34a; margin-top: 4px;">${state.formatPrice(vfOrders.reduce((s: number, o: any) => s + (o.total || 0), 0))}</div>
          </div>
        </div>

        <!-- Breakdown Details -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-xl);">
          <div class="admin-card" style="padding: var(--space-xl);">
            <h4 style="font-size: 16px; font-weight: 700; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
              أعلى المنتجات مبيعاً بالمتجر
            </h4>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${products.slice(0, 5).map((p: any, idx: number) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8fafc; border-radius: 6px;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-weight: 800; color: #94a3b8; font-size: 14px;">#${idx + 1}</span>
                    <div>
                      <strong style="font-size: 13px;">${p.nameAr || p.name}</strong>
                      <div style="font-size: 11px; color: #64748b;">SKU: ${p.sku}</div>
                    </div>
                  </div>
                  <strong style="color: #0f172a;">${state.formatPrice(p.salePrice || p.price)}</strong>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="admin-card" style="padding: var(--space-xl);">
            <h4 style="font-size: 16px; font-weight: 700; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
              توزيع الطلبات حسب مناطق ومحافظات مصر
            </h4>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${shippingZones.map((z: any) => {
                const count = orders.filter((o: any) => o.shippingZoneName?.includes(z.nameAr) || o.shippingAddress?.governorate === z.id).length;
                return `
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8fafc; border-radius: 6px;">
                    <div>
                      <strong style="font-size: 13px;">${z.nameAr || z.name}</strong>
                      <div style="font-size: 11px; color: #64748b;">تكلفة التوصيل: ${state.formatPrice(z.cost)}</div>
                    </div>
                    <span style="background: #e2e8f0; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700;">${count} طلبات</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    }

    default:
      return renderAdminSection('overview', data);
  }
}

function getStatusArabic(status: string): string {
  const map: Record<string, string> = {
    new: 'طلب جديد',
    confirmed: 'مؤكد',
    processing: 'قيد التجهيز بالأتليه',
    shipped: 'تم الشحن الجوي',
    delivered: 'تم التوصيل والإنهاء',
    cancelled: 'ملغي ومسترجع'
  };
  return map[status] || status;
}

// Security Gate Login View in Arabic with Cairo Font
export function renderAdminLoginView(): string {
  return `
    <div class="admin-login-layout" dir="rtl" style="min-height: 100vh; background-color: #0b0f19; display: flex; align-items: center; justify-content: center; padding: var(--space-xl); font-family: 'Cairo', sans-serif;">
      
      <div style="max-width: 440px; width: 100%; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 36px 32px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); color: #ffffff;">
        
        <!-- Brand & Security Header -->
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="margin-bottom: 16px;">
            <img src="/assets/logo-white.png" alt="EIGHTY-EIGHT" style="height: 52px; width: auto; max-width: 200px; object-fit: contain; margin: 0 auto; display: block;" />
          </div>
          
          <span style="font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--color-brand-gold); display: block; margin-bottom: 6px; font-weight: 700;">
            EIGHTY-EIGHT • لوحة التحكم الإدارية
          </span>
          <h2 style="font-size: 22px; font-weight: 800; color: #ffffff;">
            تسجيل دخول مدير المتجر
          </h2>
          <p style="font-size: 13px; color: #94a3b8; margin-top: 6px; line-height: 1.6;">
            منطقة أمنية مخصصة لإدارة المنتجات، الطلبات، المخزون، والوسائط.
          </p>
        </div>

        <!-- Admin Login Form (No visible credentials) -->
        <form id="admin-login-form" style="display: flex; flex-direction: column; gap: 18px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="color: #cbd5e1; font-weight: 600; font-size: 13px;">البريد الإلكتروني المعتمد للإدارة *</label>
            <input 
              type="email" 
              id="adm-login-email" 
              required 
              class="form-input" 
              value="" 
              placeholder="name@example.com" 
              style="background: #0b0f19; border-color: #334155; color: #ffffff; direction: ltr; text-align: left; padding: 12px 14px; border-radius: 10px;" 
            />
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="color: #cbd5e1; font-weight: 600; font-size: 13px;">كلمة المرور (الباسوورد) *</label>
            <input 
              type="password" 
              id="adm-login-password" 
              required 
              class="form-input" 
              value="" 
              placeholder="••••••••" 
              style="background: #0b0f19; border-color: #334155; color: #ffffff; direction: ltr; padding: 12px 14px; border-radius: 10px;" 
            />
          </div>

          <button type="submit" id="adm-submit-btn" class="btn btn-gold btn-full" style="padding: 13px; margin-top: 6px; font-weight: 700; font-size: 14px; border-radius: 12px;">
            🔒 تسجيل الدخول إلى لوحة التحكم
          </button>
        </form>

        <!-- Back to Storefront Link -->
        <div style="margin-top: 24px; text-align: center; border-top: 1px solid #1e293b; padding-top: 16px;">
          <a href="#home" style="font-size: 13px; color: #94a3b8; text-decoration: underline;">
            ← الرجوع للمتجر الإلكتروني للعملاء
          </a>
        </div>

      </div>

    </div>
  `;
}

export function setupAdminEvents(section: string) {
  const isAdmin = state.isAdmin();

  // If in login view
  if (!isAdmin || section === 'login') {
    const loginForm = document.getElementById('admin-login-form');
    if (loginForm) {
      loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = (document.getElementById('adm-login-email') as HTMLInputElement).value.trim();
        const pass = (document.getElementById('adm-login-password') as HTMLInputElement).value;
        const submitBtn = document.getElementById('adm-submit-btn') as HTMLButtonElement;

        try {
          submitBtn.disabled = true;
          submitBtn.textContent = 'جاري التحقق الأمني...';

          // Call backend admin login endpoint
          const res = await fetch('/api/auth/admin-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass })
          });
          const data = await res.json();

          if (data.success && data.user) {
            state.setCurrentUser(data.user, true);
            invalidateAdminCache();
            showToast('تم تسجيل الدخول بنجاح كمدير لبراند EIGHTY-EIGHT!', 'success');
            window.location.hash = 'admin/overview';
            return;
          }

          // Fallback Firebase Auth check
          try {
            const cred = await signInWithEmailAndPassword(auth, email, pass);
            if (cred.user.email?.toLowerCase() === 'muhammedadel.dev@gmail.com') {
              state.setCurrentUser(cred.user, true);
              invalidateAdminCache();
              showToast('تم تسجيل الدخول بنجاح!', 'success');
              window.location.hash = 'admin/overview';
              return;
            }
          } catch {}

          throw new Error(data.message || 'بيانات الدخول غير صحيحة أو غير مصرح لها');
        } catch (err: any) {
          showToast(err.message, 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = '🔒 تسجيل الدخول إلى لوحة التحكم';
        }
      };
    }

    return;
  }

  // Admin Logout Button Handler
  const logoutBtn = document.getElementById('admin-logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      try {
        await signOut(auth);
      } catch (e) {
        // ignore
      }
      state.setCurrentUser(null, false);
      invalidateAdminCache();
      showToast('تم تسجيل الخروج من لوحة التحكم بنجاح', 'info');
      window.location.hash = 'admin/login';
    };
  }

  // Refresh data button handler
  const refreshBtn = document.getElementById('admin-refresh-data-btn');
  if (refreshBtn) {
    refreshBtn.onclick = () => {
      invalidateAdminCache();
      showToast('جاري تحديث البيانات من السيرفر...', 'info');
      window.location.reload();
    };
  }

  // Sidebar mobile toggle
  const sidebarToggle = document.getElementById('admin-sidebar-toggle');
  const sidebar = document.getElementById('admin-sidebar');
  if (sidebarToggle && sidebar) {
    sidebarToggle.onclick = () => {
      sidebar.classList.toggle('open');
    };
  }

  // Shipping section events
  if (section === 'shipping') {
    document.querySelectorAll('.admin-toggle-zone-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        const active = (e.currentTarget as HTMLElement).getAttribute('data-active') === 'true';
        if (id) {
          try {
            await updateDoc(doc(db, 'shippingZones', id), { isActive: !active });
            invalidateAdminCache();
            showToast('تم تحديث حالة منطقة الشحن', 'success');
            window.location.reload();
          } catch (err: any) {
            showToast(err.message, 'error');
          }
        }
      });
    });

    const addZoneBtn = document.getElementById('admin-add-zone-btn');
    if (addZoneBtn) {
      addZoneBtn.onclick = () => {
        openModal(`
          <div style="font-family: 'Cairo', sans-serif;" dir="rtl">
            <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 16px;">إضافة منطقة شحن جديدة</h3>
            <form id="add-zone-form" style="display: flex; flex-direction: column; gap: 14px;">
              <div class="form-group">
                <label class="form-label">اسم المنطقة بالعربية *</label>
                <input type="text" id="zone-name-ar" required class="form-input" placeholder="مثال: مطروح والوادي الجديد" />
              </div>
              <div class="form-group">
                <label class="form-label">اسم المنطقة بالإنجليزية *</label>
                <input type="text" id="zone-name-en" required class="form-input" placeholder="e.g. Matrouh & New Valley" />
              </div>
              <div class="form-group">
                <label class="form-label">تكلفة الشحن (ج.م) *</label>
                <input type="number" id="zone-cost" required class="form-input" value="100" />
              </div>
              <div class="form-group">
                <label class="form-label">مدة التوصيل المتوقعة *</label>
                <input type="text" id="zone-days" required class="form-input" value="3-5 أيام عمل" />
              </div>
              <button type="submit" class="btn btn-primary" style="padding: 12px; font-weight: 700;">حفظ المنطقة</button>
            </form>
          </div>
        `);

        const zoneForm = document.getElementById('add-zone-form');
        if (zoneForm) {
          zoneForm.onsubmit = async (e) => {
            e.preventDefault();
            const nameAr = (document.getElementById('zone-name-ar') as HTMLInputElement).value.trim();
            const nameEn = (document.getElementById('zone-name-en') as HTMLInputElement).value.trim();
            const cost = Number((document.getElementById('zone-cost') as HTMLInputElement).value) || 0;
            const days = (document.getElementById('zone-days') as HTMLInputElement).value.trim();

            const zoneId = 'zone-' + Date.now().toString().slice(-6);
            await setDoc(doc(db, 'shippingZones', zoneId), {
              id: zoneId,
              name: nameEn,
              nameAr,
              cost,
              estimatedDays: days,
              estimatedDaysAr: days,
              isActive: true
            });

            closeModal();
            invalidateAdminCache();
            showToast('تمت إضافة منطقة الشحن بنجاح!', 'success');
            window.location.reload();
          };
        }
      };
    }
  }

  // Reviews section events
  if (section === 'reviews') {
    document.querySelectorAll('.admin-toggle-review-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        const approved = (e.currentTarget as HTMLElement).getAttribute('data-approved') === 'true';
        if (id) {
          try {
            await updateDoc(doc(db, 'reviews', id), { isApproved: !approved });
            invalidateAdminCache();
            showToast('تم تحديث حالة نشر التقييم', 'success');
            window.location.reload();
          } catch (err: any) {
            showToast(err.message, 'error');
          }
        }
      });
    });

    document.querySelectorAll('.admin-del-review-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id && confirm('هل أنت متأكد من حذف هذا التقييم؟')) {
          try {
            await deleteDoc(doc(db, 'reviews', id));
            invalidateAdminCache();
            showToast('تم حذف التقييم بنجاح', 'info');
            window.location.reload();
          } catch (err: any) {
            showToast(err.message, 'error');
          }
        }
      });
    });
  }

  // MEDIA SECTION EVENTS (Free Uploads)
  if (section === 'media') {
    const bulkInput = document.getElementById('media-bulk-upload-input') as HTMLInputElement;
    const dropzone = document.getElementById('media-dropzone');

    if (dropzone && bulkInput) {
      dropzone.onclick = () => bulkInput.click();

      dropzone.ondragover = (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--color-brand-gold)';
        dropzone.style.background = 'rgba(197, 160, 89, 0.05)';
      };

      dropzone.ondragleave = () => {
        dropzone.style.borderColor = '#cbd5e1';
        dropzone.style.background = '#f8fafc';
      };

      dropzone.ondrop = async (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '#cbd5e1';
        dropzone.style.background = '#f8fafc';
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
          await handleFilesUpload(files);
        }
      };
    }

    if (bulkInput) {
      bulkInput.onchange = async () => {
        if (bulkInput.files && bulkInput.files.length > 0) {
          await handleFilesUpload(bulkInput.files);
        }
      };
    }

    async function handleFilesUpload(files: FileList) {
      showToast(`جاري رفع ${files.length} صورة من جهازك مجاناً...`, 'info');
      try {
        for (let i = 0; i < files.length; i++) {
          await uploadImageFile(files[i]);
        }
        showToast('تم رفع جميع الصور بنجاح وحفظها محلياً في السيرفر!', 'success');
        window.location.hash = 'admin/media?reload=' + Date.now();
      } catch (err: any) {
        showToast(err.message, 'error');
      }
    }

    // Copy URL button
    document.querySelectorAll('.admin-copy-url-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const url = (e.currentTarget as HTMLElement).getAttribute('data-url');
        if (url) {
          navigator.clipboard.writeText(url);
          showToast('تم نسخ الرابط المباشر للصورة!', 'success');
        }
      });
    });

    // Delete Media item
    document.querySelectorAll('.admin-del-media-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id && confirm('هل أنت متأكد من حذف هذه الصورة؟')) {
          try {
            const res = await fetch(`/api/media/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
              showToast('تم حذف الصورة بنجاح', 'info');
              window.location.hash = 'admin/media?reload=' + Date.now();
            } else {
              showToast(data.message, 'error');
            }
          } catch (err: any) {
            showToast(err.message, 'error');
          }
        }
      });
    });
  }

  // Add Product Modal with Free File Upload
  const addProdBtn = document.getElementById('admin-add-product-btn');
  if (addProdBtn) {
    addProdBtn.onclick = () => {
      openModal(`
        <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 16px;">إضافة قطعة أزياء كوتور جديدة</h3>
        <form id="new-prod-form" style="display: flex; flex-direction: column; gap: var(--space-md);">
          <div class="form-group">
            <label class="form-label">اسم القطعة (بالعربية) *</label>
            <input type="text" id="np-name-ar" required class="form-input" placeholder="مثال: فستان جورجيت الحريري الملكي" />
          </div>
          <div class="form-group">
            <label class="form-label">اسم القطعة (بالإنجليزية) *</label>
            <input type="text" id="np-name-en" required class="form-input" placeholder="e.g. Silk Georgette Evening Dress" />
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
            <div class="form-group">
              <label class="form-label">كود القطعة (SKU) *</label>
              <input type="text" id="np-sku" required class="form-input" placeholder="LET-DR-101" />
            </div>
            <div class="form-group">
              <label class="form-label">السعر الأساسي (ج.م) *</label>
              <input type="number" id="np-price" required class="form-input" placeholder="850" />
            </div>
          </div>

          <!-- Free Upload or URL -->
          <div class="form-group">
            <label class="form-label">صورة القطعة (رفع مجاني من جهازك أو رابط) *</label>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="np-img" required class="form-input" style="flex: 1;" placeholder="/uploads/... أو رابط الصورة" value="https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1000&q=85" />
              <label class="btn btn-secondary btn-sm" style="cursor: pointer; display: flex; align-items: center; gap: 4px; white-space: nowrap;">
                <span>📷 رفع من جهازك</span>
                <input type="file" id="np-file-upload" accept="image/*" style="display: none;" />
              </label>
            </div>
            <div id="np-preview-box" style="margin-top: 8px; display: none; align-items: center; gap: 10px;">
              <img id="np-preview-img" src="" style="width: 60px; height: 80px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1;" />
              <span style="font-size: 12px; color: #16a34a; font-weight: 600;">✓ تم رفع الصورة محلياً بنجاح ومجاناً</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">إجمالي المخزون المتاح للقطعة *</label>
            <input type="number" id="np-stock" required class="form-input" value="25" />
          </div>
          <button type="submit" class="btn btn-primary btn-full" style="padding: 12px; font-weight: 700;">حفظ ونشر القطعة بالمتجر</button>
        </form>
      `);

      // File upload listener for new product
      const npFileInput = document.getElementById('np-file-upload') as HTMLInputElement;
      if (npFileInput) {
        npFileInput.onchange = async () => {
          const file = npFileInput.files?.[0];
          if (!file) return;
          try {
            showToast('جاري رفع صورة القطعة من جهازك مجاناً...', 'info');
            const res = await uploadImageFile(file);
            (document.getElementById('np-img') as HTMLInputElement).value = res.url;
            const pBox = document.getElementById('np-preview-box');
            const pImg = document.getElementById('np-preview-img') as HTMLImageElement;
            if (pBox && pImg) {
              pImg.src = res.url;
              pBox.style.display = 'flex';
            }
            showToast('تم رفع الصورة بنجاح وربطها بالمنتج!', 'success');
          } catch (err: any) {
            showToast(err.message, 'error');
          }
        };
      }

      const form = document.getElementById('new-prod-form');
      if (form) {
        form.onsubmit = async (ev) => {
          ev.preventDefault();
          const name = (document.getElementById('np-name-en') as HTMLInputElement).value;
          const nameAr = (document.getElementById('np-name-ar') as HTMLInputElement).value;
          const sku = (document.getElementById('np-sku') as HTMLInputElement).value;
          const price = parseFloat((document.getElementById('np-price') as HTMLInputElement).value);
          const img = (document.getElementById('np-img') as HTMLInputElement).value;
          const stock = parseInt((document.getElementById('np-stock') as HTMLInputElement).value);

          try {
            await addDoc(collection(db, 'products'), {
              name,
              nameAr,
              slug: sku.toLowerCase(),
              sku,
              price,
              images: [img],
              totalStock: stock,
              isPublished: true,
              isFeatured: true,
              sizes: ["S", "M", "L"],
              colors: [{ name: "Noir Black", hex: "#111827" }],
              variants: [
                { sku: `${sku}-S`, color: "Noir Black", size: "S", stock: Math.floor(stock / 3) },
                { sku: `${sku}-M`, color: "Noir Black", size: "M", stock: Math.floor(stock / 3) },
                { sku: `${sku}-L`, color: "Noir Black", size: "L", stock: stock - 2 * Math.floor(stock / 3) }
              ],
              createdAt: new Date().toISOString()
            });
            closeModal();
            showToast('تمت إضافة وحفظ القطعة بنجاح في قاعدة البيانات!', 'success');
            window.location.hash = 'admin/products?reload=' + Date.now();
          } catch (err: any) {
            showToast(err.message, 'error');
          }
        };
      }
    };
  }

  // Edit Product Modal with Free File Upload
  document.querySelectorAll('.admin-edit-prod-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (!id) return;
      try {
        const snap = await getDoc(doc(db, 'products', id));
        if (!snap.exists()) return;
        const p = snap.data();

        openModal(`
          <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 16px;">تعديل القطعة • ${p.nameAr || p.name}</h3>
          <form id="edit-prod-form" style="display: flex; flex-direction: column; gap: var(--space-md);">
            <div class="form-group">
              <label class="form-label">اسم القطعة (بالعربية) *</label>
              <input type="text" id="ep-name-ar" required class="form-input" value="${p.nameAr || ''}" />
            </div>
            <div class="form-group">
              <label class="form-label">اسم القطعة (بالإنجليزية) *</label>
              <input type="text" id="ep-name-en" required class="form-input" value="${p.name || ''}" />
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
              <div class="form-group">
                <label class="form-label">السعر الأساسي (ج.م) *</label>
                <input type="number" id="ep-price" required class="form-input" value="${p.price || 0}" />
              </div>
              <div class="form-group">
                <label class="form-label">سعر التخفيض (ج.م)</label>
                <input type="number" id="ep-saleprice" class="form-input" value="${p.salePrice || 0}" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">المخزون الكلي *</label>
              <input type="number" id="ep-stock" required class="form-input" value="${p.totalStock ?? 10}" />
            </div>

            <!-- Free File Upload or URL -->
            <div class="form-group">
              <label class="form-label">صورة القطعة (رفع مجاني من جهازك أو رابط) *</label>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="ep-img" required class="form-input" style="flex: 1;" value="${(p.images && p.images[0]) || ''}" />
                <label class="btn btn-secondary btn-sm" style="cursor: pointer; display: flex; align-items: center; gap: 4px; white-space: nowrap;">
                  <span>📷 رفع صورة جديدة</span>
                  <input type="file" id="ep-file-upload" accept="image/*" style="display: none;" />
                </label>
              </div>
              <div id="ep-preview-box" style="margin-top: 8px; display: flex; align-items: center; gap: 10px;">
                <img id="ep-preview-img" src="${(p.images && p.images[0]) || ''}" style="width: 60px; height: 80px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1;" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">حالة النشر بالمتجر</label>
              <select id="ep-published" class="form-select">
                <option value="true" ${p.isPublished ? 'selected' : ''}>منشور ومتاح للشراء للعملاء</option>
                <option value="false" ${!p.isPublished ? 'selected' : ''}>مسودة مخفية</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary btn-full" style="padding: 12px; font-weight: 700;">حفظ التعديلات في فايربيز</button>
          </form>
        `);

        // Free upload listener for edit
        const epFileInput = document.getElementById('ep-file-upload') as HTMLInputElement;
        if (epFileInput) {
          epFileInput.onchange = async () => {
            const file = epFileInput.files?.[0];
            if (!file) return;
            try {
              showToast('جاري رفع الصورة الجديدة مجاناً...', 'info');
              const res = await uploadImageFile(file);
              (document.getElementById('ep-img') as HTMLInputElement).value = res.url;
              const pImg = document.getElementById('ep-preview-img') as HTMLImageElement;
              if (pImg) pImg.src = res.url;
              showToast('تم رفع الصورة الجديدة بنجاح!', 'success');
            } catch (err: any) {
              showToast(err.message, 'error');
            }
          };
        }

        const editForm = document.getElementById('edit-prod-form');
        if (editForm) {
          editForm.onsubmit = async (ev) => {
            ev.preventDefault();
            const name = (document.getElementById('ep-name-en') as HTMLInputElement).value;
            const nameAr = (document.getElementById('ep-name-ar') as HTMLInputElement).value;
            const price = parseFloat((document.getElementById('ep-price') as HTMLInputElement).value);
            const salePrice = parseFloat((document.getElementById('ep-saleprice') as HTMLInputElement).value);
            const stock = parseInt((document.getElementById('ep-stock') as HTMLInputElement).value);
            const img = (document.getElementById('ep-img') as HTMLInputElement).value;
            const isPub = (document.getElementById('ep-published') as HTMLSelectElement).value === 'true';

            try {
              await updateDoc(doc(db, 'products', id), {
                name,
                nameAr,
                price,
                salePrice,
                totalStock: stock,
                images: [img],
                isPublished: isPub,
                updatedAt: new Date().toISOString()
              });
              closeModal();
              showToast('تم تحديث القطعة وحفظها بنجاح!', 'success');
              window.location.hash = 'admin/products?reload=' + Date.now();
            } catch (err: any) {
              showToast(err.message, 'error');
            }
          };
        }
      } catch (err: any) {
        showToast(err.message, 'error');
      }
    });
  });

  // Delete product
  document.querySelectorAll('.admin-del-prod-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (id && confirm('هل أنت متأكد من حذف هذه القطعة من الكتالوج نهائياً؟')) {
        try {
          await deleteDoc(doc(db, 'products', id));
          showToast('تم حذف القطعة من الكتالوج', 'info');
          window.location.hash = 'admin/products?reload=' + Date.now();
        } catch (err: any) {
          showToast(err.message, 'error');
        }
      }
    });
  });

  // Add Category Modal with Free File Upload
  const addCatBtn = document.getElementById('admin-add-category-btn');
  if (addCatBtn) {
    addCatBtn.onclick = () => {
      openModal(`
        <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 16px;">إضافة قسم جديد للأزياء</h3>
        <form id="new-cat-form" style="display: flex; flex-direction: column; gap: var(--space-md);">
          <div class="form-group">
            <label class="form-label">اسم القسم (بالعربية) *</label>
            <input type="text" id="nc-name-ar" required class="form-input" placeholder="مثال: فساتين السهرة والأعراس" />
          </div>
          <div class="form-group">
            <label class="form-label">اسم القسم (بالإنجليزية) *</label>
            <input type="text" id="nc-name-en" required class="form-input" placeholder="e.g. Evening Gowns" />
          </div>
          <div class="form-group">
            <label class="form-label">الرابط المعرّف (Slug) *</label>
            <input type="text" id="nc-slug" required class="form-input" placeholder="evening-gowns" />
          </div>

          <!-- Free Upload or URL -->
          <div class="form-group">
            <label class="form-label">صورة القسم (رفع مجاني من جهازك أو رابط) *</label>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="nc-img" required class="form-input" style="flex: 1;" value="https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80" />
              <label class="btn btn-secondary btn-sm" style="cursor: pointer; display: flex; align-items: center; gap: 4px; white-space: nowrap;">
                <span>📷 رفع من جهازك</span>
                <input type="file" id="nc-file-upload" accept="image/*" style="display: none;" />
              </label>
            </div>
            <div id="nc-preview-box" style="margin-top: 8px; display: none; align-items: center; gap: 10px;">
              <img id="nc-preview-img" src="" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1;" />
              <span style="font-size: 12px; color: #16a34a; font-weight: 600;">✓ تم رفع صورة القسم بنجاح</span>
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-full" style="padding: 12px; font-weight: 700;">إنشاء القسم وحفظه</button>
        </form>
      `);

      const ncFileInput = document.getElementById('nc-file-upload') as HTMLInputElement;
      if (ncFileInput) {
        ncFileInput.onchange = async () => {
          const file = ncFileInput.files?.[0];
          if (!file) return;
          try {
            showToast('جاري رفع صورة القسم مجاناً...', 'info');
            const res = await uploadImageFile(file);
            (document.getElementById('nc-img') as HTMLInputElement).value = res.url;
            const pBox = document.getElementById('nc-preview-box');
            const pImg = document.getElementById('nc-preview-img') as HTMLImageElement;
            if (pBox && pImg) {
              pImg.src = res.url;
              pBox.style.display = 'flex';
            }
            showToast('تم رفع صورة القسم بنجاح!', 'success');
          } catch (err: any) {
            showToast(err.message, 'error');
          }
        };
      }

      const form = document.getElementById('new-cat-form');
      if (form) {
        form.onsubmit = async (ev) => {
          ev.preventDefault();
          const name = (document.getElementById('nc-name-en') as HTMLInputElement).value;
          const nameAr = (document.getElementById('nc-name-ar') as HTMLInputElement).value;
          const slug = (document.getElementById('nc-slug') as HTMLInputElement).value;
          const img = (document.getElementById('nc-img') as HTMLInputElement).value;

          try {
            await addDoc(collection(db, 'categories'), {
              name,
              nameAr,
              slug,
              imageUrl: img,
              sortOrder: 10,
              isActive: true,
              createdAt: new Date().toISOString()
            });
            closeModal();
            showToast('تم إنشاء القسم بنجاح!', 'success');
            window.location.hash = 'admin/categories?reload=' + Date.now();
          } catch (err: any) {
            showToast(err.message, 'error');
          }
        };
      }
    };
  }

  // Delete category
  document.querySelectorAll('.admin-del-cat-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (id && confirm('هل تريد حذف هذا القسم؟')) {
        try {
          await deleteDoc(doc(db, 'categories', id));
          showToast('تم حذف القسم', 'info');
          window.location.hash = 'admin/categories?reload=' + Date.now();
        } catch (err: any) {
          showToast(err.message, 'error');
        }
      }
    });
  });

  // Manage Order Drawer
  document.querySelectorAll('.open-order-details-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (!id) return;

      try {
        const oSnap = await getDoc(doc(db, 'orders', id));
        if (!oSnap.exists()) return;
        const ord = oSnap.data();

        openModal(`
          <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">تفاصيل الطلب • ${ord.orderNumber}</h3>
          <p style="font-size: 13px; color: #64748b; margin-bottom: 16px;">العميل: ${ord.customerName} (${ord.customerPhone})</p>

          <div style="background: #f8fafc; padding: 12px; border-radius: 4px; font-size: 13px; margin-bottom: 16px;">
            <div><strong>عنوان التوصيل:</strong> ${ord.shippingAddress?.city || ''}، ${ord.shippingAddress?.address || ''}</div>
            <div><strong>طريقة الدفع:</strong> ${ord.paymentMethod === 'cod' ? 'الدفع عند الاستلام' : (ord.paymentMethod === 'vodafone_cash' ? 'فودافون كاش' : (ord.paymentMethod?.toUpperCase() || 'إلكتروني'))} (${ord.paymentStatus})</div>
            <div><strong>الإجمالي:</strong> ${state.formatPrice(ord.total)}</div>
          </div>

          <form id="update-order-status-form" style="display: flex; flex-direction: column; gap: 12px;">
            <div class="form-group">
              <label class="form-label">تحديث حالة دورة حياة الطلب</label>
              <select id="adm-order-status" class="form-select">
                <option value="new" ${ord.status === 'new' ? 'selected' : ''}>طلب جديد (بانتظار الاعتماد)</option>
                <option value="confirmed" ${ord.status === 'confirmed' ? 'selected' : ''}>مؤكد</option>
                <option value="processing" ${ord.status === 'processing' ? 'selected' : ''}>قيد التجهيز والتفصيل بالأتليه</option>
                <option value="shipped" ${ord.status === 'shipped' ? 'selected' : ''}>تم الشحن (مع شركة الشحن الجوي)</option>
                <option value="delivered" ${ord.status === 'delivered' ? 'selected' : ''}>تم التوصيل للعميل</option>
                <option value="cancelled" ${ord.status === 'cancelled' ? 'selected' : ''}>ملغي (إعادة القطع للمخزون تلقائياً)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">رقم بوليصة الشحن والتتبع (DHL / FedEx / أرامكس)</label>
              <input type="text" id="adm-tracking-no" class="form-input" value="${ord.trackingNumber || ''}" placeholder="مثال: DHL-EXP-9928172" />
            </div>

            <div class="form-group">
              <label class="form-label">ملاحظات إدارية داخلية للأتليه</label>
              <input type="text" id="adm-order-note" class="form-input" placeholder="مثال: تم التأكيد مع العميل هاتفياً وتجهيز التغليف الفاخر" />
            </div>

            <div style="display: flex; gap: 8px;">
              <button type="submit" class="btn btn-primary" style="flex: 1; padding: 12px; font-weight: 700;">حفظ وتحديث الحالة</button>
              <button type="button" class="btn btn-secondary" onclick="window.print();">🖨 طباعة الفاتورة</button>
            </div>
          </form>
        `);

        const form = document.getElementById('update-order-status-form');
        if (form) {
          form.onsubmit = async (ev) => {
            ev.preventDefault();
            const newStatus = (document.getElementById('adm-order-status') as HTMLSelectElement).value;
            const tracking = (document.getElementById('adm-tracking-no') as HTMLInputElement).value;
            const note = (document.getElementById('adm-order-note') as HTMLInputElement).value;

            try {
              const res = await fetch('/api/orders/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderId: id,
                  newStatus,
                  trackingNumber: tracking,
                  note,
                  adminEmail: state.getUser()?.email || 'admin'
                })
              });
              const resData = await res.json();
              if (resData.success) {
                invalidateAdminCache();
                closeModal();
                showToast('تم تحديث حالة الطلب بنجاح ومزامنة المخزون!', 'success');
                window.location.hash = 'admin/orders?reload=' + Date.now();
              } else {
                showToast(resData.message, 'error');
              }
            } catch (err: any) {
              showToast(err.message, 'error');
            }
          };
        }
      } catch (err: any) {
        showToast(err.message, 'error');
      }
    });
  });

  // Settings form submission with Free Hero image upload
  const settingsForm = document.getElementById('admin-settings-form');
  if (settingsForm) {
    const heroUpload = document.getElementById('set-hero-file-upload') as HTMLInputElement;
    if (heroUpload) {
      heroUpload.onchange = async () => {
        const file = heroUpload.files?.[0];
        if (!file) return;
        try {
          showToast('جاري رفع صورة البانر من جهازك مجاناً...', 'info');
          const res = await uploadImageFile(file);
          (document.getElementById('set-hero-img') as HTMLInputElement).value = res.url;
          const pImg = document.getElementById('set-hero-preview-img') as HTMLImageElement;
          if (pImg) pImg.src = res.url;
          showToast('تم رفع صورة البانر بنجاح!', 'success');
        } catch (err: any) {
          showToast(err.message, 'error');
        }
      };
    }

    settingsForm.onsubmit = async (e) => {
      e.preventDefault();
      const brandEn = (document.getElementById('set-brand-en') as HTMLInputElement).value;
      const brandAr = (document.getElementById('set-brand-ar') as HTMLInputElement).value;
      const heroEn = (document.getElementById('set-hero-title-en') as HTMLInputElement).value;
      const heroAr = (document.getElementById('set-hero-title-ar') as HTMLInputElement).value;
      const heroImg = (document.getElementById('set-hero-img') as HTMLInputElement).value;
      const annEn = (document.getElementById('set-ann-en') as HTMLInputElement).value;
      const annAr = (document.getElementById('set-ann-ar') as HTMLInputElement).value;
      const freeShip = parseFloat((document.getElementById('set-free-ship') as HTMLInputElement).value);
      const whatsapp = (document.getElementById('set-whatsapp') as HTMLInputElement).value;
      const tax = parseFloat((document.getElementById('set-tax') as HTMLInputElement).value);

      try {
        const payload = {
          brandName: brandEn,
          brandNameAr: brandAr,
          heroTitle: heroEn,
          heroTitleAr: heroAr,
          heroImageUrl: heroImg,
          announcementBarText: annEn,
          announcementBarTextAr: annAr,
          freeShippingThreshold: freeShip,
          whatsappNumber: whatsapp,
          taxPercentage: tax,
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'settings', 'store'), payload, { merge: true });
        state.setSettings(payload);
        showToast('تم حفظ وتحديث إعدادات المتجر في فايربيز بنجاح!', 'success');
      } catch (err: any) {
        showToast(err.message, 'error');
      }
    };
  }

  // Create Coupon Modal
  const addCoupBtn = document.getElementById('admin-add-coupon-btn');
  if (addCoupBtn) {
    addCoupBtn.onclick = () => {
      openModal(`
        <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 16px;">إنشاء كوبون خصم ترويجي جديد</h3>
        <form id="new-coup-form" style="display: flex; flex-direction: column; gap: var(--space-md);">
          <div class="form-group">
            <label class="form-label">رمز الكوبون *</label>
            <input type="text" id="ncp-code" required class="form-input" placeholder="مثال: LUXE20" style="text-transform: uppercase;" />
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
            <div class="form-group">
              <label class="form-label">نوع الخصم *</label>
              <select id="ncp-type" class="form-select">
                <option value="percentage">نسبة مئوية (%)</option>
                <option value="fixed">مبلغ مالي ثابت (ج.م)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">قيمة الخصم *</label>
              <input type="number" id="ncp-val" required class="form-input" placeholder="100" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">الحد الأدنى لقيمة الطلب لتطبيق الكوبون (ج.م)</label>
            <input type="number" id="ncp-min" class="form-input" value="600" />
          </div>
          <button type="submit" class="btn btn-primary btn-full" style="padding: 12px; font-weight: 700;">حفظ وتفعيل الكوبون</button>
        </form>
      `);

      const form = document.getElementById('new-coup-form');
      if (form) {
        form.onsubmit = async (ev) => {
          ev.preventDefault();
          const code = (document.getElementById('ncp-code') as HTMLInputElement).value.trim().toUpperCase();
          const discountType = (document.getElementById('ncp-type') as HTMLSelectElement).value;
          const discountValue = parseFloat((document.getElementById('ncp-val') as HTMLInputElement).value);
          const minOrderValue = parseFloat((document.getElementById('ncp-min') as HTMLInputElement).value) || 0;

          try {
            await addDoc(collection(db, 'coupons'), {
              code,
              discountType,
              discountValue,
              minOrderValue,
              isActive: true,
              usageCount: 0,
              createdAt: new Date().toISOString()
            });
            closeModal();
            showToast('تم إنشاء الكوبون بنجاح!', 'success');
            window.location.hash = 'admin/coupons?reload=' + Date.now();
          } catch (err: any) {
            showToast(err.message, 'error');
          }
        };
      }
    };
  }

  // Toggle coupon
  document.querySelectorAll('.admin-toggle-coupon-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      const isActive = (e.currentTarget as HTMLElement).getAttribute('data-active') === 'true';
      if (!id) return;
      try {
        await updateDoc(doc(db, 'coupons', id), { isActive: !isActive });
        showToast(isActive ? 'تم تعطيل الكوبون' : 'تم تفعيل الكوبون', 'info');
        window.location.hash = 'admin/coupons?reload=' + Date.now();
      } catch (err: any) {
        showToast(err.message, 'error');
      }
    });
  });

  // Process Return Modal
  document.querySelectorAll('.admin-process-return-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (!id) return;
      try {
        const snap = await getDoc(doc(db, 'returns', id));
        if (!snap.exists()) return;
        const ret = snap.data();

        openModal(`
          <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">معالجة طلب الإرجاع • طلب ${ret.orderNumber}</h3>
          <p style="font-size: 13px; color: #64748b; margin-bottom: 16px;">السبب: ${ret.reason} (${ret.type === 'exchange' ? 'استبدال' : 'استرجاع'})</p>

          <form id="proc-ret-form" style="display: flex; flex-direction: column; gap: var(--space-md);">
            <div class="form-group">
              <label class="form-label">قرار الفحص وحالة المرتجع</label>
              <select id="pr-status" class="form-select">
                <option value="approved">معتمد (بانتظار شحن القطعة من العميل)</option>
                <option value="received">تم استلام القطعة في الأتليه وفحصها</option>
                <option value="refunded">تم رد المبلغ / إرسال المقاس البديل</option>
                <option value="rejected">مرفوض (تلف القطعة أو إزالة التاج)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">ملاحظات الأتليه الداخلية</label>
              <input type="text" id="pr-notes" class="form-input" placeholder="مثال: القطعة بحالة ممتازة وبها كافة بطاقات العلامة" />
            </div>
            <button type="submit" class="btn btn-primary btn-full" style="padding: 12px; font-weight: 700;">تحديث حالة طلب الإرجاع</button>
          </form>
        `);

        const form = document.getElementById('proc-ret-form');
        if (form) {
          form.onsubmit = async (ev) => {
            ev.preventDefault();
            const status = (document.getElementById('pr-status') as HTMLSelectElement).value;
            const notes = (document.getElementById('pr-notes') as HTMLInputElement).value;

            try {
              await updateDoc(doc(db, 'returns', id), {
                status,
                adminNotes: notes,
                updatedAt: new Date().toISOString()
              });
              closeModal();
              showToast('تم تحديث حالة طلب الإرجاع!', 'success');
              window.location.hash = 'admin/returns?reload=' + Date.now();
            } catch (err: any) {
              showToast(err.message, 'error');
            }
          };
        }
      } catch (err: any) {
        showToast(err.message, 'error');
      }
    });
  });

  // Manual Stock Adjustment Modal
  const adjustStockBtn = document.getElementById('admin-adjust-stock-btn');
  if (adjustStockBtn) {
    adjustStockBtn.onclick = () => {
      openModal(`
        <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 16px;">تعديل المخزون يدوياً</h3>
        <form id="stock-adj-form" style="display: flex; flex-direction: column; gap: var(--space-md);">
          <div class="form-group">
            <label class="form-label">اختر القطعة وكود SKU *</label>
            <select id="adj-sku-select" class="form-select">
              <option value="LET-TC-001-CAM-S">معطف ترنش الأتليه (رملي • S)</option>
              <option value="LET-TC-001-CAM-M">معطف ترنش الأتليه (رملي • M)</option>
              <option value="LET-DR-002-CHP-S">فستان الحرير الملكي (شمبانيا • S)</option>
              <option value="LET-DR-002-CHP-M">فستان الحرير الملكي (شمبانيا • M)</option>
              <option value="LET-BZ-003-IVR-M">بليزر الصوف المنحوت (عاجي • M)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">تغيير الكمية (مثال: +10 أو -2) *</label>
            <input type="number" id="adj-delta" required class="form-input" placeholder="مثال: 5" />
          </div>
          <div class="form-group">
            <label class="form-label">سبب التعديل المخزني *</label>
            <input type="text" id="adj-reason" required class="form-input" placeholder="مثال: توريد دفعة جديدة من ورشة الخياطة" />
          </div>
          <button type="submit" class="btn btn-primary btn-full" style="padding: 12px; font-weight: 700;">تسجيل الحركة وتحديث المخزون</button>
        </form>
      `);

      const form = document.getElementById('stock-adj-form');
      if (form) {
        form.onsubmit = async (ev) => {
          ev.preventDefault();
          const sku = (document.getElementById('adj-sku-select') as HTMLSelectElement).value;
          const delta = parseInt((document.getElementById('adj-delta') as HTMLInputElement).value);
          const reason = (document.getElementById('adj-reason') as HTMLInputElement).value;

          try {
            await addDoc(collection(db, 'inventoryMovements'), {
              sku,
              quantityDelta: delta,
              type: 'manual_adjustment',
              reason,
              performedBy: state.getUser()?.email || 'admin',
              createdAt: new Date().toISOString()
            });
            closeModal();
            showToast(`تم تسجيل حركة المخزون (${delta > 0 ? '+' : ''}${delta}) في فايربيز!`, 'success');
            window.location.hash = 'admin/inventory?reload=' + Date.now();
          } catch (err: any) {
            showToast(err.message, 'error');
          }
        };
      }
    };
  }
}
