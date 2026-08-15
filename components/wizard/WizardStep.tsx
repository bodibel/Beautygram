"use client"

interface WizardStepProps {
    title: string
    description: string
    tips?: string[]
    children: React.ReactNode
    isWelcome?: boolean
}

export function WizardStep({ title, description, tips, children, isWelcome }: WizardStepProps) {
    if (isWelcome) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-12 px-8">
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center mb-6">
                    <span className="text-4xl">✨</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">{title}</h2>
                <p className="text-lg text-gray-600 max-w-md mb-8">{description}</p>
                {children}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-6">
            {/* Left: Description */}
            <div className="lg:col-span-1 space-y-4">
                <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                <p className="text-gray-600 leading-relaxed">{description}</p>
                {tips && tips.length > 0 && (
                    <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
                        <h4 className="font-semibold text-primary mb-2 text-sm">💡 Tippek</h4>
                        <ul className="text-sm text-primary space-y-1">
                            {tips.map((tip, i) => (
                                <li key={i}>• {tip}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            {/* Right: Form Fields */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    {children}
                </div>
            </div>
        </div>
    )
}
