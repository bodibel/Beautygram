/**
 * Jelszóházirend.
 *
 * Szándékosan külön, "use server" jelölés nélküli modul, hogy a szerver action-ök,
 * a kliens oldali űrlapok és a tesztek ugyanazt a szabályt használhassák.
 */

export const MIN_PASSWORD_LENGTH = 8

/**
 * Visszaadja a hibaüzenetet, ha a jelszó nem felel meg a házirendnek,
 * vagy `null`-t, ha megfelel.
 */
export function validatePassword(password: string): string | null {
    if (password.length < MIN_PASSWORD_LENGTH) {
        return `A jelszónak legalább ${MIN_PASSWORD_LENGTH} karakter hosszúnak kell lennie.`
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
        return "A jelszónak tartalmaznia kell legalább egy betűt és egy számot."
    }
    return null
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
    return EMAIL_PATTERN.test(email)
}
