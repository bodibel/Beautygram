# GlowySpot Salon Console IA Decisions

## Cel

Phase 2C soran az uj `/dashboard/salons/[salonId]/*` salon console struktura fokozatos bevezetesehez rogziti a megmaradt informacios architektura donteseket.

## `/reviews`

Dontes: MVP-ben ne legyen kulon primer provider salon console menupont.

Indoklas:

- A provider szamara a review-k jelenleg inkabb visszajelzes/attekintes jelleguek, nem napi operativ munkafolyamat.
- Kulon route csak akkor indokolt, ha lesz valaszadas, moderation vagy report flow.
- Phase 2C-ben a review statusz maradjon read-only jelleggel overview/stat teruleten vagy kesobbi admin/moderation alatt.

Javasolt kesobbi route:

- `/dashboard/salons/[salonId]/reviews`, ha lesz provider response vagy moderation.

Prioritas: P3, MVP blocker: nem.

## `/contact`

Dontes: olvadjon be a `profile/settings` ala.

Indoklas:

- A kapcsolati adatok, publikus lathatosagi beallitasok es booking/contact CTA-k egy szalonprofil szerkesztesi flow reszei.
- Kulon contact route feleslegesen szetdarabolja a szalonadatokat.
- A regi `/salon/[id]/contact` route marad kompatibilitasi celbol, de az uj dashboard IA-ban ne kapjon kulon nav elemet.

Javasolt cel:

- `/dashboard/salons/[salonId]/profile`

Prioritas: P1, MVP blocker: reszben, mert a profil/settings tisztasaga fontos.

## `/gallery`

Dontes: MVP-ben olvadjon be `portfolio` ala, de a regi route maradjon.

Indoklas:

- A felhasznalo szemszogebol a posztok, kepek es referenciaanyagok egy "Portfolio" munkateruletet alkotnak.
- A jelenlegi `posts` es `gallery` szetvalas erosen technikai jellegu.
- Phase 2B/2C mapping szerint az uj `/portfolio` most a stabilabb `/salon/[id]/posts` route-ra mutat; Phase 2D-ben lehet donteni, hogy a gallery tartalom is ugyanebbe a komponensbe kerul-e.

Javasolt cel:

- `/dashboard/salons/[salonId]/portfolio`

Prioritas: P2, MVP blocker: nem, ha a kepfeltoltes/poszt flow mukodik.

## Osszegzes

Vegleges MVP salon console nav javaslat:

1. Attekintes
2. Foglalasi kerelmek
3. Szalonprofil
4. Szolgaltatasok
5. Portfolio
6. Nyitvatartas
7. Csapat
8. Uzenetek

Nem primer MVP nav:

- Reviews: kesobbi read-only vagy response flow
- Contact: profile/settings ala
- Gallery: portfolio ala

