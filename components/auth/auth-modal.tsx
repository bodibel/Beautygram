"use client"

import { useEffect, useMemo, useState } from "react"
import { getProviders, signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { registerUser } from "@/lib/actions/auth"
import { resetPasswordRequest } from "@/lib/actions/password-reset"
import { Eye, EyeOff } from "lucide-react"

interface AuthModalProps {
    isOpen: boolean
    onClose: () => void
}

function GoogleIcon() {
    return (
        <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
            <path
                d="M21.805 10.023H12.24v3.955h5.48c-.236 1.273-.958 2.352-2.042 3.072v2.55h3.3c1.932-1.78 3.047-4.4 3.047-7.52 0-.693-.062-1.36-.22-2.057Z"
                fill="#4285F4"
            />
            <path
                d="M12.24 22c2.76 0 5.078-.91 6.77-2.4l-3.3-2.55c-.917.618-2.09.982-3.47.982-2.667 0-4.93-1.8-5.738-4.22H3.09v2.63A10.225 10.225 0 0 0 12.24 22Z"
                fill="#34A853"
            />
            <path
                d="M6.502 13.81a6.133 6.133 0 0 1-.32-1.81c0-.63.115-1.24.32-1.81V7.56H3.09a10.23 10.23 0 0 0 0 8.88l3.412-2.63Z"
                fill="#FBBC05"
            />
            <path
                d="M12.24 5.968c1.502 0 2.847.517 3.908 1.533l2.93-2.93C17.313 2.91 15 2 12.24 2A10.225 10.225 0 0 0 3.09 7.56l3.412 2.63c.808-2.42 3.07-4.22 5.738-4.22Z"
                fill="#EA4335"
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
    const [role, setRole] = useState<"visitor" | "provider">("visitor")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [googleEnabled, setGoogleEnabled] = useState(false)
    const [providersLoaded, setProvidersLoaded] = useState(false)

    useEffect(() => {
        let active = true

        async function loadProviders() {
            try {
                const providers = await getProviders()
                if (!active) return
                setGoogleEnabled(Boolean(providers?.google))
            } catch (providerError) {
                if (!active) return
                setGoogleEnabled(false)
            } finally {
                if (active) {
                    setProvidersLoaded(true)
                }
            }
        }

        if (isOpen) {
            loadProviders()
        }

        return () => {
            active = false
        }
    }, [isOpen])

    const feedbackClassName = useMemo(() => {
        return error.startsWith("Sikeres:")
            ? "mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
            : "mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
    }, [error])

    const handleGoogleLogin = async () => {
        setError("")

        if (!googleEnabled) {
            setError("A Google bejelentkezés jelenleg nincs beállítva.")
            return
        }

        try {
            setLoading(true)
            const callbackUrl = `${window.location.origin}${window.location.pathname}`
            await signIn("google", { callbackUrl })
        } catch (err: any) {
            setError(err?.message || "A Google bejelentkezés nem sikerült.")
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
                router.refresh()
            }
        } catch (err: any) {
            console.error("Login error:", err)
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
            router.refresh()
        } catch (err: any) {
            console.error("Registration error:", err)
            setError(err.message || "Hiba történt a regisztráció során.")
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
                setError("Sikeres: " + result.success)
            }
        } catch (err: any) {
            console.error("Forgot password error:", err)
            setError(err.message || "Hiba történt a művelet során.")
        } finally {
            setLoading(false)
        }
    }

    const googleButtonLabel =
        activeTab === "register" ? "Regisztráció Google-fiókkal" : "Bejelentkezés Google-fiókkal"

    const renderGoogleButton = () => (
        <Button
            type="button"
            variant="outline"
            className="h-12 w-full justify-center gap-3 rounded-xl border border-[#dadce0] bg-white font-medium text-[#3c4043] shadow-none hover:bg-[#f8f9fa] hover:text-[#202124]"
            onClick={handleGoogleLogin}
            disabled={loading || !providersLoaded}
        >
            <GoogleIcon />
            <span>{googleButtonLabel}</span>
        </Button>
    )

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                activeTab === "login"
                    ? "Bejelentkezés"
                    : activeTab === "register"
                      ? "Regisztráció"
                      : "Jelszó visszaállítása"
            }
        >
            <div className="mb-6 flex space-x-2 border-b">
                <button
                    className={`pb-2 px-4 text-sm font-medium transition-colors ${
                        activeTab === "login"
                            ? "border-b-2 border-primary text-primary"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setActiveTab("login")}
                >
                    Bejelentkezés
                </button>
                <button
                    className={`pb-2 px-4 text-sm font-medium transition-colors ${
                        activeTab === "register"
                            ? "border-b-2 border-primary text-primary"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setActiveTab("register")}
                >
                    Regisztráció
                </button>
            </div>

            {error && <div className={feedbackClassName}>{error}</div>}

            {activeTab === "login" ? (
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            placeholder="Email cím"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <div className="relative">
                            <Input
                                placeholder="Jelszó"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab("forgot_password")
                                setError("")
                            }}
                            className="text-xs text-primary hover:underline"
                        >
                            Elfelejtett jelszó?
                        </button>
                    </div>
                    <Button className="w-full" disabled={loading}>
                        {loading ? "Betöltés..." : "Bejelentkezés"}
                    </Button>
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-muted-foreground">Vagy</span>
                        </div>
                    </div>
                    {renderGoogleButton()}
                </form>
            ) : activeTab === "register" ? (
                <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            placeholder="Teljes név"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                        <Input
                            placeholder="Email cím"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <div className="relative">
                            <Input
                                placeholder="Jelszó"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Regisztráció mint:</label>
                        <div className="flex space-x-4">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    name="role"
                                    value="visitor"
                                    checked={role === "visitor"}
                                    onChange={() => setRole("visitor")}
                                    className="accent-primary"
                                />
                                <span>Látogató</span>
                            </label>
                            <label className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    name="role"
                                    value="provider"
                                    checked={role === "provider"}
                                    onChange={() => setRole("provider")}
                                    className="accent-primary"
                                />
                                <span>Szolgáltató</span>
                            </label>
                        </div>
                    </div>
                    <Button className="w-full" disabled={loading}>
                        {loading ? "Regisztráció..." : "Regisztráció"}
                    </Button>
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-muted-foreground">Vagy</span>
                        </div>
                    </div>
                    {renderGoogleButton()}
                </form>
            ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                    <p className="mb-4 text-sm text-muted-foreground">
                        Add meg az email címedet, és küldünk egy linket a jelszavad visszaállításához.
                    </p>
                    <div className="space-y-2">
                        <Input
                            placeholder="Email cím"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <Button className="w-full" disabled={loading}>
                        {loading ? "Küldés..." : "Link küldése"}
                    </Button>
                    <div className="mt-2 flex justify-center">
                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab("login")
                                setError("")
                            }}
                            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                        >
                            Vissza a bejelentkezéshez
                        </button>
                    </div>
                </form>
            )}

            <div className="mt-6 space-y-3 rounded-lg bg-muted p-4 text-xs">
                <p className="mb-2 font-semibold">Teszt fiókok (Gyors betöltés):</p>

                <div className="grid grid-cols-1 gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="h-auto justify-between py-2"
                        onClick={() => {
                            setEmail("admin@glowyspot.com")
                            setPassword("password123")
                        }}
                    >
                        <div className="text-left">
                            <div className="font-medium">Admin</div>
                            <div className="text-[10px] text-muted-foreground">admin@glowyspot.com</div>
                        </div>
                        <span className="ml-2 font-bold text-primary">Betöltés</span>
                    </Button>

                    <Button
                        variant="secondary"
                        size="sm"
                        className="h-auto justify-between py-2"
                        onClick={() => {
                            setEmail("provider1@glowyspot.com")
                            setPassword("password123")
                        }}
                    >
                        <div className="text-left">
                            <div className="font-medium">Szolgáltató</div>
                            <div className="text-[10px] text-muted-foreground">provider1@glowyspot.com</div>
                        </div>
                        <span className="ml-2 font-bold text-primary">Betöltés</span>
                    </Button>

                    <Button
                        variant="secondary"
                        size="sm"
                        className="h-auto justify-between py-2"
                        onClick={() => {
                            setEmail("single_provider@glowyspot.com")
                            setPassword("password123")
                        }}
                    >
                        <div className="text-left">
                            <div className="font-medium">1 Szalonos Szolg.</div>
                            <div className="text-[10px] text-muted-foreground">single_provider@glowyspot.com</div>
                        </div>
                        <span className="ml-2 font-bold text-primary">Betöltés</span>
                    </Button>

                    <Button
                        variant="secondary"
                        size="sm"
                        className="h-auto justify-between py-2"
                        onClick={() => {
                            setEmail("visitor1@glowyspot.com")
                            setPassword("password123")
                        }}
                    >
                        <div className="text-left">
                            <div className="font-medium">Látogató</div>
                            <div className="text-[10px] text-muted-foreground">visitor1@glowyspot.com</div>
                        </div>
                        <span className="ml-2 font-bold text-primary">Betöltés</span>
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
