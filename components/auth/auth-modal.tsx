"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { registerUser } from "@/lib/actions/auth"
import { resetPasswordRequest } from "@/lib/actions/password-reset"
import { cn } from "@/lib/utils"

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback
}

interface AuthModalProps {
    isOpen: boolean
    onClose: () => void
}

const inputClassName =
    "h-12 rounded-2xl border-border-subtle bg-surface px-4 text-sm shadow-sm focus-visible:ring-accent-primary"

const iconButtonClassName =
    "absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary transition-colors hover:text-text-primary"

const shouldShowQuickProfiles = process.env.NODE_ENV !== "production"
const postLoginHref = "/dashboard/account"

interface QuickProfile {
    name: string
    role: string
    email: string
    password: string
}

const quickProfiles: QuickProfile[] = [
    {
        name: "Teszt Látogató",
        role: "Látogató",
        email: "visitor1@glowyspot.com",
        password: "password123",
    },
    {
        name: "Szolgáltató",
        role: "Több szalon",
        email: "provider1@glowyspot.com",
        password: "password123",
    },
    {
        name: "Egy szalonos szolgáltató",
        role: "Egy szalon",
        email: "single_provider@glowyspot.com",
        password: "password123",
    },
    {
        name: "Admin",
        role: "Admin",
        email: "admin@glowyspot.com",
        password: "password123",
    },
]

