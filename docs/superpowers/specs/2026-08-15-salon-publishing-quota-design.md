# Szalon publikálási kvóta és admin konfiguráció — design

Dátum: 2026-08-15
Státusz: jóváhagyott terv, megvalósításra vár
Csomag: **C** (kvóta-házirend, admin konfiguráció, türelmi idő)
Előzmény: **A + B** — [`2026-08-15-salon-publishing-state-design.md`](2026-08-15-salon-publishing-state-design.md), megvalósítva
Következő: **D** — fizetési szolgáltató, **nyitva hagyva** (a szolgáltató még nincs eldöntve)

---

## 1. Kiindulás és cél

Az A+B csomag bevezette a szalonok publikálási állapotát, és a `canPublishSalon()` házirendet mint a fizetős fázisok varratát. A házirend jelenleg mindig engedélyez.

Ez a csomag adja meg a valódi tartalmát, és teszi adminból kapcsolhatóvá a három termékfázist:

| Fázis | Szabály |
| --- | --- |
| 1 (jelenlegi, felfutás) | Minden szalon ingyenesen publikálható. |
| 2 | Az első szalon ingyenes, a további szalonok **publikálása** fizetős. |
| 3 | Az első szalon X napig ingyenes, utána az is fizetős. |

A szalon **létrehozása minden fázisban ingyenes marad** — csak a publikálás korlátozott.

**A fizetési szolgáltató kifejezetten nincs eldöntve.** Ez a csomag ezért semmilyen szolgáltató-specifikus kódot vagy adatmezőt nem vezet be, és úgy készül, hogy a D csomag szabadon választhasson (Stripe, Barion, SimplePay vagy más).

---

## 2. Termékdöntések

| Kérdés | Döntés |
| --- | --- |
| Konfigurálható paraméterek | Négy: `billingEnabled`, `freeSalonSlots`, `freeSlotTrialDays`, `gracePeriodDays` |
| A további szalonok próbaideje | Nincs. A keret feletti szalonok azonnal fizetősek. |
| Ki választja ki az ingyenes helyet | A szolgáltató, a **meglévő publikálási kapcsolóval**. Nincs új folyamat. |
| Ha a türelmi idő végén nem választott | A `publishedAt` szerinti **legrégebben publikált** szalon marad, a többi kvóta-tiltást kap. |
| Értesítő emailek | **Most nincsenek.** A jelzés kizárólag a felületen történik. |
| Fizetési szolgáltató | Nyitva. Ez a csomag csak a beillesztési pontot készíti elő. |

---

## 3. Adatmodell

### 3.1 `SubscriptionConfig` bővítés

```prisma
model SubscriptionConfig {
  // ... meglévő mezők

  billingEnabled Boolean @default(false)

  // ÚJ — mikor kapcsolták be a számlázást. A türelmi idő ebből számolódik.
  // A mezőt kizárólag az admin konfigurációs action írja, a kapcsoló felfutó élén.
  billingEnabledAt DateTime?

  // ÚJ — hány szalont publikálhat ingyen egy szolgáltató.
  freeSalonSlots Int @default(1)

  // ÚJ — meddig tart az ingyenes hely, napokban. 0 = korlátlan ideig.
  // 2. fázis: 0. 3. fázis: a kívánt napszám.
  freeSlotTrialDays Int @default(0)

  // ÚJ — türelmi idő a szabály szigorításakor, napokban.
  gracePeriodDays Int @default(30)
}
```

A türelmi idő szándékosan a konfigurációból számolódik, nem szalononkénti mezőből: egyetlen igazságforrás, és a fázisváltás nem igényel tömeges adatírást.

### 3.2 A `publishBlockedReason` új értéke

A mező eddigi értékkészlete `null | "BILLING" | "ADMIN"` kiegészül a `"QUOTA"` értékkel.

**Miért nem az `isPublished`-et állítja a kvóta-érvényesítés?** Mert az `isPublished` a *tulajdonos szándékának* mezője, és az A+B csomag alapszabálya, hogy minden jelzőnek pontosan egy írója van. Ha a rendszer írná, ugyanaz az összemosás keletkezne, amit az előző csomag felszámolt. A `"QUOTA"` tiltással:

- a szolgáltató látja, hogy nem ő vette le a szalont, hanem a keret telt be,
- a szándéka érintetlen marad, tehát a fizetés vagy a keret bővítése után a szalon magától visszatér,
- a publikus láthatóság változtatás nélkül működik, mert a `PUBLIC_SALON_WHERE` már ma is `publishBlockedReason: null`-t követel.

---

## 4. Komponensek

### 4.1 `lib/salon-publishing.ts` — a házirend valódi tartalma

A jelenlegi, mindig engedélyező `canPublishSalon()` megkapja a kvóta-logikát:

```ts
export async function canPublishSalon(
    ownerId: string,
    salonId?: string
): Promise<PublishPolicyResult>
```

**Mit csinál:**

