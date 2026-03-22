import { Resend } from "resend"

const domain = process.env.NEXTAUTH_URL || "https://glowyspot.com"
const emailFrom = process.env.EMAIL_FROM || "noreply@mail.glowyspot.com"

function getResend() {
    return new Resend(process.env.RESEND_API_KEY)
}

export const sendPasswordResetEmail = async (email: string, token: string) => {
    const resetLink = `${domain}/auth/reset-password?token=${token}`

    await getResend().emails.send({
        from: `GlowySpot <${emailFrom}>`,
        to: email,
        subject: "Jelszó visszaállítása",
        html: `
            <h1>Jelszó visszaállítása</h1>
            <p>Kattints az alábbi linkre a jelszavad visszaállításához:</p>
            <a href="${resetLink}">Jelszó visszaállítása</a>
            <p>Ha nem te kérted a jelszó visszaállítását, kérjük hagyd figyelmen kívül ezt az emailt.</p>
        `
    })
}

export const sendWelcomeEmail = async (email: string, name: string) => {
    await getResend().emails.send({
        from: `GlowySpot <${emailFrom}>`,
        to: email,
        subject: "Üdvözlünk a GlowySpot-on!",
        html: `
            <h1>Kedves ${name}!</h1>
            <p>Köszönjük, hogy regisztráltál a GlowySpot oldalán.</p>
            <p>Fedezd fel a legjobb szépségipari szolgáltatásokat a közeledben!</p>
        `
    })
}

const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #FAF4F0;
  padding: 40px 0;
`
const cardStyle = `
  max-width: 560px; margin: 0 auto;
  background: #ffffff; border-radius: 24px;
  padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);
`
const btnStyle = `
  display: inline-block; background: #C87860; color: #fff;
  text-decoration: none; padding: 14px 32px; border-radius: 12px;
  font-weight: 700; font-size: 16px; margin-top: 24px;
`
const footerStyle = `
  text-align: center; color: #9ca3af; font-size: 13px; margin-top: 32px;
`

/** 3 nappal lejárat előtt küldött emlékeztető */
export const sendSubscriptionExpiryWarning = async (
    email: string,
    salonName: string,
    expiresAt: Date,
    plan: string,
    daysLeft: number
) => {
    const formattedDate = expiresAt.toLocaleDateString("hu-HU", {
        year: "numeric", month: "long", day: "numeric"
    })
    const planLabel = plan === "FREE" ? "Ingyenes" : plan === "STANDARD" ? "Standard" : "Prémium"

    await getResend().emails.send({
        from: `GlowySpot <${emailFrom}>`,
        to: email,
        subject: `⚠️ ${daysLeft} nap múlva lejár a(z) "${salonName}" előfizetése`,
        html: `
        <div style="${baseStyle}">
          <div style="${cardStyle}">
            <div style="text-align:center; margin-bottom:28px;">
              <img src="${domain}/logo.png" alt="GlowySpot" style="height:40px;" />
            </div>
            <h2 style="color:#1f2937; margin:0 0 8px;">Előfizetés lejárat közeleg</h2>
            <p style="color:#6b7280; margin:0 0 24px;">
              A(z) <strong>${salonName}</strong> szalon <strong>${planLabel}</strong> előfizetése
              <strong>${daysLeft} nap múlva, ${formattedDate}-én</strong> jár le.
            </p>
            <div style="background:#FEF3C7; border-radius:12px; padding:16px 20px; margin-bottom:24px;">
              <p style="margin:0; color:#92400E; font-size:14px;">
                ⚠️ Ha az előfizetés lejár, a szalon nem lesz látható a GlowySpot oldalán,
                és a vendégek nem fogják tudni megtalálni.
              </p>
            </div>
            <p style="color:#6b7280;">
              A folyamatos megjelenés érdekében kérjük újítsd meg az előfizetésedet időben.
            </p>
            <div style="text-align:center;">
              <a href="${domain}/dashboard/subscription" style="${btnStyle}">
                Előfizetés megújítása
              </a>
            </div>
            <p style="${footerStyle}">
              GlowySpot · Ha nem szeretnél ilyen emaileket kapni, módosítsd az értesítési beállításaidat.
            </p>
          </div>
        </div>
        `
    })
}

/** Előfizetés sikeres megújításakor küldött visszaigazolás */
export const sendSubscriptionRenewalConfirmation = async (
    email: string,
    salonName: string,
    plan: string,
    nextRenewalDate: Date
) => {
    const formattedDate = nextRenewalDate.toLocaleDateString("hu-HU", {
        year: "numeric", month: "long", day: "numeric"
    })
    const planLabel = plan === "STANDARD" ? "Standard (3 990 Ft/hó)" : "Prémium (7 990 Ft/hó)"

    await getResend().emails.send({
        from: `GlowySpot <${emailFrom}>`,
        to: email,
        subject: `✅ Előfizetés megújítva – ${salonName}`,
        html: `
        <div style="${baseStyle}">
          <div style="${cardStyle}">
            <div style="text-align:center; margin-bottom:28px;">
              <img src="${domain}/logo.png" alt="GlowySpot" style="height:40px;" />
            </div>
            <h2 style="color:#1f2937; margin:0 0 8px;">Előfizetés sikeresen megújítva!</h2>
            <p style="color:#6b7280; margin:0 0 24px;">
              A(z) <strong>${salonName}</strong> szalon <strong>${planLabel}</strong> előfizetése
              sikeresen megújult.
            </p>
            <div style="background:#D1FAE5; border-radius:12px; padding:16px 20px; margin-bottom:24px;">
              <p style="margin:0; color:#065F46; font-size:14px;">
                ✅ A következő megújítás dátuma: <strong>${formattedDate}</strong>
              </p>
            </div>
            <p style="color:#6b7280;">
              Köszönjük, hogy a GlowySpot-ot választottad! Szalonod aktív és látható a platformon.
            </p>
            <div style="text-align:center;">
              <a href="${domain}/dashboard" style="${btnStyle}">
                Ugrás a Dashboardra
              </a>
            </div>
            <p style="${footerStyle}">
              GlowySpot · Kérdés esetén írj nekünk: support@glowyspot.com
            </p>
          </div>
        </div>
        `
    })
}
