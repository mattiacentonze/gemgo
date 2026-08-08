"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Globe2,
  HeartHandshake,
  Leaf,
  Linkedin,
  MapPinned,
  Mountain,
  ShieldCheck,
  Users,
} from "lucide-react";
import MarketingHeader from "../components/MarketingHeader";
import { team } from "../content";
import { usePersistentLocale } from "../hooks/usePersistentLocale";
import { useHashScroll } from "../hooks/useHashScroll";
import { marketingCopy } from "../i18n/marketing";

const content = {
  en: {
    eyebrow: "Why GemGo exists",
    title: "We love the Alps. We do not want to love them to exhaustion.",
    intro:
      "GemGo began with a familiar Alpine contradiction: iconic places overflow, while equally meaningful valleys, lakes and villages nearby remain outside the usual itinerary.",
    story: "Where the idea began",
    storyTitle: "The morning Neuschwanstein made the problem impossible to ignore.",
    storyLead:
      "Before the AI hackathon began, the organisers took us to Neuschwanstein—one of the Alps’ strongest visitor magnets—so that we would experience the problem from inside it, as visitors and therefore as part of the pressure.",
    storyBody:
      "Inside the castle, our timed-group visit felt compressed so that successive groups could pass through. At Marienbrücke, where there was no equivalent flow control, the density of people made it difficult to cross, pause or enjoy the view. GemGo was born from that contrast: a better trip should not depend on sending everyone to the same icon at the same time.",
    storyCaption: "Illustrative image of crowd pressure on an Alpine path.",
    problem: "The challenge",
    problemTitle: "Overtourism is concentrated in space and time",
    problemBody:
      "Search and booking platforms reinforce what is already famous. The same hotspots absorb environmental and social pressure, even when credible alternatives are close by.",
    solution: "The GemGo response",
    solutionTitle: "Redirect a choice, without restricting a journey",
    solutionBody:
      "GemGo turns interests, time, mobility and crowd preference into transparent alternatives. It explains the trade-off, rewards verified lower-impact choices and helps value circulate through more Alpine communities.",
    today: "Prototype today",
    todayBody:
      "Deterministic, explainable ranking across 66 mapped prototype locations in two EUSALP pilot regions, with maps, routing, live weather where available and clearly labelled demo rewards.",
    factsRegions: "EUSALP regions",
    factsPilots: "pilot regions · Bavaria and Valle d’Aosta",
    factsMapped: "mapped prototype locations",
    future: "After validation and partnerships",
    futureBody:
      "Validated crowd forecasting, territorial data agreements, production accounts, real local offers and privacy-preserving impact reporting.",
    team: "Meet the team",
    roles: [
      "Product Development Lead",
      "Business Strategy Lead",
      "Partnerships & Growth Lead",
    ],
    bios: [
      "App development, infrastructure, recommendation logic and future AI systems.",
      "Business development, strategy and financial planning.",
      "Merchant recruitment, institutional partnerships and go-to-market.",
    ],
    hackathon:
      "GemGo was created for the European Union Strategy for the Alpine Region AI hackathon in 2026.",
    award:
      "The prototype was awarded by a jury of experts and regional representatives.",
    cta: "Try the prototype",
  },
  it: {
    eyebrow: "Perché esiste GemGo",
    title: "Amiamo le Alpi. Non vogliamo amarle fino a consumarle.",
    intro:
      "GemGo nasce da una contraddizione alpina familiare: i luoghi iconici traboccano, mentre valli, laghi e borghi altrettanto preziosi restano fuori dagli itinerari abituali.",
    story: "Dove nasce l’idea",
    storyTitle: "La mattina in cui Neuschwanstein ci ha mostrato il problema.",
    storyLead:
      "Prima dell’inizio dell’AI hackathon, gli organizzatori ci hanno portato a Neuschwanstein—una delle mete turistiche più attrattive delle Alpi—per farci vivere il problema dall’interno, da visitatori e quindi come parte della pressione.",
    storyBody:
      "Nel castello, la visita in gruppi contingentati ci è sembrata compressa per consentire il passaggio dei gruppi successivi. Sul Marienbrücke, senza un controllo equivalente dei flussi, la densità di persone rendeva difficile attraversare, fermarsi o godersi il panorama. GemGo è nato da questo contrasto: un viaggio migliore non dovrebbe dipendere dal mandare tutti nello stesso luogo, nello stesso momento.",
    storyCaption: "Immagine illustrativa della pressione della folla su un sentiero alpino.",
    problem: "La sfida",
    problemTitle: "L’overtourism si concentra nello spazio e nel tempo",
    problemBody:
      "Motori di ricerca e piattaforme di prenotazione rafforzano ciò che è già famoso. Gli stessi hotspot assorbono pressione ambientale e sociale, anche quando esistono alternative credibili poco lontano.",
    solution: "La risposta GemGo",
    solutionTitle: "Riorientare una scelta, senza limitare un viaggio",
    solutionBody:
      "GemGo trasforma interessi, tempo, mobilità e preferenze sull’affollamento in alternative trasparenti. Spiega il compromesso, premia scelte verificate a minore impatto e distribuisce valore tra più comunità alpine.",
    today: "Prototipo attuale",
    todayBody:
      "Ranking deterministico e spiegabile su 66 località mappate nel prototipo in due regioni pilota EUSALP, con mappe, routing, meteo live dove disponibile e premi demo chiaramente indicati.",
    factsRegions: "regioni EUSALP",
    factsPilots: "regioni pilota · Baviera e Valle d’Aosta",
    factsMapped: "località mappate nel prototipo",
    future: "Dopo validazione e partnership",
    futureBody:
      "Previsioni validate dell’affollamento, accordi territoriali sui dati, account di produzione, offerte locali reali e misurazione d’impatto rispettosa della privacy.",
    team: "Conosci il team",
    roles: [
      "Responsabile sviluppo prodotto",
      "Responsabile strategia aziendale",
      "Responsabile partnership e crescita",
    ],
    bios: [
      "Sviluppo app, infrastruttura, logica di raccomandazione e futuri sistemi AI.",
      "Sviluppo aziendale, strategia e pianificazione finanziaria.",
      "Reclutamento esercenti, partnership istituzionali e go-to-market.",
    ],
    hackathon:
      "GemGo è stato creato per l’European Union Strategy for the Alpine Region AI hackathon nel 2026.",
    award:
      "Il prototipo è stato premiato da una giuria di esperti e rappresentanti regionali.",
    cta: "Prova il prototipo",
  },
  de: {
    eyebrow: "Warum GemGo",
    title: "Wir lieben die Alpen. Wir wollen sie nicht zu Tode lieben.",
    intro:
      "GemGo entstand aus einem alpinen Widerspruch: Ikonen sind überfüllt, während ebenso wertvolle Täler, Seen und Dörfer in der Nähe kaum besucht werden.",
    story: "Der Ursprung der Idee",
    storyTitle: "Der Morgen, an dem Neuschwanstein das Problem sichtbar machte.",
    storyLead:
      "Vor Beginn des AI Hackathons brachten uns die Organisatoren nach Neuschwanstein—zu einem der stärksten Besuchermagnete der Alpen—damit wir das Problem als Besucher und damit als Teil des Drucks selbst erleben.",
    storyBody:
      "Im Schloss wirkte unser Besuch in einem festen Zeitfenster gedrängt, damit die nächsten Gruppen folgen konnten. Auf der Marienbrücke erschwerte der dichte Besucherstrom ohne vergleichbare Steuerung das Überqueren, Anhalten und Genießen der Aussicht. Aus diesem Gegensatz entstand GemGo: Eine bessere Reise sollte nicht alle zur selben Zeit an denselben Ort schicken.",
    storyCaption: "Illustratives Bild des Besucherdrucks auf einem Alpenweg.",
    problem: "Die Herausforderung",
    problemTitle: "Overtourism konzentriert sich räumlich und zeitlich",
    problemBody:
      "Such- und Buchungsplattformen verstärken Bekanntes. Dieselben Hotspots tragen Umwelt- und Sozialdruck, obwohl glaubwürdige Alternativen nahe liegen.",
    solution: "Die GemGo-Antwort",
    solutionTitle: "Eine Wahl umlenken, ohne eine Reise einzuschränken",
    solutionBody:
      "GemGo übersetzt Interessen, Zeit, Mobilität und Besucherpräferenz in transparente Alternativen, erklärt Kompromisse und belohnt verifizierte, schonendere Entscheidungen.",
    today: "Prototyp heute",
    todayBody:
      "Erklärbares deterministisches Ranking für 66 im Prototyp kartierte Orte in zwei EUSALP-Pilotregionen, mit Karten, Routing, Live-Wetter und klar markierten Demo-Prämien.",
    factsRegions: "EUSALP-Regionen",
    factsPilots: "Pilotregionen · Bayern und Aostatal",
    factsMapped: "im Prototyp kartierte Orte",
    future: "Nach Validierung und Partnerschaften",
    futureBody:
      "Validierte Besucherprognosen, territoriale Datenvereinbarungen, Produktivkonten, echte lokale Angebote und datenschutzfreundliche Wirkungsmessung.",
    team: "Das Team",
    roles: [
      "Leitung Produktentwicklung",
      "Leitung Geschäftsstrategie",
      "Leitung Partnerschaften & Wachstum",
    ],
    bios: [
      "App, Infrastruktur, Empfehlungslogik und künftige KI-Systeme.",
      "Geschäftsentwicklung, Strategie und Finanzplanung.",
      "Betriebe, Institutionen und Markteinführung.",
    ],
    hackathon:
      "GemGo entstand 2026 für den AI Hackathon der EU-Strategie für den Alpenraum.",
    award:
      "Der Prototyp wurde von einer Jury aus Fachleuten und regionalen Vertretern ausgezeichnet.",
    cta: "Prototyp testen",
  },
  fr: {
    eyebrow: "Pourquoi GemGo",
    title: "Nous aimons les Alpes. Pas au point de les épuiser.",
    intro:
      "GemGo est né d’un paradoxe alpin : les icônes débordent, tandis que des vallées, lacs et villages tout aussi précieux restent hors des itinéraires habituels.",
    story: "L’origine de l’idée",
    storyTitle: "Le matin où Neuschwanstein a rendu le problème évident.",
    storyLead:
      "Avant le hackathon IA, les organisateurs nous ont conduits à Neuschwanstein—l’un des plus puissants pôles touristiques des Alpes—pour nous faire vivre le problème de l’intérieur, comme visiteurs et donc comme partie de la pression.",
    storyBody:
      "Dans le château, notre visite en groupe à horaire fixe nous a semblé accélérée afin de laisser passer les groupes suivants. Sur le Marienbrücke, sans gestion équivalente des flux, la densité rendait difficile la traversée, l’arrêt et l’appréciation du panorama. GemGo est né de ce contraste : un meilleur voyage ne devrait pas envoyer tout le monde au même endroit au même moment.",
    storyCaption: "Image illustrative de la pression de la foule sur un sentier alpin.",
    problem: "Le défi",
    problemTitle: "Le surtourisme se concentre dans l’espace et le temps",
    problemBody:
      "Recherche et réservation renforcent ce qui est déjà célèbre. Les mêmes sites absorbent la pression environnementale et sociale malgré des alternatives crédibles à proximité.",
    solution: "La réponse GemGo",
    solutionTitle: "Réorienter un choix, sans restreindre un voyage",
    solutionBody:
      "GemGo transforme intérêts, temps, mobilité et préférence d’affluence en alternatives transparentes, explique le compromis et récompense les choix vérifiés à moindre impact.",
    today: "Prototype actuel",
    todayBody:
      "Classement déterministe et explicable de 66 lieux cartographiés dans le prototype, dans deux régions pilotes EUSALP, avec cartes, itinéraires, météo en direct et récompenses démo signalées.",
    factsRegions: "régions EUSALP",
    factsPilots: "régions pilotes · Bavière et Vallée d’Aoste",
    factsMapped: "lieux cartographiés dans le prototype",
    future: "Après validation et partenariats",
    futureBody:
      "Prévision validée, accords territoriaux de données, comptes de production, offres locales réelles et mesure d’impact respectueuse de la vie privée.",
    team: "L’équipe",
    roles: [
      "Responsable développement produit",
      "Responsable stratégie",
      "Responsable partenariats et croissance",
    ],
    bios: [
      "Application, infrastructure, recommandation et futurs systèmes d’IA.",
      "Développement, stratégie et planification financière.",
      "Commerçants, institutions et mise sur le marché.",
    ],
    hackathon:
      "GemGo a été créé en 2026 pour le hackathon IA de la Stratégie de l’UE pour la région alpine.",
    award:
      "Le prototype a été récompensé par un jury d’experts et de représentants régionaux.",
    cta: "Essayer le prototype",
  },
  sl: {
    eyebrow: "Zakaj GemGo",
    title: "Ljubimo Alpe. Ne želimo jih izčrpati z ljubeznijo.",
    intro:
      "GemGo je nastal iz alpskega protislovja: ikonični kraji pokajo po šivih, enako dragocene doline, jezera in vasi v bližini pa ostajajo spregledani.",
    story: "Izvor zamisli",
    storyTitle: "Jutro, ko je Neuschwanstein razkril problem.",
    storyLead:
      "Pred začetkom AI hackathona so nas organizatorji odpeljali v Neuschwanstein—eno največjih turističnih privlačnosti v Alpah—da bi težavo doživeli od znotraj, kot obiskovalci in s tem kot del pritiska.",
    storyBody:
      "V gradu se nam je obisk v časovno omejeni skupini zdel pospešen, da so lahko sledile naslednje skupine. Na mostu Marienbrücke je gost tok ljudi brez primerljivega nadzora otežil prečkanje, postanek in uživanje v razgledu. GemGo je nastal iz tega nasprotja: boljše potovanje ne bi smelo vseh pošiljati na isti kraj ob istem času.",
    storyCaption: "Ponazoritvena fotografija pritiska množice na alpski poti.",
    problem: "Izziv",
    problemTitle: "Čezmerni turizem je zgoščen v prostoru in času",
    problemBody:
      "Iskanje in rezervacije krepijo že znane kraje. Iste točke nosijo okoljski in družbeni pritisk, čeprav so verodostojne alternative blizu.",
    solution: "Odgovor GemGo",
    solutionTitle: "Preusmeriti izbiro, ne omejiti potovanja",
    solutionBody:
      "GemGo interese, čas, mobilnost in željo glede gneče spremeni v pregledne alternative, pojasni kompromis in nagradi potrjene izbire z manjšim vplivom.",
    today: "Današnji prototip",
    todayBody:
      "Pojasnljivo deterministično razvrščanje 66 lokacij, kartiranih v prototipu, v dveh pilotnih regijah EUSALP, z zemljevidi, potmi, živim vremenom in jasno označenimi demo nagradami.",
    factsRegions: "regij EUSALP",
    factsPilots: "pilotni regiji · Bavarska in Dolina Aoste",
    factsMapped: "lokacij, kartiranih v prototipu",
    future: "Po validaciji in partnerstvih",
    futureBody:
      "Potrjene napovedi obiska, ozemeljski podatkovni dogovori, produkcijski računi, prave lokalne ponudbe in zasebnosti prijazno merjenje učinka.",
    team: "Ekipa",
    roles: [
      "Vodja razvoja izdelka",
      "Vodja poslovne strategije",
      "Vodja partnerstev in rasti",
    ],
    bios: [
      "Aplikacija, infrastruktura, priporočila in prihodnji sistemi AI.",
      "Poslovni razvoj, strategija in finančno načrtovanje.",
      "Ponudniki, ustanove in vstop na trg.",
    ],
    hackathon:
      "GemGo je bil leta 2026 ustvarjen za AI hackathon Strategije EU za alpsko regijo.",
    award:
      "Prototip je nagradila žirija strokovnjakov in regionalnih predstavnikov.",
    cta: "Preizkusi prototip",
  },
} as const;

