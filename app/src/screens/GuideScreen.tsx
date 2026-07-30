import { useI18n } from '../i18n';

const content = {
  bn: [
    ['জরুরি নম্বর', 'জাতীয় জরুরি সেবা: ৯৯৯ · স্বাস্থ্য বাতায়ন: ১৬২৬৩। কল না গেলে কাছের মানুষ বা স্থানীয় উদ্ধারকর্মীর সাহায্য নিন।'],
    ['বন্যার সময়', 'বিদ্যুতের মূল সুইচ বন্ধ করুন। প্রবাহমান পানিতে হাঁটবেন না। শিশু, বয়স্ক, ওষুধ ও বিশুদ্ধ পানি আগে নিরাপদ স্থানে নিন।'],
    ['ঘূর্ণিঝড়ের সময়', 'সরকারি সতর্কতা শুনুন। জানালা থেকে দূরে থাকুন। আশ্রয়কেন্দ্রে যাওয়ার সময় পানি, শুকনো খাবার, টর্চ, ওষুধ ও পরিচয়পত্র নিন।'],
    ['রক্তপাত', 'পরিষ্কার কাপড় দিয়ে ক্ষতের ওপর শক্ত চাপ দিন। কাপড় ভিজে গেলে তুলবেন না—ওপর থেকে আরেকটি দিন। দ্রুত চিকিৎসা নিন।'],
    ['পানি বিশুদ্ধকরণ', 'পরিষ্কার পাত্রে পানি কমপক্ষে এক মিনিট ফুটিয়ে ঠান্ডা করুন। সন্দেহজনক পানি পান করবেন না।'],
    ['পারিবারিক পরিকল্পনা', 'দুইটি মিলনস্থল ঠিক করুন, জরুরি যোগাযোগ লিখে রাখুন, ওষুধ ও নথির কপি জলরোধী ব্যাগে রাখুন।'],
  ],
  en: [
    ['Emergency numbers', 'National emergency service: 999 · Health hotline: 16263. If calls fail, contact nearby people or local responders.'],
    ['During a flood', 'Turn off the main electricity supply. Do not walk through moving water. Move children, older people, medicines, and safe water first.'],
    ['During a cyclone', 'Follow official alerts. Stay away from windows. Take water, dry food, a torch, medicines, and identification to the shelter.'],
    ['Severe bleeding', 'Press firmly on the wound with a clean cloth. If it soaks through, add another cloth without removing the first. Seek urgent care.'],
    ['Safe drinking water', 'Boil water in a clean container for at least one minute, then let it cool. Do not drink water you suspect is contaminated.'],
    ['Family plan', 'Choose two meeting points, write down emergency contacts, and keep medicines and document copies in a waterproof bag.'],
  ],
};

export function GuideScreen() {
  const { t, lang } = useI18n();
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-5">
      <div className="rounded-3xl bg-accent px-5 py-6 text-white">
        <p className="text-4xl" aria-hidden="true">🛟</p>
        <h1 className="mt-3 text-2xl font-bold">{t('guideTitle')}</h1>
        <p className="mt-2 text-sm text-white/80">{t('guideOffline')}</p>
      </div>
      {content[lang].map(([title, body]) => (
        <details key={title} className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <summary className="cursor-pointer font-semibold text-ink">{title}</summary>
          <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>
        </details>
      ))}
      <p className="rounded-xl bg-warning/10 px-4 py-3 text-xs leading-relaxed text-warning">
        {t('guideDisclaimer')}
      </p>
    </div>
  );
}