1. `billingEnabled === false` → engedélyez (1. fázis, változatlan viselkedés).
2. Türelmi időn belül vagyunk → engedélyez. A türelmi idő vége: `billingEnabledAt + gracePeriodDays`.
3. A szalonnak van érvényes fizetett előfizetése → engedélyez.
4. Egyébként megszámolja a szolgáltató jelenleg publikált szalonjait (a most publikálandót nem beszámítva), és engedélyez, ha ez kevesebb, mint `freeSalonSlots`.
5. Ha az ingyenes hely lejárt (`freeSlotTrialDays > 0` és a szalon `publishedAt`-je régebbi ennél) → elutasít.

**Új segédfüggvények ugyanebben a modulban:**

```ts
/** Hol tart a szolgáltató az ingyenes kerettel? A felület ezt jeleníti meg. */
export async function getSalonQuotaStatus(ownerId: string): Promise<{
    billingEnabled: boolean
    freeSlots: number
    usedSlots: number
    inGracePeriod: boolean
    graceEndsAt: Date | null
}>

/** Van-e a szalonnak érvényes fizetett előfizetése? */
export async function hasActivePaidSubscription(salonId: string): Promise<boolean>
```

**A D csomag beillesztési pontja a `hasActivePaidSubscription()`.** Jelenleg a `Subscription` rekord `plan` és `status` mezőiből dönt (`plan !== FREE && status === ACTIVE`), fizetési szolgáltató nélkül tehát gyakorlatilag mindig `false`. Amikor a D megérkezik, ez az egyetlen függvény változik — sem a házirend, sem a hívási helyek nem.

### 4.2 `lib/actions/subscription-config.ts` (új)

Admin szerver action-ök a konfiguráció olvasásához és írásához.

```ts
export async function getSubscriptionConfigAdmin()
export async function updateSubscriptionConfig(data: {
    billingEnabled?: boolean
    freeSalonSlots?: number
    freeSlotTrialDays?: number
    gracePeriodDays?: number
}): Promise<{ success: boolean; error?: string }>
```

**Mit csinál:** `requireAdminSession()` guard mögött olvassa és írja a singleton konfigurációt. A `billingEnabled` `false → true` váltásakor beállítja a `billingEnabledAt` értékét; `true → false` váltáskor `null`-ra állítja, hogy egy későbbi visszakapcsolás új türelmi időt indítson.

Validáció: mindhárom szám nem lehet negatív, a `freeSalonSlots` legalább 0. Minden változtatás naplózásra kerül `ADMIN_BILLING_CONFIG_UPDATE` eseménnyel, a régi és az új értékkel a metaadatban.

### 4.3 Kvóta-érvényesítő cron

`app/api/cron/enforce-publishing-quota/route.ts` — a meglévő cron-mintát követve, fail-closed `CRON_SECRET` ellenőrzéssel.

**Mit csinál:** ha a `billingEnabled` be van kapcsolva és a türelmi idő lejárt, szolgáltatónként megkeresi a keret feletti publikált szalonokat, és a `publishedAt` szerinti legrégebbieket meghagyva a többire `publishBlockedReason = "QUOTA"`, `publishBlockedAt = now` értéket ír. A fizetett előfizetéssel rendelkező szalonok mindig mentesülnek, és nem számítanak bele az ingyenes keretbe.

Minden tiltás naplózásra kerül `SALON_QUOTA_BLOCKED` eseménnyel.

Idempotens: ismételt futtatás nem változtat semmit, ha a keret már rendben van.

### 4.4 Naplózási események

Új `AUDIT_ACTIONS` kulcsok: `ADMIN_BILLING_CONFIG_UPDATE`, `SALON_QUOTA_BLOCKED`.

### 4.5 Felhasználói felület

