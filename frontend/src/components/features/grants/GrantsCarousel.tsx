// Grant organisation logos carousel
// Using explicit imports for reliability

// Import all grant logos explicitly
import org1 from '../../../assets/grants/organisation 1.svg'
import org2 from '../../../assets/grants/organisation 2.svg'
import org3 from '../../../assets/grants/organisation 3.svg'
import org4 from '../../../assets/grants/organisation 4.svg'
import org5 from '../../../assets/grants/organisation 5.svg'
import org6 from '../../../assets/grants/organisation 6.svg'
import org7 from '../../../assets/grants/organisation 7.svg'
import org8 from '../../../assets/grants/organisation 8.svg'
import org9 from '../../../assets/grants/organisation 9.svg'
import org10 from '../../../assets/grants/organisation 10.svg'
import org11 from '../../../assets/grants/organisation 11.svg'
import org12 from '../../../assets/grants/organisation 12.svg'
import org13 from '../../../assets/grants/organisation 13.svg'
import org14 from '../../../assets/grants/organisation 14.svg'
import org15 from '../../../assets/grants/organisation 15.svg'
import org16 from '../../../assets/grants/organisation 16.svg'
import org17 from '../../../assets/grants/organisation 17.svg'

const images: string[] = [
    org1, org2, org3, org4, org5, org6, org7, org8, org9,
    org10, org11, org12, org13, org14, org15, org16, org17
]

export default function GrantsCarousel() {
    // Duplicate the images so the marquee can loop seamlessly
    const display = [...images, ...images]

    return (
        <div className="grants-marquee">
            <div className="marquee-track">
                {display.map((src, idx) => (
                    <div className="marquee-item" key={idx}>
                        <img src={src} alt={`organisation-logo-${idx}`} className="h-20 w-auto opacity-90 hover:opacity-100 transition-all" />
                    </div>
                ))}
            </div>
        </div>
    )
}
