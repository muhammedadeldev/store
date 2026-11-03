import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase Config
const firebaseConfigPath = path.resolve(__dirname, 'firebase-applet-config.json');
let firebaseConfig: any = {};
if (fs.existsSync(firebaseConfigPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
  } catch (e) {
    console.error('Error reading firebase-applet-config.json', e);
  }
}

const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);

const app = express();
app.use(express.json());

// API Routes
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    res.json({
      status: 'ok',
      firebase: {
        projectId: firebaseConfig.projectId,
        databaseId: firebaseConfig.firestoreDatabaseId,
      },
      time: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Coupon validation
app.post('/api/coupons/validate', async (req: Request, res: Response) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) {
      return res.status(400).json({ valid: false, message: 'كود الكوبون مطلوب / Coupon code is required' });
    }

    const couponsRef = collection(db, 'coupons');
    const q = query(couponsRef, where('code', '==', code.trim().toUpperCase()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return res.status(404).json({ valid: false, message: 'الكوبون غير صالح أو غير موجود / Invalid or expired coupon code' });
    }

    const couponDoc = snapshot.docs[0];
    const coupon = couponDoc.data();

    if (!coupon.isActive) {
      return res.status(400).json({ valid: false, message: 'هذا الكوبون غير مفعّل حالياً / Coupon is inactive' });
    }

    if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
      return res.status(400).json({ 
        valid: false, 
        message: `الحد الأدنى لاستخدام هذا الكوبون هو $${coupon.minOrderValue} / Minimum order value is $${coupon.minOrderValue}` 
      });
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = Math.min(coupon.discountValue, subtotal);
    }

    res.json({
      valid: true,
      couponId: couponDoc.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      calculatedDiscount: Math.round(discount * 100) / 100
    });
  } catch (error: any) {
    res.status(500).json({ valid: false, message: error.message });
  }
});

