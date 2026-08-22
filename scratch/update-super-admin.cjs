const fs = require('fs');
const file = 'd:\\Samim_Development\\Coding\\pos application\\pos-super-admin\\src\\lib\\menu-config.ts';
let code = fs.readFileSync(file, 'utf8');

const search = '{ to: "/rentals", label: "Equipment Rentals", tkey: "rentals", icon: noop, roles: ["admin", "manager"] },';
const replace = search + '\n      { to: "/tables", label: "Table Management", tkey: "tables", icon: noop, roles: ["admin", "manager"] },\n      { to: "/kitchen", label: "Kitchen (KOT)", tkey: "kitchen", icon: noop, roles: ["admin", "manager"] },\n      { to: "/appointments", label: "Appointments", tkey: "appointments", icon: noop, roles: ["admin", "manager"] },';

code = code.replace(search, replace);
fs.writeFileSync(file, code);
console.log('Successfully updated super admin menu-config.ts');
