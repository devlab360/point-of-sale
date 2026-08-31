import fs from 'fs';

const c = fs.readFileSync('src/lib/business-templates.ts', 'utf8');

const routeCaps = {
  '/pos': ['POS'],
  '/products': ['PRODUCTS'],
  '/services': ['SERVICES'],
  '/categories': ['PRODUCTS', 'SERVICES', 'MENU'],
  '/brands': ['PRODUCTS'],
  '/units': ['PRODUCTS'],
  '/inventory': ['INVENTORY'],
  '/inventory/adjustments': ['INVENTORY'],
  '/inventory/transfers': ['INVENTORY'],
  '/inventory/history': ['INVENTORY'],
  '/purchases': ['PURCHASES'],
  '/purchases/returns': ['PURCHASES'],
  '/sales': ['POS'],
  '/quotations': ['QUOTATIONS', 'WHOLESALE'],
  '/delivery-challans': ['DELIVERY_CHALLANS', 'WHOLESALE'],
  '/sales/returns': ['POS'],
  '/customers': ['CUSTOMERS'],
  '/suppliers': ['SUPPLIERS'],
  '/users': ['STAFF'],
  '/accounts': ['ACCOUNTS'],
  '/expenses': ['EXPENSES'],
  '/reports': ['REPORTS'],
  '/accounting-reports': ['ACCOUNTS'],
  '/repairs': ['REPAIRS', 'JOB_CARDS', 'REPAIR_STATUS'],
  '/subscriptions': ['SUBSCRIPTIONS'],
  '/rentals': ['RENTALS'],
  '/coupons': ['COUPONS'],
  '/gift-cards': ['GIFT_CARDS'],
  '/loyalty': ['LOYALTY'],
  '/promotions': ['PROMOTIONS'],
  '/settings': ['SETTINGS'],
  '/notifications': [],
  '/activity': ['REPORTS', 'SETTINGS'],
  '/profile': [],
  '/help': [],
  '/portal': ['CUSTOMERS'],
  '/tables': ['TABLES'],
  '/kitchen': ['KITCHEN', 'KOT'],
  '/appointments': ['APPOINTMENTS'],
  '/repairs': ['REPAIRS', 'JOB_CARDS', 'REPAIR_STATUS'],
  '/subscriptions': ['SUBSCRIPTIONS'],
  '/rentals': ['RENTALS'],
  '/coupons': ['COUPONS'],
  '/gift-cards': ['GIFT_CARDS'],
  '/loyalty': ['LOYALTY'],
  '/promotions': ['PROMOTIONS'],
  '/settings': ['SETTINGS'],
  '/notifications': [],
  '/activity': ['REPORTS', 'SETTINGS'],
  '/profile': [],
  '/help': [],
  '/portal': ['CUSTOMERS'],
  '/tables': ['TABLES'],
  '/kitchen': ['KITCHEN', 'KOT'],
  '/appointments': ['APPOINTMENTS'],
};

const businessTypes = [
  'UNIVERSAL', 'RETAIL', 'CLOTHING', 'JEWELLERY', 'ELECTRONICS', 'GROCERY',
  'BAKERY', 'RESTAURANT', 'CAFE', 'HOTEL', 'SALON', 'BARBER', 'GYM',
  'CLINIC', 'RENTAL', 'REPAIR_CENTER', 'MOBILE_REPAIR', 'AUTO_PARTS',
  'WHOLESALE', 'PHARMACY'
];

businessTypes.forEach(type => {
  const startIdx = c.indexOf('type: "' + type + '"');
  if (startIdx === -1) return;
  const capStart = c.indexOf('capabilities:', startIdx);
  const capEnd = c.indexOf('],', capStart);
  if (capStart === -1) return;
  const capStr = c.slice(capStart, capEnd + 2);
  const caps = capStr.match(/"[A-Z_]+"/g) || [];
  
  const missing = [];
  
  Object.entries(routeCaps).forEach(([route, required]) => {
    const hasAll = required.every(r => caps.includes('"' + r + '"'));
    if (!hasAll) {
      missing.push({route, required: required.filter(r => !caps.includes('"' + r + '"'))});
    }
  });
  
  if (missing.length > 0) {
    console.log('\n' + type + ' (' + missing.length + ' routes missing):');
    missing.forEach(m => console.log('  ' + m.route + ': needs ' + m.required.join(', ')));
  }
});