import type { Locale } from "../domain";
import type { Experience } from "../product/types";
import { kindLabel } from "./pan-ui";
import { seasonLabel } from "./season";
import { seasonForDate } from "../product/catalogue-editorial";

type CaptionSet = readonly [it: string, de: string, fr: string, sl: string];
type NonEnglishLocale = Exclude<Locale, "en">;

const captionLocaleIndex: Record<NonEnglishLocale, number> = {
  it: 0,
  de: 1,
  fr: 2,
  sl: 3,
};

// These are translations of the source-checked English editorial captions.
// Place names remain proper nouns; no new factual claims are introduced here.
const translatedCaptions: Record<string, CaptionSet> = {
  "catalogue-bav_001": [
    "La storica Mittenwald unisce facciate dipinte con la Lüftlmalerei, tradizione liutaia e passeggiate ai piedi del Karwendel.",
    "Das historische Mittenwald verbindet Lüftlmalerei-Fassaden, Geigenbautradition und Spazierwege unterhalb des Karwendels.",
    "La ville historique de Mittenwald réunit façades peintes en Lüftlmalerei, tradition de lutherie et promenades au pied du Karwendel.",
    "Zgodovinski Mittenwald združuje pročelja s poslikavami Lüftlmalerei, tradicijo izdelovanja violin in sprehode pod Karwendelom.",
  ],
  "catalogue-bav_002": [
    "Lo Staffelsee è un lago vicino a Murnau con isole, accessi balneabili, gite in battello e percorsi a piedi o in bicicletta.",
    "Der Staffelsee bei Murnau bietet Inseln, Badestellen, Bootsfahrten sowie Wander- und Radwege.",
    "Le Staffelsee, près de Murnau, compte des îles, des zones de baignade, des excursions en bateau et des itinéraires à pied ou à vélo.",
    "Staffelsee pri Murnau ima otoke, kopališča, izlete z ladjo ter sprehajalne in kolesarske poti.",
  ],
  "catalogue-bav_003": [
    "La fortezza di Burghausen si estende per oltre un chilometro lungo il crinale e comprende diversi cortili e spazi museali.",
    "Die Burganlage von Burghausen erstreckt sich über mehr als einen Kilometer auf einem Bergrücken und umfasst mehrere Höfe und Museumsbereiche.",
    "La forteresse de Burghausen s’étend sur plus d’un kilomètre le long d’une crête et comprend plusieurs cours et espaces muséaux.",
    "Trdnjava Burghausen se po grebenu razteza več kot kilometer ter obsega več dvorišč in muzejskih prostorov.",
  ],
  "catalogue-bav_004": [
    "Bad Hindelang è un comune montano con sentieri, esperienze nella natura e aree per gli sport invernali nelle Alpi dell’Allgäu.",
    "Bad Hindelang ist eine Berggemeinde mit Wanderwegen, Naturerlebnissen und Wintersportgebieten in den Allgäuer Alpen.",
    "Bad Hindelang est une commune de montagne proposant randonnées, expériences de nature et domaines de sports d’hiver dans les Alpes de l’Allgäu.",
    "Bad Hindelang je gorska občina s pohodniškimi potmi, doživetji v naravi in območji zimskih športov v Allgäuskih Alpah.",
  ],
  "catalogue-bav_005": [
    "Benediktbeuern abbina lo storico complesso monastico ai sentieri nella zona palustre di Loisach-Kochelsee.",
    "Benediktbeuern verbindet seine historische Klosteranlage mit Wegen in die Moorlandschaft Loisach-Kochelsee.",
    "Benediktbeuern associe son ensemble monastique historique à des sentiers dans les marais de Loisach-Kochelsee.",
    "Benediktbeuern povezuje zgodovinski samostanski kompleks s potmi po mokrišču Loisach-Kochelsee.",
  ],
  "catalogue-bav_006": [
    "Il Waginger See offre aree balneabili designate, attività sul lago e piste ciclabili ai piedi del Chiemgau.",
    "Der Waginger See bietet ausgewiesene Badestellen, Freizeit am See und Radwege im Chiemgauer Voralpenland.",
    "Le Waginger See propose des zones de baignade désignées, des loisirs au bord du lac et des pistes cyclables dans les contreforts du Chiemgau.",
    "Waginger See ponuja označena kopališča, dejavnosti ob jezeru in kolesarske poti v predgorju Chiemgaua.",
  ],
  "catalogue-bav_007": [
    "Kochel am See unisce l’accesso al lago, il Museo Franz Marc e itinerari verso le montagne circostanti.",
    "Kochel am See verbindet Seezugang, das Franz Marc Museum und Wege in die umliegenden Berge.",
    "Kochel am See réunit l’accès au lac, le musée Franz Marc et des itinéraires vers les montagnes environnantes.",
    "Kochel am See združuje dostop do jezera, muzej Franza Marca in poti proti okoliškim goram.",
  ],
  "catalogue-bav_008": [
    "I percorsi segnalati intorno a Garmisch-Partenkirchen offrono passeggiate anche oltre la gola della Partnach.",
    "Markierte Wege rund um Garmisch-Partenkirchen bieten Wandermöglichkeiten auch außerhalb der Partnachklamm.",
    "Les itinéraires balisés autour de Garmisch-Partenkirchen offrent des possibilités de marche au-delà des gorges de la Partnach.",
    "Označene poti okoli Garmisch-Partenkirchna ponujajo možnosti hoje tudi zunaj soteske Partnach.",
  ],
  "catalogue-bav_009": [
    "Reit im Winkl offre sentieri e piste ciclabili in estate e una vasta rete per lo sci di fondo in inverno.",
    "Reit im Winkl bietet im Sommer Wander- und Radwege sowie im Winter ein umfangreiches Loipennetz.",
    "Reit im Winkl propose randonnées et pistes cyclables en été, ainsi qu’un vaste réseau de ski de fond en hiver.",
    "Reit im Winkl poleti ponuja pohodniške in kolesarske poti, pozimi pa obsežno mrežo prog za tek na smučeh.",
  ],
  "catalogue-bav_010": [
    "Il Walchensee è utilizzato per vela, sport del vento, immersioni ed escursioni dal lago ai monti in un ripido ambiente alpino.",
    "Der Walchensee eignet sich zum Segeln, für Windsport, Tauchen und Ausflüge vom Ufer in die steile Berglandschaft.",
    "Le Walchensee accueille voile, sports de vent, plongée et excursions du rivage vers la montagne dans un cadre alpin escarpé.",
    "Walchensee omogoča jadranje, športe na veter, potapljanje in izlete od obale proti goram v strmem alpskem okolju.",
  ],
  "catalogue-bav_011": [
    "Il Sylvensteinsee è un bacino sull’alto Isar, con acqua turchese, punti panoramici e percorsi a piedi o in bicicletta.",
    "Der Sylvensteinsee ist ein Stausee an der oberen Isar mit türkisfarbenem Wasser, Uferausblicken sowie Wander- und Radwegen.",
    "Le Sylvensteinsee est un réservoir sur le cours supérieur de l’Isar, avec eau turquoise, points de vue et itinéraires à pied ou à vélo.",
    "Sylvensteinsee je akumulacijsko jezero ob zgornji Isar z modrozeleno vodo, obalnimi razgledi ter pešpotmi in kolesarskimi potmi.",
  ],
  "catalogue-bav_012": [
    "Andechs è un monastero benedettino di pellegrinaggio con chiesa, tradizione birraria e panorami dal Monte Sacro.",
    "Andechs ist ein benediktinisches Wallfahrtskloster mit Kirche, Brautradition und Ausblicken vom Heiligen Berg.",
    "Andechs est un monastère bénédictin de pèlerinage avec église, tradition brassicole et vues depuis la Montagne sacrée.",
    "Andechs je benediktinski romarski samostan s cerkvijo, pivovarsko tradicijo in razgledi s Svete gore.",
  ],
  "catalogue-bav_013": [
    "Jachenau è un’ampia valle alpina con aziende agricole attive e percorsi segnalati a piedi e in bicicletta sotto il Benediktenwand.",
    "Jachenau ist ein weites Alpental mit bewirtschafteten Höfen und markierten Wander- und Radwegen unterhalb der Benediktenwand.",
    "Jachenau est une large vallée alpine avec des fermes en activité et des itinéraires balisés à pied et à vélo sous la Benediktenwand.",
    "Jachenau je široka alpska dolina z delujočimi kmetijami ter označenimi pešpotmi in kolesarskimi potmi pod Benediktenwandom.",
  ],
  "catalogue-bav_014": [
    "Gli Osterseen sono una catena protetta di laghi glaciali; i visitatori devono usare i sentieri segnalati e le aree balneabili designate.",
    "Die Osterseen sind eine geschützte Kette von Gletscherseen; Besucher sollen markierte Wege und ausgewiesene Badestellen nutzen.",
    "Les Osterseen forment une chaîne protégée de lacs glaciaires ; les visiteurs doivent emprunter les sentiers balisés et les zones de baignade désignées.",
    "Osterseen so zaščitena veriga ledeniških jezer; obiskovalci naj uporabljajo označene poti in določena kopališča.",
  ],
  "catalogue-bav_015": [
    "Oberammergau è nota per la Passione, la tradizione dell’intaglio del legno e gli edifici dipinti con la Lüftlmalerei.",
    "Oberammergau ist für die Passionsspiele, die Holzschnitztradition und Gebäude mit Lüftlmalerei bekannt.",
    "Oberammergau est connue pour son Jeu de la Passion, sa tradition de sculpture sur bois et ses bâtiments peints en Lüftlmalerei.",
    "Oberammergau je znan po pasijonski igri, tradiciji rezbarstva in stavbah s poslikavami Lüftlmalerei.",
  ],
  "catalogue-bav_016": [
    "La vetta dell’Auerberg combina panorami alpini, la chiesa di San Giorgio e tracce di un insediamento romano.",
    "Der Gipfelbereich des Auerbergs verbindet Alpenpanorama, die Kirche St. Georg und Spuren einer römischen Siedlung.",
    "Le sommet de l’Auerberg réunit panorama alpin, église Saint-Georges et traces d’un établissement romain.",
    "Vrh Auerberga združuje alpske razglede, cerkev sv. Jurija in sledove naselbine iz rimskega obdobja.",
  ],
  "catalogue-bav_017": [
    "Hoher Peißenberg offre una vetta panoramica e un osservatorio meteorologico con misurazioni iniziate nel 1781.",
    "Der Hohe Peißenberg bietet einen Panoramagipfel und ein meteorologisches Observatorium mit Messreihen seit 1781.",
    "Le Hoher Peißenberg possède un sommet panoramique et un observatoire météorologique dont les mesures remontent à 1781.",
    "Hoher Peißenberg ima razgleden vrh in meteorološki observatorij z meritvami od leta 1781.",
  ],
  "catalogue-bav_018": [
    "Schliersee è una cittadina sul lago con passeggiate lungo la riva, collegamenti in battello e accesso verso Spitzingsee.",
    "Schliersee ist ein Marktort am See mit Uferwegen, Schiffsverbindungen und Zugang in Richtung Spitzingsee.",
    "Schliersee est un bourg lacustre avec promenades de rive, liaisons en bateau et accès vers le Spitzingsee.",
    "Schliersee je mestece ob jezeru z obalnimi sprehodi, ladijskimi povezavami in dostopom proti Spitzingseeju.",
  ],
  "catalogue-bav_019": [
    "L’alto Isar presso Isarhorn è un paesaggio fluviale dinamico, da esplorare sui percorsi pedonali e ciclabili designati.",
    "Die obere Isar bei Isarhorn ist eine dynamische Flusslandschaft, die sich auf ausgewiesenen Wander- und Radwegen erkunden lässt.",
    "Le cours supérieur de l’Isar près d’Isarhorn est un paysage fluvial dynamique à découvrir sur les itinéraires pédestres et cyclables désignés.",
    "Zgornja Isar pri Isarhornu je dinamična rečna pokrajina, ki jo je najbolje raziskovati po določenih pešpoteh in kolesarskih poteh.",
  ],
  "catalogue-bav_020": [
    "A 1.277 metri, Falkenstein è la rovina di castello più alta della Germania; una piattaforma ricorda il progetto mai realizzato di Ludovico II.",
    "Auf 1.277 Metern ist Falkenstein Deutschlands höchstgelegene Burgruine; eine Aussichtsplattform erinnert an Ludwig II. und seine nie verwirklichten Schlosspläne.",
    "À 1 277 mètres, Falkenstein est la ruine de château la plus haute d’Allemagne ; une plateforme rappelle le projet de château jamais réalisé de Louis II.",
    "Falkenstein je s 1.277 metri najvišje ležeča grajska razvalina v Nemčiji; razgledna ploščad spominja na neuresničene načrte Ludvika II.",
  ],
  "catalogue-bav_021": [
    "Il Großer Alpsee presso Immenstadt è un lago naturale utilizzato per nuoto, vela e itinerari nell’area Alpsee-Grünten.",
    "Der Große Alpsee bei Immenstadt ist ein Natursee zum Schwimmen und Segeln mit Wegen durch die Region Alpsee-Grünten.",
    "Le Großer Alpsee près d’Immenstadt est un lac naturel utilisé pour la baignade, la voile et les itinéraires dans la région Alpsee-Grünten.",
    "Großer Alpsee pri Immenstadtu je naravno jezero za plavanje, jadranje in poti po območju Alpsee-Grünten.",
  ],
  "catalogue-bav_022": [
    "I percorsi nordici di Hausham fanno parte della rete per lo sci di fondo della valle di Schliersee e dipendono dalle condizioni della neve.",
    "Die Loipen von Hausham gehören zum Langlaufnetz des Schlierseer Tals und sind von der aktuellen Schneelage abhängig.",
    "Les pistes nordiques de Hausham font partie du réseau de ski de fond de la vallée de Schliersee et dépendent de l’enneigement actuel.",
    "Nordijske proge v Haushamu so del mreže za tek na smučeh v dolini Schliersee in so odvisne od trenutnih snežnih razmer.",
  ],
  "catalogue-bav_023": [
    "Miesbach è una storica cittadina di mercato con centro pedonale, negozi di prodotti regionali e tradizioni artigiane dell’Alta Baviera.",
    "Miesbach ist eine historische Marktstadt mit begehbarem Zentrum, regionalen Lebensmittelgeschäften und oberbayerischer Handwerkstradition.",
    "Miesbach est un bourg historique avec un centre propice à la marche, des boutiques de produits régionaux et des traditions artisanales de Haute-Bavière.",
    "Miesbach je zgodovinsko trško mesto s sprehajalnim središčem, trgovinami z regionalno hrano in obrtno tradicijo Zgornje Bavarske.",
  ],
  "catalogue-bav_024": [
    "Il Lautersee sopra Mittenwald offre un percorso circolare segnalato, accesso balneabile e viste sui monti Wetterstein.",
    "Der Lautersee oberhalb von Mittenwald bietet einen markierten Rundweg, Bademöglichkeiten und Ausblicke auf das Wettersteingebirge.",
    "Le Lautersee au-dessus de Mittenwald offre un circuit balisé, un accès à la baignade et des vues sur le massif du Wetterstein.",
    "Lautersee nad Mittenwaldom ponuja označeno krožno pot, kopališče in razglede proti gorovju Wetterstein.",
  ],
  "catalogue-bav_025": [
    "Ettal è un monastero benedettino fondato nel 1330, incentrato su una basilica barocca e una sacrestia rococò.",
    "Ettal ist ein 1330 gegründetes Benediktinerkloster mit barocker Basilika und Rokoko-Sakristei.",
    "Ettal est un monastère bénédictin fondé en 1330, organisé autour d’une basilique baroque et d’une sacristie rococo.",
    "Ettal je benediktinski samostan, ustanovljen leta 1330, z baročno baziliko in rokokojsko zakristijo.",
  ],
};

