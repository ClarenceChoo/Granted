import { BookOpen, FileText, Video, Download } from 'lucide-react'

export default function Resources() {
    const resources = [
        {
            id: 1,
            title: 'Grant Writing 101',
            type: 'Guide',
            description: 'A comprehensive guide to crafting compelling grant proposals for Singapore government funds.',
            icon: BookOpen,
            color: 'bg-indigo-100 text-indigo-600'
        },
        {
            id: 2,
            title: 'Budget Planning Template',
            type: 'Template',
            description: 'Excel template for projecting grant expenditure and manpower costs.',
            icon: Download,
            color: 'bg-emerald-100 text-emerald-600'
        },
        {
            id: 3,
            title: 'Digitalisation in Non-Profits',
            type: 'Webinar',
            description: 'Panel discussion on how NPOs can leverage technology for greater impact.',
            icon: Video,
            color: 'bg-rose-100 text-rose-600'
        },
        {
            id: 4,
            title: 'NCSS Fund Application Steps',
            type: 'Checklist',
            description: 'Step-by-step checklist to ensure you have all documents ready for NCSS grants.',
            icon: FileText,
            color: 'bg-amber-100 text-amber-600'
        },
        {
            id: 5,
            title: 'Impact Measurement Framework',
            type: 'Guide',
            description: 'How to measure and report social impact to your funders effectively.',
            icon: BookOpen,
            color: 'bg-sky-100 text-sky-600'
        },
        {
            id: 6,
            title: 'Sample Case Studies',
            type: 'PDF',
            description: 'Real-world examples of successful grant applications from local VWOs.',
            icon: FileText,
            color: 'bg-violet-100 text-violet-600'
        }
    ]

    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-10">
                    <h1 className="text-3xl font-bold text-slate-900 mb-4">Knowledge Resources</h1>
                    <p className="text-slate-600 max-w-3xl">
                        Everything you need to succeed in your funding journey. Guides, templates, and expert advice for Singaporean Non-Profits.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {resources.map((resource) => {
                        const Icon = resource.icon
                        return (
                            <div key={resource.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer group">
                                <div className={`w-12 h-12 rounded-xl ${resource.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div className="mb-4">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{resource.type}</span>
                                    <h3 className="text-xl font-bold text-slate-900 mt-1 mb-2 group-hover:text-indigo-600 transition-colors">{resource.title}</h3>
                                    <p className="text-slate-600 text-sm leading-relaxed">{resource.description}</p>
                                </div>
                                <div className="flex items-center text-indigo-600 text-sm font-semibold mt-4">
                                    View Resource
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
