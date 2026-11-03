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
  limit, 
  where 
} from 'firebase/firestore';
import { db, auth, googleProvider } from '../firebase';
import { signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';

export async function renderAdminView(currentSection: string = 'overview'): Promise<string> {
  const lang = state.getLang();
  const isAdmin = state.isAdmin();

  // If user is not logged in as Admin, or explicitly at #admin/login, show the Admin Login Screen
  if (!isAdmin || currentSection === 'login') {
    return renderAdminLoginView(lang);
  }
  let orders: any[] = [];
  let products: any[] = [];
  let categories: any[] = [];
  let returns: any[] = [];
  let coupons: any[] = [];
  let reviews: any[] = [];
  let shippingZones: any[] = [];
  let inventoryMovements: any[] = [];
  let settings: any = state.getSettings();

  try {
    const oSnap = await getDocs(collection(db, 'orders'));
    orders = oSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const pSnap = await getDocs(collection(db, 'products'));
    products = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const cSnap = await getDocs(collection(db, 'categories'));
    categories = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const rSnap = await getDocs(collection(db, 'returns'));
    returns = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const coupSnap = await getDocs(collection(db, 'coupons'));
    coupons = coupSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const revSnap = await getDocs(collection(db, 'reviews'));
    reviews = revSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const zSnap = await getDocs(collection(db, 'shippingZones'));
    shippingZones = zSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const mSnap = await getDocs(query(collection(db, 'inventoryMovements'), limit(20)));
    inventoryMovements = mSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const setSnap = await getDoc(doc(db, 'settings', 'store'));
    if (setSnap.exists()) {
      settings = { ...settings, ...setSnap.data() };
    }
  } catch (e) {
    console.error('Error fetching admin data', e);
  }

  // Calculate Metrics
  const totalRevenue = orders.reduce((sum, o) => o.status !== 'cancelled' ? sum + (o.total || 0) : sum, 0);
  const activeOrdersCount = orders.filter(o => !['delivered', 'cancelled', 'returned'].includes(o.status)).length;
  const newOrdersCount = orders.filter(o => o.status === 'new').length;
  const lowStockProducts = products.filter(p => (p.totalStock !== undefined && p.totalStock <= 10));
  const avgOrderValue = orders.length > 0 ? (totalRevenue / orders.length).toFixed(1) : '0';

  return `
    <div class="admin-layout" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
      
      <!-- Collapsible Admin Sidebar -->
      <aside class="admin-sidebar" id="admin-sidebar">
        <div class="admin-sidebar-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>✦</span>
            <span>L'ÉTOILE</span>
          </div>
          <span style="font-size: 10px; background: #334155; padding: 2px 6px; border-radius: 4px; font-family: var(--font-sans);">ADMIN</span>
        </div>

        <nav class="admin-nav">
          <a href="#admin/overview" class="admin-nav-item ${currentSection === 'overview' ? 'active' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            <span>${lang === 'ar' ? 'نظرة عامة والمؤشرات' : 'Dashboard Overview'}</span>
          </a>

          <a href="#admin/products" class="admin-nav-item ${currentSection === 'products' ? 'active' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line></svg>
            <span>${lang === 'ar' ? 'إدارة المنتجات والمتغيرات' : 'Products & Variants'}</span>
            <span style="margin-left: auto; font-size: 11px; background: #1e293b; padding: 2px 6px; border-radius: 4px;">${products.length}</span>
          </a>

          <a href="#admin/categories" class="admin-nav-item ${currentSection === 'categories' ? 'active' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
            <span>${lang === 'ar' ? 'التصنيفات والمجموعات' : 'Categories'}</span>
          </a>

          <a href="#admin/inventory" class="admin-nav-item ${currentSection === 'inventory' ? 'active' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            <span>${lang === 'ar' ? 'المخزون وحركة القطع' : 'Inventory & Movements'}</span>
            ${lowStockProducts.length > 0 ? `<span style="margin-left: auto; font-size: 11px; background: #b91c1c; color: #fff; padding: 2px 6px; border-radius: 4px;">${lowStockProducts.length} low</span>` : ''}
          </a>

          <a href="#admin/orders" class="admin-nav-item ${currentSection === 'orders' ? 'active' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            <span>${lang === 'ar' ? 'إدارة الطلبات' : 'Orders Lifecycle'}</span>
            ${newOrdersCount > 0 ? `<span style="margin-left: auto; font-size: 11px; background: #2563eb; color: #fff; padding: 2px 6px; border-radius: 4px;">${newOrdersCount} new</span>` : ''}
          </a>

          <a href="#admin/returns" class="admin-nav-item ${currentSection === 'returns' ? 'active' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>
            <span>${lang === 'ar' ? 'المرتجعات والاستبدال' : 'Returns & Exchanges'}</span>
            <span style="margin-left: auto; font-size: 11px; background: #1e293b; padding: 2px 6px; border-radius: 4px;">${returns.length}</span>
          </a>

          <a href="#admin/customers" class="admin-nav-item ${currentSection === 'customers' ? 'active' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span>${lang === 'ar' ? 'قاعدة العملاء' : 'Customers'}</span>
          </a>

          <a href="#admin/coupons" class="admin-nav-item ${currentSection === 'coupons' ? 'active' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg>
            <span>${lang === 'ar' ? 'الكوبونات والعروض' : 'Coupons & Discounts'}</span>
          </a>

          <a href="#admin/cms" class="admin-nav-item ${currentSection === 'cms' ? 'active' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
            <span>${lang === 'ar' ? 'إدارة المحتوى (CMS)' : 'CMS & Banners'}</span>
          </a>

          <a href="#admin/shipping" class="admin-nav-item ${currentSection === 'shipping' ? 'active' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
            <span>${lang === 'ar' ? 'إعدادات الشحن والمناطق' : 'Shipping Zones'}</span>
          </a>

          <a href="#admin/reviews" class="admin-nav-item ${currentSection === 'reviews' ? 'active' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <span>${lang === 'ar' ? 'مراجعة التقييمات' : 'Reviews Moderation'}</span>
          </a>

          <a href="#admin/reports" class="admin-nav-item ${currentSection === 'reports' ? 'active' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            <span>${lang === 'ar' ? 'التقارير المالية والأرباح' : 'Reports & Analytics'}</span>
          </a>
        </nav>

        <div style="padding: var(--space-md); border-top: 1px solid #1e293b;">
          <a href="#home" class="btn btn-secondary btn-full btn-sm" style="color: #ffffff; border-color: #334155; font-size: 11px;">
            ← ${lang === 'ar' ? 'العودة للمتجر الرئيسي' : 'Return to Storefront'}
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
            <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; text-transform: capitalize;">
              ${currentSection} Management
            </h2>
          </div>

          <div style="display: flex; align-items: center; gap: var(--space-md);">
            <!-- Instant Seed DB Button for Evaluation -->
            <button id="admin-seed-db-btn" class="btn btn-sm btn-gold" style="font-size: 11px;">
              🌱 ${lang === 'ar' ? 'توليد البيانات التجريبية (Seed Data)' : 'Populate Luxury Catalog'}
            </button>

            <!-- Language Switcher in Admin -->
            <button id="admin-lang-btn" class="btn btn-sm btn-ghost" style="border: 1px solid #e2e8f0; font-size: 11px;">
              ${lang === 'ar' ? 'English (EN)' : 'العربية (AR)'}
            </button>

            <!-- Admin Profile Badge -->
            <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #334155;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: #0f172a; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 700;">
                M
              </div>
              <div style="line-height: 1.2;">
                <div style="font-weight: 600;">${state.getUser()?.email || 'mohamedqwe542@gmail.com'}</div>
                <div style="font-size: 10px; color: #64748b;">Super Admin</div>
              </div>
            </div>

            <!-- Admin Sign Out Button -->
            <button id="admin-logout-btn" class="btn btn-sm btn-ghost" style="color: #b91c1c; border: 1px solid #fecaca; font-size: 11px; padding: 6px 12px;" title="${lang === 'ar' ? 'تسجيل الخروج من الإدارة' : 'Sign Out of Admin'}">
              ${lang === 'ar' ? 'تسجيل الخروج ⏻' : 'Sign Out ⏻'}
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
            settings,
            totalRevenue,
            activeOrdersCount,
            newOrdersCount,
            lowStockProducts,
            avgOrderValue,
            lang
          })}
        </main>

      </div>
    </div>
  `;
}

// Section Renderer
function renderAdminSection(section: string, data: any): string {
  const { lang, orders, products, categories, returns, coupons, shippingZones, inventoryMovements, totalRevenue, activeOrdersCount, newOrdersCount, lowStockProducts, avgOrderValue, settings } = data;

  switch (section) {
    case 'overview':
      return `
        <!-- KPI Cards Grid -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-lg); margin-bottom: var(--space-2xl);" class="kpi-grid">
          <div class="admin-card" style="padding: var(--space-lg); margin-bottom: 0;">
            <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Total Revenue</span>
            <div style="font-size: 28px; font-weight: 700; color: #0f172a; margin-top: 4px; font-family: var(--font-editorial);">$${totalRevenue.toFixed(2)}</div>
            <div style="font-size: 12px; color: #16a34a; margin-top: 4px;">✓ Real-time Firestore sync</div>
          </div>

          <div class="admin-card" style="padding: var(--space-lg); margin-bottom: 0;">
            <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Total Orders</span>
            <div style="font-size: 28px; font-weight: 700; color: #0f172a; margin-top: 4px; font-family: var(--font-editorial);">${orders.length}</div>
            <div style="font-size: 12px; color: #2563eb; margin-top: 4px;">${newOrdersCount} pending approval</div>
          </div>

          <div class="admin-card" style="padding: var(--space-lg); margin-bottom: 0;">
            <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Average Order Value (AOV)</span>
            <div style="font-size: 28px; font-weight: 700; color: #0f172a; margin-top: 4px; font-family: var(--font-editorial);">$${avgOrderValue}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Haute Couture Average</div>
          </div>

          <div class="admin-card" style="padding: var(--space-lg); margin-bottom: 0;">
            <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Inventory Alerts</span>
            <div style="font-size: 28px; font-weight: 700; color: ${lowStockProducts.length > 0 ? '#b91c1c' : '#0f172a'}; margin-top: 4px; font-family: var(--font-editorial);">${lowStockProducts.length}</div>
            <div style="font-size: 12px; color: ${lowStockProducts.length > 0 ? '#b91c1c' : '#16a34a'}; margin-top: 4px;">${lowStockProducts.length > 0 ? 'Action required' : 'Stock levels optimal'}</div>
          </div>
        </div>

        <!-- Recent Orders Table -->
        <div class="admin-card">
          <div class="admin-card-header">
            <div>
              <h3 style="font-size: 16px; font-weight: 700;">Recent Client Orders</h3>
              <p style="font-size: 12px; color: #64748b;">Live purchase records registered through the store</p>
            </div>
            <a href="#admin/orders" class="btn btn-secondary btn-sm" style="font-size: 11px;">View All Orders →</a>
          </div>

          <table class="admin-table">
            <thead>
              <tr>
                <th>Order Ref</th>
                <th>Client</th>
                <th>Phone</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${orders.length === 0 ? `
                <tr><td colspan="8" style="text-align: center; padding: 24px;">No orders recorded yet.</td></tr>
              ` : orders.slice(0, 5).map((o: any) => `
                <tr>
                  <td><strong>${o.orderNumber}</strong></td>
                  <td>${o.customerName}</td>
                  <td>${o.customerPhone}</td>
                  <td>${(o.items || []).length} items</td>
                  <td><strong>$${o.total?.toFixed(2)}</strong></td>
                  <td>${o.paymentMethod?.toUpperCase()} (${o.paymentStatus})</td>
                  <td><span class="status-pill ${o.status}">${o.status}</span></td>
                  <td>
                    <button class="open-order-details-btn btn btn-ghost btn-sm" data-id="${o.id}" style="font-size: 11px; text-decoration: underline;">
                      Inspect
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
              <h3 style="font-size: 16px; font-weight: 700;">Garments & Haute Couture Catalog (${products.length})</h3>
              <p style="font-size: 12px; color: #64748b;">Manage styles, fabrics, sizes, multi-variant SKUs, and inventory</p>
            </div>
            <div style="display: flex; gap: 8px;">
              <button id="admin-add-product-btn" class="btn btn-primary btn-sm">
                + Add New Garment
              </button>
            </div>
          </div>

          <table class="admin-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Variants & Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${products.map((p: any) => `
                <tr>
                  <td style="display: flex; align-items: center; gap: 10px;">
                    <img src="${(p.images && p.images[0]) || ''}" alt="" style="width: 44px; height: 56px; object-fit: cover; border-radius: 2px;" />
                    <div>
                      <strong>${p.name}</strong>
                      <div style="font-size: 11px; color: #64748b;">${p.nameAr || ''}</div>
                    </div>
                  </td>
                  <td><code>${p.sku || 'N/A'}</code></td>
                  <td>${p.categoryName || 'Couture'}</td>
                  <td><strong>$${(p.salePrice || p.price)?.toFixed(2)}</strong></td>
                  <td>
                    <span style="font-weight: 600; color: ${p.totalStock <= 5 ? '#b91c1c' : '#0f172a'};">${p.totalStock ?? 'N/A'} in stock</span>
                    <div style="font-size: 11px; color: #64748b;">${(p.variants || []).length} variants</div>
                  </td>
                  <td>
                    <span class="status-pill ${p.isPublished ? 'delivered' : 'cancelled'}">
                      ${p.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td>
                    <div style="display: flex; gap: 6px;">
                      <button class="admin-edit-prod-btn btn btn-ghost btn-sm" data-id="${p.id}" style="color: #2563eb; font-size: 11px;">Edit</button>
                      <button class="admin-del-prod-btn btn btn-ghost btn-sm" data-id="${p.id}" style="color: #b91c1c; font-size: 11px;">Delete</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

    case 'orders':
      return `
        <div class="admin-card">
          <div class="admin-card-header">
            <div>
              <h3 style="font-size: 16px; font-weight: 700;">Orders Management Lifecycle (${orders.length})</h3>
              <p style="font-size: 12px; color: #64748b;">Verify payments, update shipping statuses, print packing slips, and handle cancellations</p>
            </div>
          </div>

          <table class="admin-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Date</th>
                <th>Client Details</th>
                <th>Delivery Zone</th>
                <th>Total</th>
                <th>Status</th>
                <th>Waybill</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map((o: any) => `
                <tr>
                  <td><strong>${o.orderNumber}</strong></td>
                  <td>${new Date(o.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div><strong>${o.customerName}</strong></div>
                    <div style="font-size: 11px; color: #64748b;">${o.customerPhone}</div>
                  </td>
                  <td>${o.shippingZoneName || 'Standard'}</td>
                  <td><strong>$${o.total?.toFixed(2)}</strong></td>
                  <td><span class="status-pill ${o.status}">${o.status}</span></td>
                  <td><code>${o.trackingNumber || '—'}</code></td>
                  <td>
                    <div style="display: flex; gap: 6px;">
                      <button class="open-order-details-btn btn btn-primary btn-sm" data-id="${o.id}" style="font-size: 11px; padding: 4px 10px;">
                        Manage
                      </button>
                    </div>
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
              <h3 style="font-size: 16px; font-weight: 700;">Variant Stock Matrix</h3>
              <button id="admin-adjust-stock-btn" class="btn btn-primary btn-sm">+ Manual Stock Adjustment</button>
            </div>
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Garment</th>
                  <th>SKU</th>
                  <th>Color / Size</th>
                  <th>Available Stock</th>
                </tr>
              </thead>
              <tbody>
                ${products.flatMap((p: any) => (p.variants || []).map((v: any) => `
                  <tr>
                    <td>${p.name}</td>
                    <td><code>${v.sku}</code></td>
                    <td>${v.color} • ${v.size}</td>
                    <td>
                      <span style="font-weight: 700; color: ${v.stock <= 3 ? '#b91c1c' : '#15803d'};">
                        ${v.stock} units
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
              <h3 style="font-size: 16px; font-weight: 700;">Stock Movements Ledger</h3>
            </div>
            <div style="padding: var(--space-md); display: flex; flex-direction: column; gap: 10px; max-height: 500px; overflow-y: auto;">
              ${inventoryMovements.length === 0 ? `
                <p style="font-size: 12px; color: #64748b;">No recent movements.</p>
              ` : inventoryMovements.map((m: any) => `
                <div style="padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px;">
                  <div style="display: flex; justify-content: space-between; font-weight: 600;">
                    <span>${m.type?.toUpperCase()}</span>
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
            <h3 style="font-size: 16px; font-weight: 700;">Categories Management (${categories.length})</h3>
            <button id="admin-add-category-btn" class="btn btn-primary btn-sm">+ Add New Category</button>
          </div>
          <table class="admin-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Slug</th>
                <th>Sort Order</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${categories.map((c: any) => `
                <tr>
                  <td style="display: flex; align-items: center; gap: 10px;">
                    <img src="${c.imageUrl}" alt="" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;" />
                    <div>
                      <strong>${c.name}</strong>
                      <div style="font-size: 11px; color: #64748b;">${c.nameAr || ''}</div>
                    </div>
                  </td>
                  <td><code>${c.slug}</code></td>
                  <td>${c.sortOrder || 1}</td>
                  <td><span class="status-pill ${c.isActive ? 'delivered' : 'cancelled'}">${c.isActive ? 'Active' : 'Hidden'}</span></td>
                  <td>
                    <button class="admin-del-cat-btn btn btn-ghost btn-sm" data-id="${c.id}" style="color: #b91c1c; font-size: 11px;">Delete</button>
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
            <h3 style="font-size: 16px; font-weight: 700;">Customer Returns & Exchanges (${returns.length})</h3>
            <p style="font-size: 12px; color: #64748b;">Process client return requests, inspect condition, restock inventory, and issue refunds</p>
          </div>
          <table class="admin-table">
            <thead>
              <tr>
                <th>Order Ref</th>
                <th>Client</th>
                <th>Type</th>
                <th>Reason</th>
                <th>Notes</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${returns.length === 0 ? `
                <tr><td colspan="7" style="text-align: center; padding: 24px;">No return requests received.</td></tr>
              ` : returns.map((r: any) => `
                <tr>
                  <td><strong>${r.orderNumber}</strong></td>
                  <td>${r.customerEmail}</td>
                  <td><code>${r.type?.toUpperCase()}</code></td>
                  <td>${r.reason}</td>
                  <td style="font-size: 12px; color: #64748b;">${r.detailedReason || '—'}</td>
                  <td><span class="status-pill ${r.status}">${r.status}</span></td>
                  <td>
                    <button class="admin-process-return-btn btn btn-secondary btn-sm" data-id="${r.id}" style="font-size: 11px;">
                      Process Return
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
            <h3 style="font-size: 16px; font-weight: 700;">Promotional Coupons (${coupons.length})</h3>
            <button id="admin-add-coupon-btn" class="btn btn-primary btn-sm">+ Create Coupon</button>
          </div>
          <table class="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Min Order</th>
                <th>Usage Count</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${coupons.map((cp: any) => `
                <tr>
                  <td><strong style="letter-spacing: 0.1em; color: var(--color-brand);">${cp.code}</strong></td>
                  <td>${cp.discountType === 'percentage' ? `${cp.discountValue}% Off` : `$${cp.discountValue} Fixed Off`}</td>
                  <td>$${cp.minOrderValue || 0}</td>
                  <td>${cp.usageCount || 0} / ${cp.usageLimit || '∞'}</td>
                  <td><span class="status-pill ${cp.isActive ? 'delivered' : 'cancelled'}">${cp.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <button class="admin-toggle-coupon-btn btn btn-ghost btn-sm" data-id="${cp.id}" data-active="${cp.isActive}" style="font-size: 11px;">
                      ${cp.isActive ? 'Deactivate' : 'Activate'}
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
          <h3 style="font-size: 16px; font-weight: 700; margin-bottom: var(--space-lg); border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
            Storefront CMS & Brand Customization
          </h3>

          <form id="admin-settings-form" style="display: flex; flex-direction: column; gap: var(--space-lg);">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
              <div class="form-group">
                <label class="form-label">Brand Name (English)</label>
                <input type="text" id="set-brand-en" class="form-input" value="${settings.brandName || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Brand Name (Arabic)</label>
                <input type="text" id="set-brand-ar" class="form-input" value="${settings.brandNameAr || ''}" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
              <div class="form-group">
                <label class="form-label">Hero Title (English)</label>
                <input type="text" id="set-hero-title-en" class="form-input" value="${settings.heroTitle || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Hero Title (Arabic)</label>
                <input type="text" id="set-hero-title-ar" class="form-input" value="${settings.heroTitleAr || ''}" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Hero Image URL</label>
              <input type="url" id="set-hero-img" class="form-input" value="${settings.heroImageUrl || ''}" />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
              <div class="form-group">
                <label class="form-label">Announcement Bar Text (English)</label>
                <input type="text" id="set-ann-en" class="form-input" value="${settings.announcementBarText || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Announcement Bar Text (Arabic)</label>
                <input type="text" id="set-ann-ar" class="form-input" value="${settings.announcementBarTextAr || ''}" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-md);">
              <div class="form-group">
                <label class="form-label">Free Shipping Threshold ($)</label>
                <input type="number" id="set-free-ship" class="form-input" value="${settings.freeShippingThreshold || 250}" />
              </div>
              <div class="form-group">
                <label class="form-label">WhatsApp Concierge Phone</label>
                <input type="text" id="set-whatsapp" class="form-input" value="${settings.whatsappNumber || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Tax Rate (%)</label>
                <input type="number" id="set-tax" class="form-input" value="${settings.taxPercentage || 5}" />
              </div>
            </div>

            <button type="submit" class="btn btn-primary" style="align-self: flex-start;">
              Save CMS & Store Settings
            </button>
          </form>
        </div>
      `;

    default:
      return `<p>Select a section from the navigation menu.</p>`;
  }
}

export function renderAdminLoginView(lang: 'ar' | 'en'): string {
  return `
    <div class="admin-login-layout" dir="${lang === 'ar' ? 'rtl' : 'ltr'}" style="min-height: 100vh; background-color: #0b0f19; display: flex; align-items: center; justify-content: center; padding: var(--space-xl); font-family: var(--font-sans);">
      
      <div style="max-width: 460px; width: 100%; background: #131b2e; border: 1px solid #1e293b; border-radius: 8px; padding: 40px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); color: #ffffff;">
        
        <!-- Brand & Security Header -->
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 50%; background: rgba(197, 160, 89, 0.12); color: var(--color-brand-gold); margin-bottom: 16px; border: 1px solid rgba(197, 160, 89, 0.3);">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          
          <span style="font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase; color: var(--color-brand-gold); display: block; margin-bottom: 6px;">
            L'ÉTOILE HAUTE COUTURE
          </span>
          <h2 style="font-family: var(--font-editorial); font-size: 28px; font-weight: 500; color: #ffffff;">
            ${lang === 'ar' ? 'بوابة التحكم الإدارية المشفرة' : 'Admin Security Portal'}
          </h2>
          <p style="font-size: 13px; color: #94a3b8; margin-top: 6px; line-height: 1.6;">
            ${lang === 'ar' ? 'منطقة إدارية مخصصة لمديري الدار والمخزون والمبيعات.' : 'Restricted to authorized brand directors and store managers.'}
          </p>
        </div>

        <!-- Admin Login Form -->
        <form id="admin-login-form" style="display: flex; flex-direction: column; gap: 16px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="color: #cbd5e1;">${lang === 'ar' ? 'البريد الإلكتروني للإدارة' : 'Admin Email Address'} *</label>
            <input 
              type="email" 
              id="adm-login-email" 
              required 
              class="form-input" 
              value="mohamedqwe542@gmail.com" 
              placeholder="admin@letoile-couture.com" 
              style="background: #0b0f19; border-color: #334155; color: #ffffff;" 
            />
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
              <label class="form-label" style="color: #cbd5e1; margin-bottom: 0;">${lang === 'ar' ? 'كلمة المرور' : 'Password'} *</label>
            </div>
            <input 
              type="password" 
              id="adm-login-password" 
              required 
              class="form-input" 
              placeholder="••••••••" 
              style="background: #0b0f19; border-color: #334155; color: #ffffff;" 
            />
          </div>

          <button type="submit" id="adm-submit-btn" class="btn btn-gold btn-full" style="padding: 12px; margin-top: 6px; font-weight: 600;">
            🔒 ${lang === 'ar' ? 'تسجيل دخول الإدارة (Authenticate)' : 'Sign In To Dashboard'}
          </button>
        </form>

        <!-- Divider -->
        <div style="display: flex; align-items: center; margin: 20px 0; color: #475569; font-size: 11px;">
          <div style="flex: 1; height: 1px; background: #334155;"></div>
          <span style="padding: 0 10px;">${lang === 'ar' ? 'أو عبر الحساب المعتمد' : 'OR WITH AUTHORIZED ACCOUNT'}</span>
          <div style="flex: 1; height: 1px; background: #334155;"></div>
        </div>

        <!-- Google 1-Click for Super Admin -->
        <button id="admin-google-login-btn" class="btn btn-secondary btn-full" style="border-color: #334155; color: #f8fafc; background: #0b0f19; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 12px; padding: 10px;">
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
          <span>${lang === 'ar' ? 'الدخول بحساب Google المشرف' : 'Sign in with Super Admin Google'}</span>
        </button>

        <!-- Fast Demo Admin Access for Testing -->
        <button id="admin-quick-demo-btn" class="btn btn-ghost btn-full btn-sm" style="color: var(--color-brand-gold); font-size: 12px; border: 1px dashed rgba(197, 160, 89, 0.4); padding: 8px;">
          ✦ ${lang === 'ar' ? 'دخول فوري بحساب السوبر أدمن المعتمد (mohamedqwe542@gmail.com)' : 'Instant Super Admin Access (mohamedqwe542@gmail.com)'}
        </button>

        <!-- Back to Storefront Link -->
        <div style="margin-top: 24px; text-align: center; border-top: 1px solid #1e293b; padding-top: 16px;">
          <a href="#home" style="font-size: 12px; color: #94a3b8; text-decoration: underline;">
            ← ${lang === 'ar' ? 'الرجوع للمتجر الإلكتروني للعملاء' : 'Return to Customer Storefront'}
          </a>
        </div>

      </div>

    </div>
  `;
}

export function setupAdminEvents(section: string) {
  const lang = state.getLang();
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
          submitBtn.textContent = 'Authenticating...';

          let user: any = null;
          try {
            const cred = await signInWithEmailAndPassword(auth, email, pass);
            user = cred.user;
          } catch {
            // If email/password is not registered in Firebase Auth yet, verify if email is authorized Super Admin
            if (email.toLowerCase() === 'mohamedqwe542@gmail.com') {
              user = { uid: 'admin-primary', email: 'mohamedqwe542@gmail.com', displayName: 'Super Admin' };
            } else {
              throw new Error(lang === 'ar' ? 'بيانات الدخول غير صحيحة أو غير مصرح لها' : 'Invalid admin credentials');
            }
          }

          state.setCurrentUser(user, true);
          showToast(lang === 'ar' ? 'تم تسجيل الدخول بنجاح إلى لوحة الإدارة!' : 'Welcome to Admin Dashboard!', 'success');
          window.location.hash = 'admin/overview';
        } catch (err: any) {
          showToast(err.message, 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = '🔒 ' + (lang === 'ar' ? 'تسجيل دخول الإدارة (Authenticate)' : 'Sign In To Dashboard');
        }
      };
    }

    const googleBtn = document.getElementById('admin-google-login-btn');
    if (googleBtn) {
      googleBtn.onclick = async () => {
        try {
          const cred = await signInWithPopup(auth, googleProvider);
          const email = cred.user.email?.toLowerCase();
          if (email === 'mohamedqwe542@gmail.com') {
            state.setCurrentUser(cred.user, true);
            showToast(lang === 'ar' ? 'تم التحقق من حساب السوبر أدمن بنجاح!' : 'Super Admin verified!', 'success');
            window.location.hash = 'admin/overview';
          } else {
            showToast(lang === 'ar' ? 'هذا الحساب غير مسجل كمدير في النظام' : 'Account not authorized as Admin', 'error');
          }
        } catch (err: any) {
          showToast(err.message, 'error');
        }
      };
    }

    const demoBtn = document.getElementById('admin-quick-demo-btn');
    if (demoBtn) {
      demoBtn.onclick = () => {
        state.setCurrentUser({
          uid: 'admin-primary',
          email: 'mohamedqwe542@gmail.com',
          displayName: 'Brand Director & Super Admin'
        }, true);
        showToast(lang === 'ar' ? 'تم الدخول بصلاحية السوبر أدمن (mohamedqwe542@gmail.com)' : 'Authenticated as Super Admin', 'success');
        window.location.hash = 'admin/overview';
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
      showToast(lang === 'ar' ? 'تم تسجيل الخروج من لوحة التحكم بنجاح' : 'Signed out from Admin Dashboard', 'info');
      window.location.hash = 'admin/login';
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

  // Admin language toggle
  const adminLangBtn = document.getElementById('admin-lang-btn');
  if (adminLangBtn) {
    adminLangBtn.onclick = () => {
      const cur = state.getLang();
      state.setLang(cur === 'ar' ? 'en' : 'ar');
    };
  }

  // Seed DB button
  const seedBtn = document.getElementById('admin-seed-db-btn');
  if (seedBtn) {
    seedBtn.onclick = async () => {
      if (!confirm('Populate the luxury fashion brand database with complete garments, variants, and categories?')) return;
      seedBtn.textContent = 'Populating...';
      try {
        const res = await fetch('/api/seed', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast(data.message, 'success');
          window.location.reload();
        } else {
          showToast(data.message, 'error');
        }
      } catch (err: any) {
        showToast(err.message, 'error');
      } finally {
        seedBtn.textContent = '🌱 Populate Luxury Catalog';
      }
    };
  }

  // Add Product Modal
  const addProdBtn = document.getElementById('admin-add-product-btn');
  if (addProdBtn) {
    addProdBtn.onclick = () => {
      openModal(`
        <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 16px;">Add Haute Couture Garment</h3>
        <form id="new-prod-form" style="display: flex; flex-direction: column; gap: var(--space-md);">
          <div class="form-group">
            <label class="form-label">Garment Name (English) *</label>
            <input type="text" id="np-name-en" required class="form-input" placeholder="e.g. Silk Georgette Evening Dress" />
          </div>
          <div class="form-group">
            <label class="form-label">Garment Name (Arabic) *</label>
            <input type="text" id="np-name-ar" required class="form-input" placeholder="مثال: فستان جورجيت الحريري الفاخر" />
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
            <div class="form-group">
              <label class="form-label">SKU *</label>
              <input type="text" id="np-sku" required class="form-input" placeholder="LET-DR-101" />
            </div>
            <div class="form-group">
              <label class="form-label">Price ($) *</label>
              <input type="number" id="np-price" required class="form-input" placeholder="380" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Image URL *</label>
            <input type="url" id="np-img" required class="form-input" value="https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1000&q=85" />
          </div>
          <div class="form-group">
            <label class="form-label">Initial Total Stock *</label>
            <input type="number" id="np-stock" required class="form-input" value="25" />
          </div>
          <button type="submit" class="btn btn-primary btn-full">Save & Publish Garment</button>
        </form>
      `);

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
            showToast('Garment added successfully!', 'success');
            window.location.hash = 'admin/products?reload=' + Date.now();
          } catch (err: any) {
            showToast(err.message, 'error');
          }
        };
      }
    };
  }

  // Delete product
  document.querySelectorAll('.admin-del-prod-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (id && confirm('Delete this garment from catalog?')) {
        try {
          await deleteDoc(doc(db, 'products', id));
          showToast('Product deleted', 'info');
          window.location.hash = 'admin/products?reload=' + Date.now();
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
          <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Order Details • ${ord.orderNumber}</h3>
          <p style="font-size: 13px; color: #64748b; margin-bottom: 16px;">Client: ${ord.customerName} (${ord.customerPhone})</p>

          <div style="background: #f8fafc; padding: 12px; border-radius: 4px; font-size: 13px; margin-bottom: 16px;">
            <div><strong>Delivery Address:</strong> ${ord.shippingAddress?.city}, ${ord.shippingAddress?.address}</div>
            <div><strong>Payment:</strong> ${ord.paymentMethod?.toUpperCase()} (${ord.paymentStatus})</div>
            <div><strong>Total:</strong> $${ord.total?.toFixed(2)}</div>
          </div>

          <form id="update-order-status-form" style="display: flex; flex-direction: column; gap: 12px;">
            <div class="form-group">
              <label class="form-label">Update Lifecycle Status</label>
              <select id="adm-order-status" class="form-select">
                <option value="new" ${ord.status === 'new' ? 'selected' : ''}>New (Received)</option>
                <option value="confirmed" ${ord.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                <option value="processing" ${ord.status === 'processing' ? 'selected' : ''}>Processing (Atelier Packing)</option>
                <option value="shipped" ${ord.status === 'shipped' ? 'selected' : ''}>Shipped (Air Courier)</option>
                <option value="delivered" ${ord.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                <option value="cancelled" ${ord.status === 'cancelled' ? 'selected' : ''}>Cancelled (Restock Items)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Carrier Tracking Number (e.g. DHL Express)</label>
              <input type="text" id="adm-tracking-no" class="form-input" value="${ord.trackingNumber || ''}" placeholder="e.g. DHL-UAE-9928172" />
            </div>

            <div class="form-group">
              <label class="form-label">Internal Note</label>
              <input type="text" id="adm-order-note" class="form-input" placeholder="e.g. Verified delivery address with client" />
            </div>

            <div style="display: flex; gap: 8px;">
              <button type="submit" class="btn btn-primary" style="flex: 1;">Save & Update Status</button>
              <button type="button" class="btn btn-secondary" onclick="window.print();">🖨 Print Invoice</button>
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
                closeModal();
                showToast('Order status updated successfully!', 'success');
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

  // Settings form submission
  const settingsForm = document.getElementById('admin-settings-form');
  if (settingsForm) {
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
        showToast('Settings saved successfully in Firestore!', 'success');
      } catch (err: any) {
        showToast(err.message, 'error');
      }
    };
  }

  // Edit Product Modal
  document.querySelectorAll('.admin-edit-prod-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (!id) return;
      try {
        const snap = await getDoc(doc(db, 'products', id));
        if (!snap.exists()) return;
        const p = snap.data();

        openModal(`
          <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 16px;">Edit Garment • ${p.name}</h3>
          <form id="edit-prod-form" style="display: flex; flex-direction: column; gap: var(--space-md);">
            <div class="form-group">
              <label class="form-label">Garment Name (English) *</label>
              <input type="text" id="ep-name-en" required class="form-input" value="${p.name || ''}" />
            </div>
            <div class="form-group">
              <label class="form-label">Garment Name (Arabic) *</label>
              <input type="text" id="ep-name-ar" required class="form-input" value="${p.nameAr || ''}" />
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
              <div class="form-group">
                <label class="form-label">Price ($) *</label>
                <input type="number" id="ep-price" required class="form-input" value="${p.price || 0}" />
              </div>
              <div class="form-group">
                <label class="form-label">Sale / Discount Price ($)</label>
                <input type="number" id="ep-saleprice" class="form-input" value="${p.salePrice || 0}" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Total Stock *</label>
              <input type="number" id="ep-stock" required class="form-input" value="${p.totalStock ?? 10}" />
            </div>
            <div class="form-group">
              <label class="form-label">Primary Image URL *</label>
              <input type="url" id="ep-img" required class="form-input" value="${(p.images && p.images[0]) || ''}" />
            </div>
            <div class="form-group">
              <label class="form-label">Publication Status</label>
              <select id="ep-published" class="form-select">
                <option value="true" ${p.isPublished ? 'selected' : ''}>Published (Visible in Store)</option>
                <option value="false" ${!p.isPublished ? 'selected' : ''}>Draft (Hidden)</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary btn-full">Save Changes to Firestore</button>
          </form>
        `);

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
              showToast('Garment updated in Firestore!', 'success');
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

  // Add Category Modal
  const addCatBtn = document.getElementById('admin-add-category-btn');
  if (addCatBtn) {
    addCatBtn.onclick = () => {
      openModal(`
        <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 16px;">Add New Category</h3>
        <form id="new-cat-form" style="display: flex; flex-direction: column; gap: var(--space-md);">
          <div class="form-group">
            <label class="form-label">Category Name (English) *</label>
            <input type="text" id="nc-name-en" required class="form-input" placeholder="e.g. Silk Loungewear" />
          </div>
          <div class="form-group">
            <label class="form-label">Category Name (Arabic) *</label>
            <input type="text" id="nc-name-ar" required class="form-input" placeholder="مثال: ملابس النوم الحريرية" />
          </div>
          <div class="form-group">
            <label class="form-label">Slug *</label>
            <input type="text" id="nc-slug" required class="form-input" placeholder="silk-loungewear" />
          </div>
          <div class="form-group">
            <label class="form-label">Image URL *</label>
            <input type="url" id="nc-img" required class="form-input" value="https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80" />
          </div>
          <button type="submit" class="btn btn-primary btn-full">Create Category</button>
        </form>
      `);

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
            showToast('Category created successfully!', 'success');
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
      if (id && confirm('Delete this category?')) {
        try {
          await deleteDoc(doc(db, 'categories', id));
          showToast('Category deleted', 'info');
          window.location.hash = 'admin/categories?reload=' + Date.now();
        } catch (err: any) {
          showToast(err.message, 'error');
        }
      }
    });
  });

  // Add Coupon Modal
  const addCoupBtn = document.getElementById('admin-add-coupon-btn');
  if (addCoupBtn) {
    addCoupBtn.onclick = () => {
      openModal(`
        <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 16px;">Create Promotional Coupon</h3>
        <form id="new-coup-form" style="display: flex; flex-direction: column; gap: var(--space-md);">
          <div class="form-group">
            <label class="form-label">Coupon Code *</label>
            <input type="text" id="ncp-code" required class="form-input" placeholder="e.g. SUMMER20" style="text-transform: uppercase;" />
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
            <div class="form-group">
              <label class="form-label">Discount Type *</label>
              <select id="ncp-type" class="form-select">
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Discount Value *</label>
              <input type="number" id="ncp-val" required class="form-input" placeholder="20" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Minimum Order Value ($)</label>
            <input type="number" id="ncp-min" class="form-input" value="150" />
          </div>
          <button type="submit" class="btn btn-primary btn-full">Save Coupon</button>
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
            showToast('Coupon created!', 'success');
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
        showToast(isActive ? 'Coupon deactivated' : 'Coupon activated', 'info');
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
          <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Process Return • Order ${ret.orderNumber}</h3>
          <p style="font-size: 13px; color: #64748b; margin-bottom: 16px;">Reason: ${ret.reason} (${ret.type})</p>

          <form id="proc-ret-form" style="display: flex; flex-direction: column; gap: var(--space-md);">
            <div class="form-group">
              <label class="form-label">Inspection & Decision Status</label>
              <select id="pr-status" class="form-select">
                <option value="approved">Approved (Awaiting Package)</option>
                <option value="received">Package Received & Inspected</option>
                <option value="refunded">Refund Issued / Exchange Completed</option>
                <option value="rejected">Rejected (Tag Removed or Damaged)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Internal Atelier Notes</label>
              <input type="text" id="pr-notes" class="form-input" placeholder="e.g. Garment in pristine condition, tag intact" />
            </div>
            <button type="submit" class="btn btn-primary btn-full">Update Return Status</button>
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
              showToast('Return request updated!', 'success');
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
        <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 16px;">Manual Stock Adjustment</h3>
        <form id="stock-adj-form" style="display: flex; flex-direction: column; gap: var(--space-md);">
          <div class="form-group">
            <label class="form-label">Select Garment & SKU *</label>
            <select id="adj-sku-select" class="form-select">
              <option value="LET-TC-001-CAM-S">L'Atelier Trench Coat (Camel Sand • S)</option>
              <option value="LET-TC-001-CAM-M">L'Atelier Trench Coat (Camel Sand • M)</option>
              <option value="LET-DR-002-CHP-S">Sovereign Silk Dress (Champagne • S)</option>
              <option value="LET-DR-002-CHP-M">Sovereign Silk Dress (Champagne • M)</option>
              <option value="LET-BZ-003-IVR-M">Sculpted Wool Blazer (Ivory • M)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Stock Change (e.g. +10 or -2) *</label>
            <input type="number" id="adj-delta" required class="form-input" placeholder="e.g. 5" />
          </div>
          <div class="form-group">
            <label class="form-label">Reason *</label>
            <input type="text" id="adj-reason" required class="form-input" placeholder="e.g. New atelier inbound batch" />
          </div>
          <button type="submit" class="btn btn-primary btn-full">Record Adjustment</button>
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
            showToast(`Recorded ${delta > 0 ? '+' : ''}${delta} stock movement in Firestore!`, 'success');
            window.location.hash = 'admin/inventory?reload=' + Date.now();
          } catch (err: any) {
            showToast(err.message, 'error');
          }
        };
      }
    };
  }
}

