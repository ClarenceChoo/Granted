import React from 'react'

// Import all grant logos from the assets/grants folder using Vite's glob
// Use an absolute /src path and eager for broader compatibility in Vite
const modules = import.meta.glob('/src/assets/grants/*.{png,jpg,jpeg,svg,avif,webp}', { eager: true })
const images: string[] = Object.values(modules).map((m: any) => {
    // When eager, Vite returns module objects with a default export for assets
    if (m && typeof m === 'object' && 'default' in m) return (m as any).default
    return m as any
})

export default function GrantsCarousel() {
    // Debug: log images discovered so we can see runtime results
    if (typeof window !== 'undefined') console.debug('GrantsCarousel images:', images)

    if (!images || images.length === 0) {
        return (
            <div className="grants-marquee">
                <div className="marquee-track">
                    <div className="marquee-item">No grant logos found ({images.length})</div>
                </div>
            </div>
        )
    }

    // Duplicate the images so the marquee can loop seamlessly
    const display = [...images, ...images]

    return (
        <div className="grants-marquee">
            <div className="marquee-track">
                {display.map((src, idx) => (
                    <div className="marquee-item" key={`${idx}-${src}`}>
                        <img src={src} alt={`grant-logo-${idx}`} className="max-h-12 grayscale opacity-90 hover:grayscale-0 hover:opacity-100 transition-all" />
                    </div>
                ))}
            </div>
        </div>
    )
}