| Hely | Változás |
| --- | --- |
| `/dashboard/admin/settings` | Új szerkesztő a négy beállításhoz. A `billingEnabled` bekapcsolása megerősítést kér, és megmutatja, mikor jár le a türelmi idő. |
| `/dashboard/salons` | A keret állása („1 / 1 ingyenes hely"), türelmi idő esetén a visszaszámlálás, kvóta-tiltott szalonnál a magyarázat. |
| Publikálási kapcsoló | Kvóta miatti elutasításkor beszédes üzenet: mennyi a keret, és mit tehet a szolgáltató. |

A `salon-publish-toggle.tsx` már ma is megjeleníti a `publishBlockedReason` szerinti indoklást — csak a `"QUOTA"` ágat kell hozzáadni.

---

## 5. A korábban talált Ú4 hiba javítása

A meglévő `app/api/cron/subscription-reminders` végpont nincs a `billingEnabled` mögé kapuzva. Mivel a `createSalon` minden új szalonnak `freeTrialDays` (alapértelmezés: 60) napos lejáratot ad az `initSubscription`-ön keresztül, körülbelül két hónap múlva valós szolgáltatók kapnának lejárati figyelmeztetést arról, hogy a szalonjuk nem lesz látható — holott az 1. fázisban ennek semmilyen következménye nincs, mert az `expireFreeSalons` kikapcsolt állapotban nem csinál semmit.

**Javítás:** a cron a `billingEnabled` kapcsolóhoz kötve. Kikapcsolt állapotban azonnal visszatér, email nélkül.

A `components/dashboard/SubscriptionBadge.tsx` szintén mutat lejárati állapotot, de **jelenleg sehonnan nincs meghívva** — holt kód. Ezért nem képezi részét ennek a csomagnak; ha később bekötik a felületre, akkor kell a kapcsoló mögé tenni. A tényt a csomag zárásakor rögzíteni kell a nyitott pontok között.

Ez nem új funkció, hanem egy ismert hiba lezárása, és szorosan ide tartozik.

---

## 6. Adatfolyam

**Fázisváltás:** admin bekapcsolja a `billingEnabled`-et → `billingEnabledAt = now` → a türelmi idő elindul → `canPublishSalon` a türelmi idő alatt még mindent engedélyez → a felület megmutatja a visszaszámlálást.

**A türelmi idő lejárta:** cron → szolgáltatónként a legrégebben publikált `freeSalonSlots` darab szalon marad → a többire `publishBlockedReason = "QUOTA"` → eltűnnek a publikus felületről, de az `isPublished` érintetlen marad.

**Publikálási kísérlet betelt kerettel:** `publishSalon` → `canPublishSalon` elutasít → naplóbejegyzés `SALON_PUBLISH_BLOCKED` → a felület megmutatja, hogy előbb le kell venni egy másik szalont.

**Ha a D megérkezik:** a `hasActivePaidSubscription()` igazat ad a fizetett szalonokra → azok mentesülnek a kvóta alól → a `publishBlockedReason = "QUOTA"` feloldható, és az `isPublished` érintetlen szándéka miatt a szalon magától visszatér a publikus felületre.

---

## 7. Hibakezelés

- **A házirend sosem akaszthatja meg a szalon létrehozását.** A `createSalon` már ma try/catch-be zárja a hívást, és hiba esetén publikálatlanul hozza létre a szalont. Ez a viselkedés megmarad.
- **Konfigurációs hiba esetén a rendszer megengedő.** Ha a konfiguráció nem olvasható, a házirend engedélyez — a jelenlegi, ingyenes fázis a biztonságos alapértelmezés. Fizetőfal mögé zárni az ügyfeleket egy adatbázis-hiba miatt rosszabb kimenet, mint átmenetileg többet engedni.
- **A kvóta-cron részleges hibája nem áshatja alá az egészet:** szolgáltatónként dolgozik, és egy szolgáltatón belüli hiba nem akadályozza a többit.
- **A felület nem közöl pontatlan keretet:** ha a kvóta állapota nem lekérdezhető, a jelzés elrejtődik, nem téves számot mutat.

---

## 8. Tesztelés

Vitest, a meglévő minta szerint (mockolt Prisma, valódi házirend-logika).

| Terület | Eset |
| --- | --- |
| Házirend, 1. fázis | `billingEnabled = false` → mindig engedélyez, tetszőleges szalonszámnál |
| Házirend, türelmi idő | A türelmi időn belül engedélyez akkor is, ha a keret betelt |
| Házirend, keret | A keret alatt engedélyez, betelt keretnél elutasít, beszédes indoklással |
| Házirend, fizetett szalon | Fizetett előfizetésű szalon a keret felett is publikálható, és nem fogyasztja az ingyenes helyet |
| Házirend, lejárt ingyenes hely | `freeSlotTrialDays > 0` és régebbi `publishedAt` → elutasít |
| Konfiguráció | Nem admin nem írhatja; a `billingEnabledAt` a felfutó élen íródik, visszakapcsoláskor nullázódik; negatív érték elutasítva |
| Kvóta-cron | Kikapcsolt számlázásnál és türelmi időn belül nem módosít semmit |
| Kvóta-cron | A legrégebben publikált marad, a többi `"QUOTA"` tiltást kap; az `isPublished` **nem** módosul |
| Kvóta-cron | Idempotens: második futtatás nem változtat |
| Emlékeztető cron | `billingEnabled = false` esetén nem küld emailt |

A kritikus védelmeket mutációs próbával kell igazolni: szándékosan elrontani az ellenőrzést, és megnézni, hogy a teszt valóban bukik-e. Az előző csomagban kétszer fordult elő, hogy egy teszt rossz okból ment át.

---

## 9. Hatókörön kívül

- **Bármilyen fizetési szolgáltató** (D csomag): checkout, webhook, számlázási időszakok, sikertelen fizetés, lemondás, ügyfélportál.
- **Értesítő emailek a türelmi időről** — a projektgazda döntése szerint most csak felületi jelzés van.
- **A `Subscription` modell szolgáltató-specifikus mezői** (`stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`, valamint a `SubscriptionConfig` Stripe-kulcsai): ezek a sémában maradnak érintetlenül, de ez a csomag nem használja és nem bővíti őket. A D csomag dönti el, hogy megtartja, átnevezi vagy szolgáltató-semlegesre cseréli őket.
- **Árak és csomagszintek** (Standard/Prémium tartalma): terméki döntés, a D csomaghoz tartozik.

---

## 10. Következő lépés

Megvalósítási terv készítése a `writing-plans` skillel.
