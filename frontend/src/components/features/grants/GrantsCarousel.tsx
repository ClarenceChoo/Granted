import React from 'react'

// Import all grant logos from the assets/grants folder using Vite's glob.
// Use Vite's absolute alias for asset globbing, which works from any file location
const modules = import.meta.glob('/src/assets/grants/*.svg', { eager: true }) as Record<string, any>
const images: string[] = Object.values(modules).map((m: any) => {
    if (m && typeof m === 'object' && 'default' in m) return (m as any).default
    return m as any
})

// Debug discovered keys at runtime
if (typeof window !== 'undefined') {
    console.debug('GrantsCarousel module keys:', Object.keys(modules))
    console.debug('GrantsCarousel images loaded:', images.length, images)
}

export default function GrantsCarousel() {
    // Debug: log images discovered so we can see runtime results
    if (typeof window !== 'undefined') console.debug('GrantsCarousel images:', images)

    if (!images || images.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="grants-marquee">
                    <div className="marquee-track">
                        <div className="marquee-item text-slate-500">No grant logos found ({images.length})</div>
                    </div>
                </div>
                <div className="text-red-500 text-center mt-2 text-sm">
                    (Debug: Carousel fallback rendered)
                </div>
            </div>
        )
    }

    // Duplicate the images so the marquee can loop seamlessly
    const display = [...images, ...images]

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-6 px-4">
            <div className="grants-marquee">
                <div className="marquee-track">
                    {display.map((src, idx) => (
                        <div className="marquee-item" key={`${idx}-${src}`}>
                            <img src={src} alt={`grant-logo-${idx}`} className="h-12 w-auto grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