// Secure Checkout & Stock Deduction
app.post('/api/checkout', async (req: Request, res: Response) => {
  try {
    const { 
      items, 
      customerInfo, 
      shippingZoneId, 
      couponCode, 
      paymentMethod = 'cod', 
      notes = '' 
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'السلة فارغة / Shopping cart is empty' });
    }

    if (!customerInfo || !customerInfo.fullName || !customerInfo.phoneNumber || !customerInfo.address) {
      return res.status(400).json({ success: false, message: 'جميع بيانات التوصيل مطلوبة / Complete customer details are required' });
    }

    // Verify each item's price, existence, and variant stock from Firestore
    let verifiedSubtotal = 0;
    const verifiedItems: any[] = [];
    const stockUpdates: Array<{ docId: string; productData: any; variantSku: string; quantity: number }> = [];

    for (const item of items) {
      const productRef = doc(db, 'products', item.productId);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        return res.status(400).json({ success: false, message: `المنتج غير موجود / Product not found: ${item.name || item.productId}` });
      }

      const product = productSnap.data();
      const unitPrice = product.salePrice && product.salePrice > 0 ? product.salePrice : product.price;

      // Find variant
      const variants = product.variants || [];
      const variant = variants.find((v: any) => v.sku === item.variantSku || (v.size === item.size && v.color === item.color));

      if (variant) {
        if (variant.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `المخزون غير كافٍ للمقاس ${item.size} واللون ${item.color} من المنتج "${product.name}". المتاح: ${variant.stock} فقط.`
          });
        }
      } else if (product.totalStock !== undefined && product.totalStock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `المخزون غير كافٍ للمنتج "${product.name}". المتاح: ${product.totalStock} فقط.`
        });
      }

      verifiedSubtotal += unitPrice * item.quantity;
      verifiedItems.push({
        productId: item.productId,
        productName: product.name,
        productNameAr: product.nameAr || product.name,
        variantSku: item.variantSku || (variant ? variant.sku : product.sku),
        color: item.color || '',
        size: item.size || '',
        image: item.image || (product.images && product.images[0]) || '',
        price: unitPrice,
        quantity: item.quantity,
        total: unitPrice * item.quantity
      });

      stockUpdates.push({
        docId: item.productId,
        productData: product,
        variantSku: item.variantSku || (variant ? variant.sku : product.sku),
        quantity: item.quantity
      });
    }

    // Verify Shipping cost
    let shippingCost = 15; // default fallback
    let shippingZoneName = 'Standard Delivery';
    if (shippingZoneId) {
      const zoneRef = doc(db, 'shippingZones', shippingZoneId);
      const zoneSnap = await getDoc(zoneRef);
      if (zoneSnap.exists()) {
        const zone = zoneSnap.data();
        shippingCost = zone.cost || 0;
        shippingZoneName = zone.name;
      }
    }

    // Check free shipping threshold from settings
    const settingsRef = doc(db, 'settings', 'store');
    const settingsSnap = await getDoc(settingsRef);
    let taxAmount = 0;
    if (settingsSnap.exists()) {
      const settings = settingsSnap.data();
      if (settings.freeShippingThreshold && verifiedSubtotal >= settings.freeShippingThreshold) {
        shippingCost = 0;
      }
      if (settings.enableTax && settings.taxPercentage) {
        taxAmount = (verifiedSubtotal * settings.taxPercentage) / 100;
      }
    }

    // Validate coupon if provided
    let discountAmount = 0;
    let appliedCoupon = null;
    if (couponCode) {
      const couponsRef = collection(db, 'coupons');
      const q = query(couponsRef, where('code', '==', couponCode.trim().toUpperCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const cDoc = snap.docs[0];
        const cData = cDoc.data();
        if (cData.isActive && (!cData.minOrderValue || verifiedSubtotal >= cData.minOrderValue)) {
          if (cData.discountType === 'percentage') {
            discountAmount = (verifiedSubtotal * cData.discountValue) / 100;
            if (cData.maxDiscount && discountAmount > cData.maxDiscount) {
              discountAmount = cData.maxDiscount;
            }
          } else {
            discountAmount = Math.min(cData.discountValue, verifiedSubtotal);
          }
          appliedCoupon = cData.code;
          // Increment coupon usage
          await updateDoc(doc(db, 'coupons', cDoc.id), {
            usageCount: (cData.usageCount || 0) + 1
          });
        }
      }
    }

    const finalTotal = Math.max(0, verifiedSubtotal - discountAmount + shippingCost + taxAmount);
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const newOrderData = {
      orderNumber,
      customerId: customerInfo.userId || 'guest',
      customerName: customerInfo.fullName,
      customerEmail: customerInfo.email || '',
      customerPhone: customerInfo.phoneNumber,
      shippingAddress: {
        governorate: customerInfo.governorate || '',
        city: customerInfo.city || '',
        address: customerInfo.address,
        building: customerInfo.building || '',
        apartment: customerInfo.apartment || '',
        postalCode: customerInfo.postalCode || ''
      },
      items: verifiedItems,
      subtotal: Math.round(verifiedSubtotal * 100) / 100,
      shippingCost,
      shippingZoneName,
      discountAmount: Math.round(discountAmount * 100) / 100,
      couponCode: appliedCoupon || null,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(finalTotal * 100) / 100,
      currency: 'USD',
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
      status: 'new',
      notes,
      statusHistory: [
        {
          status: 'new',
          timestamp: new Date().toISOString(),
          note: 'تم إنشاء الطلب بنجاح / Order created'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add Order to Firestore
    const orderDocRef = await addDoc(collection(db, 'orders'), newOrderData);

    // Deduct stock and record inventory movement for each item
    for (const update of stockUpdates) {
      const pRef = doc(db, 'products', update.docId);
      const variants = update.productData.variants || [];
      let updatedVariants = variants.map((v: any) => {
        if (v.sku === update.variantSku) {
          const newQty = Math.max(0, (v.stock || 0) - update.quantity);
          return { ...v, stock: newQty };
        }
        return v;
      });

      const newTotalStock = updatedVariants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);

      await updateDoc(pRef, {
        variants: updatedVariants,
        totalStock: newTotalStock,
        updatedAt: new Date().toISOString()
      });

      // Record movement
      await addDoc(collection(db, 'inventoryMovements'), {
        productId: update.docId,
        sku: update.variantSku,
        quantityDelta: -update.quantity,
        type: 'sale',
        referenceId: orderDocRef.id,
        orderNumber,
        reason: `مبيعات للطلب ${orderNumber} / Sale for order ${orderNumber}`,
        performedBy: 'system',
        createdAt: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      orderId: orderDocRef.id,
      orderNumber,
      total: newOrderData.total,
      currency: newOrderData.currency,
      message: 'تم تسجيل طلبك بنجاح / Order placed successfully!'
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin Update Order Status with auto cancellation restock
app.post('/api/orders/update-status', async (req: Request, res: Response) => {
  try {
    const { orderId, newStatus, note = '', trackingNumber = '', adminEmail = 'admin' } = req.body;
    if (!orderId || !newStatus) {
      return res.status(400).json({ success: false, message: 'Missing orderId or newStatus' });
    }

    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orderSnap.data();
    const oldStatus = order.status;

    // If changing to cancelled from an active state, restock items
    if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
      for (const item of (order.items || [])) {
        if (item.productId) {
          const pRef = doc(db, 'products', item.productId);
          const pSnap = await getDoc(pRef);
          if (pSnap.exists()) {
            const pData = pSnap.data();
            const updatedVariants = (pData.variants || []).map((v: any) => {
              if (v.sku === item.variantSku) {
                return { ...v, stock: (v.stock || 0) + item.quantity };
              }
              return v;
            });
            const newTotalStock = updatedVariants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
            await updateDoc(pRef, {
              variants: updatedVariants,
              totalStock: newTotalStock,
              updatedAt: new Date().toISOString()
            });

            await addDoc(collection(db, 'inventoryMovements'), {
              productId: item.productId,
              sku: item.variantSku,
              quantityDelta: item.quantity,
              type: 'cancellation_restock',
              referenceId: orderId,
              orderNumber: order.orderNumber,
              reason: `إلغاء الطلب ${order.orderNumber} / Order cancelled restock`,
              performedBy: adminEmail,
              createdAt: new Date().toISOString()
            });
          }
        }
      }
    }

    const historyEntry = {
      status: newStatus,
      timestamp: new Date().toISOString(),
      note: note || `الحالة تم تغييرها إلى ${newStatus}`,
      performedBy: adminEmail
    };

    const updatePayload: any = {
      status: newStatus,
      statusHistory: [...(order.statusHistory || []), historyEntry],
      updatedAt: new Date().toISOString()
    };

    if (trackingNumber) {
      updatePayload.trackingNumber = trackingNumber;
    }

    await updateDoc(orderRef, updatePayload);

    res.json({ success: true, message: 'Order status updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Seed Initial High-End Fashion Brand Data
app.post('/api/seed', async (_req: Request, res: Response) => {
  try {
    // 1. Settings
    const settingsRef = doc(db, 'settings', 'store');
    await setDoc(settingsRef, {
      brandName: "L'ÉTOILE",
      brandNameAr: "لو إتوال",
      logoUrl: "",
      tagline: "Haute Couture & Contemporary Tailoring",
      taglineAr: "الأزياء الراقية والخياطة العصرية الفاخرة",
      currency: "USD",
      currencyAr: "$",
      whatsappNumber: "+971501234567",
      contactEmail: "concierge@letoile-couture.com",
      contactPhone: "+971 4 800 3864",
      address: "Design District, Avenue Montaigne Paris & Dubai Mall Fashion Avenue",
      announcementBarText: "Complimentary worldwide express shipping on orders over $250 — Autumn/Winter Atelier Edition",
      announcementBarTextAr: "شحن سريع مجاني لجميع الطلبات التي تتجاوز 250 دولاراً — مجموعة الخريف والشتاء الحصرية",
      announcementBarActive: true,
      announcementBarBgColor: "#0f172a",
      taxPercentage: 5,
      enableTax: true,
      freeShippingThreshold: 250,
      defaultShippingCost: 20,
      heroTitle: "Elegance In Every Stitch",
      heroTitleAr: "الأناقة في أدق تفاصيلها",
      heroSubtitle: "Discover the Autumn/Winter Haute Couture collection crafted from the finest organic Italian silks and Mongolian cashmere.",
      heroSubtitleAr: "اكتشفي مجموعة الخريف والشتاء الراقية المصنوعة من أرقى الحرير الإيطالي والكشمير المنغولي الفاخر.",
      heroImageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1800&q=85",
      heroCtaText: "Explore Collection",
      heroCtaTextAr: "استكشف المجموعة",
      heroCtaLink: "#shop",
      socialInstagram: "https://instagram.com/letoile_official",
      socialFacebook: "https://facebook.com/letoile.couture",
      socialTiktok: "https://tiktok.com/@letoilecouture",
      updatedAt: new Date().toISOString()
    });

    // 2. Shipping Zones
    const shippingZones = [
      { id: 'zone-local', name: 'UAE & Gulf Express', nameAr: 'الإمارات ودول الخليج السريع', cost: 15, estimatedDays: '1-2 Days', estimatedDaysAr: '1-2 يوم عمل', isActive: true },
      { id: 'zone-egypt', name: 'Egypt & Levant VIP Delivery', nameAr: 'مصر والشام توصيل مميز', cost: 18, estimatedDays: '2-4 Days', estimatedDaysAr: '2-4 أيام عمل', isActive: true },
      { id: 'zone-europe', name: 'Europe & UK Express Courier', nameAr: 'أوروبا والمملكة المتحدة', cost: 25, estimatedDays: '3-5 Days', estimatedDaysAr: '3-5 أيام عمل', isActive: true },
      { id: 'zone-global', name: 'Worldwide Air Express', nameAr: 'الشحن الجوي العالمي السريع', cost: 35, estimatedDays: '4-7 Days', estimatedDaysAr: '4-7 أيام عمل', isActive: true },
    ];
    for (const zone of shippingZones) {
      await setDoc(doc(db, 'shippingZones', zone.id), zone);
    }

    // 3. Categories
    const categories = [
      {
        id: 'cat-coats',
        name: 'Outerwear & Coats',
        nameAr: 'المعاطف والسترات الفاخرة',
        slug: 'outerwear-coats',
        description: 'Impeccably tailored trench coats, double-breasted blazers, and wool-cashmere longcoats.',
        imageUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80',
        sortOrder: 1,
        isActive: true
      },
      {
        id: 'cat-dresses',
        name: 'Evening & Atelier Dresses',
        nameAr: 'فساتين السهرة والآتيليه',
        slug: 'evening-dresses',
        description: 'Sculptural silhouettes, fluid mulberry silks, and bespoke evening wear.',
        imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80',
        sortOrder: 2,
        isActive: true
      },
      {
        id: 'cat-tailoring',
        name: 'Tailored Suits & Separates',
        nameAr: 'البدلات والقطع المفصلة',
        slug: 'tailored-suits',
        description: 'Sharp shoulders, fluid wide-leg trousers, and minimalist modern suiting.',
        imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
        sortOrder: 3,
        isActive: true
      },
      {
        id: 'cat-knitwear',
        name: 'Cashmere & Knitwear',
        nameAr: 'الكشمير والتريكو الفاخر',
        slug: 'cashmere-knitwear',
        description: 'Pure Grade-A Mongolian cashmere turtlenecks, cardigans, and lounge knits.',
        imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=800&q=80',
        sortOrder: 4,
        isActive: true
      },
      {
        id: 'cat-accessories',
        name: 'Artisanal Leather & Silk Scarves',
        nameAr: 'الجلود الطبيعية والأوشحة الحريرية',
        slug: 'accessories',
        description: 'Hand-stitched leather totes, minimalist belts, and silk twill scarves.',
        imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
        sortOrder: 5,
        isActive: true
      }
    ];

    for (const cat of categories) {
      await setDoc(doc(db, 'categories', cat.id), cat);
    }

    // 4. Products with Multi-Variant Matrix
    const sampleProducts = [
      {
        id: 'prod-trench-01',
        name: "L'Atelier Cashmere-Wool Trench Coat",
        nameAr: "معطف الترنش الفاخر من الكشمير والصوف",
        slug: "atelier-cashmere-wool-trench-coat",
        sku: "LET-TC-001",
        categoryId: "cat-coats",
        categoryName: "Outerwear & Coats",
        price: 490,
        salePrice: 420,
        cost: 180,
        description: "Constructed from 70% virgin wool and 30% Mongolian cashmere, this iconic double-breasted trench features horn buttons, a wide storm flap, belted cuffs, and a fluid silhouette tailored to perfection.",
        descriptionAr: "مصنوع من 70% صوف بكر و30% كشمير منغولي، يتميز هذا المعطف الأيقوني بأزرار قرنية طبيعية، وحزام خصر متناسق، وقصة انسيابية عصرية تمنحك إطلالة راقية في كل مناسبة.",
        fabric: "70% Virgin Wool, 30% Mongolian Cashmere. 100% Cupro Lining.",
        careInstructions: "Specialist dry clean only. Do not tumble dry. Cool iron on reverse with press cloth.",
        images: [
          "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1000&q=85",
          "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=1000&q=85",
          "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85"
        ],
        colors: [
          { name: "Camel Sand", nameAr: "رملي كلاسيكي", hex: "#c29b74" },
          { name: "Noir Black", nameAr: "أسود داكن", hex: "#111827" },
          { name: "Slate Olive", nameAr: "زيتي حجري", hex: "#4b5320" }
        ],
        sizes: ["XS", "S", "M", "L", "XL"],
        variants: [
          { sku: "LET-TC-001-CAM-XS", color: "Camel Sand", size: "XS", stock: 6, price: 420 },
          { sku: "LET-TC-001-CAM-S", color: "Camel Sand", size: "S", stock: 12, price: 420 },
          { sku: "LET-TC-001-CAM-M", color: "Camel Sand", size: "M", stock: 15, price: 420 },
          { sku: "LET-TC-001-CAM-L", color: "Camel Sand", size: "L", stock: 8, price: 420 },
          { sku: "LET-TC-001-CAM-XL", color: "Camel Sand", size: "XL", stock: 4, price: 420 },
          { sku: "LET-TC-001-BLK-S", color: "Noir Black", size: "S", stock: 10, price: 420 },
          { sku: "LET-TC-001-BLK-M", color: "Noir Black", size: "M", stock: 14, price: 420 },
          { sku: "LET-TC-001-BLK-L", color: "Noir Black", size: "L", stock: 5, price: 420 }
        ],
        totalStock: 74,
        isPublished: true,
        isFeatured: true,
        isNewArrival: true,
        isBestSeller: true,
        seoTitle: "Luxury Cashmere-Wool Trench Coat | L'ÉTOILE Haute Couture",
        seoDescription: "Shop the handcrafted cashmere-wool double-breasted trench coat. Impeccable tailoring and supreme warmth.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'prod-dress-02',
        name: "Sovereign Bias-Cut Silk Maxi Dress",
        nameAr: "فستان الحرير الانسيابي ماكسي المقصوص بالورب",
        slug: "sovereign-bias-cut-silk-maxi-dress",
        sku: "LET-DR-002",
        categoryId: "cat-dresses",
        categoryName: "Evening & Atelier Dresses",
        price: 360,
        salePrice: 320,
        cost: 110,
        description: "Cut on the bias from heavyweight 22-momme Mulberry silk, this evening gown drapes naturally against the curves. Features delicate spaghetti straps and a low cowl back.",
        descriptionAr: "مفصل بالورب من حرير التوت الصافي بوزن 22 مومي الفاخر. ينساب بنعومة استثنائية مع ظهر مكشوف ناعم وقصة كتف أنيقة تلفت الأنظار.",
        fabric: "100% Grade 6A Mulberry Silk (22 Momme).",
        careInstructions: "Dry clean or delicate hand wash cold using specialized silk detergent. Dry flat in shade.",
        images: [
          "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1000&q=85",
          "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=1000&q=85",
          "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1000&q=85"
        ],
        colors: [
          { name: "Champagne Pearl", nameAr: "لؤلؤي شامبين", hex: "#f5e6d3" },
          { name: "Emerald Forest", nameAr: "زمردي ملكي", hex: "#164e63" },
          { name: "Onyx Midnight", nameAr: "أسود أونيكس", hex: "#0f172a" }
        ],
        sizes: ["XS", "S", "M", "L"],
        variants: [
          { sku: "LET-DR-002-CHP-XS", color: "Champagne Pearl", size: "XS", stock: 8, price: 320 },
          { sku: "LET-DR-002-CHP-S", color: "Champagne Pearl", size: "S", stock: 12, price: 320 },
          { sku: "LET-DR-002-CHP-M", color: "Champagne Pearl", size: "M", stock: 10, price: 320 },
          { sku: "LET-DR-002-CHP-L", color: "Champagne Pearl", size: "L", stock: 4, price: 320 },
          { sku: "LET-DR-002-EMR-S", color: "Emerald Forest", size: "S", stock: 6, price: 320 },
          { sku: "LET-DR-002-EMR-M", color: "Emerald Forest", size: "M", stock: 9, price: 320 }
        ],
        totalStock: 49,
        isPublished: true,
        isFeatured: true,
        isNewArrival: true,
        isBestSeller: false,
        seoTitle: "Mulberry Silk Bias-Cut Maxi Dress | L'ÉTOILE",
        seoDescription: "Exquisite 100% Mulberry silk evening maxi dress with cowl neckline.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'prod-blazer-03',
        name: "Sculpted Double-Breasted Wool Blazer",
        nameAr: "بليزر صوف مفصل مزدوج الأزرار بتصميم نحتي",
        slug: "sculpted-double-breasted-wool-blazer",
        sku: "LET-BZ-003",
        categoryId: "cat-tailoring",
        categoryName: "Tailored Suits & Separates",
        price: 340,
        salePrice: 0,
        cost: 130,
        description: "A masterclass in modern power dressing. Featuring accentuated peak lapels, structured padded shoulders, and tailored waist cinching made from high-twist Italian wool crepe.",
        descriptionAr: "قطعة أساسية تمثل قمة التميز والرقي. يتميز البليزر بياقة عريضة حادة، وأكتاف منظمة، وتفصيل يحدد الخصر بدقة من صوف الكريب الإيطالي.",
        fabric: "100% Italian Wool Crepe. Hand-finished horn buttons.",
        careInstructions: "Dry clean only. Steam gently. Store on wide wooden hanger.",
        images: [
          "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1000&q=85",
          "https://images.unsplash.com/photo-1548624149-f9b1859aa9d0?auto=format&fit=crop&w=1000&q=85"
        ],
        colors: [
          { name: "Chalk Ivory", nameAr: "عاجي طباشيري", hex: "#f8fafc" },
          { name: "Deep Navy", nameAr: "كحلي داكن", hex: "#1e293b" }
        ],
        sizes: ["S", "M", "L", "XL"],
        variants: [
          { sku: "LET-BZ-003-IVR-S", color: "Chalk Ivory", size: "S", stock: 8, price: 340 },
          { sku: "LET-BZ-003-IVR-M", color: "Chalk Ivory", size: "M", stock: 14, price: 340 },
          { sku: "LET-BZ-003-IVR-L", color: "Chalk Ivory", size: "L", stock: 6, price: 340 },
          { sku: "LET-BZ-003-NVY-S", color: "Deep Navy", size: "S", stock: 10, price: 340 },
          { sku: "LET-BZ-003-NVY-M", color: "Deep Navy", size: "M", stock: 11, price: 340 }
        ],
        totalStock: 49,
        isPublished: true,
        isFeatured: true,
        isNewArrival: false,
        isBestSeller: true,
        seoTitle: "Sculpted Italian Wool Blazer | L'ÉTOILE",
        seoDescription: "Double-breasted Italian wool blazer with structured shoulders.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'prod-cashmere-04',
        name: "Pure Mongolian Cashmere Mockneck Sweater",
        nameAr: "كنزة كشمير منغولي بياقة عالية ناعمة",
        slug: "pure-mongolian-cashmere-mockneck-sweater",
        sku: "LET-CS-004",
        categoryId: "cat-knitwear",
        categoryName: "Cashmere & Knitwear",
        price: 280,
        salePrice: 240,
        cost: 95,
        description: "Spun from ultra-fine 15.2-micron 2-ply Mongolian cashmere fibers. Cloud-like softness, thermo-regulating warmth, and ribbed cuff detailing that holds its shape.",
        descriptionAr: "مغزولة من أجود ألياف الكشمير المنغولي بسماكة 15.2 ميكرون وخيط مزدوج. خفة ونعومة استثنائية مع دفء مثالي وتصميم ياقة أنيق.",
        fabric: "100% Grade A Mongolian Cashmere (2-Ply).",
        careInstructions: "Hand wash cold with cashmere wash. Squeeze gently, reshape and dry flat. Do not wring.",
        images: [
          "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=1000&q=85",
          "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1000&q=85"
        ],
        colors: [
          { name: "Oatmeal Melange", nameAr: "بيج شوفان", hex: "#e7dfd5" },
          { name: "Charcoal Heather", nameAr: "رمادي فحمي", hex: "#334155" },
          { name: "Dusty Rose", nameAr: "وردي ناعم", hex: "#d8b4b4" }
        ],
        sizes: ["XS", "S", "M", "L", "XL"],
        variants: [
          { sku: "LET-CS-004-OAT-S", color: "Oatmeal Melange", size: "S", stock: 9, price: 240 },
          { sku: "LET-CS-004-OAT-M", color: "Oatmeal Melange", size: "M", stock: 15, price: 240 },
          { sku: "LET-CS-004-OAT-L", color: "Oatmeal Melange", size: "L", stock: 7, price: 240 },
          { sku: "LET-CS-004-CHR-M", color: "Charcoal Heather", size: "M", stock: 12, price: 240 }
        ],
        totalStock: 43,
        isPublished: true,
        isFeatured: false,
        isNewArrival: true,
        isBestSeller: true,
        seoTitle: "Grade-A Mongolian Cashmere Sweater | L'ÉTOILE",
        seoDescription: "100% Pure Mongolian Cashmere Sweater with mockneck collar.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'prod-trousers-05',
        name: "Fluid Pleated High-Waist Wool Trousers",
        nameAr: "بنطال صوف واسع بخصر عالي وكسرات انسيابية",
        slug: "fluid-pleated-high-waist-wool-trousers",
        sku: "LET-TR-005",
        categoryId: "cat-tailoring",
        categoryName: "Tailored Suits & Separates",
        price: 240,
        salePrice: 0,
        cost: 85,
        description: "Tailored with deep double front pleats and a relaxed wide-leg puddle hem. Crafted from breathable lightweight tropical wool that drapes fluidly with each step.",
        descriptionAr: "مفصل بكسرات أمامية عميقة وخصر مرتفع مع قصة أرجل واسعة مستقيمة من الصوف التروبيكال الفاخر الخفيف الذي يوفر انسيابية وحرية حركة تامة.",
        fabric: "100% Super 120s Tropical Wool.",
        careInstructions: "Dry clean only. Press with medium steam.",
        images: [
          "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=1000&q=85",
          "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=85"
        ],
        colors: [
          { name: "Ecru White", nameAr: "أبيض إكرو", hex: "#f1f5f9" },
          { name: "Coffee Brown", nameAr: "بني قهوة", hex: "#451a03" }
        ],
        sizes: ["XS", "S", "M", "L"],
        variants: [
          { sku: "LET-TR-005-ECR-S", color: "Ecru White", size: "S", stock: 11, price: 240 },
          { sku: "LET-TR-005-ECR-M", color: "Ecru White", size: "M", stock: 16, price: 240 },
          { sku: "LET-TR-005-CFE-S", color: "Coffee Brown", size: "S", stock: 8, price: 240 },
          { sku: "LET-TR-005-CFE-M", color: "Coffee Brown", size: "M", stock: 10, price: 240 }
        ],
        totalStock: 45,
        isPublished: true,
        isFeatured: false,
        isNewArrival: false,
        isBestSeller: true,
        seoTitle: "High-Waist Pleated Wool Trousers | L'ÉTOILE",
        seoDescription: "Tailored pleated wide-leg trousers crafted from Italian tropical wool.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'prod-tote-06',
        name: "The Palais Hand-Stitched Leather Tote",
        nameAr: "حقيبة باليه الجلدية الطبيعية بحياكة يدوية",
        slug: "the-palais-hand-stitched-leather-tote",
        sku: "LET-AC-006",
        categoryId: "cat-accessories",
        categoryName: "Artisanal Leather & Silk Scarves",
        price: 450,
        salePrice: 395,
        cost: 160,
        description: "Crafted in Florence from vegetable-tanned full-grain calfskin. Features hand-painted edge burnishing, brushed gold hardware, and a suede-lined spacious interior with removable zip pouch.",
        descriptionAr: "صُنعت في فلورنسا من جلد العجل الطبيعي المدبوغ نباتياً بالكامل. تتميز بأطراف مصقولة يدوياً، وإكسسوارات ذهبية مطفية، وبطانة شمواه فاخرة.",
        fabric: "100% Full-Grain Tuscan Calfskin Leather. Suede Lining.",
        careInstructions: "Store in provided dust bag with stuffing. Protect from water and direct perfume spray. Clean with leather balm.",
        images: [
          "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=85",
          "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1000&q=85"
        ],
        colors: [
          { name: "Cognac Amber", nameAr: "عنبري كوجناك", hex: "#78350f" },
          { name: "Midnight Black", nameAr: "أسود ليلي", hex: "#0f172a" }
        ],
        sizes: ["One Size"],
        variants: [
          { sku: "LET-AC-006-CGN-OS", color: "Cognac Amber", size: "One Size", stock: 12, price: 395 },
          { sku: "LET-AC-006-BLK-OS", color: "Midnight Black", size: "One Size", stock: 15, price: 395 }
        ],
        totalStock: 27,
        isPublished: true,
        isFeatured: true,
        isNewArrival: true,
        isBestSeller: true,
        seoTitle: "Tuscan Calfskin Leather Tote Bag | L'ÉTOILE",
        seoDescription: "Artisanal hand-stitched full-grain leather tote bag with suede lining.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    for (const prod of sampleProducts) {
      await setDoc(doc(db, 'products', prod.id), prod);
    }

    // 5. Coupons
    const coupons = [
      {
        id: 'coup-luxe15',
        code: 'LUXE15',
        discountType: 'percentage',
        discountValue: 15,
        minOrderValue: 200,
        maxDiscount: 100,
        usageLimit: 500,
        usageCount: 24,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'coup-welcome10',
        code: 'WELCOME10',
        discountType: 'percentage',
        discountValue: 10,
        minOrderValue: 100,
        maxDiscount: 50,
        usageLimit: 1000,
        usageCount: 68,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'coup-first50',
        code: 'FIRST50',
        discountType: 'fixed',
        discountValue: 50,
        minOrderValue: 350,
        maxDiscount: 50,
        usageLimit: 200,
        usageCount: 15,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];
    for (const coup of coupons) {
      await setDoc(doc(db, 'coupons', coup.id), coup);
    }

    // 6. Promotional Banners
    const banners = [
      {
        id: 'banner-hero',
        title: "The Autumn Haute Couture Edition",
        titleAr: "مجموعة خريف وشتاء الكوتور الحصرية",
        subtitle: "Architectural lines meeting fluid Italian silks",
        subtitleAr: "خطوط معمارية تلتقي مع انسيابية الحرير الإيطالي",
        imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1800&q=85",
        mobileImageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=85",
        linkUrl: "#shop",
        buttonText: "Discover The Runway",
        buttonTextAr: "اكتشف إطلالات العرض",
        position: "hero",
        sortOrder: 1,
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'banner-middle',
        title: "Bespoke Outerwear Craftsmanship",
        titleAr: "حرفية تفصيل المعاطف الفاخرة",
        subtitle: "Hand-finished double-faced cashmere and virgin wool longcoats designed to last a lifetime.",
        subtitleAr: "معاطف صوف وكشمير مزدوجة الوجه بحياكة يدوية متقنة تدوم لأجيال.",
        imageUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=85",
        mobileImageUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=85",
        linkUrl: "#shop",
        buttonText: "Shop Outerwear",
        buttonTextAr: "تسوق المعاطف",
        position: "middle",
        sortOrder: 2,
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];
    for (const b of banners) {
      await setDoc(doc(db, 'banners', b.id), b);
    }

    // 7. CMS Pages
    const pages = [
      {
        id: 'page-about',
        title: "The Atelier Story",
        titleAr: "قصة الدار والحرفية",
        slug: "about",
        content: `Founded with an uncompromising devotion to fabric integrity and architectural silhouettes, L'ÉTOILE represents modern minimalism elevated to haute couture standards. Every garment is meticulously patterned in our Parisian atelier and hand-finished by master artisans in northern Italy and Scotland. We source solely certified ethical Mongolian cashmere, Oeko-Tex Grade 6A Mulberry silk, and traceable Australian merino wool.`,
        contentAr: `تأسست دار لو إتوال L'ÉTOILE انطلاقاً من شغف استثنائي بنقاء الخامات ودقة الخطوط التصميمية لتصل بالبساطة الحديثة إلى آفاق الهوت كوتور العالمية. يتم تصميم وقص كل قطعة داخل الآتيليه الخاص بنا في باريس، وتُستكمل الحياكة يدوياً على أيدي أمهر الحرفيين في شمال إيطاليا واسكتلندا، مع الالتزام بأرقى معايير الاستدامة والخامات الطبيعية الموثقة.`,
        isPublished: true,
        seoTitle: "About L'ÉTOILE | The Atelier Story & Heritage",
        seoDescription: "Discover the heritage, sustainability, and master artisans behind L'ÉTOILE luxury fashion house.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'page-shipping',
        title: "Shipping & Delivery Policy",
        titleAr: "سياسة الشحن والتوصيل الفاخر",
        slug: "shipping-policy",
        content: `All L'ÉTOILE orders are packaged by hand in signature embossed keepsake gift boxes with acid-free tissue paper and organic cotton garment bags. We partner with DHL Express and premium air couriers to guarantee swift and insured delivery worldwide. Orders placed before 2:00 PM CET are dispatched the same business day. Tracking details are automatically provided via SMS and email.`,
        contentAr: `يتم تجهيز وتغليف جميع طلبات لو إتوال يدوياً داخل صناديق هدايا فاخرة مميزة مع أكياس حفظ الملابس القطنية العضوية. نتعاون مع كبرى شركات الشحن الجوي السريع لضمان وصول شحنتكم بأمان وسرعة فائقة مع إمكانية التتبع المباشر لحظة بلحظة.`,
        isPublished: true,
        seoTitle: "Shipping & Worldwide Delivery | L'ÉTOILE",
        seoDescription: "Learn about our worldwide white-glove shipping, delivery times, and bespoke packaging.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'page-returns',
        title: "Returns & Exchanges",
        titleAr: "سياسة الاستبدال والاسترجاع",
        slug: "returns-policy",
        content: `We offer complimentary 14-day returns and exchanges on all unworn items with original security tags attached. Once your return request is submitted through our customer portal, a prepaid courier pickup will be scheduled. Refunds are issued to the original payment method or store credit within 3 to 5 business days after inspection.`,
        contentAr: `نوفر خدمة الإرجاع والاستبدال المجاني خلال 14 يوماً من استلام الطلب لجميع القطع غير المستخدمة التي تحتفظ ببطاقات الأمان الأصلية. يمكنكم تقديم طلب الإرجاع بسهولة عبر حسابكم في الموقع ليتم التنسيق لاستلام الشحنة وإعادة المبلغ أو استبدال المقاس.`,
        isPublished: true,
        seoTitle: "Returns & Exchanges Policy | L'ÉTOILE",
        seoDescription: "Complimentary 14-day returns and size exchanges on all couture pieces.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'page-size-guide',
        title: "Atelier Size & Fit Guide",
        titleAr: "دليل المقاسات والقياسات",
        slug: "size-guide",
        content: `Our tailoring follows standard European sizing (FR/IT). For outerwear designed with an oversized fit, we recommend ordering your true size for a relaxed editorial silhouette, or sizing down for a sharper fitted look. Detailed bust, waist, and hip measurements in both centimeters and inches are available on every product page.`,
        contentAr: `تعتمد قياساتنا على المقاييس الأوروبية القياسية (الفرنسية والإيطالية). يمكنك الاعتماد على جدول المقاسات الدقيق بالسنتيمتر والبوصة المتوفر في كل منتج لتحديد المقاس الأمثل لك.`,
        isPublished: true,
        seoTitle: "Size & Measurement Guide | L'ÉTOILE",
        seoDescription: "Comprehensive sizing chart and measuring instructions for coats, dresses, and tailoring.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    for (const p of pages) {
      await setDoc(doc(db, 'pages', p.id), p);
    }

    // 8. Sample Customer Reviews
    const reviews = [
      {
        id: 'rev-01',
        productId: 'prod-trench-01',
        customerName: 'Victoria S.',
        customerEmail: 'victoria.s@example.com',
        rating: 5,
        title: 'Unrivaled tailoring and drape',
        comment: 'The cashmere-wool blend has the most exquisite hand feel. The silhouette is reminiscent of classic French haute couture. Arrived in a gorgeous storage box.',
        isApproved: true,
        isVerifiedPurchase: true,
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
      },
      {
        id: 'rev-02',
        productId: 'prod-dress-02',
        customerName: 'Sarah M.',
        customerEmail: 'sarah.m@example.com',
        rating: 5,
        title: 'Stunning silk quality',
        comment: 'Wore this to a gala and received non-stop compliments. The Champagne color catches the light like liquid gold. Perfectly true to size.',
        isApproved: true,
        isVerifiedPurchase: true,
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString()
      },
      {
        id: 'rev-03',
        productId: 'prod-blazer-03',
        customerName: 'Elena Rostova',
        customerEmail: 'elena@example.com',
        rating: 5,
        title: 'Sharp, elegant power blazer',
        comment: 'Shoulders are sculpted to absolute perfection. The wool crepe has zero creasing even after travel. An investment piece.',
        isApproved: true,
        isVerifiedPurchase: true,
        createdAt: new Date(Date.now() - 10 * 86400000).toISOString()
      }
    ];
    for (const rev of reviews) {
      await setDoc(doc(db, 'reviews', rev.id), rev);
    }

    // 9. Bootstrap Super Admin Record
    await setDoc(doc(db, 'admins', 'admin-primary'), {
      id: 'admin-primary',
      email: 'mohamedqwe542@gmail.com',
      displayName: 'Brand Director & Super Admin',
      role: 'super_admin',
      permissions: ['all', 'products', 'orders', 'inventory', 'returns', 'coupons', 'cms', 'settings', 'reports', 'roles'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // 10. Sample Orders for Dashboard Analytics
    const sampleOrders = [
      {
        orderNumber: 'ORD-89421-102',
        customerId: 'cust-demo-1',
        customerName: 'Amina Al-Mansoor',
        customerEmail: 'amina.mansoor@example.com',
        customerPhone: '+971509988771',
        shippingAddress: {
          governorate: 'Dubai',
          city: 'Downtown Dubai',
          address: 'Burj Residences, Tower 3, Apt 1402'
        },
        items: [
          {
            productId: 'prod-trench-01',
            productName: "L'Atelier Cashmere-Wool Trench Coat",
            variantSku: "LET-TC-001-CAM-S",
            color: "Camel Sand",
            size: "S",
            price: 420,
            quantity: 1,
            total: 420,
            image: "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=600&q=80"
          }
        ],
        subtotal: 420,
        shippingCost: 0,
        shippingZoneName: 'UAE & Gulf Express',
        discountAmount: 42,
        couponCode: 'WELCOME10',
        taxAmount: 18.9,
        total: 396.9,
        currency: 'USD',
        paymentMethod: 'card',
        paymentStatus: 'paid',
        status: 'delivered',
        trackingNumber: 'DHL-UAE-9928172',
        statusHistory: [
          { status: 'new', timestamp: new Date(Date.now() - 5 * 86400000).toISOString(), note: 'Order placed' },
          { status: 'confirmed', timestamp: new Date(Date.now() - 4 * 86400000).toISOString(), note: 'Payment verified' },
          { status: 'shipped', timestamp: new Date(Date.now() - 3 * 86400000).toISOString(), note: 'Dispatched via DHL' },
          { status: 'delivered', timestamp: new Date(Date.now() - 1 * 86400000).toISOString(), note: 'Handed to client' }
        ],
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
      },
      {
        orderNumber: 'ORD-89422-205',
        customerId: 'cust-demo-2',
        customerName: 'Youssef El-Shennawy',
        customerEmail: 'youssef.shennawy@example.com',
        customerPhone: '+201012345678',
        shippingAddress: {
          governorate: 'Cairo',
          city: 'Zamalek',
          address: '22 Gezira Street, 4th Floor'
        },
        items: [
          {
            productId: 'prod-dress-02',
            productName: "Sovereign Bias-Cut Silk Maxi Dress",
            variantSku: "LET-DR-002-CHP-M",
            color: "Champagne Pearl",
            size: "M",
            price: 320,
            quantity: 1,
            total: 320,
            image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80"
          },
          {
            productId: 'prod-cashmere-04',
            productName: "Pure Mongolian Cashmere Mockneck Sweater",
            variantSku: "LET-CS-004-OAT-M",
            color: "Oatmeal Melange",
            size: "M",
            price: 240,
            quantity: 1,
            total: 240,
            image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=600&q=80"
          }
        ],
        subtotal: 560,
        shippingCost: 0,
        shippingZoneName: 'Egypt & Levant VIP Delivery',
        discountAmount: 84,
        couponCode: 'LUXE15',
        taxAmount: 23.8,
        total: 499.8,
        currency: 'USD',
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        status: 'processing',
        trackingNumber: '',
        statusHistory: [
          { status: 'new', timestamp: new Date(Date.now() - 1 * 86400000).toISOString(), note: 'Order created' },
          { status: 'confirmed', timestamp: new Date(Date.now() - 18 * 3600000).toISOString(), note: 'Confirmed with client via phone' },
          { status: 'processing', timestamp: new Date(Date.now() - 4 * 3600000).toISOString(), note: 'Packing at Atelier' }
        ],
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 4 * 3600000).toISOString()
      }
    ];

    for (const ord of sampleOrders) {
      await addDoc(collection(db, 'orders'), ord);
    }

    res.json({
      success: true,
      message: 'Luxury Fashion Brand database seeded successfully with products, categories, coupons, pages, reviews, and admin accounts!'
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Configure Vite integration
const isDev = process.env.NODE_ENV !== 'production';

async function startServer() {
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`L'ÉTOILE Fashion Platform server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
