
'use client';
import type { Teacher } from '@/lib/types';
import Image from 'next/image';
import { Calendar, Clock, MapPin, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export type LayoutStyle = 'classic' | 'modern' | 'elegant' | 'dynamic' | 'playful' | 'corporate' | 'artistic';
export type PfpShape = 'circle' | 'square' | 'rectangle';

export const layoutOptions: {id: LayoutStyle, name: string}[] = [
    { id: 'classic', name: 'Classic' },
    { id: 'modern', name: 'Modern' },
    { id: 'elegant', name: 'Elegant' },
    { id: 'dynamic', name: 'Dynamic' },
    { id: 'playful', name: 'Playful' },
    { id: 'corporate', name: 'Corporate' },
    { id: 'artistic', name: 'Artistic' },
];

interface MarketingPostTemplateProps {
    layoutId: LayoutStyle;
    pfpShape: PfpShape;
    pfpSize: number;
    pfpX: number;
    pfpY: number;
    teacher: Teacher | null;
    header: string;
    subHeader: string;
    description: string;
    offer: string;
    schedule?: string;
    time?: string;
    place?: string;
    contact?: string;
    customBgColor?: string;
    customTextColor?: string;
    fontFamily?: string;
    logo: React.ReactNode;
}

// Helper to check if a color is light or dark
const isColorLight = (hexColor: string) => {
    if (!hexColor) return true;
    const color = hexColor.charAt(0) === '#' ? hexColor.substring(1, 7) : hexColor;
    const r = parseInt(color.substring(0, 2), 16); // hexToR
    const g = parseInt(color.substring(2, 4), 16); // hexToG
    const b = parseInt(color.substring(4, 6), 16); // hexToB
    const uicolors = [r / 255, g / 255, b / 255];
    const c = uicolors.map((col) => {
        if (col <= 0.03928) {
            return col / 12.92;
        }
        return Math.pow((col + 0.055) / 1.055, 2.4);
    });
    const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    return L > 0.179;
};


export function MarketingPostTemplate({
    layoutId,
    pfpShape,
    pfpSize,
    pfpX,
    pfpY,
    teacher,
    header,
    subHeader,
    description,
    offer,
    schedule,
    time,
    place,
    contact,
    customBgColor,
    customTextColor,
    fontFamily,
    logo
}: MarketingPostTemplateProps) {
    const { t } = useTranslation();

    const pfpShapeClasses = {
        circle: 'rounded-full',
        square: 'rounded-md',
        rectangle: 'rounded-md aspect-[3/4]',
    };
    
    // Determine colors for offer box based on the main text color
    const offerBgIsLight = isColorLight(customTextColor || '#000000');

    const theme = {
        bg: customBgColor || '#FFFFFF',
        text: customTextColor || '#000000',
        primary: customTextColor || '#000000', // Use text color as primary for simplicity
        accent: isColorLight(customBgColor || '#FFFFFF') ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)',
        offerBg: customTextColor || '#000000',
        offerText: offerBgIsLight ? '#000000' : '#FFFFFF',
    }

    const ScheduleInfo = () => (
        (schedule || time || place) ? (
            <div className='flex flex-wrap justify-center items-center gap-x-4 gap-y-1 p-2 rounded-lg text-sm' style={{backgroundColor: theme.accent}}>
                {schedule && <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /><span>{t(schedule)}</span></div>}
                {time && <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /><span>{t(time)}</span></div>}
                {place && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /><span>{t(place)}</span></div>}
            </div>
        ) : null
    );

    const ContactInfo = () => (
        contact ? (
            <div className="flex items-center justify-center gap-2 text-sm font-semibold">
                <Phone className="w-4 h-4" />
                <span>{t(contact)}</span>
            </div>
        ) : null
    )
    
    const TeacherPFP = ({className}: {className?: string}) => (
        teacher ? <div className={cn("absolute overflow-hidden shadow-lg border-4 bg-white", pfpShapeClasses[pfpShape], className)} style={{
            width: `${pfpSize}px`,
            height: pfpShape === 'rectangle' ? `${pfpSize * (4/3)}px` : `${pfpSize}px`,
            top: `${pfpY}%`,
            left: `${pfpX}%`,
            transform: `translate(-${pfpX}%, -${pfpY}%)`,
            borderColor: theme.bg
        }}>
            <Image src={teacher.profilePictureUrl} alt={teacher.name} layout="fill" objectFit="cover" />
        </div> : null
    );
    
    const TeacherBanner = ({className}: {className?: string}) => (
        teacher ? <div className={cn("relative w-full overflow-hidden", className)}>
            <Image src={teacher.heroImageUrl} alt="Hero" layout="fill" objectFit="cover" />
        </div> : null
    );

    const layouts: {[key in LayoutStyle]: React.ReactNode} = {
        classic: (
            <div className='w-full h-full p-8 flex flex-col' style={{ backgroundColor: theme.bg, color: theme.text, fontFamily: fontFamily }}>
                <TeacherBanner className="h-40 mb-4 rounded-lg"/>
                <div className="flex justify-between items-start mb-6">
                    <div style={{color: theme.primary}}>{logo}</div>
                    <div className="text-right">
                        <h1 className='text-5xl font-extrabold' style={{color: theme.primary}}>{t(header)}</h1>
                        <p className="text-xl font-light">{t(subHeader)}</p>
                    </div>
                </div>
                 <div className="flex-grow flex flex-col items-center justify-center text-center relative">
                    <TeacherPFP />
                    <div style={{paddingTop: `${pfpSize/2}px`}}>
                        <h2 className="text-3xl font-bold">{teacher?.name}</h2>
                        <p className="max-w-md text-base mt-2">{t(description)}</p>
                    </div>
                </div>
                 <div className="space-y-4">
                    <ScheduleInfo />
                    <div className='w-full py-3 px-4 rounded-lg shadow-lg text-center' style={{backgroundColor: theme.offerBg, color: theme.offerText}}>
                        <p className="text-2xl font-bold tracking-wide uppercase">{t(offer)}</p>
                    </div>
                    <ContactInfo />
                </div>
            </div>
        ),
        modern: (
            <div className='w-full h-full p-8 flex flex-col relative justify-between' style={{ backgroundColor: theme.bg, color: theme.text, fontFamily: fontFamily }}>
                <TeacherBanner className="absolute inset-0 opacity-10" />
                <div className="text-center pt-8 relative z-10">
                    <h1 className='text-5xl font-extrabold mt-6' style={{color: theme.primary}}>{t(header)}</h1>
                    <p className="max-w-lg text-lg mt-2 mx-auto">{t(description)}</p>
                </div>
                <div className="absolute top-0 left-0 w-full h-full z-10">
                    <TeacherPFP />
                </div>
                <div className="relative z-20 text-center">
                     <h2 className="text-4xl font-bold">{teacher?.name}</h2>
                </div>
                <div className="mt-auto space-y-4 relative z-10">
                    <ScheduleInfo />
                    <div className='w-full py-4 px-4 rounded-xl shadow-lg' style={{backgroundColor: theme.offerBg, color: theme.offerText}}>
                        <p className="text-2xl font-black tracking-wider uppercase text-center">{t(offer)}</p>
                    </div>
                     <ContactInfo />
                </div>
                 <div className="absolute bottom-4 right-4 z-10" style={{color: theme.primary}}>{logo}</div>
            </div>
        ),
        elegant: (
             <div className='w-full h-full p-8 flex items-center justify-center relative' style={{ backgroundColor: theme.bg, color: theme.text, fontFamily: fontFamily }}>
                <TeacherBanner className="absolute inset-0 scale-125 blur-sm opacity-20" />
                <div className="w-full h-full flex flex-col justify-between p-6 border-4 rounded-2xl relative z-10" style={{borderColor: theme.primary}}>
                    <div>
                        <h1 className="text-6xl font-extrabold leading-tight">{t(header)}</h1>
                        <p className="text-xl font-light">{t(subHeader)}</p>
                    </div>
                    <div className="self-center text-center relative">
                         <TeacherPFP />
                         <div style={{paddingTop: `${pfpSize/2}px`}}>
                            <h2 className="text-3xl font-bold">{teacher?.name}</h2>
                            <p className="max-w-sm text-base mt-2">{t(description)}</p>
                         </div>
                    </div>
                    <div className="space-y-4">
                        <ScheduleInfo />
                        <div className='w-full py-3 px-4 rounded-lg shadow-lg text-center' style={{backgroundColor: theme.offerBg, color: theme.offerText}}>
                            <p className="text-xl font-bold tracking-wide uppercase">{t(offer)}</p>
                        </div>
                        <div className="flex justify-between items-center">
                            <ContactInfo />
                            <div style={{color: theme.primary}}>{logo}</div>
                        </div>
                    </div>
                </div>
            </div>
        ),
        dynamic: (
            <div className='w-full h-full flex flex-col relative justify-between overflow-hidden' style={{ backgroundColor: theme.bg, color: theme.text, fontFamily: fontFamily }}>
                <div className='absolute top-0 left-0 h-full w-2/3 -skew-x-12 -translate-x-1/4' style={{backgroundColor: theme.accent}}></div>
                <TeacherBanner className="absolute top-0 right-0 h-1/2 w-1/2 rounded-bl-full" />
                <div className="relative z-10 flex justify-between items-start px-8 pt-8">
                    <div>
                        <h1 className='text-5xl font-extrabold' style={{color: theme.primary}}>{t(header)}</h1>
                        <p className="text-xl font-light">{t(subHeader)}</p>
                    </div>
                    <div style={{color: theme.primary}}>{logo}</div>
                </div>

                 <div className="relative z-10 flex items-center justify-end gap-6 text-right px-8">
                    <div className="max-w-md">
                        <h2 className="text-4xl font-bold">{teacher?.name}</h2>
                        <p className="text-base mt-2">{t(description)}</p>
                    </div>
                </div>
                 <div className="absolute top-0 left-0 w-full h-full z-0">
                    <TeacherPFP className="flex-shrink-0" />
                </div>
                
                <div className="relative z-10 space-y-4 px-8 pb-8">
                     <ScheduleInfo />
                    <div className='w-full py-4 px-4 rounded-xl shadow-lg text-center' style={{backgroundColor: theme.offerBg, color: theme.offerText}}>
                        <p className="text-2xl font-black tracking-wider uppercase">{t(offer)}</p>
                    </div>
                    <ContactInfo />
                </div>
            </div>
        ),
        playful: (
            <div className='w-full h-full p-8 flex flex-col relative overflow-hidden' style={{ backgroundColor: theme.bg, color: theme.text, fontFamily: fontFamily }}>
                <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full" style={{backgroundColor: theme.accent}}></div>
                <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full" style={{backgroundColor: theme.accent}}></div>
                <TeacherBanner className="relative w-full h-40 rounded-3xl -rotate-3"/>
                <div className="relative z-10 flex-grow flex flex-col items-center justify-center text-center">
                    <TeacherPFP className="rotate-3 -mt-8"/>
                     <div className="pt-4" style={{paddingTop: `${pfpSize/2 + 16}px`}}>
                        <h2 className="text-4xl font-bold">{teacher?.name}</h2>
                        <h1 className='text-5xl font-extrabold mt-4' style={{color: theme.primary}}>{t(header)}</h1>
                        <p className="max-w-md text-base mt-2">{t(description)}</p>
                     </div>
                </div>
                <div className="relative z-10 mt-auto space-y-4">
                    <ScheduleInfo />
                     <div className='w-full py-3 px-4 rounded-2xl shadow-lg text-center' style={{backgroundColor: theme.offerBg, color: theme.offerText}}>
                        <p className="text-2xl font-bold uppercase">{t(offer)}</p>
                    </div>
                    <div className="flex justify-between items-center">
                        <ContactInfo />
                        <div style={{color: theme.primary}}>{logo}</div>
                    </div>
                </div>
            </div>
        ),
        corporate: (
            <div className='w-full h-full flex' style={{ backgroundColor: theme.bg, color: theme.text, fontFamily: fontFamily }}>
                <div className="w-1/3 h-full p-8 flex flex-col justify-between" style={{backgroundColor: theme.accent}}>
                    <TeacherBanner className="h-32 rounded-md" />
                    <div className="relative">
                        <TeacherPFP />
                        <div style={{paddingTop: `${pfpSize + 10}px`}}>
                           <h2 className="text-3xl font-bold">{teacher?.name}</h2>
                           <p className="text-sm">{t(description)}</p>
                        </div>
                    </div>
                     <div style={{color: theme.primary}}>{logo}</div>
                </div>
                <div className="w-2/3 h-full p-8 flex flex-col justify-center relative">
                     <div className="relative text-left mb-auto">
                         <h1 className='text-6xl font-extrabold' style={{color: theme.primary}}>{t(header)}</h1>
                         <p className="text-xl font-light">{t(subHeader)}</p>
                     </div>
                     <div className="relative space-y-4 mt-auto">
                        <ScheduleInfo />
                        <div className='w-full py-4 px-4 rounded-lg shadow-lg text-center' style={{backgroundColor: theme.offerBg, color: theme.offerText}}>
                            <p className="text-2xl font-bold tracking-wider uppercase">{t(offer)}</p>
                        </div>
                        <ContactInfo />
                     </div>
                </div>
            </div>
        ),
        artistic: (
            <div className='w-full h-full relative flex flex-col justify-between p-8' style={{ backgroundColor: theme.bg, color: theme.text, fontFamily: fontFamily }}>
                <TeacherBanner className="absolute inset-0 opacity-20" />
                <div className="absolute inset-0" style={{backgroundColor: theme.accent, opacity: 0.5}}></div>

                <div className="relative z-10 flex justify-between items-start">
                    <div className="p-4" style={{backgroundColor: theme.accent}}>
                        <h1 className="text-4xl font-extrabold">{t(header)}</h1>
                        <p className="text-lg font-light">{t(subHeader)}</p>
                    </div>
                     <div style={{color: theme.primary}}>{logo}</div>
                </div>

                 <div className="relative z-10 text-center flex items-center justify-center gap-6">
                    <div className="relative" style={{width: pfpSize, height: pfpSize}}>
                         <TeacherPFP />
                    </div>
                    <div className="text-left">
                        <h2 className="text-3xl font-bold drop-shadow-md">{teacher?.name}</h2>
                        <p className="mt-4 p-4 text-base backdrop-blur-sm rounded-lg max-w-sm" style={{backgroundColor: theme.accent}}>{t(description)}</p>
                    </div>
                </div>
                
                <div className="relative z-10 space-y-4">
                     <ScheduleInfo />
                    <div className='w-full py-3 px-4 rounded-lg shadow-lg text-center' style={{backgroundColor: theme.offerBg, color: theme.offerText}}>
                        <p className="text-2xl font-bold uppercase">{t(offer)}</p>
                    </div>
                    <ContactInfo />
                </div>
            </div>
        ),
    };


    return layouts[layoutId] || layouts['classic'];
}
