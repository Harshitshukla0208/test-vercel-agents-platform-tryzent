// components/Tabs.tsx
'use client';

import { useState } from 'react';

interface Tab {
    id: string;
    label: string;
    content: React.ReactNode;
}

interface TabsProps {
    tabs: Tab[];
    defaultTab?: string;
}

export function Tabs({ tabs, defaultTab }: TabsProps) {
    const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

    return (
        <div className="w-full">
            {/* Tab Headers - Now takes full width */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="flex w-full" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                flex-1 px-2 py-1 text-sm font-medium rounded-t-lg transition-all
                ${activeTab === tab.id
                                    ? 'bg-[#714B90] text-white shadow-md'
                                    : 'text-gray-600 hover:text-[#714B90] hover:bg-gray-50'
                                }
                `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-4">
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        className={activeTab === tab.id ? 'block' : 'hidden'}
                    >
                        {tab.content}
                    </div>
                ))}
            </div>
        </div>
    );
}