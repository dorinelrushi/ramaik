import Link from 'next/link';

export default function Rregullorja() {
  return (
    <div className="min-h-screen bg-[#07080b] text-[#f1f5f9] px-4 py-12 flex flex-col items-center">
      <div className="w-full max-w-3xl bg-[#0e121a]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-10 shadow-2xl flex flex-col gap-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            ← Kthehu te Debati Kryesor
          </Link>
          <span className="text-xs text-gray-400">Përditësuar: 2026</span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
            Rregullorja & Politika e Anonimatit
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Rregullat e pjesëmarrjes, ruajtja e anonimatit dhe moderimi i komenteve.
          </p>
        </div>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold text-red-400">1. Qëllimi i Platformës</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Kjo është një platformë online qytetare e pavarur, e krijuar për të mbledhur dhe pasqyruar mendimin e lirë të qytetarëve dhe studentëve shqiptarë. Ajo nuk organizohet nga asnjë parti politike apo institucion shtetëror.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold text-red-400">2. Anonimati dhe Adresa IP</h2>
          <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1.5 leading-relaxed">
            <li>Pjesëmarrja në debat dhe komentimi janë tërësisht anonime.</li>
            <li>
              <strong>Adresa juaj IP nuk shfaqet asnjëherë si emër apo në ndonjë pjesë të faqes.</strong>
            </li>
            <li>
              Për të parandaluar spam-in dhe sulmet e automatizuara, sistemi zbaton një kufizim teknik prej <strong>maksimumi 3 komente/përgjigje në ditë për çdo pajisje (IP)</strong>.
            </li>
            <li>Nuk kërkohet asnjë regjistrim me email apo të dhëna personale.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold text-red-400">3. Moderimi dhe Fjalori i Papërshtatshëm</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Platforma ka një filtër automatik të fjalorit denigrues dhe fyes. Çdo koment që përmban sharje ose ofendime refuzohet menjëherë nga serveri dhe nuk lejohet të publikohet në faqe.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold text-red-400">4. Përgjegjësia</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Mendimet e shprehura në komente përfaqësojnë vetëm autorët anonimë përkatës dhe nuk përbëjnë qëndrim zyrtar të platformës.
          </p>
        </section>

        <footer className="pt-4 border-t border-white/10 text-xs text-gray-400 flex items-center justify-between">
          <span>&copy; 2026 Votoni Shqipëri</span>
          <Link href="/" className="text-red-400 hover:underline">
            Merr pjesë në votim & debat →
          </Link>
        </footer>
      </div>
    </div>
  );
}