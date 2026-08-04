const fs = require('fs');
const path = require('path');

function fix(file, replacements) {
  try {
    let content = fs.readFileSync(path.join(__dirname, 'src/api', file), 'utf8');
    replacements.forEach(([bad, good]) => {
      content = content.split(bad).join(good);
    });
    fs.writeFileSync(path.join(__dirname, 'src/api', file), content);
    console.log("Fixed", file);
  } catch (e) {
    console.error("Error fixing", file, e.message);
  }
}

fix('coupons.ts', [
  ['validUntil: data.coupon.validUntil ? .toISOString() : null', 'validUntil: data.coupon.validUntil ? new Date(data.coupon.validUntil).toISOString() : null']
]);

fix('gift-cards.ts', [
  ['issueDate: data.card.issueDate ? .toISOString() : .toISOString()', 'issueDate: data.card.issueDate ? new Date(data.card.issueDate).toISOString() : new Date().toISOString()'],
  ['expiryDate: data.card.expiryDate ? .toISOString() : null', 'expiryDate: data.card.expiryDate ? new Date(data.card.expiryDate).toISOString() : null']
]);

fix('inventory.ts', [
  ['date: .toISOString()', 'date: new Date(data.adjustment ? data.adjustment.date : data.transfer ? data.transfer.date : Date.now()).toISOString()'],
  ['createdAt: .toISOString()', 'createdAt: new Date().toISOString()']
]);

fix('loyalty.ts', [
  ['joinedAt: data.member.joinedAt ? .toISOString() : .toISOString()', 'joinedAt: data.member.joinedAt ? new Date(data.member.joinedAt).toISOString() : new Date().toISOString()']
]);

fix('promotions.ts', [
  ['startDate: .toISOString()', 'startDate: new Date(data.startDate).toISOString()'],
  ['endDate: .toISOString()', 'endDate: new Date(data.endDate).toISOString()'],
  ['expires: .toISOString()', 'expires: new Date(data.expires).toISOString()']
]);

fix('purchases.ts', [
  ['date: .toISOString()', 'date: new Date(data.purchase ? data.purchase.date : data.purchaseReturn ? data.purchaseReturn.date : Date.now()).toISOString()'],
  ['createdAt: .toISOString()', 'createdAt: new Date().toISOString()']
]);

fix('quotations.ts', [
  ['date: .toISOString()', 'date: new Date(data.quotation.date || Date.now()).toISOString()'],
  ['validUntil: .toISOString()', 'validUntil: new Date(data.quotation.validUntil || Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()']
]);

fix('rentals.ts', [
  ['rentStartDate: .toISOString()', 'rentStartDate: new Date(data.rental.rentStartDate).toISOString()'],
  ['expectedReturnDate: .toISOString()', 'expectedReturnDate: new Date(data.rental.expectedReturnDate).toISOString()']
]);

fix('repairs.ts', [
  ['createdAt: data.repair.createdAt ? .toISOString() : .toISOString()', 'createdAt: data.repair.createdAt ? new Date(data.repair.createdAt).toISOString() : new Date().toISOString()']
]);

fix('returns.ts', [
  ['date: .toISOString()', 'date: new Date(data.returnData.date || Date.now()).toISOString()']
]);

fix('services.ts', [
  ['rentStartDate: .toISOString()', 'rentStartDate: new Date(data.rental.rentStartDate).toISOString()'],
  ['expectedReturnDate: .toISOString()', 'expectedReturnDate: new Date(data.rental.expectedReturnDate).toISOString()'],
  ['date: .toISOString()', 'date: new Date(data.repair.date || Date.now()).toISOString()'],
  ['nextBillingDate: .toISOString()', 'nextBillingDate: new Date(data.subscription.nextBillingDate).toISOString()']
]);
