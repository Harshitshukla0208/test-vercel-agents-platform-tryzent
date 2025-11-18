"use client"
import { X } from 'lucide-react'

type CoinPackage = {
    title: string
    price: string
    originalPrice?: string
    icon: string
    description: string
    buttonColor: string
    recommended?: boolean
    cardBg?: string
    custom?: boolean
}

interface BuyCoinsModalProps {
    open: boolean
    onClose: () => void
    packages: CoinPackage[]
}

export default function BuyCoinsModal({ open, onClose, packages }: BuyCoinsModalProps) {
    if (!open) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Buy LeoCoins</h2>
                            <p className="text-gray-600">Lorem ipsum case Start your journey by exploring classrooms with LeoQui</p>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {packages.map((pkg, index) => (
                            <div key={index} className={`relative rounded-2xl p-6 ${pkg.cardBg || 'bg-white border border-gray-200'}`}>
                                {pkg.recommended && (
                                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                        <span className="bg-yellow-500 text-black px-4 py-1 rounded-full text-sm font-semibold">
                                            RECOMMENDED
                                        </span>
                                    </div>
                                )}

                                <div className="text-center mb-4">
                                    <div className="text-4xl mb-3">{pkg.icon}</div>
                                    <h3 className="text-xl font-bold mb-2">{pkg.title}</h3>
                                    <div className="flex items-center justify-center space-x-2">
                                        <span className="text-2xl font-bold text-[#714B90]">{pkg.price}</span>
                                        {pkg.originalPrice && (
                                            <span className="text-lg text-gray-500 line-through">{pkg.originalPrice}</span>
                                        )}
                                    </div>
                                </div>

                                <p className="text-sm text-gray-600 mb-6 text-center">
                                    {pkg.description}
                                </p>

                                {pkg.custom ? (
                                    <input
                                        type="number"
                                        placeholder="Enter number"
                                        className="w-full mb-4 p-3 border border-gray-300 rounded-lg"
                                    />
                                ) : null}

                                <button className={`w-full py-3 rounded-lg font-semibold transition-colors ${pkg.buttonColor} text-white`}>
                                    Buy now
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