function GoogleLogo() {
    return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
                fill="#4285F4"
                d="M21.6 12.23c0-.76-.07-1.49-.19-2.19H12v4.14h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.31 2.98-7.48Z"
            />
            <path
                fill="#34A853"
                d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.59A10 10 0 0 0 12 22Z"
            />
            <path
                fill="#FBBC05"
                d="M6.41 13.9A6 6 0 0 1 6.1 12c0-.66.11-1.3.31-1.9V7.51H3.06A10 10 0 0 0 2 12c0 1.61.39 3.13 1.06 4.49l3.35-2.59Z"
            />
            <path
                fill="#EA4335"
                d="M12 5.98c1.47 0 2.79.51 3.83 1.5l2.86-2.86C16.96 3.01 14.7 2 12 2a10 10 0 0 0-8.94 5.51l3.35 2.59C7.2 7.74 9.4 5.98 12 5.98Z"
            />
        </svg>
    )
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<"login" | "register" | "forgot_password">("login")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [name, setName] = useState("")
    const role = "visitor" as const
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const handleQuickProfileLogin = async (profile: QuickProfile) => {
        setError("")
        setEmail(profile.email)
        setPassword(profile.password)
        setLoading(true)

        try {
            const result = await signIn("credentials", {
                email: profile.email,
                password: profile.password,
                redirect: false,
            })

            if (result?.error) {
                setError("Nem sikerült belépni ezzel a teszt profillal.")
                return
            }

            onClose()
            router.push(postLoginHref)
            router.refresh()
        } catch (error) {
            console.error("Quick profile login error:", error)
            setError(getErrorMessage(error, "Hiba történt a gyors belépés során."))
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleLogin = async () => {
        try {
            setLoading(true)
            await signIn("google", { callbackUrl: postLoginHref })
        } catch (error) {
            setError(getErrorMessage(error, "Hiba történt a Google bejelentkezés során."))
        } finally {
            setLoading(false)
        }
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            })

            if (result?.error) {
                setError("Hibás email vagy jelszó!")
            } else {
                onClose()
                router.push(postLoginHref)
                router.refresh()
            }
        } catch (error) {
            console.error("Login error:", error)
            setError("Hiba történt a bejelentkezés során.")
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            setError("A jelszavak nem egyeznek!")
            return
        }

        setError("")
        setLoading(true)

        try {
            const regResult = await registerUser({
                email,
                name,
                role,
                password,
            })

            if (regResult.error) {
                setError(regResult.error)
                setLoading(false)
                return
            }

            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            })

            if (result?.error) {
                setError("Hiba a bejelentkezésnél a regisztráció után.")
                return
            }

            onClose()
            router.push(postLoginHref)
            router.refresh()
        } catch (error) {
            console.error("Registration error:", error)
            setError(getErrorMessage(error, "Hiba történt a regisztráció során."))
        } finally {
            setLoading(false)
        }
    }

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) {
            setError("Kérjük, add meg az email címedet!")
            return
        }

        setError("")
        setLoading(true)

        try {
            const result = await resetPasswordRequest(email)
            if (result.error) {
                setError(result.error)
            } else {
                setError(`Sikeres: ${result.success}`)
            }
        } catch (error) {
            console.error("Forgot password error:", error)
            setError(getErrorMessage(error, "Hiba történt a művelet során."))
        } finally {
            setLoading(false)
        }
    }

    const title =
        activeTab === "login"
            ? "Bejelentkezés"
            : activeTab === "register"
                ? "Regisztráció"
                : "Jelszó visszaállítása"

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-5">
                {activeTab !== "forgot_password" && (
                    <div className="grid grid-cols-2 rounded-full bg-surface-muted p-1">
                        <button
                            type="button"
                            className={cn(
                                "min-h-11 rounded-full text-sm font-bold transition-colors",
                                activeTab === "login"
                                    ? "bg-surface text-accent-primary shadow-soft"
                                    : "text-text-secondary hover:text-text-primary"
                            )}
                            onClick={() => setActiveTab("login")}
                        >
                            Bejelentkezés
                        </button>
                        <button
                            type="button"
                            className={cn(
                                "min-h-11 rounded-full text-sm font-bold transition-colors",
                                activeTab === "register"
                                    ? "bg-surface text-accent-primary shadow-soft"
                                    : "text-text-secondary hover:text-text-primary"
                            )}
                            onClick={() => setActiveTab("register")}
                        >
                            Regisztráció
                        </button>
                    </div>
                )}

                {error && (
                    <div
                        className={cn(
                            "rounded-2xl border px-4 py-3 text-sm font-semibold",
                            error.startsWith("Sikeres:")
                                ? "border-success/25 bg-success/10 text-success"
                                : "border-danger/25 bg-danger/10 text-danger"
                        )}
                    >
                        {error}
                    </div>
                )}

                {activeTab === "login" ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-3">
                            <Input
                                placeholder="Email cím"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className={inputClassName}
                            />
                            <div className="relative">
                                <Input
                                    placeholder="Jelszó"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className={cn(inputClassName, "pr-12")}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className={iconButtonClassName}
                                    aria-label={showPassword ? "Jelszó elrejtése" : "Jelszó megjelenítése"}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => { setActiveTab("forgot_password"); setError("") }}
                                className="text-xs font-bold text-accent-primary hover:text-primary-hover"
                            >
                                Elfelejtett jelszó?
                            </button>
                        </div>

                        <Button className="h-12 w-full rounded-full font-bold" disabled={loading}>
                            {loading ? "Betöltés..." : "Bejelentkezés"}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            className="h-12 w-full gap-3 rounded-full border-border-subtle bg-white font-bold text-text-primary shadow-sm hover:bg-surface-muted"
                            onClick={handleGoogleLogin}
                        >
                            <GoogleLogo />
                            Bejelentkezés Google fiókkal
                        </Button>

                        {shouldShowQuickProfiles && (
                            <div className="space-y-3 rounded-3xl border border-border-subtle bg-surface-muted/70 p-3">
                                <div>
                                    <p className="text-sm font-bold text-text-primary">Gyors teszt profilok</p>
                                    <p className="text-xs text-text-secondary">
                                        Válassz egy profilt, és beléptetünk a lokális teszt fiókkal.
                                    </p>
                                </div>
                                <div className="grid gap-2">
                                    {quickProfiles.map((profile) => (
                                        <button
                                            key={profile.email}
                                            type="button"
                                            disabled={loading}
                                            onClick={() => handleQuickProfileLogin(profile)}
                                            className="flex items-center justify-between rounded-2xl border border-border-subtle bg-white px-4 py-3 text-left shadow-sm transition-colors hover:border-accent-primary/40 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <span>
                                                <span className="block text-sm font-bold text-text-primary">
                                                    {profile.name}
                                                </span>
                                                <span className="block text-xs text-text-secondary">
                                                    {profile.email}
                                                </span>
                                            </span>
                                            <span className="rounded-full bg-accent-primary/10 px-3 py-1 text-xs font-bold text-accent-primary">
                                                {profile.role}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </form>
                ) : activeTab === "register" ? (
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-3">
                            <Input
                                placeholder="Teljes név"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className={inputClassName}
                            />
                            <Input
                                placeholder="Email cím"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className={inputClassName}
                            />
                            <div className="relative">
                                <Input
                                    placeholder="Jelszó"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className={cn(inputClassName, "pr-12")}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className={iconButtonClassName}
                                    aria-label={showPassword ? "Jelszó elrejtése" : "Jelszó megjelenítése"}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <div className="relative">
                                <Input
                                    placeholder="Jelszó megerősítése"
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className={cn(inputClassName, "pr-12")}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className={iconButtonClassName}
                                    aria-label={showConfirmPassword ? "Jelszó elrejtése" : "Jelszó megjelenítése"}
                                >
                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <Button className="h-12 w-full rounded-full font-bold" disabled={loading}>
                            {loading ? "Regisztráció..." : "Regisztráció"}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            className="h-12 w-full gap-3 rounded-full border-border-subtle bg-white font-bold text-text-primary shadow-sm hover:bg-surface-muted"
                            onClick={handleGoogleLogin}
                        >
                            <GoogleLogo />
                            Regisztráció Google fiókkal
                        </Button>
                    </form>
                ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                        <p className="text-sm leading-6 text-text-secondary">
                            Add meg az email címedet, és küldünk egy linket a jelszavad visszaállításához.
                        </p>
                        <Input
                            placeholder="Email cím"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className={inputClassName}
                        />
                        <Button className="h-12 w-full rounded-full font-bold" disabled={loading}>
                            {loading ? "Küldés..." : "Link küldése"}
                        </Button>
                        <button
                            type="button"
                            onClick={() => { setActiveTab("login"); setError("") }}
                            className="mx-auto block text-sm font-bold text-text-secondary hover:text-text-primary"
                        >
                            Vissza a bejelentkezéshez
                        </button>
                    </form>
                )}
            </div>
        </Modal>
    )
}