Object.assign(translatedCaptions, {
  "catalogue-vda_001": [
    "Cogne è una porta d’accesso al Parco Nazionale Gran Paradiso, con passeggiate di fondovalle, itinerari montani e navette stagionali.",
    "Cogne ist ein Zugang zum Nationalpark Gran Paradiso mit Talwegen, Bergtouren und saisonalen Shuttle-Verbindungen.",
    "Cogne est une porte d’entrée du parc national du Grand-Paradis, avec promenades en vallée, itinéraires de montagne et navettes saisonnières.",
    "Cogne je izhodišče za Narodni park Gran Paradiso z dolinskimi sprehodi, gorskimi potmi in sezonskimi prevozi.",
  ],
  "catalogue-vda_002": [
    "Chamois è un paese di montagna senza auto, raggiungibile in funivia da Buisson oppure a piedi e in bicicletta.",
    "Chamois ist ein autofreies Bergdorf, das per Seilbahn von Buisson sowie zu Fuß oder mit dem Fahrrad erreichbar ist.",
    "Chamois est un village de montagne sans voitures, accessible en téléphérique depuis Buisson ou par des itinéraires à pied et à vélo.",
    "Chamois je gorska vas brez avtomobilov, dostopna z žičnico iz Buissona ali po pešpoteh in kolesarskih poteh.",
  ],
  "catalogue-vda_003": [
    "Il Lago Blu è un piccolo lago vicino a Breuil-Cervinia, noto per i riflessi del Cervino e le brevi passeggiate circostanti.",
    "Der Lago Blu ist ein kleiner See bei Breuil-Cervinia, bekannt für Matterhorn-Spiegelungen und kurze Spazierwege in der Umgebung.",
    "Le Lago Blu est un petit lac près de Breuil-Cervinia, connu pour les reflets du Cervin et les courtes promenades alentour.",
    "Lago Blu je majhno jezero blizu Breuil-Cervinie, znano po odsevu Matterhorna in kratkih sprehodih v okolici.",
  ],
  "catalogue-vda_004": [
    "Il Castello di Fénis è una residenza fortificata medievale con torri, cortili interni, stanze arredate e pitture murali.",
    "Das Schloss Fénis ist eine mittelalterliche befestigte Residenz mit Türmen, Innenhöfen, eingerichteten Räumen und Wandmalereien.",
    "Le château de Fénis est une résidence médiévale fortifiée avec tours, cours intérieures, pièces meublées et peintures murales.",
    "Grad Fénis je srednjeveška utrjena rezidenca s stolpi, notranjimi dvorišči, opremljenimi sobami in stenskimi poslikavami.",
  ],
  "catalogue-vda_005": [
    "Valpelline unisce un centro visitatori dedicato alla Fontina ancora in produzione, percorsi nel paese e accesso all’alta valle.",
    "Valpelline verbindet ein aktives Fontina-Besucherzentrum mit Dorfwegen und dem Zugang zur Landschaft des oberen Tals.",
    "Valpelline associe un centre de visite de la Fontina en activité, des parcours dans le village et l’accès au paysage de la haute vallée.",
    "Valpelline združuje delujoči center za obiskovalce, posvečen Fontini, vaške poti in dostop v zgornji del doline.",
  ],
  "catalogue-vda_006": [
    "Bard abbina un borgo medievale al Forte di Bard restaurato, i cui edifici ospitano musei e mostre temporanee.",
    "Bard verbindet ein mittelalterliches Dorf mit dem restaurierten Fort von Bard, dessen Gebäude Museen und Wechselausstellungen beherbergen.",
    "Bard associe un village médiéval au fort restauré de Bard, dont les bâtiments accueillent musées et expositions temporaires.",
    "Bard združuje srednjeveško vas z obnovljeno trdnjavo Bard, katere stavbe gostijo muzeje in začasne razstave.",
  ],
  "catalogue-vda_007": [
    "Rhêmes-Notre-Dame si trova nel Parco Nazionale Gran Paradiso, tra boschi di conifere, prati alpini e percorsi per osservare la fauna.",
    "Rhêmes-Notre-Dame liegt im Nationalpark Gran Paradiso mit Nadelwäldern, Alpwiesen und Routen zur Tierbeobachtung.",
    "Rhêmes-Notre-Dame se trouve dans le parc national du Grand-Paradis, avec forêts de conifères, prairies alpines et itinéraires d’observation de la faune.",
    "Rhêmes-Notre-Dame leži v Narodnem parku Gran Paradiso, med iglastimi gozdovi, alpskimi travniki in potmi za opazovanje živali.",
  ],
  "catalogue-vda_008": [
    "Introd unisce un ambiente rurale, il Parc Animalier e il vicino patrimonio del castello all’ingresso delle valli del Gran Paradiso.",
    "Introd verbindet eine ländliche Dorfkulisse mit dem Parc Animalier und dem nahen Burgerbe am Eingang der Gran-Paradiso-Täler.",
    "Introd réunit un cadre villageois rural, le Parc Animalier et le patrimoine du château voisin à l’entrée des vallées du Grand-Paradis.",
    "Introd združuje podeželsko vaško okolje, Parc Animalier in bližnjo grajsko dediščino ob vhodu v doline Gran Paradisa.",
  ],
  "catalogue-vda_009": [
    "Ollomont offre itinerari montani e visite guidate alla storia delle miniere di rame dell’area di Valpelline.",
    "Ollomont bietet Bergwege und geführte Einblicke in die historischen Kupferminen der Region Valpelline.",
    "Ollomont propose des itinéraires de montagne et des visites guidées consacrées aux anciennes mines de cuivre de la région de Valpelline.",
    "Ollomont ponuja gorske poti in vodene predstavitve zgodovinskih bakrovih rudnikov na območju Valpelline.",
  ],
  "catalogue-vda_010": [
    "Torgnon è un paese su un altopiano soleggiato, con escursioni e ciclismo nei mesi caldi e percorsi sciistici o nordici in inverno.",
    "Torgnon ist ein sonniges Hochplateaudorf mit Wandern und Radfahren in der warmen Jahreszeit sowie Ski- und Loipenangeboten im Winter.",
    "Torgnon est un village de plateau ensoleillé, avec randonnée et vélo aux beaux jours, puis ski et itinéraires nordiques en hiver.",
    "Torgnon je sončna vas na planoti, s pohodništvom in kolesarjenjem v toplejših mesecih ter smučarskimi in nordijskimi potmi pozimi.",
  ],
  "catalogue-vda_011": [
    "Gressoney-Saint-Jean unisce il patrimonio walser, Castel Savoia e itinerari sotto il massiccio del Monte Rosa.",
    "Gressoney-Saint-Jean verbindet Walserkultur, Schloss Savoyen und Wege unterhalb des Monte-Rosa-Massivs.",
    "Gressoney-Saint-Jean réunit patrimoine walser, château Savoie et itinéraires sous le massif du Mont-Rose.",
    "Gressoney-Saint-Jean združuje walserjevsko dediščino, grad Savoia in poti pod masivom Monte Rosa.",
  ],
  "catalogue-vda_012": [
    "Arvier è circondata da vigneti terrazzati legati al vino Enfer d’Arvier e da itinerari nella valle centrale.",
    "Arvier liegt zwischen terrassierten Weinbergen des Enfer d’Arvier und Wegen durch das zentrale Tal.",
    "Arvier se trouve parmi des vignobles en terrasses liés au vin Enfer d’Arvier et des itinéraires dans la vallée centrale.",
    "Arvier leži med terasastimi vinogradi, povezanimi z vinom Enfer d’Arvier, in potmi po osrednji dolini.",
  ],
  "catalogue-vda_013": [
    "Pont d’Aël è un ponte-acquedotto romano su due livelli, con una galleria interna di servizio percorribile.",
    "Pont d’Aël ist eine zweigeschossige römische Aquäduktbrücke mit begehbarem innerem Wartungsgang.",
    "Pont d’Aël est un pont-aqueduc romain à deux niveaux, avec une galerie de service intérieure accessible à pied.",
    "Pont d’Aël je rimski akvaduktni most v dveh nivojih, tudi s prehodno notranjo servisno galerijo.",
  ],
  "catalogue-vda_014": [
    "Fontainemore è un paese nella bassa valle del Lys e un punto d’accesso ai sentieri della Riserva naturale del Mont Mars.",
    "Fontainemore ist ein Dorf im unteren Lystal und ein Ausgangspunkt für Wege im Naturreservat Mont Mars.",
    "Fontainemore est un village de la basse vallée du Lys et un point d’accès aux sentiers de la réserve naturelle du Mont-Mars.",
    "Fontainemore je vas v spodnji dolini Lys in izhodišče za poti v naravnem rezervatu Mont Mars.",
  ],
  "catalogue-vda_015": [
    "Il Castello di Aymavilles ha quattro torri angolari cilindriche e un percorso espositivo dedicato all’architettura e alle collezioni.",
    "Das Schloss Aymavilles besitzt vier zylindrische Ecktürme und einen Ausstellungsrundgang durch Architektur und Sammlungen.",
    "Le château d’Aymavilles possède quatre tours d’angle cylindriques et un parcours d’exposition consacré à son architecture et à ses collections.",
    "Grad Aymavilles ima štiri valjaste vogalne stolpe in razstavno pot skozi arhitekturo ter zbirke.",
  ],
  "catalogue-vda_016": [
    "Brusson unisce il paese e il lago della Val d’Ayas alle visite guidate nell’ex miniera d’oro di Chamousira.",
    "Brusson verbindet Dorf und See im Aystal mit Führungen durch die ehemalige Goldmine Chamousira.",
    "Brusson associe le village et le lac du val d’Ayas aux visites guidées de l’ancienne mine d’or de Chamousira.",
    "Brusson združuje vas in jezero v dolini Ayas z vodenimi ogledi nekdanjega rudnika zlata Chamousira.",
  ],
  "catalogue-vda_017": [
    "Verrès ruota attorno a una compatta fortezza del XIV secolo e a un borgo storico che ospita un carnevale invernale.",
    "Verrès wird von einer kompakten Festung aus dem 14. Jahrhundert und einem historischen Ort mit Winterkarneval geprägt.",
    "Verrès s’organise autour d’une forteresse compacte du XIVe siècle et d’un bourg historique qui accueille un carnaval d’hiver.",
    "Verrès zaznamujeta strnjena trdnjava iz 14. stoletja in zgodovinska vas z zimskim karnevalom.",
  ],
  "catalogue-vda_018": [
    "La Salle è un paese vinicolo affacciato sul Monte Bianco, con vigneti terrazzati e la cooperativa Cave Mont Blanc nelle vicinanze.",
    "La Salle ist ein Weinort mit Blick auf den Mont Blanc, terrassierten Weinbergen und der nahen Genossenschaft Cave Mont Blanc.",
    "La Salle est un village viticole tourné vers le Mont-Blanc, avec vignobles en terrasses et coopérative Cave Mont Blanc à proximité.",
    "La Salle je vinarska vas z razgledom na Mont Blanc, terasastimi vinogradi in bližnjo zadrugo Cave Mont Blanc.",
  ],
  "catalogue-vda_019": [
    "Lillianes è un paese della bassa valle del Lys costruito lungo il fiume, con uno storico ponte in pietra e accesso ai sentieri sui versanti.",
    "Lillianes ist ein Dorf im unteren Lystal am Fluss mit historischer Steinbrücke und Zugang zu Hangwegen.",
    "Lillianes est un village de la basse vallée du Lys établi le long de la rivière, avec un pont historique en pierre et des chemins de versant.",
    "Lillianes je vas v spodnji dolini Lys ob reki, z zgodovinskim kamnitim mostom in dostopom do poti po pobočjih.",
  ],
  "catalogue-vda_020": [
    "I vigneti terrazzati di Chambave sono legati al Muscat de Chambave e ad altri vini DOC della Valle d’Aosta.",
    "Die terrassierten Weinberge von Chambave sind mit Muscat de Chambave und weiteren DOC-Weinen des Aostatals verbunden.",
    "Les vignobles en terrasses de Chambave sont associés au Muscat de Chambave et à d’autres vins DOC de la Vallée d’Aoste.",
    "Terasasti vinogradi Chambava so povezani z vinom Muscat de Chambave in drugimi vini DOC iz Doline Aoste.",
  ],
  "catalogue-vda_021": [
    "Perloz collega il Museo della Resistenza a Chemp, un piccolo insediamento utilizzato come spazio artistico all’aperto.",
    "Perloz verbindet das Widerstandsmuseum mit Chemp, einer kleinen Siedlung, die als Kunstort unter freiem Himmel dient.",
    "Perloz relie le musée de la Résistance à Chemp, un petit hameau utilisé comme espace artistique en plein air.",
    "Perloz povezuje Muzej odpora s Chempom, majhnim naseljem, ki služi kot umetniški prostor na prostem.",
  ],
  "catalogue-vda_022": [
    "Il MegaMuseo di Saint-Martin-de-Corléans presenta un’area archeologica megalitica con stele, sepolture e strutture rituali.",
    "Das MegaMuseo in Saint-Martin-de-Corléans zeigt eine megalithische Fundstätte mit Stelen, Gräbern und rituellen Strukturen.",
    "Le MegaMuseo de Saint-Martin-de-Corléans présente une aire archéologique mégalithique avec stèles, sépultures et structures rituelles.",
    "MegaMuseo v Saint-Martin-de-Corléansu predstavlja megalitsko arheološko območje s stelami, grobovi in obrednimi strukturami.",
  ],
  "catalogue-vda_023": [
    "Il Colle del Piccolo San Bernardo conserva testimonianze archeologiche transfrontaliere e il patrimonio dell’ospizio a 2.188 metri.",
    "Der Kleine Sankt Bernhard bewahrt auf 2.188 Metern grenzüberschreitende Archäologie und Hospizgeschichte.",
    "Le col du Petit-Saint-Bernard conserve à 2 188 mètres un patrimoine archéologique transfrontalier et l’histoire de son hospice.",
    "Prelaz Mali Sveti Bernard na 2.188 metrih ohranja čezmejno arheološko dediščino in zgodovino hospica.",
  ],
  "catalogue-vda_024": [
    "Châtillon permette di raggiungere il Castello di Ussel e la collezione di arte moderna e contemporanea del Castello Gamba.",
    "Châtillon bietet Zugang zum Schloss Ussel und zur Sammlung moderner und zeitgenössischer Kunst im Schloss Gamba.",
    "Châtillon donne accès au château d’Ussel et à la collection d’art moderne et contemporain du château Gamba.",
    "Châtillon omogoča dostop do gradu Ussel in zbirke moderne ter sodobne umetnosti v gradu Gamba.",
  ],
  "catalogue-vda_025": [
    "Il Santuario di Machaby sorge in un castagneto sopra Arnad e conserva ex voto e un altare del Seicento.",
    "Die Wallfahrtskirche Machaby liegt im Kastanienwald oberhalb von Arnad und enthält Votivgaben sowie einen Altar aus dem 17. Jahrhundert.",
    "Le sanctuaire de Machaby se dresse dans une châtaigneraie au-dessus d’Arnad et conserve des ex-voto ainsi qu’un autel du XVIIe siècle.",
    "Svetišče Machaby stoji v kostanjevem gozdu nad Arnadom ter hrani votivne darove in oltar iz 17. stoletja.",
  ],
} satisfies Record<string, CaptionSet>);