export default function AboutPage() {
  useHashScroll();
  const { locale, setLocale } = usePersistentLocale();
  const t = content[locale];
  const marketing = marketingCopy[locale];

  return (
    <main className="marketing-page standalone-info-page">
      <MarketingHeader
        locale={locale}
        onLocaleChange={setLocale}
        copy={marketing}
      />
      <section className="info-page-hero">
        <span className="eyebrow">
          <Globe2 size={15} /> {t.eyebrow}
        </span>
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
      </section>

      <section className="origin-story-card" id="origin">
        <figure className="origin-story-photo">
          <img
            src="/assets/neuschwanstein-overtourism-story.webp"
            alt={t.storyCaption}
            loading="lazy"
          />
          <figcaption>{t.storyCaption}</figcaption>
        </figure>
        <div>
          <span className="eyebrow">{t.story}</span>
          <h2>{t.storyTitle}</h2>
          <p className="story-lead">{t.storyLead}</p>
          <p>{t.storyBody}</p>
        </div>
      </section>

      <section className="about-story-grid">
        <article>
          <Leaf />
          <span>{t.problem}</span>
          <h2>{t.problemTitle}</h2>
          <p>{t.problemBody}</p>
        </article>
        <article>
          <HeartHandshake />
          <span>{t.solution}</span>
          <h2>{t.solutionTitle}</h2>
          <p>{t.solutionBody}</p>
        </article>
      </section>

      <section className="eus-alp-facts" aria-label="EUSALP pilot scope">
        <div>
          <Globe2 />
          <strong>48</strong>
          <span>{t.factsRegions}</span>
        </div>
        <div>
          <MapPinned />
          <strong>2</strong>
          <span>{t.factsPilots}</span>
        </div>
        <div>
          <Mountain />
          <strong>66</strong>
          <span>{t.factsMapped}</span>
        </div>
      </section>

      <section className="product-reality-grid info-reality">
        <article>
          <BadgeCheck />
          <span>{t.today}</span>
          <p>{t.todayBody}</p>
        </article>
        <article>
          <ShieldCheck />
          <span>{t.future}</span>
          <p>{t.futureBody}</p>
        </article>
      </section>

      <section className="about-team-page" id="team">
        <div className="section-intro">
          <span className="eyebrow">
            <Users size={15} /> GemGo
          </span>
          <h2>{t.team}</h2>
        </div>
        <div className="team-photo-grid">
          {team.map((person, index) => (
            <article key={person.name}>
              <img src={person.photo} alt={person.name} />
              <div>
                <h3>{person.name}</h3>
                <strong>{t.roles[index]}</strong>
                <p>{t.bios[index]}</p>
                <a
                  href={person.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="team-linkedin"
                >
                  <Linkedin size={16} /> LinkedIn
                </a>
              </div>
            </article>
          ))}
        </div>
        <div className="hackathon-note">
          <Mountain />
          <p>
            <strong>{t.hackathon}</strong>
            <span>{t.award}</span>
          </p>
        </div>
      </section>

      <section className="final-cta-section">
        <div>
          <h2>{marketing.final.title}</h2>
          <p>{marketing.final.body}</p>
        </div>
        <Link href="/app" className="button button-primary button-large">
          {t.cta} <ArrowRight />
        </Link>
      </section>
    </main>
  );
}
