/* Hand-written Urdu narration for every category of the Command Center.
   Each line is [short English title, Roman Urdu (what viewers read, WhatsApp style), Urdu script (what the voice speaks)]. */
export type PackLine = [title: string, roman: string, urdu: string, match?: RegExp];
export interface CategoryPack { hook: [roman: string, urdu: string]; parts: PackLine[] }

export const OVERVIEW_LINE: [string, string] = ['Aaiye dekhte hain, is section mein aap ko kya kya milta hai.', 'آئیے دیکھتے ہیں، اس سیکشن میں آپ کو کیا کیا ملتا ہے۔'];
export const OUTRO_LINE: [string, string] = ['Poora platform dekhne ke liye, link bio mein hai.', 'پورا پلیٹ فارم دیکھنے کے لیے، لنک بائیو میں ہے۔'];

const P = (t: string, r: string, u: string, m?: RegExp): PackLine => [t, r, u, m];

export const PACKS: Record<string, CategoryPack> = {
  DASHBOARD: { hook: ['Aap ka poora trading control room, ek hi screen par.', 'آپ کا پورا ٹریڈنگ کنٹرول روم، ایک ہی اسکرین پر۔'], parts: [
    P('Account and Balance', 'Demo ho ya real, har account ka balance aur profit loss ek jagah.', 'ڈیمو ہو یا ریئل، ہر اکاؤنٹ کا بیلنس اور پرافٹ لاس ایک جگہ۔', /BALANCE|Demo Preview|Switch/),
    P('Challenge Targets', 'Prop firm challenge ka target aur daily loss limit, live progress ke saath.', 'پراپ فرم چیلنج کا ٹارگٹ اور ڈیلی لاس لمٹ، لائیو پروگریس کے ساتھ۔', /PRACTICE TARGET|DAILY LOSS \(/),
    P('Next Trade Risk Coach', 'Agli trade par kitna risk lena hai, paison mein bata deta hai.', 'اگلی ٹریڈ پر کتنا رسک لینا ہے، پیسوں میں بتا دیتا ہے۔', /RISK COACH/),
    P('Command Readiness', 'Trade se pehle readiness check. Green ho, tabhi aage barhein.', 'ٹریڈ سے پہلے ریڈی نس چیک۔ گرین ہو، تبھی آگے بڑھیں۔', /readiness|defcon/i),
    P('Performance Score', 'Aap ki trading ka score, zero se sau tak.', 'آپ کی ٹریڈنگ کا اسکور، صفر سے سو تک۔', /PERFORMANCE SCORE|score/i),
    P('Fundamental Surprise', 'Top long term pairs ka surprise, ek click mein reveal.', 'ٹاپ لانگ ٹرم پیئرز کا سرپرائز، ایک کلک میں ریویل۔', /FUNDAMENTAL SURPRISE/),
    P('Recent Trades', 'Haal hi ki trades, aur lot size aur risk plan ke shortcuts.', 'حال ہی کی ٹریڈز، اور لاٹ سائز اور رسک پلان کے شارٹ کٹس۔', /RECENT COMBAT|Risk plan/)] },
  JOURNAL: { hook: ['Jo trade likhta hai, wohi seekhta hai.', 'جو ٹریڈ لکھتا ہے، وہی سیکھتا ہے۔'], parts: [
    P('Trade Vault', 'Aap ki har trade, ek mehfooz vault mein.', 'آپ کی ہر ٹریڈ، ایک محفوظ والٹ میں۔', /TRADE VAULT/),
    P('Win Loss Diagnostic', 'A plus wins aur good losses ka diagnostic, khud ba khud.', 'اے پلس ونز اور گڈ لاسز کا ڈائیگنوسٹک، خود بخود۔', /DIAGNOSTIC/),
    P('Screenshot Upload', 'TradingView ka screenshot upload karein, trade ke saath jod dein.', 'ٹریڈنگ ویو کا اسکرین شاٹ اپلوڈ کریں، ٹریڈ کے ساتھ جوڑ دیں۔', /Upload TradingView|Screenshot/i),
    P('Smart Filters', 'Instrument, strategy, grade aur outcome se trades filter karein.', 'انسٹرومنٹ، اسٹریٹجی، گریڈ اور آؤٹ کم سے ٹریڈز فلٹر کریں۔', /All Instruments|All Strategies|All Grades/),
    P('Grades and R Multiple', 'Har trade ka grade, R multiple aur net profit loss.', 'ہر ٹریڈ کا گریڈ، آر ملٹیپل اور نیٹ پرافٹ لاس۔', /R-MULT|NET P&L|PSYCH DIAGNOSTIC/),
    P('Record New Trade', 'Nayi trade record karna, bas ek button door.', 'نئی ٹریڈ ریکارڈ کرنا، بس ایک بٹن دور۔', /RECORD (NEW )?TRADE/)] },
  SBT_MODELS: { hook: ['Das institutional models, source ke saath verified.', 'دس انسٹی ٹیوشنل ماڈلز، سورس کے ساتھ ویریفائیڈ۔'], parts: [
    P('Verified Source', 'Har model official SBT PDF se verify kiya gaya hai.', 'ہر ماڈل آفیشل ایس بی ٹی پی ڈی ایف سے ویریفائی کیا گیا ہے۔', /SOURCE VERIFIED|Official SBT PDF/),
    P('All 10 Models', 'Das models, aur har ke verbatim rules, locked.', 'دس ماڈلز، اور ہر کے ہو بہو رولز، لاکڈ۔', /Models Verified|All Models/),
    P('Model Categories', 'Continuation, reversal, liquidity aur turtle soup, category ke hisab se.', 'کنٹینیوایشن، ریورسل، لیکویڈیٹی اور ٹرٹل سوپ، کیٹیگری کے حساب سے۔', /Continuation Models|Reversal Models|Category/),
    P('Inspect Rules', 'Kisi bhi model par click karein, poore rules dekhein.', 'کسی بھی ماڈل پر کلک کریں، پورے رولز دیکھیں۔', /Inspect Model/),
    P('Q and A and Progress', 'Sawal jawab aur apni SBT progress ka hisab.', 'سوال جواب اور اپنی ایس بی ٹی پروگریس کا حساب۔', /SBT Q&A|SBT Progress/),
    P('SBT Bot 2027', 'Naye saal SBT bot aa raha hai, abhi pre register karein.', 'نئے سال ایس بی ٹی بوٹ آ رہا ہے، ابھی پری رجسٹر کریں۔', /SBT Bot 2027|COMING SOON/)] },
  LOT_SIZE: { hook: ['Galat lot size account ud jati hai. Ye calculator bachata hai.', 'غلط لاٹ سائز اکاؤنٹ اڑا دیتی ہے۔ یہ کیلکولیٹر بچاتا ہے۔'], parts: [
    P('Pair and Pip Value', 'Pair khud detect hota hai, pip ki value live.', 'پیئر خود ڈیٹیکٹ ہوتا ہے، پپ کی ویلیو لائیو۔', /PAIR \/ INSTRUMENT|Detected/),
    P('Many Currencies', 'Dollar, cent, rupee aur kai currencies ke account support hain.', 'ڈالر، سینٹ، روپے اور کئی کرنسیوں کے اکاؤنٹ سپورٹ ہیں۔', /ACCOUNT BALANCE|PKR/),
    P('Risk Percentage', 'Risk percent ke ready buttons, aur paison mein max risk.', 'رسک پرسنٹ کے ریڈی بٹنز، اور پیسوں میں میکس رسک۔', /RISK PERCENTAGE|Max Risk Amount/),
    P('Stop Loss Distance', 'Stop loss pips mein dein, ya entry aur SL price se.', 'اسٹاپ لاس پپس میں دیں، یا انٹری اور ایس ایل پرائس سے۔', /STOP LOSS DISTANCE/),
    P('Exact Lot Size', 'Standard, mini aur micro lot ka sahi hisab, TP targets ke saath.', 'اسٹینڈرڈ، مِنی اور مائیکرو لاٹ کا صحیح حساب، ٹی پی ٹارگٹس کے ساتھ۔', /RECOMMENDED LOT SIZE|OFFICIAL LOT/),
    P('Over-Risk Safeguard', 'Apni lot size daalein, zyada risk par foran warning.', 'اپنی لاٹ سائز ڈالیں، زیادہ رسک پر فوراً وارننگ۔', /MANUAL LOT SIZE|Over-Risk/),
    P('Saved History', 'Har calculation save hoti hai, ek click mein wapas.', 'ہر کیلکولیشن سیو ہوتی ہے، ایک کلک میں واپس۔', /CALCULATION HISTORY/)] },
  RISK: { hook: ['Risk sambhal liya, to account bach gaya.', 'رسک سنبھال لیا، تو اکاؤنٹ بچ گیا۔'], parts: [
    P('Safe To Execute', 'Status saaf: trade karna safe hai ya nahi.', 'اسٹیٹس صاف: ٹریڈ کرنا سیف ہے یا نہیں۔', /SAFE TO EXECUTE|STATUS:/),
    P('Core Risk Limits', 'Ek percent per trade, daily loss limit aur max drawdown guard.', 'ایک فیصد پر ٹریڈ، ڈیلی لاس لمٹ اور میکس ڈراڈاؤن گارڈ۔', /MAX RISK PER TRADE|DAILY LOSS LIMIT|MAX DRAWDOWN/),
    P('Risk Ladder', 'Drawdown barhe to allowed risk khud kam ho jata hai.', 'ڈراڈاؤن بڑھے تو الاؤڈ رسک خود کم ہو جاتا ہے۔', /RISK LADDER/),
    P('Losses Left', 'Daily stop aur max loss se pehle kitni losses ki gunjaish hai.', 'ڈیلی اسٹاپ اور میکس لاس سے پہلے کتنی لاسز کی گنجائش ہے۔', /LOSSES BEFORE|DAILY LOSS LEFT/),
    P('Losing Streak Odds', 'Lagataar losses ka chance, number mein. Haqeeqat se pehle tayyari.', 'لگاتار لاسز کا چانس، نمبرز میں۔ حقیقت سے پہلے تیاری۔', /LOSING STREAKS/),
    P('Complete Risk Guides', 'Risk ki poori guides, formula ke saath.', 'رسک کی پوری گائیڈز، فارمولے کے ساتھ۔', /COMPLETE RISK GUIDES/)] },
  PRE_TRADE_PLAN: { hook: ['Plan ke bina trade? Yahan wo mumkin hi nahi.', 'پلان کے بغیر ٹریڈ؟ یہاں وہ ممکن ہی نہیں۔'], parts: [
    P('Three Phase Gatekeeper', 'Teen phase ka rule engine, jazbaat ke bina execution.', 'تین فیز کا رول انجن، جذبات کے بغیر ایگزیکیوشن۔', /LOCK MODULE|PHASE 1/),
    P('News and COT Check', 'Pehle news aur COT report check karein, phir mark karein.', 'پہلے نیوز اور سی او ٹی رپورٹ چیک کریں، پھر مارک کریں۔', /CHECK NEWS/),
    P('Timeframe Check', 'Multi timeframe analysis ka check, step by step.', 'ملٹی ٹائم فریم اینالسس کا چیک، مرحلہ وار۔', /TIME FRAME ANALYSIS/),
    P('Five Conditions', 'Paanch conditions ki checklist, poori na ho to aage nahi.', 'پانچ کنڈیشنز کی چیک لسٹ، پوری نہ ہو تو آگے نہیں۔', /FIVE CONDITIONS/),
    P('Risk Defense and Entry', 'Phase do mein lot size, ek do reward aur entry.', 'فیز دو میں لاٹ سائز، ایک دو ریوارڈ اور انٹری۔', /PHASE 2/),
    P('Journal Logging', 'Phase teen mein trade seedha journal mein save.', 'فیز تین میں ٹریڈ سیدھا جرنل میں سیو۔', /PHASE 3/)] },
  FUNDAMENTAL_CALENDAR: { hook: ['Khabar se pehle khabar. Live news calendar.', 'خبر سے پہلے خبر۔ لائیو نیوز کیلنڈر۔'], parts: [
    P('Live Feed', 'TradingView se seedha live feed, Forex Factory ke andaaz mein.', 'ٹریڈنگ ویو سے سیدھا لائیو فیڈ، فاریکس فیکٹری کے انداز میں۔', /LIVE TRADINGVIEW|Live News Calendar/),
    P('Pakistan Time', 'Poora calendar Pakistan ke waqt mein, live countdown ke saath.', 'پورا کیلنڈر پاکستان کے وقت میں، لائیو کاؤنٹ ڈاؤن کے ساتھ۔', /PKT \(UTC\+5\)|Red Folder/),
    P('Date Ranges', 'Aaj, is hafte ya agle hafte ki news, ek click mein.', 'آج، اس ہفتے یا اگلے ہفتے کی نیوز، ایک کلک میں۔', /This Week|Next Week|Today/),
    P('Impact and Currency', 'High impact news aur currency ke hisab se filter.', 'ہائی امپیکٹ نیوز اور کرنسی کے حساب سے فلٹر۔', /High \(|ALL USD EUR/),
    P('Actual Forecast Previous', 'Har khabar ke actual, forecast aur previous figures.', 'ہر خبر کے ایکچوئل، فورکاسٹ اور پریویس فگرز۔', /ACTUAL|FORECAST|PREVIOUS/),
    P('Expand All', 'Ek click mein har event ki poori detail kholein.', 'ایک کلک میں ہر ایونٹ کی پوری تفصیل کھولیں۔', /Expand All/)] },
  FUNDAMENTAL_INDICATORS: { hook: ['Bade players kya kar rahe hain? Ab aap bhi dekhein.', 'بڑے کھلاڑی کیا کر رہے ہیں؟ اب آپ بھی دیکھیں۔'], parts: [
    P('Currency Strength', 'Kaun si currency sab se mazboot, kaun si sab se kamzor.', 'کون سی کرنسی سب سے مضبوط، کون سی سب سے کمزور۔', /CURRENCY STRENGTH/),
    P('Bull and Bear Scores', 'Har currency ka bullish bearish score aur confidence.', 'ہر کرنسی کا بُلش بیئرش اسکور اور کانفیڈنس۔', /conf \d+%|MILD BEARISH|BULLISH/),
    P('COT Report', 'Bade institutions ki positioning, CFTC COT report se.', 'بڑے اداروں کی پوزیشننگ، سی ایف ٹی سی سی او ٹی رپورٹ سے۔', /CFTC COT/),
    P('Retail Sentiment', 'Retail crowd kidhar khara hai, contrarian nazariye se.', 'ریٹیل کراؤڈ کدھر کھڑا ہے، کنٹرارین نظریے سے۔', /Sentiment/),
    P('Financial Universe', 'Har asset ek live naqshe par, forex se crypto tak.', 'ہر ایسیٹ ایک لائیو نقشے پر، فاریکس سے کرپٹو تک۔', /Financial Universe/),
    P('Scenario Lab', 'Agar Fed rate kam kare to kya palatta hai, pehle dekh lein.', 'اگر فیڈ ریٹ کم کرے تو کیا پلٹتا ہے، پہلے دیکھ لیں۔', /Scenario Lab/),
    P('Sources and Audit', 'Pakistan news aur data audit, har number ka source saaf.', 'پاکستان نیوز اور ڈیٹا آڈٹ، ہر نمبر کا سورس صاف۔', /Pakistan News|Data Audit/)] },
  SIGNALS: { hook: ['Premium signals, poori wajah ke saath.', 'پریمیم سگنلز، پوری وجہ کے ساتھ۔'], parts: [
    P('Live Signals', 'Institutional trade setups live, TP aur SL ke saath.', 'انسٹی ٹیوشنل ٹریڈ سیٹ اپس لائیو، ٹی پی اور ایس ایل کے ساتھ۔', /ACTIVE INSTITUTIONAL SIGNALS|ACTIVE SIGNALS/),
    P('Admin Only Dispatch', 'Signal sirf admin bhejta hai, koi nakli signal nahi.', 'سگنل صرف ایڈمن بھیجتا ہے، کوئی نقلی سگنل نہیں۔', /Only Admin Creates/),
    P('Real Time Feed', 'Signal jari hote hi students ko foran mil jata hai.', 'سگنل جاری ہوتے ہی اسٹوڈنٹس کو فوراً مل جاتا ہے۔', /Real-Time Student Feed|NO ACTIVE SIGNALS/),
    P('Reports and Outcomes', 'Har signal ka nateeja, reports mein mehfooz.', 'ہر سگنل کا نتیجہ، رپورٹس میں محفوظ۔', /REPORTS & OUTCOMES/),
    P('Announcements', 'Zaroori elaanat bhi isi hub mein.', 'ضروری اعلانات بھی اسی ہب میں۔', /ANNOUNCEMENTS/)] },
  PRO_TRADING: { hook: ['Professional charts, seedha app ke andar.', 'پروفیشنل چارٹس، سیدھا ایپ کے اندر۔'], parts: [
    P('Live Fundamental Bias', 'Pair par click karein, uska chart khul jata hai.', 'پیئر پر کلک کریں، اس کا چارٹ کھل جاتا ہے۔', /FUNDAMENTAL BIAS/),
    P('All Markets', 'Athaais forex pairs, indices, metals, stocks aur crypto.', 'اٹھائیس فاریکس پیئرز، انڈیسز، میٹلز، اسٹاکس اور کرپٹو۔', /CATEGORIES|Forex \(28/),
    P('Choose Your Broker Feed', 'Apne broker ka feed chunein, FXCM se OANDA tak.', 'اپنے بروکر کا فیڈ چنیں، ایف ایکس سی ایم سے اوانڈا تک۔', /Broker|FXCM|OANDA/),
    P('Timeframes and Indicators', 'Ek minute se weekly tak, indicators ke saath.', 'ایک منٹ سے ویکلی تک، انڈیکیٹرز کے ساتھ۔', /1m 15m|Indicators/),
    P('Indicator Editor', 'Apna indicator khud likhein aur chart par lagayein.', 'اپنا انڈیکیٹر خود لکھیں اور چارٹ پر لگائیں۔', /Indicator Editor|Full-Screen/),
    P('Share and Save', 'Chart share karein, aur apka kaam auto save rehta hai.', 'چارٹ شیئر کریں، اور آپ کا کام آٹو سیو رہتا ہے۔', /Share|Camera Settings/)] },
  BACKTESTING: { hook: ['Pehle test karein, phir paisa lagayein.', 'پہلے ٹیسٹ کریں، پھر پیسہ لگائیں۔'], parts: [
    P('Pick Symbol and Date', 'Symbol, timeframe aur start date chunein, saalon purani history.', 'سمبل، ٹائم فریم اور اسٹارٹ ڈیٹ چنیں، سالوں پرانی ہسٹری۔', /SYMBOL|TIMEFRAME|START \(UTC\)/),
    P('Replay Speed', 'Aadhi bar se do sau chhappan bar per second tak speed.', 'آدھی بار سے دو سو چھپن بار فی سیکنڈ تک اسپیڈ۔', /Start replay|bar\/s/),
    P('Drawing Tools', 'Trend line, fibonacci aur channel jaise drawing tools.', 'ٹرینڈ لائن، فیبوناچی اور چینل جیسے ڈرائنگ ٹولز۔', /DRAW|Trend line/),
    P('Indicators', 'Indicators lagayein, jaise asli chart par.', 'انڈیکیٹرز لگائیں، جیسے اصلی چارٹ پر۔', /INDICATORS|Add indicator/),
    P('Order Ticket', 'Risk percent se lot khud, stop loss aur take profit ke saath.', 'رسک پرسنٹ سے لاٹ خود، اسٹاپ لاس اور ٹیک پرافٹ کے ساتھ۔', /ORDER TICKET/),
    P('Performance Stats', 'Win rate, profit factor, drawdown aur expectancy, live.', 'وِن ریٹ، پرافٹ فیکٹر، ڈراڈاؤن اور ایکسپیکٹنسی، لائیو۔', /PERFORMANCE|PROFIT FACTOR/),
    P('Export and Shortcuts', 'Trades CSV mein export karein, keyboard shortcuts alag.', 'ٹریڈز سی ایس وی میں ایکسپورٹ کریں، کی بورڈ شارٹ کٹس الگ۔', /Export trades|Keyboard/)] },
  BACKTEST_REPLAY: { hook: ['Purane market mein aaj ki practice.', 'پرانی مارکیٹ میں آج کی پریکٹس۔'], parts: [
    P('Candle By Candle', 'Candle by candle replay, play, pause aur step ke saath.', 'کینڈل بائی کینڈل ریپلے، پلے، پاز اور اسٹیپ کے ساتھ۔', /Start replay|bar\/s/),
    P('Real History', 'Dukascopy ki asli history, saalon peeche tak.', 'ڈوکاسکوپی کی اصلی ہسٹری، سالوں پیچھے تک۔', /History available|Dukascopy/),
    P('Paper Trading', 'Buy sell karein, stop loss aur take profit lines ke saath.', 'بائے سیل کریں، اسٹاپ لاس اور ٹیک پرافٹ لائنز کے ساتھ۔', /BUY|SELL|ORDER TICKET/),
    P('Auto Lot Size', 'Risk percent se lot size khud ba khud.', 'رسک پرسنٹ سے لاٹ سائز خود بخود۔', /RISK % PER TRADE|LOTS/),
    P('Live Performance', 'Balance, equity aur win rate, har bar ke saath badalte hue.', 'بیلنس، ایکویٹی اور وِن ریٹ، ہر بار کے ساتھ بدلتے ہوئے۔', /PERFORMANCE|WIN RATE/),
    P('Journal Sync', 'Practice trade ek click mein journal mein.', 'پریکٹس ٹریڈ ایک کلک میں جرنل میں۔', /Export trades|Keyboard/)] },
  CHART_ANALYSIS: { hook: ['Unlimited charts, live data, koi hadd nahi.', 'ان لمیٹڈ چارٹس، لائیو ڈیٹا، کوئی حد نہیں۔'], parts: [
    P('Multi Chart Layouts', 'Ek screen par ek se aath charts tak ka layout.', 'ایک اسکرین پر ایک سے آٹھ چارٹس تک کا لے آؤٹ۔', /LAYOUT/),
    P('Sync and Multi Timeframe', 'Symbol aur timeframe sync karein, ya sab timeframes ek saath dekhein.', 'سمبل اور ٹائم فریم سنک کریں، یا سب ٹائم فریمز ایک ساتھ دیکھیں۔', /Sync symbol|Multi-timeframe/),
    P('Every Market', 'Forex, metals, indices, crypto aur stocks, sab ek jagah.', 'فاریکس، میٹلز، انڈیسز، کرپٹو اور اسٹاکس، سب ایک جگہ۔', /Forex 10|Metals & Energy/),
    P('Search 1500 Plus', 'Pandrah sau se zyada instruments mein se kuch bhi search karein.', 'پندرہ سو سے زیادہ انسٹرومنٹس میں سے کچھ بھی سرچ کریں۔', /symbol button|1,500/),
    P('Indicators and Screenshot', 'Indicators, drawing tools aur screenshot, top bar mein.', 'انڈیکیٹرز، ڈرائنگ ٹولز اور اسکرین شاٹ، ٹاپ بار میں۔', /Indicator|Screenshot/),
    P('Live Streaming Data', 'Crypto live stream hota hai, purani bars khud load hoti hain.', 'کرپٹو لائیو اسٹریم ہوتا ہے، پرانی بارز خود لوڈ ہوتی ہیں۔', /Crypto streams live|Scroll or drag/),
    P('Full Screen', 'Full screen mein poora focus, sirf chart.', 'فل اسکرین میں پورا فوکس، صرف چارٹ۔', /Full screen/i)] },
  COMPOUNDING: { hook: ['Chhoti saving, bada nateeja. Compounding ka kamal.', 'چھوٹی بچت، بڑا نتیجہ۔ کمپاؤنڈنگ کا کمال۔'], parts: [
    P('Starting Capital', 'Active account ka balance lein ya apna custom amount.', 'ایکٹو اکاؤنٹ کا بیلنس لیں یا اپنا کسٹم اماؤنٹ۔', /Starting Capital/),
    P('Currency Modes', 'Dollar, cent, euro aur rupee mein bhi simulation.', 'ڈالر، سینٹ، یورو اور روپے میں بھی سمیولیشن۔', /Currency Mode/),
    P('Compounding Modes', 'Percentage, dynamic ya fixed risk, jo aap ka tareeqa ho.', 'پرسنٹیج، ڈائنامک یا فکسڈ رسک، جو آپ کا طریقہ ہو۔', /Compounding Mode/),
    P('Your Trading Inputs', 'Risk, win rate, reward ratio aur roz ki trades daalein.', 'رسک، وِن ریٹ، ریوارڈ ریشو اور روز کی ٹریڈز ڈالیں۔', /Risk Per Trade|Win Rate|Risk-to-Reward/),
    P('Any Period', 'Ek hafta se barah mahine tak, ya apni marzi ki muddat.', 'ایک ہفتے سے بارہ مہینے تک، یا اپنی مرضی کی مدت۔', /Calculation Period/),
    P('Expected Result', 'Expected result dollar aur percent mein, har trade ka edge.', 'ایکسپیکٹڈ رزلٹ ڈالر اور پرسنٹ میں، ہر ٹریڈ کا ایج۔', /EXPECTED RESULT/),
    P('Real Data Comparison', 'Apni asli trades se simulation ka muqabla.', 'اپنی اصلی ٹریڈز سے سمیولیشن کا مقابلہ۔', /REAL DATA COMPARISON/)] },
  PERFORMANCE: { hook: ['Apni asli performance dekhne ka waqt.', 'اپنی اصلی پرفارمنس دیکھنے کا وقت۔'], parts: [
    P('Trader DNA', 'Trader DNA: aap ki asli edge aur mehngi aadatein.', 'ٹریڈر ڈی این اے: آپ کی اصلی ایج اور مہنگی عادتیں۔', /TRADER DNA/),
    P('Measured From Your Trades', 'Sab kuch aap ki apni closed trades se napa jata hai.', 'سب کچھ آپ کی اپنی کلوزڈ ٹریڈز سے ناپا جاتا ہے۔', /measured from|closed trades/i),
    P('Pairs Sessions Models', 'Pair, timeframe, session aur SBT model ka breakdown.', 'پیئر، ٹائم فریم، سیشن اور ایس بی ٹی ماڈل کا بریک ڈاؤن۔', /Real-time analytics|pairs, timeframes/),
    P('Audit Engine', 'Audit engine, bina andaaze ke, sirf asli data par.', 'آڈٹ انجن، بغیر اندازے کے، صرف اصلی ڈیٹا پر۔', /AUDIT ENGINE/),
    P('Start With One Trade', 'Pehli trade journal mein daalein, analytics khud ban jati hai.', 'پہلی ٹریڈ جرنل میں ڈالیں، اینالیٹکس خود بن جاتی ہے۔', /RECORD YOUR FIRST/)] },
  DAILY_DEV: { hook: ['Ek behtar trader banta hai roz ki aadat se.', 'ایک بہتر ٹریڈر بنتا ہے روز کی عادت سے۔'], parts: [
    P('Daily Discipline Focus', 'Har din ka ek discipline focus, subah sab se pehle.', 'ہر دن کا ایک ڈسپلن فوکس، صبح سب سے پہلے۔', /DAILY DISCIPLINE FOCUS/),
    P('Habit Plan', 'Aaj ka habit plan aur das trades ka challenge.', 'آج کا ہیبٹ پلان اور دس ٹریڈز کا چیلنج۔', /10-TRADE CHALLENGE|HABIT PLAN/),
    P('Habit Checklist', 'Roz ki checklist, apna custom task bhi jodein.', 'روز کی چیک لسٹ، اپنا کسٹم ٹاسک بھی جوڑیں۔', /HABIT CHECKLIST|ADD CUSTOM TASK/),
    P('Discipline Score', 'Daily discipline score, process ko number mein.', 'ڈیلی ڈسپلن اسکور، پروسیس کو نمبر میں۔', /DAILY DISCIPLINE SCORE/),
    P('Daily Feedback', 'Aaj kya acha kiya, kya behtar karna hai, kal ka focus.', 'آج کیا اچھا کیا، کیا بہتر کرنا ہے، کل کا فوکس۔', /DAILY IMPROVEMENT FEEDBACK/),
    P('Weekly Audit', 'Weekly audit aur behavior patterns, apni aadatein pehchaanein.', 'ویکلی آڈٹ اور بیہیویئر پیٹرنز، اپنی عادتیں پہچانیں۔', /WEEKLY AUDIT|BEHAVIOR PATTERNS/)] },
  PSYCHOLOGY: { hook: ['Zyada tar nuqsan strategy se nahi, jazbaat se hota hai.', 'زیادہ تر نقصان اسٹریٹجی سے نہیں، جذبات سے ہوتا ہے۔'], parts: [
    P('How Do You Feel', 'Pehle batayein aap kaisa mehsoos kar rahe hain.', 'پہلے بتائیں آپ کیسا محسوس کر رہے ہیں۔', /How do you feel/),
    P('Feeling Cards', 'Dar, badla, FOMO, lalach: har jazbe ka alag card.', 'ڈر، بدلہ، فومو، لالچ: ہر جذبے کا الگ کارڈ۔', /Scared to enter|Want to win my loss/),
    P('Guide and 60 Second Action', 'Har jazbe ke liye guide, 60 second ka amal aur guided session.', 'ہر جذبے کے لیے گائیڈ، ساٹھ سیکنڈ کا عمل اور گائیڈڈ سیشن۔', /Open guide|Session/),
    P('Recovery and Calm Mode', 'Recovery mode aur calm mode, nuqsan ke baad sambhalne ke liye.', 'ریکوری موڈ اور کالم موڈ، نقصان کے بعد سنبھلنے کے لیے۔', /RECOVERY MODE|CALM MODE/),
    P('Trader DNA', 'Trader DNA aap ki aadaton ko aap ki trades se pehchanta hai.', 'ٹریڈر ڈی این اے آپ کی عادتوں کو آپ کی ٹریڈز سے پہچانتا ہے۔', /TRADER DNA/)] },
  CALMING_TOOLS: { hook: ['Dimaag thanda, to trading behtar.', 'دماغ ٹھنڈا، تو ٹریڈنگ بہتر۔'], parts: [
    P('Fifteen Calming Suites', 'Pandrah calming tools, ek hi suite mein.', 'پندرہ کالمنگ ٹولز، ایک ہی سویٹ میں۔', /ALL CALMING SUITES|Suite Home/),
    P('Pure Synthesis', 'Chaar sau battees hertz, brown noise aur solfeggio sounds.', 'چار سو بتیس ہرٹز، براؤن نوائز اور سولفیجیو ساؤنڈز۔', /Pure Synthesis/),
    P('Ambient Mixer', 'Baarish, samundar aur hawa ka apna soundscape banayein.', 'بارش، سمندر اور ہوا کا اپنا ساؤنڈ اسکیپ بنائیں۔', /Ambient Mixer/),
    P('Relaxation Music', 'Das qisam ka relaxing music, bina copyright ke.', 'دس قسم کا ریلیکسنگ میوزک، بغیر کاپی رائٹ کے۔', /Relaxation Music|Relax Music/),
    P('Breathing Center', 'Box breathing aur relax breathing ka guided orb.', 'باکس بریدنگ اور ریلیکس بریدنگ کا گائیڈڈ اوربّ۔', /Breathing/),
    P('Mind Reset', 'Chhe step ka mind reset, loss ke baad.', 'چھ مرحلوں کا مائنڈ ریسیٹ، لاس کے بعد۔', /MIND RESET|Mind Reset/),
    P('Calm Anchor', 'Chaar minute ki breathing, chart focus tez.', 'چار منٹ کی بریدنگ، چارٹ فوکس تیز۔', /CALM ANCHOR|Eye Relax/)] },
  RESEARCH: { hook: ['Andaze nahi, research. Asli tehqeeq aap ki ungliyon par.', 'اندازے نہیں، ریسرچ۔ اصلی تحقیق آپ کی انگلیوں پر۔'], parts: [
    P('Huge Library', 'Dhai sau million se zyada research works ki library.', 'ڈھائی سو ملین سے زیادہ ریسرچ ورکس کی لائبریری۔', /Indexed Library|250M/),
    P('Ready Topics', 'Market structure se psychology tak, ready search topics.', 'مارکیٹ اسٹرکچر سے سائیکالوجی تک، ریڈی سرچ ٹاپکس۔', /Presets/),
    P('Smart Filters', 'Most cited, naye papers ya open access, jo chahein filter karein.', 'موسٹ سائیٹڈ، نئے پیپرز یا اوپن ایکسس، جو چاہیں فلٹر کریں۔', /Filters|Most Cited/),
    P('Real Papers', 'Asli journals ke papers, kitni baar cite hue, sab saath.', 'اصلی جرنلز کے پیپرز، کتنی بار سائٹ ہوئے، سب ساتھ۔', /Cited by/),
    P('Abstract and DOI', 'Abstract, cite karne ka button aur DOI link, ek jagah.', 'ابسٹریکٹ، سائٹ کرنے کا بٹن اور ڈی او آئی لنک، ایک جگہ۔', /Abstract|Cite Paper|DOI/)] },
  FREEHAND_WORKSPACE: { hook: ['Apni soch ko chart par utaariye.', 'اپنی سوچ کو چارٹ پر اتاریے۔'], parts: [
    P('Drawing Tools', 'Pencil, eraser, text aur rectangle, sab tayyar.', 'پنسل، ایریزر، ٹیکسٹ اور ریکٹینگل، سب تیار۔', /Pencil/),
    P('Candle Objects', 'Bullish aur bearish candles seedha canvas par lagayein.', 'بُلش اور بیئرش کینڈلز سیدھا کینوس پر لگائیں۔', /Bullish|Bearish/),
    P('Upload Your Chart', 'Apna chart upload karein aur us par likhein.', 'اپنا چارٹ اپلوڈ کریں اور اس پر لکھیں۔', /Upload/),
    P('Full Screen', 'Full screen mein khula canvas, shortcuts ke saath.', 'فل اسکرین میں کھلا کینوس، شارٹ کٹس کے ساتھ۔', /FULL SCREEN|Full Screen/),
    P('Auto Save and Download', 'Kaam khud save hota hai, ek click mein download.', 'کام خود سیو ہوتا ہے، ایک کلک میں ڈاؤن لوڈ۔', /Auto-saved|Download/)] },
  SITUATION_SAVER: { hook: ['Wohi galti dobara nahi. Apni situations save karein.', 'وہی غلطی دوبارہ نہیں۔ اپنی سچویشنز سیو کریں۔'], parts: [
    P('Your Stats', 'Kul situations, win rate aur average risk reward, ek nazar mein.', 'کل سچویشنز، وِن ریٹ اور ایوریج رسک ریوارڈ، ایک نظر میں۔', /TOTAL SITUATIONS|VERIFIED WIN RATE/),
    P('Create Situation', 'Nayi market situation save karein, poori detail ke saath.', 'نئی مارکیٹ سچویشن سیو کریں، پوری تفصیل کے ساتھ۔', /CREATE SITUATION/),
    P('Similarity Matcher', 'Aaj ki situation purani se milayein, khud pehchaan hoti hai.', 'آج کی سچویشن پرانی سے ملائیں، خود پہچان ہوتی ہے۔', /SIMILARITY MATCHER/),
    P('Powerful Filters', 'Pair, SBT model, direction, outcome aur fibonacci zone se filter.', 'پیئر، ایس بی ٹی ماڈل، ڈائریکشن، آؤٹ کم اور فیبوناچی زون سے فلٹر۔', /All Instruments|All Fibonacci/),
    P('Lessons Learned', 'Har situation ka takeaway, taake sabaq yaad rahe.', 'ہر سچویشن کا ٹیک اوے، تاکہ سبق یاد رہے۔', /Takeaway/),
    P('Cards and Table', 'Cards ya table view, aur sab kuch download.', 'کارڈز یا ٹیبل ویو، اور سب کچھ ڈاؤن لوڈ۔', /CARDS TABLE|DOWNLOAD ALL/)] },
  PAIR_SAVER: { hook: ['Apne pairs, ek hi nazar mein.', 'اپنے پیئرز، ایک ہی نظر میں۔'], parts: [
    P('Saved Scenarios', 'Har pair ka poora scenario, save aur taiyaar.', 'ہر پیئر کا پورا سیناریو، سیو اور تیار۔', /MULTI-TIMEFRAME SCENARIO|Saved Scenarios/),
    P('Every Timeframe Direction', 'Weekly se M1 tak, har timeframe ki direction.', 'ویکلی سے ایم ون تک، ہر ٹائم فریم کی ڈائریکشن۔', /DIRECTION FOR EACH TIME FRAME/),
    P('Fibonacci and Targets', 'Har timeframe ke fibonacci zones aur final targets.', 'ہر ٹائم فریم کے فیبوناچی زونز اور فائنل ٹارگٹس۔', /FIBONACCI RETRACEMENTS/),
    P('Scenario Notes', 'Apne notes aur commentary, scenario ke saath.', 'اپنے نوٹس اور کمنٹری، سیناریو کے ساتھ۔', /SCENARIO NOTES/),
    P('Create and Download', 'Naya scenario banayein, PDF mein download karein.', 'نیا سیناریو بنائیں، پی ڈی ایف میں ڈاؤن لوڈ کریں۔', /CREATE PAIR SCENARIO|Download All PDF/)] },
  PRO_LEARNING: { hook: ['Zero se institutional trading tak, apni zubaan mein.', 'زیرو سے انسٹی ٹیوشنل ٹریڈنگ تک، اپنی زبان میں۔'], parts: [
    P('Full Curriculum', 'Battees lessons, aur chaar sau paintees topics ki library.', 'بتیس لیسنز، اور چار سو پینسٹھ ٹاپکس کی لائبریری۔', /LESSONS|LIBRARY TOPICS/),
    P('English and Urdu', 'Har lesson English aur Urdu, dono mein.', 'ہر لیسن انگلش اور اردو، دونوں میں۔', /English|اردو/),
    P('Your Progress', 'Kitne lessons mukammal hue, progress saaf nazar aati hai.', 'کتنے لیسنز مکمل ہوئے، پروگریس صاف نظر آتی ہے۔', /Your progress/),
    P('Chapters and Key Points', 'Chapter wise lessons, aur har lesson ke key points.', 'چیپٹر وائز لیسنز، اور ہر لیسن کے کی پوائنٹس۔', /Module 1|KEY POINTS|CHAPTER/),
    P('Markets and Gold', 'Pakistan aur duniya ki markets, aur physical gold ki guide.', 'پاکستان اور دنیا کی مارکیٹس، اور فزیکل گولڈ کی گائیڈ۔', /Physical Gold|Markets \(PK/),
    P('Feelings to Solutions', 'Apna haal batayein, saaf hal payein.', 'اپنا حال بتائیں، صاف حل پائیں۔', /Feelings/)] },
  BOOK_SESSION: { hook: ['Apne mentor se seedha, one on one.', 'اپنے مینٹر سے سیدھا، ون آن ون۔'], parts: [
    P('Direct Mentorship', 'Owner se seedha mentorship, live aur one on one.', 'اونر سے سیدھا مینٹرشپ، لائیو اور ون آن ون۔', /DIRECT OWNER|VERIFIED DIRECT/),
    P('Choose Your Session', 'Apni zaroorat ka session chunein, chhe qisam mein se.', 'اپنی ضرورت کا سیشن چنیں، چھ قسموں میں سے۔', /SELECT MENTORSHIP TYPE/),
    P('Journal Audit', 'Apni trades ka audit, ghaltiyan saamne.', 'اپنی ٹریڈز کا آڈٹ، غلطیاں سامنے۔', /Journal Audit/),
    P('SBT Deep Dive', 'Teen mahine mein das SBT models ki poori training.', 'تین مہینے میں دس ایس بی ٹی ماڈلز کی پوری ٹریننگ۔', /SBT Model Deep Dive/),
    P('Mind and Risk Reset', 'Psychology reset aur risk protocol, alag sessions.', 'سائیکالوجی ریسیٹ اور رسک پروٹوکول، الگ سیشنز۔', /Psychology \/ Emotion|Risk Protocol/),
    P('Pick Date and Time', 'Pakistan ke waqt mein apni date aur time slot chunein.', 'پاکستان کے وقت میں اپنی ڈیٹ اور ٹائم سلاٹ چنیں۔', /PREFERRED DATE|TIME SLOT/)] },
  META5_PREMIUM: { hook: ['Poora MT5 terminal, ab aap ke browser mein.', 'پورا ایم ٹی فائیو ٹرمنل، اب آپ کے براؤزر میں۔'], parts: [
    P('MetaTrader 5 Inside', 'MetaTrader 5, seedha app ke andar, kuch install nahi.', 'میٹا ٹریڈر فائیو، سیدھا ایپ کے اندر، کچھ انسٹال نہیں۔', /MetaTrader 5/),
    P('PC and Mobile Version', 'PC version ya mobile version, ek click mein badlein.', 'پی سی ورژن یا موبائل ورژن، ایک کلک میں بدلیں۔', /PC version|Mobile version/),
    P('Broker Connection', 'Apna broker chunein aur connect ho jayein.', 'اپنا بروکر چنیں اور کنیکٹ ہو جائیں۔', /Broker/),
    P('Full Screen', 'Full screen ya naye tab mein, bara terminal.', 'فل اسکرین یا نئے ٹیب میں، بڑا ٹرمنل۔', /Full screen|New tab/)] },
  COMMUNITY: { hook: ['Akele nahi, traders ki poori community ke saath.', 'اکیلے نہیں، ٹریڈرز کی پوری کمیونٹی کے ساتھ۔'], parts: [
    P('Live Chat', 'Live chat aur setups ki sharing.', 'لائیو چیٹ اور سیٹ اپس کی شیئرنگ۔'),
    P('Private Messages', 'Dosti ki request aur private messaging.', 'دوستی کی ریکویسٹ اور پرائیویٹ میسجنگ۔'),
    P('Verified Presence', 'Verified traders ki online maujoodgi.', 'ویریفائیڈ ٹریڈرز کی آن لائن موجودگی۔'),
    P('Mentor Updates', 'Mentorship desk se seedhi announcements.', 'مینٹرشپ ڈیسک سے سیدھی اناؤنسمنٹس۔')] },
  SETTINGS: { hook: ['Aap ka data, sirf aap ka.', 'آپ کا ڈیٹا، صرف آپ کا۔'], parts: [
    P('One Click Export', 'Ek click mein poora journal export.', 'ایک کلک میں پورا جرنل ایکسپورٹ۔'),
    P('Drive Backup', 'Google Drive par automatic backup.', 'گوگل ڈرائیو پر خودکار بیک اپ۔'),
    P('Any Device', 'Kisi bhi device par data wapas, koi server kharcha nahi.', 'کسی بھی ڈیوائس پر ڈیٹا واپس، کوئی سرور خرچہ نہیں۔'),
    P('Full Privacy', 'Poori privacy, data ki malkiyat aap ki.', 'پوری پرائیویسی، ڈیٹا کی ملکیت آپ کی۔')] },
  ADMIN: { hook: ['Poora students system, ek hi panel se.', 'پورا اسٹوڈنٹس سسٹم، ایک ہی پینل سے۔'], parts: [
    P('Student Accounts', 'Student account aur credentials ek click mein.', 'اسٹوڈنٹ اکاؤنٹ اور کریڈنشلز ایک کلک میں۔'),
    P('WhatsApp Activation', 'Ek click mein WhatsApp activation link.', 'ایک کلک میں واٹس ایپ ایکٹیویشن لنک۔'),
    P('Subscriptions', 'Subscription ki qeemat aur expiry ka intezam.', 'سبسکرپشن کی قیمت اور ایکسپائری کا انتظام۔'),
    P('Live Roster', 'Live student roster aur session monitoring.', 'لائیو اسٹوڈنٹ روسٹر اور سیشن مانیٹرنگ۔')] },
};


/** Variety for repeat videos in the same category: each "take" opens, introduces and closes differently. */
export const HOOK_OPENERS: [string, string][] = [
  ['', ''],
  ['Kya aap ab bhi aise trading kar rahe hain? Ye dekhiye.', 'کیا آپ اب بھی ایسے ٹریڈنگ کر رہے ہیں؟ یہ دیکھیے۔'],
  ['Sirf paintalees second mein poora section dekhiye.', 'صرف پینتالیس سیکنڈ میں پورا سیکشن دیکھیے۔'],
  ['Zara rukiye! Ye cheez aap ki trading badal sakti hai.', 'ذرا رکیے! یہ چیز آپ کی ٹریڈنگ بدل سکتی ہے۔'],
  ['Aksar traders yahin ghalti karte hain. Iska hal yahan hai.', 'اکثر ٹریڈرز یہیں غلطی کرتے ہیں۔ اس کا حل یہاں ہے۔'],
  ['Agar aap serious trader hain, to ye aap ke liye hai.', 'اگر آپ سنجیدہ ٹریڈر ہیں، تو یہ آپ کے لیے ہے۔'],
];
export const OVERVIEW_VARIANTS: [string, string][] = [
  OVERVIEW_LINE,
  ['Chaliye, ek ek karke saari khoobiyan dekhte hain.', 'چلیے، ایک ایک کر کے ساری خوبیاں دیکھتے ہیں۔'],
  ['Ab dekhte hain, andar kya kya taqat chhupi hai.', 'اب دیکھتے ہیں، اندر کیا کیا طاقت چھپی ہے۔'],
];
export const OUTRO_VARIANTS: [string, string][] = [
  OUTRO_LINE,
  ['Ye sab ek hi jagah milta hai. Link bio mein hai. Follow zaroor karein.', 'یہ سب ایک ہی جگہ ملتا ہے۔ لنک بائیو میں ہے۔ فالو ضرور کریں۔'],
  ['Pasand aaye to comment mein batayein, aur primepipfx.site abhi try karein.', 'پسند آئے تو کمنٹ میں بتائیں، اور پرائم پپ ایف ایکس ڈاٹ سائٹ ابھی آزمائیں۔'],
  ['Apne trader dost ko ye zaroor bhejein. Link bio mein hai.', 'اپنے ٹریڈر دوست کو یہ ضرور بھیجیں۔ لنک بائیو میں ہے۔'],
];
export const MUSIC_BPM = [102, 96, 108, 100, 112, 98];