Object.assign(translatedCaptions, {
  "catalogue-alpify-weisensee": [
    "Il Weißensee vicino a Füssen ha una zona balneabile dal fondale dolcemente digradante, un circuito lungo la riva e viste sulle Alpi dell’Allgäu.",
    "Der Weißensee bei Füssen bietet einen flach abfallenden Badebereich, einen Uferrundweg und Ausblicke auf die Allgäuer Alpen.",
    "Le Weißensee près de Füssen dispose d’une zone de baignade en pente douce, d’un circuit de rive et de vues sur les Alpes de l’Allgäu.",
    "Weißensee pri Füssnu ima položno kopališče, krožno pot ob obali in razglede na Allgäuske Alpe.",
  ],
  "catalogue-alpify-forgensee": [
    "Il Forggensee è un bacino stagionale utilizzato per gite in battello, vela e ciclismo, con viste sui castelli reali.",
    "Der Forggensee ist ein saisonaler Stausee für Schifffahrten, Segeln und Radfahren mit Blick auf die Königsschlösser.",
    "Le Forggensee est un réservoir saisonnier utilisé pour les excursions en bateau, la voile et le vélo, avec vue sur les châteaux royaux.",
    "Forggensee je sezonsko akumulacijsko jezero za izlete z ladjo, jadranje in kolesarjenje z razgledi na kraljeve gradove.",
  ],
  "catalogue-alpify-faulensee": [
    "Il Faulensee sopra Rieden è un piccolo lago di torbiera circondato da boschi e prati, raggiungibile con percorsi locali a piedi e in bicicletta.",
    "Der Faulensee oberhalb von Rieden ist ein kleiner Moorsee zwischen Wald und Wiesen, erreichbar über örtliche Wander- und Radwege.",
    "Le Faulensee au-dessus de Rieden est un petit lac de tourbière entouré de bois et de prairies, accessible par des itinéraires locaux à pied et à vélo.",
    "Faulensee nad Riednom je majhno barjansko jezero med gozdovi in travniki, dostopno po lokalnih pešpoteh in kolesarskih poteh.",
  ],
  "catalogue-alpify-gaisalpsee": [
    "Il Gaisalpsee è un lago di montagna sopra Reichenbach, raggiungibile con un itinerario in salita continua su terreno alpino.",
    "Der Gaisalpsee ist ein Bergsee oberhalb von Reichenbach, erreichbar über eine Wanderroute mit anhaltendem Anstieg und alpinem Gelände.",
    "Le Gaisalpsee est un lac de montagne au-dessus de Reichenbach, accessible par une randonnée à montée soutenue en terrain alpin.",
    "Gaisalpsee je gorsko jezero nad Reichenbachom, dosegljivo po pohodniški poti z daljšim vzponom po alpskem terenu.",
  ],
  "catalogue-alpify-buchenberg": [
    "Buchenberg è un’area panoramica dell’Allgäu con sentieri e ampie viste sui rilievi prealpini.",
    "Buchenberg ist ein Allgäuer Aussichtsgebiet mit Wanderwegen und weitem Blick über das Alpenvorland.",
    "Buchenberg est un secteur panoramique de l’Allgäu avec des sentiers et de larges vues sur les contreforts alpins.",
    "Buchenberg je razgledno območje v Allgäuu s pešpotmi in širokimi razgledi po alpskem predgorju.",
  ],
  "catalogue-alpify-tegelberg": [
    "Tegelberg è una meta montana sopra Schwangau, raggiungibile in funivia o con sentieri vicino ai castelli reali.",
    "Der Tegelberg ist ein Ausflugsberg oberhalb von Schwangau, erreichbar per Seilbahn oder auf Wanderwegen nahe den Königsschlössern.",
    "Le Tegelberg est une excursion de montagne au-dessus de Schwangau, accessible en téléphérique ou par des sentiers près des châteaux royaux.",
    "Tegelberg je gorski izlet nad Schwangauom, dosegljiv z žičnico ali po pohodniških poteh blizu kraljevih gradov.",
  ],
  "catalogue-alpify-castle-hohenschwangau": [
    "Hohenschwangau fu la residenza estiva ottocentesca della famiglia reale ed è visitabile con tour a orario prestabilito.",
    "Hohenschwangau war die Sommerresidenz der königlichen Familie im 19. Jahrhundert und wird in zeitgebundenen Führungen besichtigt.",
    "Hohenschwangau fut la résidence d’été de la famille royale au XIXe siècle et se visite lors de visites guidées à horaire défini.",
    "Hohenschwangau je bil poletna rezidenca kraljeve družine v 19. stoletju in ga je mogoče obiskati na časovno določenih ogledih.",
  ],
  "catalogue-alpify-breitachklamm": [
    "Breitachklamm è un percorso gestito in una gola, con sentieri, ponti e aperture che variano con la stagione.",
    "Die Breitachklamm ist eine bewirtschaftete Schluchtstrecke mit Wegen, Brücken und saisonalen Öffnungsbedingungen.",
    "La Breitachklamm est un parcours aménagé dans une gorge, avec sentiers, passerelles et conditions d’ouverture saisonnières.",
    "Breitachklamm je urejena pot skozi sotesko s stezami, mostovi in sezonskimi pogoji odprtja.",
  ],
  "catalogue-alpify-castle-neuschwanstein": [
    "Neuschwanstein è il palazzo ottocentesco di Ludovico II e una grande destinazione con ingresso a orario prestabilito sopra Hohenschwangau.",
    "Neuschwanstein ist der Palast Ludwigs II. aus dem 19. Jahrhundert und ein stark besuchtes Ziel mit Zeitfenster-Eintritt oberhalb von Hohenschwangau.",
    "Neuschwanstein est le palais du XIXe siècle de Louis II et une destination majeure à entrée horaire au-dessus de Hohenschwangau.",
    "Neuschwanstein je palača Ludvika II. iz 19. stoletja in zelo obiskana destinacija s časovno določenim vstopom nad Hohenschwangauom.",
  ],
  "catalogue-alpify-nesselwang-waterfall-trail": [
    "Il percorso delle cascate di Nesselwang attraversa la zona boscosa dell’Alpspitz e segue diverse cascate su un circuito segnalato.",
    "Der Nesselwanger Wasserfallweg führt auf einem markierten Rundweg durch das bewaldete Alpspitzgebiet an Kaskaden vorbei.",
    "Le parcours des cascades de Nesselwang traverse le secteur boisé de l’Alpspitz et longe des cascades sur un circuit balisé.",
    "Pot ob slapovih v Nesselwangu vodi po označenem krogu skozi gozdnato območje Alpspitza mimo več kaskad.",
  ],
  "catalogue-alpify-starzlachklamm": [
    "Starzlachklamm è un sentiero gestito in una gola vicino a Sonthofen, con passaggi rocciosi, ponti e cascate.",
    "Die Starzlachklamm ist ein bewirtschafteter Schluchtweg bei Sonthofen mit Felspassagen, Brücken und Wasserfällen.",
    "La Starzlachklamm est un sentier aménagé dans une gorge près de Sonthofen, avec passages rocheux, ponts et cascades.",
    "Starzlachklamm je urejena pot skozi sotesko blizu Sonthofna s skalnimi prehodi, mostovi in slapovi.",
  ],
  "catalogue-alpify-gruenten": [
    "Il Grünten è una montagna prominente dell’Allgäu con diversi sentieri di accesso e punti panoramici sulla valle dell’Iller.",
    "Der Grünten ist ein markanter Allgäuer Berg mit mehreren Wanderanstiegen und Aussichtspunkten über das Illertal.",
    "Le Grünten est une montagne marquante de l’Allgäu avec plusieurs itinéraires de randonnée et des points de vue sur la vallée de l’Iller.",
    "Grünten je izrazita gora v Allgäuu z več pohodniškimi pristopi in razgledišči nad dolino Iller.",
  ],
  "catalogue-alpify-castle-ruin-hapfen": [
    "Le rovine del Castello di Hopfen dominano l’Hopfensee e si raggiungono con una breve salita che offre un panorama sul lago.",
    "Die Burgruine Hopfen liegt oberhalb des Hopfensees und lässt sich mit einem kurzen Aufstieg und Seepanorama verbinden.",
    "La ruine du château de Hopfen domine le Hopfensee et se combine avec une courte montée offrant un panorama sur le lac.",
    "Razvaline gradu Hopfen stojijo nad Hopfenseejem in jih je mogoče doseči s kratkim vzponom z razgledom na jezero.",
  ],
  "catalogue-alpify-ruin-att-trauchburg": [
    "Alt-Trauchburg è una rovina di castello medievale sopra Weitnau, raggiungibile con un percorso in salita.",
    "Alt-Trauchburg ist eine mittelalterliche Burgruine oberhalb von Weitnau, erreichbar über einen ansteigenden Fußweg.",
    "Alt-Trauchburg est une ruine de château médiéval au-dessus de Weitnau, accessible par un itinéraire en montée.",
    "Alt-Trauchburg je srednjeveška grajska razvalina nad Weitnauom, dosegljiva po vzpenjajoči se pešpoti.",
  ],
  "catalogue-alpify-eisenberg-hohenfreyberg": [
    "Eisenberg e Hohenfreyberg sono due vicine rovine di castelli su un’altura, collegate da un breve percorso a piedi.",
    "Eisenberg und Hohenfreyberg sind benachbarte Höhenburgruinen, die ein kurzer Fußweg verbindet.",
    "Eisenberg et Hohenfreyberg sont deux ruines voisines sur les hauteurs, reliées par un court itinéraire à pied.",
    "Eisenberg in Hohenfreyberg sta sosednji grajski razvalini na vzpetinah, povezani s kratko pešpotjo.",
  ],
  "catalogue-alpify-buchenegger-waterfalls": [
    "Le cascate di Buchenegg si raggiungono su sentieri nel bosco; il livello dell’acqua e il terreno scivoloso richiedono un controllo delle condizioni.",
    "Die Buchenegger Wasserfälle sind über Waldwege erreichbar; Wasserstand und rutschiges Gelände erfordern eine Prüfung der aktuellen Bedingungen.",
    "Les cascades de Buchenegg sont accessibles par des chemins forestiers ; le niveau de l’eau et le terrain glissant exigent de vérifier les conditions actuelles.",
    "Slapovi Buchenegg so dostopni po gozdnih poteh; zaradi vodostaja in spolzkega terena je treba preveriti trenutne razmere.",
  ],
} satisfies Record<string, CaptionSet>);

