import React from 'react';
import { Coins, ShieldCheck, MapPin, Scale, Lock, TrendingUp, ExternalLink, AlertTriangle } from 'lucide-react';
import { URDU_FONT, type Lang } from './AdvancedLibrary';

type Sec = { icon: React.ElementType; en: [string, string, string[]]; ur: [string, string, string[]] };

/** Educational guide to buying physical gold in Pakistan. No live prices or specific dealer endorsements. */
const SECTIONS: Sec[] = [
  {
    icon: Coins,
    en: ['Why physical gold', 'Gold holds its value over the long run and tends to rise when the rupee weakens or inflation is high, so Pakistanis have long used it to protect savings. It is a store of value, not a monthly income — treat it as the safe, long-term anchor of your wealth, alongside stocks and funds, not as a quick trade.', ['Protects savings against rupee weakness & inflation', 'A long-term store of value, not monthly income', 'Hold for years, not for quick trading']],
    ur: ['فزیکل گولڈ کیوں', 'سونا طویل مدت میں اپنی قدر برقرار رکھتا ہے اور روپے کے کمزور ہونے یا مہنگائی بڑھنے پر عموماً اوپر جاتا ہے، اسی لیے پاکستانی عرصے سے بچت کے تحفظ کے لیے اسے رکھتے ہیں۔ یہ قدر محفوظ رکھنے کا ذریعہ ہے، ماہانہ آمدنی نہیں — اسے اسٹاک اور فنڈ کے ساتھ اپنی دولت کا محفوظ، طویل مدتی سہارا سمجھیں، فوری ٹریڈ نہیں۔', ['روپے کی کمزوری اور مہنگائی کے خلاف تحفظ', 'طویل مدتی قدر محفوظ رکھنے کا ذریعہ', 'برسوں کے لیے رکھیں، فوری ٹریڈ نہیں']],
  },
  {
    icon: Scale,
    en: ['Forms & purity (karat)', '24K is pure gold (99.9%) — bars and coins are usually 24K and closest to the real price. Jewellery is 22K (91.6%) or 21K because pure gold is too soft to wear. Weight is sold in tola (≈ 11.66 g) and grams. For investment, bars and coins give you the most gold for your money; jewellery carries extra “making charges”.', ['24K = pure (bars/coins); 22K/21K = jewellery', '1 tola ≈ 11.66 grams', 'For investment, prefer bars/coins over jewellery']],
    ur: ['اقسام اور پاکیزگی (کیرٹ)', '24 کیرٹ خالص سونا ہے (99.9%) — بار اور سکے عموماً 24K اور اصل قیمت کے قریب ترین ہوتے ہیں۔ زیورات 22K (91.6%) یا 21K کے ہوتے ہیں کیونکہ خالص سونا پہننے کے لیے بہت نرم ہے۔ وزن تولہ (≈ 11.66 گرام) اور گرام میں بکتا ہے۔ سرمایہ کاری کے لیے بار اور سکے سب سے زیادہ سونا دیتے ہیں؛ زیورات پر اضافی ”میکنگ چارجز“ لگتے ہیں۔', ['24K = خالص (بار/سکے)؛ 22K/21K = زیورات', '1 تولہ ≈ 11.66 گرام', 'سرمایہ کاری کے لیے زیورات کی بجائے بار/سکے']],
  },
  {
    icon: MapPin,
    en: ['Where to buy in Pakistan', 'The main places are the Sarafa (gold) bazaars in every city, well-known branded/established jewellers, and some banks and online platforms that sell certified gold. For pure investment gold, ask for 24K bars/coins with an assay certificate. Prefer sellers who are members of a recognised jewellers’ association and who give a proper printed receipt.', ['Sarafa bazaars, established jewellers, some banks', 'Ask for 24K bars/coins with an assay certificate', 'Buy from association members who give a receipt']],
    ur: ['پاکستان میں کہاں سے خریدیں', 'اہم جگہیں ہر شہر کے صرافہ (سونے) بازار، معروف و مستند جوہری، اور کچھ بینک و آن لائن پلیٹ فارم ہیں جو سرٹیفائیڈ سونا بیچتے ہیں۔ خالص سرمایہ کاری والے سونے کے لیے اسے سرٹیفکیٹ کے ساتھ 24K بار/سکے مانگیں۔ ایسے بیچنے والے کو ترجیح دیں جو تسلیم شدہ جوہری ایسوسی ایشن کے رکن ہوں اور باقاعدہ پرنٹ شدہ رسید دیں۔', ['صرافہ بازار، مستند جوہری، کچھ بینک', 'اسے سرٹیفکیٹ کے ساتھ 24K بار/سکے مانگیں', 'ایسوسی ایشن کے رکن سے خریدیں جو رسید دیں']],
  },
  {
    icon: ShieldCheck,
    en: ['How to verify (avoid being cheated)', 'Always confirm the karat, the exact weight on a calibrated scale, and the day’s rate (gold rates are published daily by the local Sarafa association). Get a receipt showing purity, weight, rate and making charges separately. For bars/coins, insist on a hallmark/assay certificate. If a price looks far below the market rate, walk away — it is a warning sign.', ['Check karat, weight on scale, and the day’s rate', 'Receipt must show purity, weight, rate & making charges', 'A too-good price is a red flag — walk away']],
    ur: ['کیسے تصدیق کریں (دھوکے سے بچیں)', 'ہمیشہ کیرٹ، کیلیبریٹڈ ترازو پر درست وزن، اور دن کا ریٹ (سونے کے ریٹ مقامی صرافہ ایسوسی ایشن روزانہ شائع کرتی ہے) کی تصدیق کریں۔ ایسی رسید لیں جس پر پاکیزگی، وزن، ریٹ اور میکنگ چارجز الگ الگ ہوں۔ بار/سکوں کے لیے ہال مارک/اسے سرٹیفکیٹ پر اصرار کریں۔ اگر قیمت مارکیٹ ریٹ سے بہت کم لگے تو رک جائیں — یہ خطرے کی علامت ہے۔', ['کیرٹ، ترازو پر وزن، اور دن کا ریٹ دیکھیں', 'رسید پر پاکیزگی، وزن، ریٹ اور میکنگ چارجز ہوں', 'بہت کم قیمت خطرے کی علامت ہے — رک جائیں']],
  },
  {
    icon: Lock,
    en: ['Storage, safety, Zakat & tax', 'Keep investment gold in a bank locker or a home safe, and keep every receipt and certificate — they prove ownership and purity at resale. Gold is zakatable: Zakat (2.5%) is due on gold you hold above the nisab for a full year. Tax rules on buying/selling gold change — confirm the current position with a tax adviser or the FBR rather than assuming.', ['Bank locker or safe; keep all receipts/certificates', 'Zakat 2.5% on holdings above nisab, held a year', 'Confirm current buy/sell tax with FBR / an adviser']],
    ur: ['ذخیرہ، حفاظت، زکوٰۃ اور ٹیکس', 'سرمایہ کاری والا سونا بینک لاکر یا گھر کی محفوظ تجوری میں رکھیں، اور ہر رسید و سرٹیفکیٹ سنبھالیں — یہ دوبارہ فروخت پر ملکیت اور پاکیزگی ثابت کرتے ہیں۔ سونے پر زکوٰۃ ہے: نصاب سے اوپر سال بھر رکھے سونے پر 2.5% زکوٰۃ واجب ہے۔ سونے کی خرید و فروخت پر ٹیکس کے قواعد بدلتے ہیں — فرض کرنے کے بجائے موجودہ صورتحال ٹیکس مشیر یا FBR سے تصدیق کریں۔', ['بینک لاکر یا تجوری؛ تمام رسیدیں/سرٹیفکیٹ سنبھالیں', 'نصاب سے اوپر سال بھر رکھے سونے پر 2.5% زکوٰۃ', 'خرید/فروخت ٹیکس FBR یا مشیر سے تصدیق کریں']],
  },
  {
    icon: TrendingUp,
    en: ['Long-term investing alongside gold', 'Gold protects; stocks and funds grow. A balanced long-term plan keeps part in gold and the rest in quality dividend-paying shares or a low-cost index fund, added to every month. For hands-off exposure to gold without storing metal, some mutual funds hold gold. Use the Markets tab to explore PSX blue chips and world indices, and the Invest courses to learn the steps.', ['Balance: some gold + quality stocks/index funds', 'Add to both every month for the long term', 'See the Markets tab and the Invest courses']],
    ur: ['سونے کے ساتھ طویل مدتی سرمایہ کاری', 'سونا تحفظ دیتا ہے؛ اسٹاک اور فنڈ ترقی۔ متوازن طویل مدتی منصوبہ کچھ حصہ سونے میں اور باقی معیاری ڈیویڈنڈ دینے والے شیئرز یا کم لاگت انڈیکس فنڈ میں رکھتا ہے، ہر مہینے اضافہ کے ساتھ۔ دھات رکھے بغیر سونے میں شمولیت کے لیے کچھ میوچل فنڈ سونا رکھتے ہیں۔ PSX بلیو چپس اور عالمی انڈیکس دیکھنے کے لیے مارکیٹ ٹیب اور قدم سیکھنے کے لیے انویسٹ کورسز استعمال کریں۔', ['توازن: کچھ سونا + معیاری اسٹاک/انڈیکس فنڈ', 'طویل مدت کے لیے ہر مہینے دونوں میں اضافہ', 'مارکیٹ ٹیب اور انویسٹ کورسز دیکھیں']],
  },
];

