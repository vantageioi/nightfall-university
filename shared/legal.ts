// Legal documents, versioned. Bump LEGAL_VERSION whenever any document's
// meaning changes — every student is re-gated through acceptance once.
export const LEGAL_VERSION = "2026-08";

export type Doc = { title: string; sections: Array<{ heading: string; body: string }> };
type Bilingual = Record<"en" | "ar", Doc>;

const TERMS_EN: Doc = {
  title: "Terms and Conditions",
  sections: [
    { heading: "1. What Nightfall is", body: "Nightfall is a research and organization tool for university applicants. It helps you collect programme information, prepare drafts of your own application materials, and track your own deadlines. Nightfall is not an admissions consultancy, a legal service, or a representative before any university." },
    { heading: "2. No decisions made for you", body: "Nightfall never decides your eligibility, admission chances, visa outcomes, scholarship results, or anything else that belongs to a university or authority. Every research signal is an orientation aid. You must verify every fact on the official source before relying on it." },
    { heading: "3. Your account", body: "You are responsible for the accuracy of the information you provide, for keeping your sign-in method secure, and for the content you upload. You must be old enough to form a binding contract in your jurisdiction, or have a guardian's consent." },
    { heading: "4. Acceptable use", body: "Do not upload other people's personal data without their permission, attempt to access other users' data, automate abusive request volumes, or use Nightfall to misrepresent anything to a university." },
    { heading: "5. AI-generated material", body: "Drafts prepared by Nightfall's AI are starting points only. You must read, personalize, fact-check, and take full responsibility for anything you submit anywhere." },
    { heading: "6. Availability and changes", body: "We work to keep Nightfall available but do not guarantee uninterrupted service. These terms may change; material changes re-require your acceptance inside the app." },
  ],
};

const TERMS_AR: Doc = {
  title: "الشروط والأحكام",
  sections: [
    { heading: "١. شو نايتفول", body: "نايتفول أداة بحث وتنظيم لتقديمات الجامعة. بتساعدك تجمع معلومات البرامج، تجهّز مسودات أوراقك إنت، وتتابع مواعيدك. نايتفول مش مكتب قبول، ومش خدمة قانونية، ومش وكيل عند أي جامعة." },
    { heading: "٢. ما مناخد قرارات عنك", body: "نايتفول ما بيقرر أهليتك، فرص القبول، نتائج الفيزا أو المنح، أو أي قرار بيرجع للجامعة أو لأي جهة رسمية. كل إشارة بحث هي وسيلة توجيه. لازم تتحقق بكل معلومة من المصدر الرسمي قبل الاعتماد عليها." },
    { heading: "٣. حسابك", body: "إنت مسؤول عن صحة المعلومات اللي بتقدمها، عن تأمين طريقة دخولك، وعن المحتوى اللي بترفعه. لازم تكون بعمر يسمح بالتعاقد ببلدك، أو مع موافقة وليّ أمر." },
    { heading: "٤. الاستخدام المقبول", body: "ممنوع ترفع بيانات شخصية لغيرك بدون إذنهم، تحاول توصل لبيانات مستخدمين غيرك، تسوّي ضغط طلبات مسيء، أو تستخدم نايتفول لتضليل أي جامعة." },
    { heading: "٥. المواد المولدة بالذكاء الاصطناعي", body: "المسودات اللي بيجهزها الذكاء الاصطناعي هي نقطة بداية بس. لازم تقرأها، تعدّلها بصوتك، تتحقق منها، وتتحمل المسؤولية الكاملة عن أي شي بتبعته لأي جهة." },
    { heading: "٦. الخدمة والتعديلات", body: "منحاول نخلي نايتفول متاح دايماً بس ما بندمان عدم انقطاع. هالشروط ممكن تتغير؛ والتغييرات الجوهرية رح تتطلب موافقتك من جديد داخل التطبيق." },
  ],
};

const EULA_EN: Doc = {
  title: "End User License Agreement",
  sections: [
    { heading: "1. License", body: "Nightfall grants you a personal, non-exclusive, non-transferable license to use the app for preparing your own university applications. You may not copy, resell, reverse-engineer, or use the service to build a competing product." },
    { heading: "2. Your data stays yours", body: "Your uploaded documents and answers remain your property. You grant Nightfall only the limited right to process them to provide the service: extracting grades you can review, preparing drafts you approve, and syncing replies you connect." },
    { heading: "3. Approval-first communication", body: "Nightfall never sends an email to a university without your explicit click-to-approve on that specific draft. This is structural and cannot be disabled by anyone, including staff." },
    { heading: "4. Termination", body: "You may delete your account at any time from Settings → Privacy & data. Deletion removes your personal records and destroys your encryption key so no remaining copies of your sealed data can ever be decrypted again." },
    { heading: "5. Warranty disclaimer", body: "The service is provided as-is. To the maximum extent permitted by law, Nightfall disclaims warranties of merchantability or fitness for a particular purpose and is not liable for indirect damages arising from use." },
  ],
};

