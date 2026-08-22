import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src/components/pos/CartPanel.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Restore KOT items logic
content = content.replace(
  /const kotItems = lines\.map\(\(l: any\) => \(\{\n\s*productId: l\.product\.id,\n\s*name: l\.product\.name,\n\s*quantity: l\.qty,\n\s*\}\)\);/g,
  \const kotItems = lines.map((l: any) => ({
      productId: l.product.id,
      name: l.product.name,
      quantity: l.qty,
      modifiers: l.modifiers || [],
      variantName: l.variantName || null,
    }));\
);

// 2. Restore modifiers display in cart
content = content.replace(
  /<div className="truncate text-sm font-semibold">\{l\.product\.name\}<\/div>/g,
  \<div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{l.product.name}</div>
                        {l.modifiers && l.modifiers.length > 0 && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                            {l.modifiers.map((m: any) => m.optionName).join(", ")}
                          </div>
                        )}
                      </div>\
);

// 3. Fix the Pay button design issue (the actual user request)
const payBtnOld = \<Button
            size="lg"
            className="h-12 md:h-14 text-sm md:text-base font-bold shadow-lg hover:shadow-xl transition-all relative overflow-hidden group w-full"
            disabled={lines.length === 0}
            onClick={() => setConfirmCheckout(true)}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-2">
                Pay{" "}
                <kbd className="hidden sm:inline-flex text-[9px] font-mono bg-primary-foreground/20 rounded px-1.5 py-0.5">
                  Ctrl+Enter
                </kbd>
              </span>
              <span className="text-xl tracking-tight">{formatCurrency(total)}</span>
            </div>
          </Button>\;

const payBtnNew = \<Button
            size="lg"
            className="h-12 md:h-14 text-sm md:text-base font-bold shadow-lg hover:shadow-xl transition-all relative overflow-hidden group w-full px-2"
            disabled={lines.length === 0}
            onClick={() => setConfirmCheckout(true)}
          >
            <div className="flex items-center justify-between w-full">
              <span className="flex items-center gap-1.5">
                <span className="uppercase tracking-wide">Pay</span>
                <kbd className="hidden lg:inline-flex text-[10px] font-mono bg-primary-foreground/20 rounded px-1.5 py-0.5">
                  Ctrl+Enter
                </kbd>
              </span>
              <span className="text-lg md:text-xl tracking-tight truncate pl-2">{formatCurrency(total)}</span>
            </div>
          </Button>\;

content = content.replace(payBtnOld, payBtnNew);

// 4. Wallet PayBtn commented out
content = content.replace(
  /<PayBtn\\n\\s*icon=\\{Banknote\\}\\n\\s*label="Wallet"\\n\\s*active=\\{payment === "wallet"\\}\\n\\s*onClick=\\{.*?\\}\\n\\s*\\/>/g,
  \{/* <PayBtn
              icon={Banknote}
              label="Wallet"
              active={payment === "wallet"}
              onClick={() => setPayment("wallet")}
            /> */}\
);

fs.writeFileSync(filePath, content);
console.log('Done');
