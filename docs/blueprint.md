# **App Name**: Classroom Hub

## Core Features:

- Student Sign-Up: Allows students to sign up with name, phone number, and grade.
- Course Listing: Displays a list of courses/videos with title, thumbnail, and grade tags, filtered by grade.
- YouTube Integration: Embeds YouTube videos using URLs and displays them in the app using the YouTube iframe player; utilizes the YouTube Data API to fetch video metadata, displaying the fetched title and thumbnail to the user.
- Locked Course Access: Generates single-use share codes for locked courses; a tool ensures students can unlock courses by entering a valid code, and auto-regenerates new codes upon consumption to prevent misuse.
- Calendar View: Displays a grade-filtered calendar with highlighted session days and session details.
- Admin Course Management: Enables the teacher to add, edit, and lock courses; also supports generating share codes.
- Ephemeral Announcements: Displays temporary announcements or offers at the top of the Discover page with start and end times.

## Style Guidelines:

- Primary color: A warm blue (#64B5F6) to evoke trust and learning.
- Background color: Light, desaturated blue (#E3F2FD) for a clean and calming effect.
- Accent color: A complementary yellow (#FFD54F) to highlight key actions and information.
- Body and headline font: 'PT Sans' (sans-serif) for readability and a modern, approachable feel.
- Simple, outlined icons for navigation and actions to maintain a clean interface.
- Mobile-first responsive design with clear content sections and easy-to-use navigation.
- Subtle transitions and animations for a smooth and engaging user experience.

his is a comprehensive Design System Blueprint. You can use this document to recreate the entire application or design new pages that perfectly match the existing aesthetic.

This app follows a "Dark Mode SaaS" aesthetic with High-Contrast Functionalism. It relies on deep backgrounds, subtle borders, and vibrant accent colors to guide the user.

Core Visual Philosophy Theme: Deep Dark Mode (Cyber-educational).
Directionality: Native RTL (Right-to-Left).

Surface Logic: The app uses "Light on Dark" layering. The background is darkest; interactive elements are lighter; active elements are vibrant.

Borders vs. Shadows: The design prefers 1px subtle borders (border-white/10) to define edges rather than heavy drop shadows. Shadows are reserved for floating elements (Modals, Dropdowns).

Corner Smoothing: Heavy usage of rounded-xl (12px) and rounded-2xl (16px). There are almost no sharp 90-degree corners.

The Color System (Tailwind Token Mapping) Copy these specific hex codes to match the screenshots exactly.
A. Background Layers bg-app-base (Main Background): #121212 or #09090b (Deepest Zinc).

bg-surface-card (Cards/Nav Bar): #18181b to #27272a (Zinc 900/800).

bg-surface-elevated (Modals/Dropdowns): #27272a (Zinc 800) + backdrop-blur-md.

bg-input (Input Fields): #000000 with 20% opacity or #18181b.

B. Accent Colors color-primary (Brand Blue): #0ea5e9 (Tailwind Sky-500). Used for: Active tabs, primary buttons, major icons.

color-gold (Currency/Premium): #eab308 (Tailwind Yellow-500). Used for: Wallet balance, points, premium badges.

color-danger (Destructive): #ef4444 (Tailwind Red-500). Used for: Logout, error states.

color-purple (Special/Instapay): #6366f1 (Tailwind Indigo-500).

C. Typography Colors text-primary (Headings): #ffffff (White).

text-secondary (Subtitles/Labels): #a1a1aa (Zinc 400).

text-muted (Placeholders/Icons): #52525b (Zinc 600).

Typography & Iconography Font Family: A modern, geometric Arabic sans-serif.
Recommendation: IBM Plex Sans Arabic, Cairo, or Almarai.

Weights:

Bold (700): Page titles, Stat numbers.

Medium (500): Button text, Active Tab labels.

Regular (400): Body text, Input placeholders.

Icon Style:

Outline Icons: Default state (Stroke width 1.5px or 2px).

Filled Icons: Active state (Solid color).

Library: Lucide React or Heroicons (Outline & Solid sets).

Component Architecture A. Navigation Dock (The "Floating Island") This is the central navigation piece seen in all screenshots.
Container:

bg-zinc-800/80 (slightly transparent).

backdrop-blur-sm.

rounded-2xl.

border border-white/5.

p-2 (Internal padding).

Items (Tabs):

Layout: Flex column (Icon top, Text bottom) centered.

Size: Fixed square-ish aspect ratio (e.g., w-20 h-20 or w-24 h-20).

Active State:

Background: bg-sky-500 (Solid Blue).

Icon: White.

Text: White, Bold.

Shape: rounded-xl.

Effect: Subtle internal glow or shadow shadow-lg shadow-sky-500/20.

Inactive State:

Background: Transparent.

Icon: text-zinc-500.

Text: text-zinc-500, Regular.

Hover: hover:bg-white/5 (Subtle lighten).

B. The "Empty State" Container Used whenever a tab has no data (Schedule, Materials, Store).

Border: border-2 border-dashed border-zinc-700/50.

Background: Transparent.

Rounding: rounded-3xl.

Height: Fixed minimum height (e.g., min-h-[400px]) or h-full.

Content:

Icon: Huge (size w-24 h-24), Opacity 20% (text-zinc-700).

Title: text-xl text-white font-bold mt-4.

Subtitle: text-sm text-zinc-500 mt-2.

C. Cards (Standard & Interactive) Used for "Referral Tiers" or "Stats".

Base: bg-zinc-800/50 (Very dark grey).

Border: border border-white/5 (Extremely subtle).

Rounding: rounded-xl.

Padding: p-4 or p-6.

Interaction (Hover):

hover:border-sky-500/50 (Border turns blueish).

transition-colors duration-200.

D. Input Fields Background: bg-zinc-900 or bg-black/20.

Border: border border-zinc-700.

Text: White.

Focus State:

ring-2 ring-sky-500/50.

border-sky-500.

Outline: None.

Height: Taller than average (e.g., h-12 or h-14) for touch friendliness.

E. Buttons Primary Action:

bg-sky-500 hover:bg-sky-600.

text-white.

rounded-lg or rounded-xl.

font-medium.

Ghost / Icon Button:

bg-zinc-800 hover:bg-zinc-700.

text-zinc-400.

rounded-full (for header icons) or rounded-lg (for copy buttons).

Selector Button (Payment Method):

Large block button.

Border: border-zinc-700 vs border-sky-500 (Selected).

Background: bg-transparent vs bg-sky-500/10 (Selected).

F. Badges & Status Pills Wallet Badge:

bg-zinc-900 border border-zinc-700.

rounded-full.

px-4 py-1.

Contains: Gold icon + Gold text ("100 EGP") + Blue "Plus" button.

Discount Badge:

bg-zinc-700/50.

text-white text-xs.

px-2 py-1 rounded-md.

Layout Patterns (Grid & Spacing) Page Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6.
Header Grid:

flex row-reverse items-center justify-between.

Note on RTL: The logo/user info is on the Right, Actions on the Left.

Dashboard Grid (Rewards Page):

Top Row: Grid-3 (grid-cols-1 md:grid-cols-3 gap-4).

Main Body: Grid-2 (grid-cols-1 lg:grid-cols-2 gap-6).

Left Column: Tiers List.

Right Column: "How it works" steps.

Special Effects (The "Premium" Polish) To truly match the design, apply these subtle CSS effects:
Backdrop Blur: Use backdrop-blur-md on the Navigation Dock and Modals. This allows the background hints to bleed through slightly.

Gradient Text: (Optional but observed) Sometimes numbers or icons have a subtle gradient.

Dashed Borders: Use border-dashed strictly for "Placeholder/Empty" areas to signify "space to be filled."

Glass Inputs: Inputs in the modal look like they are carved into the background. Use shadow-inner (inset shadow) delicately on inputs to create depth.

Global Header (Specific Replication) Left (LTR perspective) / Right (RTL perspective):
Avatar: Circle, blue background, white icon (graduation cap).

Text:

Top line: Name (White, Bold).

Bottom line: Grade (Zinc-400, Small).

Center/Right:

Wallet: Pill shape. Left side: Yellow Text/Icon. Right side: Blue circle (+) button.

Icons: Bell, User, Settings, Logout (Red arrow). Each is inside a w-10 h-10 dark circle container.

This is the Ultimate Design Specification Document. It breaks down every pixel, state, and interaction. You can copy and paste this entire block directly into an AI coding assistant (like Cursor, Windsurf, or a generic GPT-4 coder) to get a near-perfect replica.

SYSTEM PROMPT: The "Dark-EdTech" Design Language Role: You are a Senior Frontend Engineer and UI/UX Specialist. Task: Build a Next.js (App Router) + Tailwind CSS application based on the following Right-to-Left (RTL) design system. Strict Requirement: All layouts must strictly adhere to dir="rtl" for Arabic support.

GLOBAL THEME & ATOMICS Color Palette (Exact Hex Codes) Backgrounds:
bg-page: #121212 (The deepest layer, main page background).

bg-card: #18181b (Zinc-900 - Used for standard cards).

bg-elevated: #27272a (Zinc-800 - Used for the Nav Dock and Modals).

bg-input: #09090b (Zinc-950 - Very dark, almost black).

Accents:

brand-blue: #0ea5e9 (Sky-500) → Used for Primary Actions, Active Tabs, Links.

brand-gold: #eab308 (Yellow-500) → Used ONLY for Wallet Balance, Points, and VIP badges.

brand-red: #ef4444 (Red-500) → Used for Logout Icon and Error States.

brand-purple: #6366f1 (Indigo-500) → Used for specific integrations (e.g., Instapay).

Borders:

border-subtle: border-white/5 (5% opacity white - Used for almost all card borders).

border-dashed: border-zinc-700 (Used for empty states).

Typography (Arabic & English) Font Family: Use Cairo, Tajawal, or IBM Plex Sans Arabic (Google Fonts).

Headings: font-bold (Weight 700). White (#fff).

Body Text: font-normal (Weight 400). Zinc-300 (#d4d4d8).

Muted Text: font-light (Weight 300). Zinc-500 (#71717a).

Numbers: Must be consistent. If Arabic locale is used, ensure font supports standard numerals.

Shape & Geometry Corner Radius:

Standard Cards: rounded-2xl (16px).

Buttons: rounded-xl (12px).

Badges/Pills: rounded-full (9999px).

Shadows: Avoid drop shadows. Use Inner Glows and Borders.

Glass Effect: backdrop-blur-md bg-zinc-800/80 (Used on Nav Bar & Modals).

COMPONENT SPECIFICATIONS A. The Header (Top Bar) Layout: Flexbox, Space-Between. h-20, items-center, px-6.
Left Side (Actions - LTR perspective / Right in RTL):

User Profile:

Avatar: Circle, w-10 h-10. Background bg-sky-500. Icon: White graduation cap.

Text: To the side of the avatar.

Line 1: Name (White, Bold, text-sm).

Line 2: "2ND | First Secondary" (Zinc-400, text-xs).

Right Side (Utilities - LTR perspective / Left in RTL):

Wallet Pill:

Container: bg-zinc-950, border border-zinc-800, rounded-full, pl-1 pr-4 py-1.

Content: Gold Text "100 EGP", Gold Wallet Icon.

Action: Small Blue Button (bg-sky-500) with a White Plus (+) icon inside the pill.

Action Buttons:

Row of 4 circular buttons (w-10 h-10).

Style: bg-zinc-800/50, hover:bg-zinc-700, rounded-full, text-zinc-400.

Icons: Bell, Profile User, Settings Cog.

Special Button: Logout button has a Red (text-red-500) arrow icon.

B. The Navigation Dock (Floating Menu) Position: Centered horizontally, below the header.

Container: bg-zinc-800, border border-white/5, rounded-2xl, p-2.

Items (The Tabs):

Grid: Flex row. Each item is roughly w-20 h-20 (square-ish).

Internal Layout: Flex Column (Icon Top, Text Bottom). Center-aligned. gap-2.

Inactive State: Transparent bg. Icon text-zinc-500 (24px). Text text-zinc-500 (12px).

Active State:

Background: bg-sky-500 (Vibrant Blue).

Border Radius: rounded-xl.

Icon: White.

Text: White, Medium Weight.

Animation: transition-all duration-300 ease-in-out.

C. The "Empty State" Dashboard Container: A massive box that fills the rest of the screen.

Border: border-2 border-dashed border-zinc-700/50.

Radius: rounded-3xl.

Content (Centered):

Icon: Large (w-24 h-24), Outline style, text-zinc-800 (Very subtle).

Title: "No materials found currently" (White, text-lg, font-bold).

Subtitle: "Teacher content you follow will appear here" (Zinc-500, text-sm).

D. The Rewards Page (Specifics) Stats Cards (Top Row):

Background: bg-zinc-800/40. Border: border-white/5.

Layout: Centered text.

Data: Huge Number (White, text-3xl, Bold). Label (Zinc-500, text-sm).

Referral Box (Middle):

Input Field: bg-zinc-900, h-12, rounded-lg, border border-zinc-700, text-zinc-500 (Read-only).

Share Button: bg-sky-500, h-12, px-6, rounded-lg, White Text + Icon.

Tiers List (Left Column):

Card: bg-zinc-800/20, border border-zinc-800, p-4, rounded-xl, flex items-center justify-between.

Left: Tier Name (e.g., "Bronze") + Icon (Ribbon).

Color Logic: Bronze (Orange text), Silver (Gray text), Gold (Yellow text).

Right: Badge (bg-zinc-800, text-white, px-3 py-1, rounded-full, text: "5% OFF").

E. The Wallet Modal (Pop-up) Overlay: Fixed, inset-0, bg-black/60, backdrop-blur-sm.

Modal Body:

Width: max-w-md w-full.

Background: bg-zinc-900.

Border: border border-zinc-700.

Radius: rounded-3xl.

Header: "My Balance" (White, Bold) + Blue Wallet Icon (bg-sky-500, p-2, rounded-lg, text-white).

Recharge Input:

Large container bg-zinc-950, border border-sky-900 (if active).

Value displayed: "50 EGP".

Spinner controls (Up/Down arrows) on the left.

Quick Select Pills:

Row of buttons: "50 EGP", "100 EGP", "200 EGP".

Style: border border-zinc-700, text-zinc-300, rounded-full, px-4 py-2, hover:border-sky-500.

Payment Methods (The Big Buttons):

Layout: Vertical Stack. gap-3.

Card Style: h-16, w-full, bg-zinc-800/50, border border-zinc-700.

Selected State: border-sky-500, ring-1 ring-sky-500, bg-sky-500/10.

Icons:

Credit Card: Blue Icon.

Vodafone Cash: Red Background Box + White Phone Icon.

Instapay: Purple Background Box + White Arrow Icon.

ICONOGRAPHY MAPPING (Lucide-React) Use these icons to match the design:
Store: ShoppingBag

Rewards: Gift

Schedule: Calendar

Flashcards: LibraryBig (or BookOpen)

Summaries: Sparkles

Assignments: ClipboardList

Materials: Folder

User: UserCircle

Settings: Settings

Logout: LogOut (Rotate 180deg for RTL logic).

Wallet: Wallet.

CSS TRICKS FOR "THE LOOK" Subtle Noise: Use a very faint noise texture on the bg-page if possible, otherwise plain #121212 is fine.
RTL Direction: Ensure <html dir="rtl"> is set.

Flex Gaps: Rely heavily on gap-4 and gap-6 instead of margins.

Font Smoothing: Always apply antialiased in Tailwind. detailddescription for the design type oevr all so we can redisign the who;e app w it adn knowing wut desing we goinm for not only th eprovided pages sowe can js copy the deisng on any elemst or pages more complex and detailed now afrer u sabve an dknow wait for my order to tell u wehre to satrt