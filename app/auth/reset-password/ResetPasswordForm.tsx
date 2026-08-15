"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { resetPassword } from "@/lib/actions/password-reset"
import { Eye, EyeOff } from "lucide-react"

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "Hiba történt a jelszó visszaállítása során."
}

export function ResetPasswordForm() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const token = searchParams.get("token")

    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!token) {
            setError("Érvénytelen vagy hiányzó token!")
            return
        }

        if (password !== confirmPassword) {
            setError("A jelszavak nem egyeznek!")
            return
        }

        if (password.length < 6) {
            setError("A jelszónak legalább 6 karakter hosszúnak kell lennie.")
            return
        }

        setError("")
        setSuccess("")
        setLoading(true)

        try {
            const result = await resetPassword(password, token)
            if (result.error) {
                setError(result.error)
            } else if (result.success) {
                setSuccess(result.success)
                setPassword("")
                setConfirmPassword("")
                setTimeout(() => {
                    router.push("/")
                }, 3000)
            }
        } catch (error) {
            setError(getErrorMessage(error))
        } finally {
            setLoading(false)
        }
    }

    if (!token) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-md text-sm text-center">
                Hiányzó token. A jelszó visszaállítása nem folytatható.
            </div>
        )
    }

    if (success) {
        return (
            <div className="p-4 bg-green-50 text-green-600 border border-green-200 rounded-md text-sm text-center">
                <p className="font-semibold mb-2">{success}</p>
                <p>Átirányítás a főoldalra...</p>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 bg-card border rounded-xl p-6 shadow-sm">
            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md">{error}</div>}
            
            <div className="space-y-2">
                <label className="text-sm font-medium">Új jelszó</label>
                <div className="relative">
                    <Input
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
            <div className="space-y-2">
                <label className="text-sm font-medium">Új jelszó megerősítése</label>
                <div className="relative">
                    <Input
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
            <Button className="w-full" disabled={loading}>
                {loading ? "Mentés..." : "Jelszó mentése"}
            </Button>
        </form>
    )
}