export const PhysicalGold: React.FC<{ lang: Lang }> = ({ lang }) => {
  const ur = lang === 'ur';
  const uf = ur ? URDU_FONT : undefined;
  return (
    <div className="space-y-4" data-testid="physical-gold" dir={ur ? 'rtl' : 'ltr'}>
      <section className="rounded-3xl border border-amber-400/30 bg-[radial-gradient(ellipse_at_top_left,rgba(251,191,36,0.18),transparent_60%),#120d04] p-5 sm:p-6 space-y-2">
        <div className="text-[11px] font-mono-code uppercase tracking-[0.25em] text-amber-300" dir="ltr">Physical Gold · Pakistan</div>
        <h2 className="text-xl sm:text-3xl font-black text-white" style={uf}>{ur ? 'فزیکل گولڈ خریدنا — پاکستان' : 'Buying Physical Gold — Pakistan'}</h2>
        <p className={`text-[13px] text-slate-300 max-w-3xl ${ur ? 'leading-[2.2]' : 'leading-relaxed'}`} style={uf}>
          {ur
            ? 'پاکستان میں جسمانی سونا خریدنے، پرکھنے، محفوظ رکھنے اور طویل مدتی سرمایہ کاری کے ساتھ متوازن رکھنے کی مکمل رہنمائی — آسان الفاظ میں۔'
            : 'A complete, plain-language guide to buying, checking, storing and balancing physical gold with long-term investing — for Pakistan.'}
        </p>
      </section>

      <div className="grid md:grid-cols-2 gap-3">
        {SECTIONS.map((s, i) => {
          const [title, body, points] = ur ? s.ur : s.en;
          return (
            <section key={i} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-300 to-yellow-500 text-amber-950 flex items-center justify-center shrink-0"><s.icon className="w-5 h-5" /></span>
                <h3 className="text-[15px] font-black text-white" style={uf}>{title}</h3>
              </div>
              <p className={`text-[12.5px] text-slate-300 ${ur ? 'leading-[2.2]' : 'leading-relaxed'}`} style={uf}>{body}</p>
              <ul className="space-y-1 pt-1">
                {points.map((p, j) => (
                  <li key={j} className="flex items-start gap-2 text-[12px] text-slate-200" style={uf}>
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />{p}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3.5 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-[12px] text-amber-100/90" style={uf}>
          {ur
            ? 'یہ تعلیمی رہنمائی ہے، سرمایہ کاری کا مشورہ نہیں، اور کسی مخصوص دکان کی توثیق نہیں کرتی۔ موجودہ سونے کے ریٹ اپنی مقامی صرافہ ایسوسی ایشن سے دیکھیں۔'
            : 'This is educational guidance, not investment advice, and does not endorse any specific shop. Check the current gold rate with your local Sarafa association.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2" dir="ltr">
        <a href="https://www.sbp.org.pk" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-[12px] font-semibold text-amber-200 hover:text-white">State Bank of Pakistan<ExternalLink className="w-3 h-3" /></a>
        <a href="https://www.fbr.gov.pk" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-[12px] font-semibold text-amber-200 hover:text-white">FBR (tax)<ExternalLink className="w-3 h-3" /></a>
      </div>
    </div>
  );
};

export default PhysicalGold;