Object.assign(translatedCaptions, {
  "expert-bosco-peuterey": [
    "Un ambiente di larici in Val Veny, servito dal trasporto stagionale di Courmayeur e collegato a percorsi a piedi.",
    "Eine Lärchenwaldlandschaft im Val Veny, angebunden an den saisonalen Verkehr von Courmayeur und an Wanderwege.",
    "Un cadre de mélèzes dans le val Veny, desservi par les transports saisonniers de Courmayeur et relié à des itinéraires à pied.",
    "Macesnov gozd v Val Venyju, povezan s sezonskim prevozom iz Courmayeurja in pešpotmi.",
  ],
  "expert-big-bench-la-salle": [
    "Una grande panchina panoramica sopra La Salle, raggiungibile con una breve passeggiata nel paesaggio rivolto al Monte Bianco.",
    "Eine große Panoramabank oberhalb von La Salle, erreichbar über einen kurzen Spaziergang in der Landschaft mit Mont-Blanc-Blick.",
    "Un grand banc panoramique au-dessus de La Salle, accessible par une courte marche dans le paysage tourné vers le Mont-Blanc.",
    "Velika razgledna klop nad La Sallom, dosegljiva s kratkim sprehodom po pokrajini z razgledom na Mont Blanc.",
  ],
  "expert-lenteney": [
    "Il torrente Lenteney scende nel bosco di Derby vicino a La Salle ed è visibile da una breve area di accesso lungo la strada.",
    "Der Lenteney-Bach fällt durch den Wald von Derby bei La Salle und ist über einen kurzen Zugang an der Straße sichtbar.",
    "Le torrent de Lenteney descend dans le bois de Derby près de La Salle et s’observe depuis un court accès en bord de route.",
    "Potok Lenteney pada skozi gozd Derby blizu La Salla in je viden s kratkega dostopa ob cesti.",
  ],
  "expert-chatel-argent": [
    "Un itinerario a piedi sopra Villeneuve collega le fortificazioni di Châtel-Argent, chiese romaniche e il mastio circolare.",
    "Ein Rundweg oberhalb von Villeneuve verbindet die Befestigungen von Châtel-Argent, romanische Kirchen und den runden Bergfried.",
    "Un itinéraire à pied au-dessus de Villeneuve relie les fortifications de Châtel-Argent, des églises romanes et le donjon circulaire.",
    "Pešpot nad Villeneuveom povezuje utrdbe Châtel-Argent, romanske cerkve in okrogli obrambni stolp.",
  ],
  "expert-lillaz-falls": [
    "Un breve sentiero da Lillaz segue il torrente Urtier lungo una sequenza di cascate e punti panoramici rocciosi.",
    "Ein kurzer Weg ab Lillaz folgt dem Urtier-Bach an mehreren Wasserfällen und felsigen Aussichtspunkten vorbei.",
    "Un court sentier depuis Lillaz suit le torrent de l’Urtier le long d’une succession de cascades et de points de vue rocheux.",
    "Kratka pot iz Lillaza sledi potoku Urtier mimo niza slapov in skalnatih razgledišč.",
  ],
  "expert-etrubles": [
    "Étroubles è un compatto borgo medievale sulla Via Francigena, con un percorso d’arte all’aperto nelle vie storiche.",
    "Étroubles ist ein kompakter mittelalterlicher Ort an der Via Francigena mit einem Kunstweg unter freiem Himmel durch die historischen Gassen.",
    "Étroubles est un village médiéval compact sur la Via Francigena, avec un parcours d’art en plein air dans ses rues historiques.",
    "Étroubles je strnjena srednjeveška vas ob Via Francigeni z umetniško potjo na prostem po zgodovinskih ulicah.",
  ],
  "expert-doues-aqueduct": [
    "Una storica galleria di canalizzazione presso Doues fa parte del patrimonio irriguo locale e della rete di sentieri sui versanti.",
    "Ein historischer Wasserstollen bei Doues gehört zum örtlichen Bewässerungserbe und zum Wegenetz an den Hängen.",
    "Une ancienne galerie d’adduction près de Doues fait partie du patrimoine d’irrigation local et du réseau de sentiers de versant.",
    "Zgodovinski vodni rov pri Douesu je del lokalne namakalne dediščine in mreže poti po pobočjih.",
  ],
  "expert-niel": [
    "Niel è un piccolo villaggio walser sopra Gaby e un punto di partenza per percorsi segnalati nell’alta valle di Niel.",
    "Niel ist ein kleiner Walserweiler oberhalb von Gaby und Ausgangspunkt markierter Wege im oberen Nieltal.",
    "Niel est un petit hameau walser au-dessus de Gaby et un point de départ pour des itinéraires balisés dans la haute vallée de Niel.",
    "Niel je majhen walserjevski zaselek nad Gabyjem in izhodišče označenih poti po zgornji dolini Niel.",
  ],
  "expert-pont-saint-martin": [
    "Il ponte romano a campata unica attraversa il Lys nel centro di Pont-Saint-Martin e fa ancora parte della rete stradale cittadina.",
    "Die einbogige Römerbrücke überspannt den Lys im Zentrum von Pont-Saint-Martin und ist weiterhin Teil des örtlichen Straßennetzes.",
    "Le pont romain à arche unique franchit le Lys au centre de Pont-Saint-Martin et fait toujours partie du réseau de rues de la ville.",
    "Rimski most z enim lokom prečka Lys v središču Pont-Saint-Martina in je še vedno del mestne cestne mreže.",
  ],
  "expert-speiden": [
    "Speiden è un piccolo paese dell’Ostallgäu vicino al paesaggio dei castelli di Eisenberg e ai percorsi pedonali locali.",
    "Speiden ist ein kleines Dorf im Ostallgäu nahe der Eisenberger Burgenlandschaft und ihrer örtlichen Wanderwege.",
    "Speiden est un petit village de l’Ostallgäu proche du paysage castral d’Eisenberg et de ses itinéraires pédestres locaux.",
    "Speiden je majhna vas v Ostallgäuu blizu grajske pokrajine Eisenberg in lokalnih pešpoti.",
  ],
  "expert-eisenberg-ruin": [
    "Eisenberg è una delle due vicine rovine sulla collina sopra Zell, raggiungibile con una salita segnalata.",
    "Eisenberg ist eine von zwei benachbarten Höhenburgruinen oberhalb von Zell und über einen markierten Anstieg erreichbar.",
    "Eisenberg est l’une des deux ruines voisines sur la colline au-dessus de Zell, accessible par une montée balisée.",
    "Eisenberg je ena od dveh sosednjih grajskih razvalin na hribu nad Zellom, dosegljiva po označenem vzponu.",
  ],
  "expert-hohenfreyberg-ruin": [
    "Hohenfreyberg è la rovina occidentale del sito dei due castelli e dista una breve passeggiata da Eisenberg.",
    "Hohenfreyberg ist die westliche Ruine der Doppelburg und liegt einen kurzen Fußweg von Eisenberg entfernt.",
    "Hohenfreyberg est la ruine occidentale du site des deux châteaux, à quelques minutes à pied d’Eisenberg.",
    "Hohenfreyberg je zahodna razvalina dvojnega grajskega območja in je kratek sprehod oddaljena od Eisenberga.",
  ],
  "expert-aschauerweiher": [
    "Aschauerweiher a Bischofswiesen è un’area balneabile naturale in estate e un centro per gli sport nordici in inverno.",
    "Der Aschauerweiher in Bischofswiesen ist im Sommer ein Naturbad und im Winter ein nordisches Sportzentrum.",
    "L’Aschauerweiher à Bischofswiesen est une zone de baignade naturelle en été et un centre de sports nordiques en hiver.",
    "Aschauerweiher v Bischofswiesnu je poleti naravno kopališče, pozimi pa center nordijskih športov.",
  ],
  "expert-kastensteinerwand": [
    "Un percorso segnalato in salita da Bischofswiesen raggiunge il punto panoramico di Kastensteinerwand sopra la valle.",
    "Ein markierter Aufstieg von Bischofswiesen führt zum Aussichtspunkt Kastensteinerwand oberhalb des Tals.",
    "Un itinéraire balisé en montée depuis Bischofswiesen rejoint le point de vue de Kastensteinerwand au-dessus de la vallée.",
    "Označena vzpenjajoča se pot iz Bischofswiesna vodi do razgledišča Kastensteinerwand nad dolino.",
  ],
  "expert-hoeglwoerther-see": [
    "L’Höglwörther See è un piccolo lago prealpino accanto all’ex monastero agostiniano di Höglwörth.",
    "Der Höglwörther See ist ein kleiner Voralpensee neben dem ehemaligen Augustinerkloster Höglwörth.",
    "Le Höglwörther See est un petit lac de piémont à côté de l’ancien monastère augustin de Höglwörth.",
    "Höglwörther See je majhno jezero v predgorju ob nekdanjem avguštinskem samostanu Höglwörth.",
  ],
  "expert-barmsee": [
    "Il Barmsee vicino a Krün offre un facile percorso circolare, panorami montani e collegamenti verso il Grubsee.",
    "Der Barmsee bei Krün bietet einen leichten Rundweg, Bergblicke und Verbindungen in Richtung Grubsee.",
    "Le Barmsee près de Krün propose un circuit facile, des vues sur les montagnes et des liaisons vers le Grubsee.",
    "Barmsee pri Krünu ponuja lahko krožno pot, gorske razglede in povezave proti Grubseeju.",
  ],
  "expert-grubsee": [
    "Il Grubsee è un piccolo lago a sud del Barmsee, con area balneabile gestita e percorsi pedonali verso Krün.",
    "Der Grubsee ist ein kleiner See südlich des Barmsees mit bewirtschaftetem Strandbad und Wanderverbindungen nach Krün.",
    "Le Grubsee est un petit lac au sud du Barmsee, avec une zone de baignade aménagée et des liaisons pédestres vers Krün.",
    "Grubsee je majhno jezero južno od Barmseeja z urejenim kopališčem in pešpotmi proti Krünu.",
  ],
  "expert-kruen": [
    "Krün è una base per esplorare le pendici del Karwendel, i prati Buckelwiesen e i percorsi a piedi o in bicicletta tra i laghi vicini.",
    "Krün ist ein Ausgangsort für Karwendelvorland, Buckelwiesen und Wander- oder Radwege zwischen den nahen Seen.",
    "Krün est une base pour découvrir les contreforts du Karwendel, les prairies de Buckelwiesen et les itinéraires à pied ou à vélo entre les lacs voisins.",
    "Krün je izhodišče za predgorje Karwendela, travnike Buckelwiesen ter pešpoti in kolesarske poti med bližnjimi jezeri.",
  ],
  "expert-tinninger-see": [
    "Il Tinninger See è un lago di torbiera vicino a Riedering, con percorso circolare, punti di sosta e area balneabile gestita.",
    "Der Tinninger See ist ein Moorsee bei Riedering mit Rundweg, Rastplätzen und bewirtschafteter Badestelle.",
    "Le Tinninger See est un lac de tourbière près de Riedering, avec circuit, haltes et zone de baignade aménagée.",
    "Tinninger See je barjansko jezero pri Riederingu s krožno potjo, počivališči in urejenim kopališčem.",
  ],
  "expert-simsseemoos": [
    "Simsseemoos è una zona umida protetta accanto al Simssee, da osservare restando sui percorsi consentiti.",
    "Das Simsseemoos ist eine geschützte Feuchtlandschaft am Simssee, die von erlaubten Wegen aus beobachtet werden soll.",
    "Le Simsseemoos est une zone humide protégée près du Simssee, à observer depuis les chemins autorisés.",
    "Simsseemoos je zaščiteno mokrišče ob Simsseeju, namenjeno opazovanju z dovoljenih poti.",
  ],
  "expert-riedering": [
    "Riedering è un comune rurale tra il Simssee e le pendici del Chiemgau, con percorsi locali nel paese e a piedi.",
    "Riedering ist eine ländliche Gemeinde zwischen Simssee und Chiemgauer Vorbergen mit örtlichen Dorf- und Wanderwegen.",
    "Riedering est une commune rurale entre le Simssee et les contreforts du Chiemgau, avec des parcours locaux dans le village et à pied.",
    "Riedering je podeželska občina med Simsseejem in predgorjem Chiemgaua z lokalnimi vaškimi in sprehajalnimi potmi.",
  ],
} satisfies Record<string, CaptionSet>);

