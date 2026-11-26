/* Hand-written Urdu narration for every category of the Command Center.
   Each line is [short English title, Roman Urdu (what viewers read, WhatsApp style), Urdu script (what the voice speaks)]. */
export type PackLine = [title: string, roman: string, urdu: string, match?: RegExp];
export interface CategoryPack { hook: [roman: string, urdu: string]; parts: PackLine[] }

export const OVERVIEW_LINE: [string, string] = ['Aaiye dekhte hain, is section mein aap ko kya kya milta hai.', 'آئیے دیکھتے ہیں، اس سیکشن میں آپ کو کیا کیا ملتا ہے۔'];
export const OUTRO_LINE: [string, string] = ['Bilkul free try karein. primepipfx.site, link bio mein hai.', 'بالکل مفت آزمائیں۔ پرائم پپ ایف ایکس ڈاٹ سائٹ، لنک بائیو میں ہے۔'];

const P = (t: string, r: string, u: string, m?: RegExp): PackLine => [t, r, u, m];

export const PACKS: Record<string, CategoryPack> = {
  DASHBOARD: { hook: ['Zyada tar traders ke paas ye dashboard nahi hota.', 'زیادہ تر ٹریڈرز کے پاس یہ ڈیش بورڈ نہیں ہوتا۔'], parts: [
    P('Live Equity Curve', 'Apna equity graph aur balance live dekhein, har account ka.', 'اپنا ایکویٹی گراف اور بیلنس لائیو دیکھیں، ہر اکاؤنٹ کا۔', /account|equity|balance|demo/i),
    P('Daily Loss Breaker', 'Roz ke nuqsan ki limit par automatic risk alert milta hai.', 'روز کے نقصان کی حد پر خودکار رسک الرٹ ملتا ہے۔', /readiness|defcon|risk|limit/i),
    P('Discipline Score', 'Aap ki trading discipline ka score, ek nazar mein.', 'آپ کی ٹریڈنگ ڈسپلن کا اسکور، ایک نظر میں۔', /performance|score/i),
    P('Quick Trade Launcher', 'Ek click mein trade shuru karein, risk gauge samne rahe.', 'ایک کلک میں ٹریڈ شروع کریں، رسک گیج سامنے رہے۔', /execution|combat|next trade/i)] },
  JOURNAL: { hook: ['Jo trade likhta hai, wohi seekhta hai.', 'جو ٹریڈ لکھتا ہے، وہی سیکھتا ہے۔'], parts: [
    P('Full Trade Details', 'Har trade ki poori detail, lot size aur risk ke saath.', 'ہر ٹریڈ کی پوری تفصیل، لاٹ سائز اور رسک کے ساتھ۔'),
    P('Before and After Charts', 'Trade se pehle aur baad ke chart screenshot upload karein.', 'ٹریڈ سے پہلے اور بعد کے چارٹ اسکرین شاٹ اپلوڈ کریں۔'),
    P('Confluence Tags', 'Har setup par SMC aur fundamental confluence tag lagayein.', 'ہر سیٹ اپ پر ایس ایم سی اور فنڈامینٹل کنفلوئنس ٹیگ لگائیں۔'),
    P('Auto P and L', 'Profit, loss aur win ratio khud ba khud calculate hota hai.', 'پرافٹ، لاس اور وِن ریشو خود بخود کیلکولیٹ ہوتا ہے۔')] },
  SBT_MODELS: { hook: ['Institutional entry ka seedha aur saaf tareeqa.', 'انسٹی ٹیوشنل انٹری کا سیدھا اور صاف طریقہ۔'], parts: [
    P('Entry Checklists', 'Har entry se pehle step by step checklist poori karein.', 'ہر انٹری سے پہلے مرحلہ وار چیک لسٹ پوری کریں۔'),
    P('FVG and Order Blocks', 'FVG, order block aur liquidity ka confluence matrix.', 'ایف وی جی، آرڈر بلاک اور لیکویڈیٹی کا کنفلوئنس میٹرکس۔'),
    P('Kill Zone Timing', 'London aur New York kill zone ke time filters.', 'لندن اور نیویارک کل زون کے ٹائم فلٹرز۔'),
    P('Mechanical Rules', 'High win rate setups ke liye saaf mechanical rules.', 'ہائی وِن ریٹ سیٹ اپس کے لیے صاف میکینیکل رولز۔')] },
  LOT_SIZE: { hook: ['Galat lot size account ud jati hai. Ye calculator bachata hai.', 'غلط لاٹ سائز اکاؤنٹ اڑا دیتی ہے۔ یہ کیلکولیٹر بچاتا ہے۔'], parts: [
    P('Live Pip Value', 'Pip ki value live calculate hoti hai, har pair ki.', 'پپ کی ویلیو لائیو کیلکولیٹ ہوتی ہے، ہر پیئر کی۔'),
    P('Cent and Dollar', 'Cent aur dollar, dono qisam ke account support hote hain.', 'سینٹ اور ڈالر، دونوں قسم کے اکاؤنٹ سپورٹ ہوتے ہیں۔'),
    P('Over-Risk Safeguard', 'Zyada risk lene par foran warning mil jati hai.', 'زیادہ رسک لینے پر فوراً وارننگ مل جاتی ہے۔')] },
  RISK: { hook: ['Risk sambhal liya, to account bach gaya.', 'رسک سنبھال لیا، تو اکاؤنٹ بچ گیا۔'], parts: [
    P('1 Percent Rule', 'Har trade par sirf ek percent risk, strictly lagu.', 'ہر ٹریڈ پر صرف ایک فیصد رسک، سختی سے لاگو۔'),
    P('Daily Trade Limit', 'Din mein zyada se zyada do trades, uske baad lock.', 'دن میں زیادہ سے زیادہ دو ٹریڈز، اس کے بعد لاک۔'),
    P('Drawdown Protection', 'Account drawdown ki hadd par automatic hifazat.', 'اکاؤنٹ ڈراڈاؤن کی حد پر خودکار حفاظت۔'),
    P('Risk Audit Reports', 'Capital bachane ki risk audit reports.', 'سرمایہ بچانے کی رسک آڈٹ رپورٹس۔')] },
  PRE_TRADE_PLAN: { hook: ['Plan ke bina trade? Yahan wo mumkin hi nahi.', 'پلان کے بغیر ٹریڈ؟ یہاں وہ ممکن ہی نہیں۔'], parts: [
    P('3 Phase Gatekeeper', 'Teen marhale ki checklist: macro, technical aur risk.', 'تین مرحلوں کی چیک لسٹ: میکرو، ٹیکنیکل اور رسک۔'),
    P('Entry Lock', 'Jab tak sab shartein poori na hon, order nahi lagta.', 'جب تک سب شرطیں پوری نہ ہوں، آرڈر نہیں لگتا۔'),
    P('Risk Reward Check', 'Target ke mutabiq risk reward khud verify hota hai.', 'ٹارگٹ کے مطابق رسک ریوارڈ خود ویریفائی ہوتا ہے۔'),
    P('Discipline Log', 'Discipline ka record seedha journal mein judta hai.', 'ڈسپلن کا ریکارڈ سیدھا جرنل میں جڑتا ہے۔')] },
  FUNDAMENTAL_CALENDAR: { hook: ['Khabar se pehle khabar. Live news calendar.', 'خبر سے پہلے خبر۔ لائیو نیوز کیلنڈر۔'], parts: [
    P('100% Live Feed', 'Macro economic khabrein bilkul live, seedha source se.', 'میکرو اکنامک خبریں بالکل لائیو، سیدھا سورس سے۔'),
    P('Impact Folders', 'Rang ke hisab se low, medium aur high impact folders.', 'رنگ کے حساب سے لو، میڈیم اور ہائی امپیکٹ فولڈرز۔'),
    P('News Details', 'Kisi bhi khabar par click karein, poori detail samne.', 'کسی بھی خبر پر کلک کریں، پوری تفصیل سامنے۔'),
    P('Pakistan Time', 'Sab kuch Pakistan Standard Time ke mutabiq.', 'سب کچھ پاکستان اسٹینڈرڈ ٹائم کے مطابق۔')] },
  FUNDAMENTAL_INDICATORS: { hook: ['Bade players kya kar rahe hain? Ab aap bhi dekhein.', 'بڑے کھلاڑی کیا کر رہے ہیں؟ اب آپ بھی دیکھیں۔'], parts: [
    P('COT Severity Report', 'Institutional COT positioning ki severity report.', 'انسٹی ٹیوشنل سی او ٹی پوزیشننگ کی سیوریٹی رپورٹ۔'),
    P('Retail Sentiment', 'Retail sentiment aur crowded market ke gauges.', 'ریٹیل سینٹیمنٹ اور کراؤڈڈ مارکیٹ کے گیجز۔'),
    P('Multi Asset View', 'Currencies, commodities aur indices ek jagah.', 'کرنسیز، کموڈیٹیز اور انڈیکسز ایک جگہ۔'),
    P('Live Data', 'Live aur unthrottled data feeds, koi rukawat nahi.', 'لائیو اور اَن تھروٹلڈ ڈیٹا فیڈز، کوئی رکاوٹ نہیں۔')] },
  SIGNALS: { hook: ['Premium signals, poori wajah ke saath.', 'پریمیم سگنلز، پوری وجہ کے ساتھ۔'], parts: [
    P('Live Setups', 'Real time trade setups, TP aur SL ke saath.', 'ریئل ٹائم ٹریڈ سیٹ اپس، ٹی پی اور ایس ایل کے ساتھ۔'),
    P('Confluence Breakdown', 'Har signal ke technical, macro aur sentiment wajohat.', 'ہر سگنل کی ٹیکنیکل، میکرو اور سینٹیمنٹ وجوہات۔'),
    P('Timeframe and Risk', 'Timeframe aur risk ki poori maloomat.', 'ٹائم فریم اور رسک کی پوری معلومات۔'),
    P('Signal Status', 'Signal active hai, target hit hua ya band, sab live.', 'سگنل ایکٹو ہے، ٹارگٹ ہٹ ہوا یا بند، سب لائیو۔')] },
  PRO_TRADING: { hook: ['Professional charts, bilkul free app ke andar.', 'پروفیشنل چارٹس، بالکل فری ایپ کے اندر۔'], parts: [
    P('Full Drawing Suite', 'Poora drawing suite: trendline se fibonacci tak.', 'پورا ڈرائنگ سوئٹ: ٹرینڈ لائن سے فبوناچی تک۔'),
    P('Candle Countdown', 'Candle close hone ka countdown samne chalta rehta hai.', 'کینڈل کلوز ہونے کا کاؤنٹ ڈاؤن سامنے چلتا رہتا ہے۔'),
    P('Fundamental Pairs', 'Fundamental pairs ka alag tab, bullish aur bearish.', 'فنڈامینٹل پیئرز کا الگ ٹیب، بُلش اور بیئرش۔'),
    P('Auto Save', 'Aap ka kaam khud save hota hai, aur share bhi.', 'آپ کا کام خود سیو ہوتا ہے، اور شیئر بھی۔')] },
  BACKTESTING: { hook: ['Pehle test karein, phir paisa lagayein.', 'پہلے ٹیسٹ کریں، پھر پیسہ لگائیں۔'], parts: [
    P('Interactive Charts', 'Interactive charts, green aur red candles ke saath.', 'انٹرایکٹو چارٹس، گرین اور ریڈ کینڈلز کے ساتھ۔'),
    P('Drawing Tools', 'Trendline, support resistance aur fibonacci tools.', 'ٹرینڈ لائن، سپورٹ ریزسٹنس اور فبوناچی ٹولز۔'),
    P('Indicators', 'Moving average, RSI aur MACD jaise indicators.', 'موونگ ایوریج، آر ایس آئی اور میکڈ جیسے انڈیکیٹرز۔'),
    P('Bar by Bar Replay', 'Bar by bar replay, play, pause aur step ke saath.', 'بار بائی بار ری پلے، پلے، پاز اور اسٹیپ کے ساتھ۔'),
    P('Paper Trading', 'Paper trading mein buy sell karein, bina risk ke.', 'پیپر ٹریڈنگ میں بائے سیل کریں، بغیر رسک کے۔')] },
  BACKTEST_REPLAY: { hook: ['Purane market mein aaj ki practice.', 'پرانی مارکیٹ میں آج کی پریکٹس۔'], parts: [
    P('Candle Replay', 'Candle by candle video ki tarah market replay.', 'کینڈل بائی کینڈل ویڈیو کی طرح مارکیٹ ری پلے۔'),
    P('Real History', 'Forex aur crypto ka asli historical data.', 'فاریکس اور کرپٹو کا اصلی ہسٹوریکل ڈیٹا۔'),
    P('Auto Position Size', 'Position size account ke risk ke hisab se khud nikalta hai.', 'پوزیشن سائز اکاؤنٹ کے رسک کے حساب سے خود نکلتا ہے۔'),
    P('Journal Sync', 'Backtest tag ke saath journal mein khud sync.', 'بیک ٹیسٹ ٹیگ کے ساتھ جرنل میں خود سنک۔')] },
  CHART_ANALYSIS: { hook: ['Unlimited charts, live data, koi hadd nahi.', 'ان لمیٹڈ چارٹس، لائیو ڈیٹا، کوئی حد نہیں۔'], parts: [
    P('Multi Pair Charts', 'Kai pairs ki live streaming ek saath.', 'کئی پیئرز کی لائیو اسٹریمنگ ایک ساتھ۔'),
    P('Live Crypto Feed', 'Crypto ka sub second live feed.', 'کرپٹو کا سب سیکنڈ لائیو فیڈ۔'),
    P('Forex Feed', 'Forex ka institutional feed, seedha aap ke chart par.', 'فاریکس کا انسٹی ٹیوشنل فیڈ، سیدھا آپ کے چارٹ پر۔'),
    P('Instant Switching', 'Pair badalte hi chart foran khul jata hai.', 'پیئر بدلتے ہی چارٹ فوراً کھل جاتا ہے۔'),
    P('One Click Tools', 'Ek click mein trade plan aur lot calculator tak.', 'ایک کلک میں ٹریڈ پلان اور لاٹ کیلکولیٹر تک۔')] },
  COMPOUNDING: { hook: ['Chhoti saving, bada nateeja. Compounding ka kamal.', 'چھوٹی بچت، بڑا نتیجہ۔ کمپاؤنڈنگ کا کمال۔'], parts: [
    P('Custom Periods', 'Apni marzi ke compounding periods chunein.', 'اپنی مرضی کے کمپاؤنڈنگ پیریڈز چنیں۔'),
    P('Milestone Targets', 'Milestone target set karein aur raasta dekhein.', 'مائل اسٹون ٹارگٹ سیٹ کریں اور راستہ دیکھیں۔'),
    P('Drawdown Projection', 'Drawdown ka andaza pehle se maloom ho.', 'ڈراڈاؤن کا اندازہ پہلے سے معلوم ہو۔')] },
  PERFORMANCE: { hook: ['Apni asli performance dekhne ka waqt.', 'اپنی اصلی پرفارمنس دیکھنے کا وقت۔'], parts: [
    P('Win and Loss Analysis', 'Win loss ratio aur profit factor ka poora tajziya.', 'وِن لاس ریشو اور پرافٹ فیکٹر کا پورا تجزیہ۔'),
    P('Pair and Session Breakdown', 'Pair, session aur din ke hisab se performance.', 'پیئر، سیشن اور دن کے حساب سے پرفارمنس۔'),
    P('Average Win vs Loss', 'Ausat jeet aur ausat haar ka muqabla.', 'اوسط جیت اور اوسط ہار کا مقابلہ۔'),
    P('Fix Profit Leaks', 'Nuqsan ke raaste band karne ke mashware.', 'نقصان کے راستے بند کرنے کے مشورے۔')] },
  DAILY_DEV: { hook: ['Ek behtar trader banta hai roz ki aadat se.', 'ایک بہتر ٹریڈر بنتا ہے روز کی عادت سے۔'], parts: [
    P('Morning Routine', 'Subah ki routine aur session ki tayyari ki checklist.', 'صبح کی روٹین اور سیشن کی تیاری کی چیک لسٹ۔'),
    P('Sleep and Focus', 'Neend, energy aur focus ka hisab.', 'نیند، انرجی اور فوکس کا حساب۔'),
    P('Daily Reflection', 'Din ke end par reflection aur seekhi hui baatein.', 'دن کے آخر پر ریفلیکشن اور سیکھی ہوئی باتیں۔'),
    P('Habit Streaks', 'Aadat ke streak counter aur consistency score.', 'عادت کے اسٹریک کاؤنٹر اور کنسسٹنسی اسکور۔')] },
  PSYCHOLOGY: { hook: ['Zyada tar nuqsan strategy se nahi, jazbaat se hota hai.', 'زیادہ تر نقصان اسٹریٹجی سے نہیں، جذبات سے ہوتا ہے۔'], parts: [
    P('Emotion Check', 'Trade se pehle apni jazbati halat ki jaanch.', 'ٹریڈ سے پہلے اپنی جذباتی حالت کی جانچ۔'),
    P('Bias Detector', 'Ghalat soch ki pehchan: sunk cost aur confirmation bias.', 'غلط سوچ کی پہچان: سنک کاسٹ اور کنفرمیشن بائس۔'),
    P('Revenge Trade Lock', 'Badla lene wali trading par automatic lock.', 'بدلہ لینے والی ٹریڈنگ پر خودکار لاک۔'),
    P('Emotional Timeline', 'Apne jazbaat ka safar waqt ke saath dekhein.', 'اپنے جذبات کا سفر وقت کے ساتھ دیکھیں۔')] },
  CALMING_TOOLS: { hook: ['Dimaag thanda, to trading behtar.', 'دماغ ٹھنڈا، تو ٹریڈنگ بہتر۔'], parts: [
    P('Breathing Guides', 'Box breathing aur 4-7-8 saans ki rehnumai.', 'باکس بریدنگ اور چار سات آٹھ سانس کی رہنمائی۔'),
    P('Heart Coherence', 'Dil ki dhadkan ke saath visual pulse guide.', 'دل کی دھڑکن کے ساتھ ویژوئل پلس گائیڈ۔'),
    P('Post Loss Reset', 'Nuqsan ke baad paanch minute ka cool down timer.', 'نقصان کے بعد پانچ منٹ کا کول ڈاؤن ٹائمر۔'),
    P('Focus Sounds', 'Focus barhane wali awazein aur ambient frequencies.', 'فوکس بڑھانے والی آوازیں اور ایمبیئنٹ فریکوئنسیز۔')] },
  RESEARCH: { hook: ['Andaze nahi, research. Asli tehqeeq aap ki ungliyon par.', 'اندازے نہیں، ریسرچ۔ اصلی تحقیق آپ کی انگلیوں پر۔'], parts: [
    P('Research Engine', 'OpenAlex academic research engine.', 'اوپن ایلیکس اکیڈمک ریسرچ انجن۔'),
    P('Peer Reviewed Studies', 'Peer reviewed studies seedha search karein.', 'پیئر ریویوڈ اسٹڈیز سیدھا سرچ کریں۔'),
    P('Quant Papers', 'Quantitative trading ke research papers.', 'کوانٹیٹیٹو ٹریڈنگ کے ریسرچ پیپرز۔')] },
  FREEHAND_WORKSPACE: { hook: ['Apni soch ko chart par utaariye.', 'اپنی سوچ کو چارٹ پر اتاریے۔'], parts: [
    P('Vector Drawing', 'Vector drawing tools se khul kar banayein.', 'ویکٹر ڈرائنگ ٹولز سے کھل کر بنائیں۔'),
    P('Chart Snapshots', 'Chart ke snapshot paste karein aur uspar likhein.', 'چارٹ کے اسنیپ شاٹ پیسٹ کریں اور اس پر لکھیں۔'),
    P('Export Sheets', 'Tayyar diagram sheets export kar lein.', 'تیار ڈایاگرام شیٹس ایکسپورٹ کر لیں۔')] },
  SITUATION_SAVER: { hook: ['Wohi galti dobara nahi. Apni situations save karein.', 'وہی غلطی دوبارہ نہیں۔ اپنی سچویشنز سیو کریں۔'], parts: [
    P('Market Conditions', 'Setups ko trend aur consolidation ke hisab se rakhein.', 'سیٹ اپس کو ٹرینڈ اور کنسولیڈیشن کے حساب سے رکھیں۔'),
    P('Notes and Lessons', 'Execution notes aur seekhi hui baatein likhein.', 'ایگزیکیوشن نوٹس اور سیکھی ہوئی باتیں لکھیں۔'),
    P('Searchable Library', 'Apni personal library mein foran search karein.', 'اپنی پرسنل لائبریری میں فوراً سرچ کریں۔'),
    P('Cloud Sync', 'Cloud sync, aur offline bhi chalta hai.', 'کلاؤڈ سنک، اور آف لائن بھی چلتا ہے۔')] },
  PAIR_SAVER: { hook: ['Apne pairs, ek hi nazar mein.', 'اپنے پیئرز، ایک ہی نظر میں۔'], parts: [
    P('Watchlists', 'Pairs ko watchlist mein group karein.', 'پیئرز کو واچ لسٹ میں گروپ کریں۔'),
    P('Live Quotes', 'Live quotes har waqt samne.', 'لائیو کوٹس ہر وقت سامنے۔'),
    P('Bias Tags', 'Har pair par technical bias ka tag.', 'ہر پیئر پر ٹیکنیکل بائس کا ٹیگ۔')] },
  PRO_LEARNING: { hook: ['Teen mahine mein institutional trading seekhein.', 'تین مہینے میں انسٹی ٹیوشنل ٹریڈنگ سیکھیں۔'], parts: [
    P('3 Month Curriculum', 'Teen mahine ka mukammal institutional curriculum.', 'تین مہینے کا مکمل انسٹی ٹیوشنل کریکولم۔'),
    P('Video Breakdowns', 'High probability models ki video breakdowns.', 'ہائی پروبیبلٹی ماڈلز کی ویڈیو بریک ڈاؤنز۔'),
    P('Trading Bots', 'Trading bot algorithms aur automated scripts.', 'ٹریڈنگ بوٹ الگورتھمز اور آٹومیٹڈ اسکرپٹس۔'),
    P('Mentor Review', 'Mentor se seedha review aur homework ka channel.', 'مینٹر سے سیدھا ریویو اور ہوم ورک کا چینل۔')] },
  COMMUNITY: { hook: ['Akele nahi, traders ki poori community ke saath.', 'اکیلے نہیں، ٹریڈرز کی پوری کمیونٹی کے ساتھ۔'], parts: [
    P('Live Chat', 'Live chat aur setups ki sharing.', 'لائیو چیٹ اور سیٹ اپس کی شیئرنگ۔'),
    P('Private Messages', 'Dosti ki request aur private messaging.', 'دوستی کی ریکویسٹ اور پرائیویٹ میسجنگ۔'),
    P('Verified Presence', 'Verified traders ki online maujoodgi.', 'ویریفائیڈ ٹریڈرز کی آن لائن موجودگی۔'),
    P('Mentor Updates', 'Mentorship desk se seedhi announcements.', 'مینٹرشپ ڈیسک سے سیدھی اناؤنسمنٹس۔')] },
  BOOK_SESSION: { hook: ['Apne mentor se seedha, one on one.', 'اپنے مینٹر سے سیدھا، ون آن ون۔'], parts: [
    P('1 on 1 Booking', 'Zoom ya Google Meet par seedhi booking.', 'زوم یا گوگل میٹ پر سیدھی بکنگ۔'),
    P('Journal Autopsy', 'Apne journal aur charts ka poora audit.', 'اپنے جرنل اور چارٹس کا پورا آڈٹ۔'),
    P('Prop Firm Prep', 'Prop firm challenge ki tayyari ki strategy.', 'پراپ فرم چیلنج کی تیاری کی اسٹریٹجی۔'),
    P('Priority Support', 'WhatsApp par priority support.', 'واٹس ایپ پر پرائیرٹی سپورٹ۔')] },
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
