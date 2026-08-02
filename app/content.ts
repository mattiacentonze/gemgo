import type { Destination, RegionCode } from "./domain";

export type Accommodation = {
  id: string;
  name: string;
  area: string;
  region: Exclude<RegionCode, "all">;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  priceBand: string;
  bookingUrl: string;
  photoQuery: string;
  checkedAt: string;
};

export const accommodations: Accommodation[] = [
  {
    id: "zum-hechten",
    name: "Altstadthotel Zum Hechten",
    area: "Füssen old town",
    region: "fussen_allgau",
    lat: 47.5686,
    lng: 10.7002,
    rating: 8.8,
    reviewCount: 806,
    priceBand: "€€",
    bookingUrl: "https://www.booking.com/hotel/de/altstadt-zum-hechten.html",
    photoQuery: "Altstadthotel Zum Hechten Füssen",
    checkedAt: "2026-08-02",
  },
  {
    id: "ameron-neuschwanstein",
    name: "AMERON Neuschwanstein Alpsee Resort & Spa",
    area: "Hohenschwangau",
    region: "fussen_allgau",
    lat: 47.5567,
    lng: 10.7428,
    rating: 9.0,
    reviewCount: 2449,
    priceBand: "€€€",
    bookingUrl:
      "https://www.booking.com/hotel/de/ameron-neuschwanstein-alpsee-resort-amp-spa-schwangau12.html",
    photoQuery: "AMERON Neuschwanstein Alpsee Resort",
    checkedAt: "2026-08-02",
  },
  {
    id: "die-gams",
    name: "DIE GAMS Hotel-Resort",
    area: "Bad Hindelang",
    region: "bavaria",
    lat: 47.5054,
    lng: 10.3658,
    rating: 8.2,
    reviewCount: 645,
    priceBand: "€€",
    bookingUrl:
      "https://www.booking.com/hotel/de/kur-und-sporthotel-bad-hindelang.html",
    photoQuery: "DIE GAMS Hotel Resort Bad Hindelang",
    checkedAt: "2026-08-02",
  },
  {
    id: "comtes-de-challant",
    name: "Hotel Comtes de Challant",
    area: "Fénis",
    region: "aosta",
    lat: 45.7374,
    lng: 7.4892,
    rating: 8.1,
    reviewCount: 186,
    priceBand: "€€",
    bookingUrl: "https://www.booking.com/hotel/it/comtes-de-challant-fenis.html",
    photoQuery: "Hotel Comtes de Challant Fénis",
    checkedAt: "2026-08-02",
  },
  {
    id: "maison-dominique",
    name: "Eco Chalet Maison Dominique",
    area: "Challand-Saint-Anselme",
    region: "aosta",
    lat: 45.7144,
    lng: 7.734,
    rating: 9.1,
    reviewCount: 381,
    priceBand: "€€",
    bookingUrl: "https://www.booking.com/hotel/it/maison-dominique.en-gb.html",
    photoQuery: "Maison Dominique Challand Saint Anselme",
    checkedAt: "2026-08-02",
  },
];

export const officialDestinationUrl = (destination: Destination) => {
  if (destination.region === "aosta") {
    return "https://www.lovevda.it/en";
  }
  if (destination.region === "fussen_allgau") {
    return "https://www.fuessen.de/en/";
  }
  return "https://www.bavaria.travel/";
};

export const team = [
  {
    name: "Mattia Centonze",
    role: "Development & product engineering",
    bio: "Full-stack developer at the Italian Institute of Technology and Software Security graduate student, building GemGo’s product and technical foundation.",
    linkedin: "https://www.linkedin.com/in/mattiacentonze/",
    photo: "https://avatars.githubusercontent.com/u/93384261?v=4",
  },
  {
    name: "Killian Foloppe",
    role: "AI governance & strategy",
    bio: "AI for Good researcher with experience across international institutions, AI governance, geopolitical risk and strategic partnerships.",
    linkedin: "https://www.linkedin.com/in/killianfoloppe/",
    photo: null,
  },
  {
    name: "Martino Dalla Fontana",
    role: "Tourism & field experience",
    bio: "Environmental hiking guide focused on group leadership, guest experience, languages and communication for sustainable tourism.",
    linkedin: "https://www.linkedin.com/in/martinodallafontana/",
    photo: null,
  },
] as const;
