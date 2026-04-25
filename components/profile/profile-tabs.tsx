export function ProfileTabs({ activeTab, onChange, isTeam }: { activeTab: string, onChange: (tab: string) => void, isTeam?: boolean }) {
    const tabs = [
        { id: "posts", label: "Bejegyzések" },
        { id: "services", label: "Szolgáltatások" },
        { id: "gallery", label: "Galéria" },
        { id: "reviews", label: "Értékelések" },
        { id: "about", label: isTeam ? "Csapatunk" : "Rólam" },
    ]

    return (
        <div className="bg-white">
            <div className="w-full overflow-x-auto px-4 scrollbar-hide">
                <div className="flex min-w-max gap-3 border-b border-gray-100 sm:justify-center sm:gap-8">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => onChange(tab.id)}
                            className={`whitespace-nowrap py-4 text-sm font-bold border-b-[3px] transition-colors ${activeTab === tab.id
                                ? "border-primary text-gray-900"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