const EULA_AR: Doc = {
  title: "اتفاقية ترخيص المستخدم",
  sections: [
    { heading: "١. الترخيص", body: "نايتفول بيمنحك ترخيص شخصي وغير حصري لاستخدام التطبيق لتحضير تقديماتك الجامعية إنت. ممنوع النسخ أو إعادة البيع أو الهندسة العكسية أو استخدام الخدمة لبناء منتج منافس." },
    { heading: "٢. بياناتك ملكك", body: "أوراقك وأجوبتك بتفضل ملكك. بتمنح نايتفول بس الحق المحدود بمعالجتها لتقديم الخدمة: استخراج علامات بتراجعها، تجهيز مسودات بتوافق عليها، ومزامنة ردود بتوصّلها." },
    { heading: "٣. الإرسال بموافقتك", body: "نايتفول عمّا يبعتل جامعة أي إيميل بدون ضغطة موافقة صريحة منك عالمسودة المحددة نفسها. هيكل ثابت ما بينقدر حد يشيلو، حتى الموظفين." },
    { heading: "٤. إنهاء الحساب", body: "بتقدر تحذف حسابك بأي وقت من الإعدادات ← الخصوصية والبيانات. الحذف بشيل سجلاتك الشخصية وبدمّر مفتاح التشفير تبعك، فما فينا نفك تشفير أي نسخة من بياناتك المشفرة بعد هالحذف، أبداً." },
    { heading: "٥. تنويه الضمانات", body: "الخدمة مقدمة كما هي. بالحد الأقصى اللي بيسمح فيه القانون، نايتفول ما بيوفر ضمانات لغرض معين وما بكون مسؤول عن أضرار غير مباشرة." },
  ],
};

const PRIVACY_EN: Doc = {
  title: "Privacy Policy",
  sections: [
    { heading: "What we store", body: "Your account details, the profile context you choose to share (study direction, grades, budget band), your saved programmes and deadlines, documents you upload, and communication drafts you create. Your Gemini API key and Gmail refresh token are stored encrypted under a key unique to your account." },
    { heading: "Encryption and shredding", body: "Every secret is encrypted under a per-user key wrapped by a server master key. When you delete your account we destroy your per-user key first: all sealed data becomes permanently undecryptable, including in backups, then personal rows are removed." },
    { heading: "Third parties", body: "Google (Gmail API) receives tokens only to send mail you explicitly approved and read replies you chose to sync. Google Gemini processes prompts you initiate. We do not sell your data, ever, to anyone." },
    { heading: "Your rights", body: "Export everything as JSON from Settings → Privacy & data, delete your account with one confirmed action, and revoke Gmail access at any time from Google's security settings or here in Connections." },
    { heading: "Contact", body: "Privacy questions and erasure requests: reach us through the app's support channel or your account email. We respond within 30 days." },
  ],
};

const PRIVACY_AR: Doc = {
  title: "سياسة الخصوصية",
  sections: [
    { heading: "شو منخزّن", body: "تفاصيل حسابك، سياق الملف اللي بتختار تشاركه (الاتجاه، العلامات، الميزانية)، برامجك المحفوظة ومواعيدك، الأوراق اللي بترفعها، والمسودات اللي بتنشئها. مفتاح Gemini ورقم Gmail السري بينخزّنوا مشفّرين بمفتاح خاص بحسابك إنت." },
    { heading: "التشفير والإتلاف", body: "كل سر مشفّر بمفتاح خاص فيك ملفوف بمفتاح رئيسي على السيرفر. لما تحذف حسابك مندمّر مفتاحك الخاص الأول: كل البيانات المشفرة بتصير مستحيلة الفك للأبد — حتى بالنسخ الاحتياطية — وبعدها بنحذف الصفوف الشخصية." },
    { heading: "الأطراف الثالثة", body: "غوغل (Gmail API) بتستلم أرقام سرية بس لإرسال إيميلات موافقت عليها صراحة ولقراءة ردود اخترت مزامنتها. Gemini من غوغل بيعالج الطلبات اللي أنت بتطلعها. ما منبيع بياناتك أبداً، لأحد." },
    { heading: "حقوقك", body: "صدّر كل شي JSON من الإعدادات ← الخصوصية والبيانات، احذف حسابك بضغطة مؤكدة وحدة، واسحب صلاحيات Gmail بأي وقت من إعدادات أمان غوغل أو من صفحة الاتصالات هون." },
    { heading: "التواصل", body: "أسئلة الخصوصية وطلبات الحذف: من خلال قناة الدعم بالتطبيق أو إيميل حسابك. منرد خلال ٣٠ يوم." },
  ],
};

export const TERMS: Bilingual = { en: TERMS_EN, ar: TERMS_AR };
export const EULA: Bilingual = { en: EULA_EN, ar: EULA_AR };
export const PRIVACY: Bilingual = { en: PRIVACY_EN, ar: PRIVACY_AR };