export const localizedExperienceCaption = (locale: Locale, experience: Experience) => {
  if (locale === "en") return experience.promise;
  const translated = translatedCaptions[experience.id];
  return translated?.[captionLocaleIndex[locale]] ?? experience.promise;
};

export const localizedExperienceReasons = (
  locale: Locale,
  experience: Experience,
  travelMinutes: number | null,
  visitDate?: string,
) => {
  const selectedSeason = seasonForDate(visitDate);
  const season = experience.seasons?.includes(selectedSeason) ? selectedSeason : experience.seasons?.[0];
  const kinds = experience.kind.slice(0, 2).map((kind) => kindLabel(locale, kind));
  const copy = {
    en: {
      expert: "Included in the GemGo tourism-expert contest sequence",
      interests: (values: string) => `Matches your interest in ${values}`,
      travel: (minutes: number) => `About ${minutes} minutes from the selected start`,
      season: (value: string) => `Suitable for ${value}`,
      pressure: "Lower-pressure arrival window available",
    },
    it: {
      expert: "Inclusa nella sequenza del contest curata dall’esperto di turismo GemGo",
      interests: (values: string) => `Coerente con il tuo interesse per ${values}`,
      travel: (minutes: number) => `Circa ${minutes} minuti dalla partenza selezionata`,
      season: (value: string) => `Adatta per ${value}`,
      pressure: "È disponibile una fascia di arrivo a minore affollamento",
    },
    de: {
      expert: "Teil der GemGo-Wettbewerbsroute des Tourismusexperten",
      interests: (values: string) => `Passt zu deinem Interesse an ${values}`,
      travel: (minutes: number) => `Etwa ${minutes} Minuten vom gewählten Start`,
      season: (value: string) => `Geeignet für ${value}`,
      pressure: "Ein Ankunftsfenster mit geringerem Andrang ist verfügbar",
    },
    fr: {
      expert: "Incluse dans la séquence du concours validée par l’expert tourisme GemGo",
      interests: (values: string) => `Correspond à votre intérêt pour ${values}`,
      travel: (minutes: number) => `Environ ${minutes} minutes depuis le départ choisi`,
      season: (value: string) => `Adaptée à ${value}`,
      pressure: "Un créneau d’arrivée à moindre affluence est disponible",
    },
    sl: {
      expert: "Vključeno v tekmovalno zaporedje turističnega strokovnjaka GemGo",
      interests: (values: string) => `Ustreza vašemu zanimanju za ${values}`,
      travel: (minutes: number) => `Približno ${minutes} minut od izbranega začetka`,
      season: (value: string) => `Primerno za ${value}`,
      pressure: "Na voljo je čas prihoda z manjšo gnečo",
    },
  }[locale];
  return [
    experience.catalogueSource === "team-expert" ? copy.expert : copy.interests(kinds.join(" · ")),
    travelMinutes === null ? null : copy.travel(travelMinutes),
    season ? copy.season(seasonLabel(locale, season)) : null,
    copy.pressure,
  ].filter((value): value is string => Boolean(value));
};

