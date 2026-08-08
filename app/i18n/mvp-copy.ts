import type { Locale } from "../domain";

export const mvpCopy: Record<Locale, {
  originModes: [string, string, string];
  farHelp: string;
  gpsHelp: string;
  placeHelp: string;
  locating: string;
  outside: string;
  inside: string;
  startDate: string;
  endDate: string;
  dateHelp: string;
  collections: string;
  savedCollection: (region: string) => string;
  removedCollection: (region: string) => string;
  addTrip: string;
  addedTrip: string;
  refineTitle: string;
  refineBody: string;
  betweenStops: string;
  tripTune: string;
  suggestions: [string, string, string, string];
  automaticOffline: string;
  automaticOfflineBody: string;
  conditionTitle: string;
  conditionBody: string;
  conditionReasons: string[];
  aiDemo: string;
  keepStop: string;
  changeStop: string;
  conditionReminder: string;
  shared: string;
  copied: string;
  invalidShare: string;
  open: string;
  rename: string;
  duplicate: string;
  remove: string;
  share: string;
}> = {
  en: {
    originModes: ["Arriving from afar", "Use my location", "Choose an Alpine start"],
    farHelp: "GemGo plans only movement between Alpine stops; your journey to the pilot region is outside this itinerary.",
    gpsHelp: "We check whether you are already near a pilot region and use the nearest Alpine place as a planning anchor.",
    placeHelp: "Choose a deliberate Alpine starting point and GemGo will include it in travel estimates.",
    locating: "Checking your location…", outside: "You appear to be outside the pilot regions. Arrival from afar is selected.", inside: "Alpine starting point detected:",
    startDate: "Starts", endDate: "Ends", dateHelp: "Dates guide duration, forecast and prototype weekend/holiday pressure logic.",
    collections: "Collections", savedCollection: (region) => `Saved in ${region} collection`, removedCollection: (region) => `Removed from ${region} collection`, addTrip: "Add to My Trip", addedTrip: "Added to your active trip",
    refineTitle: "Build the next stop", refineBody: "Suggestions now start from the last place in your trip.", betweenStops: "Maximum time between locations", tripTune: "Would you like to reshape this trip?",
    suggestions: ["Less time between locations", "More quiet places", "More culture", "Easier activities"],
    automaticOffline: "Available offline automatically", automaticOfflineBody: "Visited pages, the app shell and your device-local trip are cached automatically when supported.",
    conditionTitle: "Conditions may have changed", conditionBody: "The future Crowd Predictor detected a higher probability of crowding for this stop at your planned time.", conditionReasons: ["Sunny conditions", "Comfortable temperature", "Light wind", "Schools or local services may be closed"], aiDemo: "Future AI feature · simulated", keepStop: "Keep this stop", changeStop: "Find a better alternative", conditionReminder: "Crowd conditions changed for one planned stop. Review the simulated alert.",
    shared: "A shared trip was copied to your device", copied: "Share link copied", invalidShare: "This shared trip link is invalid", open: "Open", rename: "Rename", duplicate: "Duplicate", remove: "Delete", share: "Share",
  },
  it: {
    originModes: ["Arrivo da lontano", "Usa la mia posizione", "Scegli una partenza alpina"],
    farHelp: "GemGo pianifica solo gli spostamenti tra tappe alpine; il viaggio verso la regione pilota resta fuori dall’itinerario.",
    gpsHelp: "Verifichiamo se sei già vicino a una regione pilota e usiamo la località alpina più vicina come riferimento.",
    placeHelp: "Scegli una partenza alpina precisa e GemGo la includerà nei tempi di spostamento.",
    locating: "Rilevamento della posizione…", outside: "Sembri fuori dalle regioni pilota. È selezionato Arrivo da lontano.", inside: "Punto di partenza alpino rilevato:",
    startDate: "Inizio", endDate: "Fine", dateHelp: "Date e orari guidano durata, meteo e logica demo su weekend e festività.",
    collections: "Collezioni", savedCollection: (region) => `Salvato nella collezione ${region}`, removedCollection: (region) => `Rimosso dalla collezione ${region}`, addTrip: "Aggiungi al mio viaggio", addedTrip: "Aggiunta al viaggio attivo",
    refineTitle: "Costruisci la prossima tappa", refineBody: "Le proposte partono ora dall’ultima località del viaggio.", betweenStops: "Tempo massimo tra le località", tripTune: "Vuoi modificare questo viaggio?",
    suggestions: ["Meno tempo tra le località", "Più luoghi tranquilli", "Più cultura", "Attività più facili"],
    automaticOffline: "Disponibile offline automaticamente", automaticOfflineBody: "Le pagine visitate, l’app e il viaggio locale vengono messi automaticamente in cache quando il browser lo consente.",
    conditionTitle: "Le condizioni potrebbero essere cambiate", conditionBody: "Il futuro Crowd Predictor ha rilevato una maggiore probabilità di affollamento per questa tappa nell’orario previsto.", conditionReasons: ["Cielo sereno", "Temperatura piacevole", "Poco vento", "Scuole o servizi locali chiusi"], aiDemo: "Funzione AI futura · simulazione", keepStop: "Mantieni questa tappa", changeStop: "Trova un’alternativa migliore", conditionReminder: "Le condizioni di affollamento sono cambiate per una tappa. Rivedi l’avviso simulato.",
    shared: "Il viaggio condiviso è stato copiato sul dispositivo", copied: "Link di condivisione copiato", invalidShare: "Il link del viaggio non è valido", open: "Apri", rename: "Rinomina", duplicate: "Duplica", remove: "Elimina", share: "Condividi",
  },
  de: {
    originModes: ["Anreise von weiter weg", "Meinen Standort nutzen", "Alpen-Start wählen"], farHelp: "GemGo plant nur Wege zwischen Alpenstopps; die Anreise zur Pilotregion gehört nicht zu diesem Reiseplan.", gpsHelp: "Wir prüfen, ob du bereits nahe einer Pilotregion bist, und nutzen den nächsten Alpenort als Anker.", placeHelp: "Wähle einen Alpen-Start; GemGo berücksichtigt ihn bei den Reisezeiten.", locating: "Standort wird geprüft…", outside: "Du scheinst außerhalb der Pilotregionen zu sein. Anreise von weiter weg ist ausgewählt.", inside: "Alpen-Start erkannt:", startDate: "Beginn", endDate: "Ende", dateHelp: "Datum und Uhrzeit steuern Dauer, Prognose und die Demo-Logik für Wochenenden und Feiertage.", collections: "Sammlungen", savedCollection: (region) => `In der Sammlung ${region} gespeichert`, removedCollection: (region) => `Aus der Sammlung ${region} entfernt`, addTrip: "Zu meiner Reise", addedTrip: "Zur aktiven Reise hinzugefügt", refineTitle: "Nächsten Stopp planen", refineBody: "Vorschläge starten jetzt am letzten Ort deiner Reise.", betweenStops: "Maximale Zeit zwischen Orten", tripTune: "Möchtest du diese Reise anpassen?", suggestions: ["Weniger Zeit zwischen Orten", "Mehr ruhige Orte", "Mehr Kultur", "Leichtere Aktivitäten"], automaticOffline: "Automatisch offline verfügbar", automaticOfflineBody: "Besuchte Seiten, App und lokale Reise werden automatisch zwischengespeichert, wenn unterstützt.", conditionTitle: "Bedingungen könnten sich geändert haben", conditionBody: "Der künftige Crowd Predictor erkennt für diesen Stopp zur geplanten Zeit eine höhere Besuchswahrscheinlichkeit.", conditionReasons: ["Sonniges Wetter", "Angenehme Temperatur", "Wenig Wind", "Schul- oder lokale Schließtage"], aiDemo: "Künftige KI-Funktion · Simulation", keepStop: "Stopp behalten", changeStop: "Bessere Alternative finden", conditionReminder: "Besuchsbedingungen für einen Stopp haben sich geändert. Simulierten Hinweis prüfen.", shared: "Geteilte Reise wurde auf dein Gerät kopiert", copied: "Freigabelink kopiert", invalidShare: "Ungültiger Reiselink", open: "Öffnen", rename: "Umbenennen", duplicate: "Duplizieren", remove: "Löschen", share: "Teilen",
  },
  fr: {
    originModes: ["J’arrive de loin", "Utiliser ma position", "Choisir un départ alpin"], farHelp: "GemGo planifie uniquement les déplacements entre étapes alpines, pas le trajet vers la région pilote.", gpsHelp: "Nous vérifions si vous êtes déjà près d’une région pilote et utilisons le lieu alpin le plus proche.", placeHelp: "Choisissez un départ alpin précis pour l’inclure dans les temps de trajet.", locating: "Localisation en cours…", outside: "Vous semblez hors des régions pilotes. J’arrive de loin est sélectionné.", inside: "Départ alpin détecté :", startDate: "Début", endDate: "Fin", dateHelp: "Dates et heures guident la durée, la météo et la logique démo des week-ends et jours fériés.", collections: "Collections", savedCollection: (region) => `Enregistré dans la collection ${region}`, removedCollection: (region) => `Retiré de la collection ${region}`, addTrip: "Ajouter à mon voyage", addedTrip: "Ajouté au voyage actif", refineTitle: "Construire l’étape suivante", refineBody: "Les suggestions partent désormais de la dernière étape.", betweenStops: "Temps maximal entre les lieux", tripTune: "Souhaitez-vous modifier ce voyage ?", suggestions: ["Moins de trajet entre les lieux", "Plus de lieux calmes", "Plus de culture", "Activités plus faciles"], automaticOffline: "Disponible hors ligne automatiquement", automaticOfflineBody: "Les pages visitées, l’application et le voyage local sont mis en cache automatiquement si possible.", conditionTitle: "Les conditions ont peut-être changé", conditionBody: "Le futur Crowd Predictor détecte un risque d’affluence plus élevé pour cette étape à l’heure prévue.", conditionReasons: ["Temps ensoleillé", "Température agréable", "Vent faible", "Écoles ou services locaux fermés"], aiDemo: "Fonction IA future · simulation", keepStop: "Garder cette étape", changeStop: "Trouver une meilleure alternative", conditionReminder: "L’affluence a changé pour une étape. Consultez l’alerte simulée.", shared: "Le voyage partagé a été copié sur votre appareil", copied: "Lien de partage copié", invalidShare: "Lien de voyage invalide", open: "Ouvrir", rename: "Renommer", duplicate: "Dupliquer", remove: "Supprimer", share: "Partager",
  },
  sl: {
    originModes: ["Prihajam od daleč", "Uporabi mojo lokacijo", "Izberi alpski začetek"], farHelp: "GemGo načrtuje le premike med alpskimi postanki, ne poti do pilotne regije.", gpsHelp: "Preverimo, ali ste blizu pilotne regije, in uporabimo najbližji alpski kraj.", placeHelp: "Izberite alpsko izhodišče, ki bo vključeno v čase poti.", locating: "Preverjanje lokacije…", outside: "Videti je, da ste zunaj pilotnih regij. Izbrano je Prihajam od daleč.", inside: "Zaznano alpsko izhodišče:", startDate: "Začetek", endDate: "Konec", dateHelp: "Datum in čas usmerjata trajanje, napoved ter demo logiko vikendov in praznikov.", collections: "Zbirke", savedCollection: (region) => `Shranjeno v zbirko ${region}`, removedCollection: (region) => `Odstranjeno iz zbirke ${region}`, addTrip: "Dodaj v moje potovanje", addedTrip: "Dodano v aktivno potovanje", refineTitle: "Sestavite naslednji postanek", refineBody: "Predlogi se zdaj začnejo pri zadnjem kraju poti.", betweenStops: "Najdaljši čas med kraji", tripTune: "Želite spremeniti potovanje?", suggestions: ["Manj časa med kraji", "Več mirnih krajev", "Več kulture", "Lažje dejavnosti"], automaticOffline: "Samodejno na voljo brez povezave", automaticOfflineBody: "Obiskane strani, aplikacija in lokalna pot se samodejno predpomnijo, ko je to podprto.", conditionTitle: "Razmere so se morda spremenile", conditionBody: "Prihodnji Crowd Predictor zaznava večjo verjetnost gneče ob načrtovanem času.", conditionReasons: ["Sončno vreme", "Prijetna temperatura", "Malo vetra", "Zaprte šole ali lokalne storitve"], aiDemo: "Prihodnja funkcija AI · simulacija", keepStop: "Obdrži postanek", changeStop: "Poišči boljšo alternativo", conditionReminder: "Razmere glede gneče so se spremenile. Preglejte simulirano opozorilo.", shared: "Deljeno potovanje je bilo kopirano v napravo", copied: "Povezava kopirana", invalidShare: "Neveljavna povezava", open: "Odpri", rename: "Preimenuj", duplicate: "Podvoji", remove: "Izbriši", share: "Deli",
  },
};
