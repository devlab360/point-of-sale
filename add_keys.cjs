const fs = require('fs');

const path = 'src/contexts/LanguageContext.tsx';
let content = fs.readFileSync(path, 'utf8');

const keysToAdd = {
  en: {
    overview: "Overview",
    catalog: "Catalog",
    brands: "Brands",
    units: "Units",
    stock: "Stock",
    inventory: "Inventory",
    adjustments: "Adjustments",
    transfers: "Transfers",
    stockHistory: "Stock History",
    tradeB2B: "Trade & B2B",
    purchaseReturns: "Purchase Returns",
    salesInvoices: "Sales Invoices",
    quotations: "Quotations",
    deliveryChallans: "Delivery Challans",
    people: "People",
    employees: "Employees",
    finance: "Finance & Accounts",
    accounts: "Chart of Accounts",
    reports: "Financial Reports",
    services: "Services & Verticals",
    repairs: "Repair Job Sheets",
    subscriptions: "Subscriptions",
    rentals: "Equipment Rentals",
    marketing: "Marketing",
    coupons: "Coupons",
    giftCards: "Gift Cards",
    loyalty: "Loyalty",
    promotions: "Promotions",
    system: "System",
    superAdmin: "Super Admin SaaS",
    clientPortal: "Client Portal",
    activityLog: "Activity Log"
  },
  bn: {
    overview: "ওভারভিউ",
    catalog: "ক্যাটালগ",
    brands: "ব্র্যান্ড",
    units: "ইউনিট",
    stock: "স্টক",
    inventory: "ইনভেন্টরি",
    adjustments: "অ্যাডজাস্টমেন্ট",
    transfers: "ট্রান্সফার",
    stockHistory: "স্টক হিস্ট্রি",
    tradeB2B: "ট্রেড ও বিটুবি",
    purchaseReturns: "ক্রয় ফেরত",
    salesInvoices: "বিক্রয় ইনভয়েস",
    quotations: "কোটেশন",
    deliveryChallans: "ডেলিভারি চালান",
    people: "লোকজন",
    employees: "কর্মচারী",
    finance: "অর্থ ও হিসাব",
    accounts: "হিসাবের তালিকা",
    reports: "আর্থিক প্রতিবেদন",
    services: "পরিষেবা",
    repairs: "মেরামত জব শিট",
    subscriptions: "সাবস্ক্রিপশন",
    rentals: "ভাড়া",
    marketing: "মার্কেটিং",
    coupons: "কুপন",
    giftCards: "গিফট কার্ড",
    loyalty: "লয়্যালটি",
    promotions: "প্রোমোশন",
    system: "সিস্টেম",
    superAdmin: "সুপার অ্যাডমিন",
    clientPortal: "ক্লাইন্ট পোর্টাল",
    activityLog: "অ্যাক্টিভিটি লগ"
  },
  ar: {
    overview: "نظرة عامة",
    catalog: "فهرس",
    brands: "العلامات التجارية",
    units: "الوحدات",
    stock: "المخزون",
    inventory: "الجرد",
    adjustments: "التعديلات",
    transfers: "التحويلات",
    stockHistory: "سجل المخزون",
    tradeB2B: "التجارة والشركات",
    purchaseReturns: "مرتجعات المشتريات",
    salesInvoices: "فواتير المبيعات",
    quotations: "عروض الأسعار",
    deliveryChallans: "إيصالات التسليم",
    people: "الأشخاص",
    employees: "الموظفون",
    finance: "المالية والحسابات",
    accounts: "دليل الحسابات",
    reports: "التقارير المالية",
    services: "الخدمات",
    repairs: "أوراق عمل الإصلاح",
    subscriptions: "الاشتراكات",
    rentals: "تأجير المعدات",
    marketing: "التسويق",
    coupons: "الكوبونات",
    giftCards: "بطاقات الهدايا",
    loyalty: "الولاء",
    promotions: "العروض الترويجية",
    system: "النظام",
    superAdmin: "المدير المتميز",
    clientPortal: "بوابة العميل",
    activityLog: "سجل النشاط"
  },
  hi: {
    overview: "अवलोकन",
    catalog: "कैटलॉग",
    brands: "ब्रांड",
    units: "इकाइयाँ",
    stock: "स्टॉक",
    inventory: "इन्वेंटरी",
    adjustments: "समायोजन",
    transfers: "स्थानांतरण",
    stockHistory: "स्टॉक इतिहास",
    tradeB2B: "व्यापार और बी2बी",
    purchaseReturns: "खरीद वापसी",
    salesInvoices: "बिक्री चालान",
    quotations: "कोटेशन",
    deliveryChallans: "डिलीवरी चालान",
    people: "लोग",
    employees: "कर्मचारी",
    finance: "वित्त और खाते",
    accounts: "खातों का चार्ट",
    reports: "वित्तीय रिपोर्ट",
    services: "सेवाएं",
    repairs: "मरम्मत जॉब शीट",
    subscriptions: "सदस्यता",
    rentals: "किराये पर देना",
    marketing: "मार्केटिंग",
    coupons: "कूपन",
    giftCards: "गिफ्ट कार्ड",
    loyalty: "वफादारी",
    promotions: "प्रचार",
    system: "सिस्टम",
    superAdmin: "सुपर एडमिन",
    clientPortal: "ग्राहक पोर्टल",
    activityLog: "गतिविधि लॉग"
  },
  zh: {
    overview: "概览",
    catalog: "目录",
    brands: "品牌",
    units: "单位",
    stock: "库存",
    inventory: "存货",
    adjustments: "调整",
    transfers: "调拨",
    stockHistory: "库存历史",
    tradeB2B: "贸易与 B2B",
    purchaseReturns: "采购退货",
    salesInvoices: "销售发票",
    quotations: "报价单",
    deliveryChallans: "交货单",
    people: "人员",
    employees: "员工",
    finance: "财务与账户",
    accounts: "会计科目表",
    reports: "财务报告",
    services: "服务",
    repairs: "维修工单",
    subscriptions: "订阅",
    rentals: "设备租赁",
    marketing: "营销",
    coupons: "优惠券",
    giftCards: "礼品卡",
    loyalty: "忠诚度",
    promotions: "促销",
    system: "系统",
    superAdmin: "超级管理员",
    clientPortal: "客户门户",
    activityLog: "活动日志"
  }
};

let lines = content.split('\n');
let newLines = [];
let currentLang = null;
let inBlock = false;

for (let line of lines) {
  let langMatch = line.match(/^\s*(en|bn|ar|hi|zh):\s*\{/);
  if (langMatch) {
    currentLang = langMatch[1];
    inBlock = true;
    newLines.push(line);
    continue;
  }
  
  if (inBlock && line.match(/^\s*\}/)) {
    // We hit the end of a block. Insert all keys for currentLang.
    let keys = keysToAdd[currentLang];
    for (let k in keys) {
      newLines.push(`    ${k}: "${keys[k]}",`);
    }
    
    inBlock = false;
    currentLang = null;
    newLines.push(line);
    continue;
  }
  
  newLines.push(line);
}

fs.writeFileSync(path, newLines.join('\n'));
console.log('Added missing keys');