const narrativeCopy = {
  en: {
    crowd: { low: "Low crowd", moderate: "Moderate crowd", high: "High crowd" },
    validation: { "Data-based suggestion": "Data-based suggestion", "Locally reviewed": "Locally reviewed", "Verified Gem": "Verified Gem" },
    country: { Germany: "Germany", Italy: "Italy" },
    leaveStart: "Leave from your selected starting point",
    leavePrevious: "Leave from the previous stop",
    arrive: (name: string) => `Arrive at ${name}`,
    visit: "Follow the signed local visit route",
    continue: "Continue or return",
    mobility: ["Travel time is recalculated from your selected origin", "Walking, bicycle and public transport earn mobility bonuses", "Check seasonal access and current operations before departure"],
    originalCore: "A better-known nearby Alpine destination",
    originalExpert: "Overcrowded hotspot selected in the contest scenario",
    reachCore: "Calculated from your selected starting point",
    reachExpert: "Team estimate from the previous stop, not live routing",
    advantages: ["Compatible theme and season", "Helps distribute visits and local spending", "Source and operational limits are shown"],
    tradeoffs: ["Access, opening and trail conditions require a current official check", "Crowd and road times are prototype estimates, not live occupancy or routing"],
    benefit: (name: string, region: string) => `A visit to ${name} can distribute time and potential spending beyond the busiest tourism corridors of ${region}.`,
    safetyEasy: "Use signed visitor routes",
    safetyModerate: "Outdoor footwear and route awareness recommended",
    safety: ["Check official local conditions before departure", "Seasonal restrictions or closures may apply"],
  },
  it: {
    crowd: { low: "Poco affollata", moderate: "Affollamento moderato", high: "Molto affollata" },
    validation: { "Data-based suggestion": "Suggerimento basato sui dati", "Locally reviewed": "Revisionata localmente", "Verified Gem": "Gem verificata" },
    country: { Germany: "Germania", Italy: "Italia" },
    leaveStart: "Parti dal punto di partenza selezionato",
    leavePrevious: "Parti dalla tappa precedente",
    arrive: (name: string) => `Arriva a ${name}`,
    visit: "Segui il percorso di visita locale segnalato",
    continue: "Prosegui oppure rientra",
    mobility: ["Il tempo di viaggio viene ricalcolato dalla partenza selezionata", "A piedi, in bici e con il trasporto pubblico ottieni bonus mobilità", "Controlla accesso stagionale e operatività prima di partire"],
    originalCore: "Una destinazione alpina vicina più conosciuta",
    originalExpert: "Hotspot sovraffollato scelto nello scenario del contest",
    reachCore: "Calcolato dal punto di partenza selezionato",
    reachExpert: "Stima del team dalla tappa precedente, non percorso live",
    advantages: ["Tema e stagione compatibili", "Aiuta a distribuire visite e spesa locale", "Mostra fonte e limiti operativi"],
    tradeoffs: ["Accessi, aperture e condizioni dei sentieri richiedono un controllo ufficiale aggiornato", "Affollamento e tempi su strada sono stime del prototipo, non dati o percorsi live"],
    benefit: (name: string, region: string) => `Una visita a ${name} può distribuire tempo e spesa potenziale oltre i corridoi turistici più affollati di ${region}.`,
    safetyEasy: "Usa i percorsi di visita segnalati",
    safetyModerate: "Sono consigliate calzature da esterno e attenzione al percorso",
    safety: ["Controlla le condizioni locali ufficiali prima di partire", "Potrebbero esserci restrizioni o chiusure stagionali"],
  },
  de: {
    crowd: { low: "Wenig Andrang", moderate: "Mäßiger Andrang", high: "Hoher Andrang" },
    validation: { "Data-based suggestion": "Datenbasierter Vorschlag", "Locally reviewed": "Lokal geprüft", "Verified Gem": "Bestätigtes Juwel" },
    country: { Germany: "Deutschland", Italy: "Italien" },
    leaveStart: "Vom gewählten Startpunkt aufbrechen",
    leavePrevious: "Vom vorherigen Stopp aufbrechen",
    arrive: (name: string) => `In ${name} ankommen`,
    visit: "Der ausgeschilderten örtlichen Besuchsroute folgen",
    continue: "Weiterfahren oder zurückkehren",
    mobility: ["Die Reisezeit wird ab dem gewählten Start neu berechnet", "Zu Fuß, mit dem Rad und im ÖPNV gibt es Mobilitätsboni", "Saisonalen Zugang und Betrieb vor der Abfahrt prüfen"],
    originalCore: "Ein bekannteres nahes Alpenziel",
    originalExpert: "Überfüllter Hotspot aus dem Wettbewerbsszenario",
    reachCore: "Ab dem gewählten Startpunkt berechnet",
    reachExpert: "Teamschätzung ab dem vorherigen Stopp, kein Live-Routing",
    advantages: ["Passendes Thema und passende Saison", "Verteilt Besuche und lokale Ausgaben", "Quelle und betriebliche Grenzen sind sichtbar"],
    tradeoffs: ["Zugang, Öffnung und Wegzustand müssen aktuell offiziell geprüft werden", "Andrang und Straßenzeiten sind Prototypschätzungen, keine Live-Daten oder Live-Routen"],
    benefit: (name: string, region: string) => `Ein Besuch in ${name} kann Zeit und potenzielle Ausgaben über die meistbesuchten Tourismuskorridore von ${region} hinaus verteilen.`,
    safetyEasy: "Ausgeschilderte Besuchswege nutzen",
    safetyModerate: "Outdoor-Schuhe und Aufmerksamkeit auf der Route empfohlen",
    safety: ["Offizielle örtliche Bedingungen vor der Abfahrt prüfen", "Saisonale Einschränkungen oder Sperrungen sind möglich"],
  },
  fr: {
    crowd: { low: "Faible affluence", moderate: "Affluence modérée", high: "Forte affluence" },
    validation: { "Data-based suggestion": "Suggestion fondée sur les données", "Locally reviewed": "Révisée localement", "Verified Gem": "Pépite vérifiée" },
    country: { Germany: "Allemagne", Italy: "Italie" },
    leaveStart: "Partir du point de départ choisi",
    leavePrevious: "Partir de l’étape précédente",
    arrive: (name: string) => `Arriver à ${name}`,
    visit: "Suivre le parcours de visite local balisé",
    continue: "Continuer ou revenir",
    mobility: ["Le temps de trajet est recalculé depuis le départ choisi", "La marche, le vélo et les transports publics donnent des bonus mobilité", "Vérifier l’accès saisonnier et le fonctionnement avant le départ"],
    originalCore: "Une destination alpine proche plus connue",
    originalExpert: "Un site surfréquenté choisi dans le scénario du concours",
    reachCore: "Calculé depuis le point de départ choisi",
    reachExpert: "Estimation de l’équipe depuis l’étape précédente, sans itinéraire en direct",
    advantages: ["Thème et saison compatibles", "Aide à répartir les visites et les dépenses locales", "Affiche la source et les limites opérationnelles"],
    tradeoffs: ["Accès, ouvertures et état des sentiers nécessitent une vérification officielle à jour", "Affluence et temps routiers sont des estimations du prototype, pas des données ou itinéraires en direct"],
    benefit: (name: string, region: string) => `Une visite à ${name} peut répartir le temps et les dépenses potentielles au-delà des axes touristiques les plus fréquentés de ${region}.`,
    safetyEasy: "Utiliser les parcours de visite balisés",
    safetyModerate: "Chaussures de plein air et vigilance sur l’itinéraire recommandées",
    safety: ["Vérifier les conditions locales officielles avant le départ", "Des restrictions ou fermetures saisonnières peuvent s’appliquer"],
  },
  sl: {
    crowd: { low: "Malo gneče", moderate: "Zmerna gneča", high: "Velika gneča" },
    validation: { "Data-based suggestion": "Predlog na podlagi podatkov", "Locally reviewed": "Lokalno pregledano", "Verified Gem": "Potrjen biser" },
    country: { Germany: "Nemčija", Italy: "Italija" },
    leaveStart: "Odhod z izbranega izhodišča",
    leavePrevious: "Odhod s prejšnjega postanka",
    arrive: (name: string) => `Prihod v ${name}`,
    visit: "Sledite označeni lokalni poti obiska",
    continue: "Nadaljujte ali se vrnite",
    mobility: ["Čas poti se znova izračuna od izbranega izhodišča", "Hoja, kolo in javni prevoz prinašajo bonus mobilnosti", "Pred odhodom preverite sezonski dostop in obratovanje"],
    originalCore: "Bolj znana bližnja alpska destinacija",
    originalExpert: "Preobremenjena točka iz tekmovalnega scenarija",
    reachCore: "Izračunano od izbranega izhodišča",
    reachExpert: "Ocena ekipe od prejšnjega postanka, ne usmerjanje v živo",
    advantages: ["Ustrezna tema in sezona", "Pomaga razporediti obiske in lokalno porabo", "Prikaže vir in operativne omejitve"],
    tradeoffs: ["Dostop, odprtje in stanje poti je treba preveriti pri uradnem viru", "Gneča in cestni časi so ocene prototipa, ne podatki ali usmerjanje v živo"],
    benefit: (name: string, region: string) => `Obisk kraja ${name} lahko čas in morebitno porabo razporedi zunaj najbolj obremenjenih turističnih koridorjev regije ${region}.`,
    safetyEasy: "Uporabljajte označene poti za obiskovalce",
    safetyModerate: "Priporočeni so zunanja obutev in pozornost na poti",
    safety: ["Pred odhodom preverite uradne lokalne razmere", "Veljajo lahko sezonske omejitve ali zapore"],
  },
} as const;

export const localizedExperienceNarrative = (locale: Locale, experience: Experience) => {
  const copy = narrativeCopy[locale];
  const expert = experience.catalogueSource === "team-expert";
  return {
    crowd: copy.crowd[experience.crowd],
    validation: copy.validation[experience.validation],
    country: copy.country[experience.country as keyof typeof copy.country] ?? experience.country,
    itinerary: [
      expert ? copy.leavePrevious : copy.leaveStart,
      copy.arrive(experience.name),
      copy.visit,
      copy.continue,
    ],
    mobility: [...copy.mobility],
    comparison: {
      original: expert ? copy.originalExpert : copy.originalCore,
      reachDifference: expert ? copy.reachExpert : copy.reachCore,
      advantages: [...copy.advantages],
    },
    tradeoffs: [...copy.tradeoffs],
    localBenefit: copy.benefit(experience.name, experience.region),
    safety: [copy.safety[0], experience.difficulty === "moderate" ? copy.safetyModerate : copy.safetyEasy, copy.safety[1]],
  };
};
