# Design System Blueprint: The Ultimate "Dark-EdTech" Specification

This is the definitive design system blueprint, compiling all provided details into a single, comprehensive document. It is the source of truth for recreating the entire application or designing new pages that perfectly match the desired "Dark-EdTech" aesthetic.

## 1. Core Visual Philosophy
- **Theme**: Deep Dark Mode (Cyber-educational aesthetic).
- **Directionality**: Native RTL (Right-to-Left). All layouts must strictly adhere to `dir="rtl"` for Arabic support.
- **Surface Logic**: "Light on Dark" layering. The background is the darkest layer, interactive elements are progressively lighter, and active/focused elements are vibrant.
- **Borders vs. Shadows**: The design heavily favors 1px subtle borders (`border-white/5` or `border-zinc-800`) to define component edges. Drop shadows are used exclusively for floating elements like Modals and Dropdowns to lift them off the page.
- **Corner Smoothing**: Heavy and consistent use of large corner radii. `rounded-xl` (12px) and `rounded-2xl` (16px) are standard. Sharp 90-degree corners are to be avoided.
- **Font Smoothing**: Always apply `antialiased` for smoother text rendering.
- **Spacing**: Rely on `gap-4` and `gap-6` for layout spacing instead of margins to ensure consistency.

---

## 2. The Color System (Tailwind Token Mapping)

### A. Background Layers (The Foundation)
- **`bg-page` / `bg-app-base`**: `#09090b` (Deepest Zinc). This is the main page background, the darkest element in the hierarchy.
- **`bg-card` / `bg-surface-card`**: `#18181b` (Zinc-900). Used for all standard cards and the main body of the Navigation Dock.
- **`bg-elevated`**: `#27272a` (Zinc-800). Used for floating surfaces like Modals and Dropdowns.
- **`bg-input`**: `#09090b` (Zinc-950). Inputs are almost black to create a "carved out" look.

### B. Accent Colors (The Action Layer)
- **`brand-blue` / `color-primary`**: `#0ea5e9` (Tailwind Sky-500). The primary action color for active tabs, primary buttons, links, and major icons.
- **`brand-gold` / `color-gold`**: `#eab308` (Tailwind Yellow-500). Reserved exclusively for currency, wallet balances, points, and VIP/premium status badges.
- **`brand-red` / `color-danger`**: `#ef4444` (Tailwind Red-500). Used for destructive actions (e.g., Logout) and error states.
- **`brand-purple` / `color-purple`**: `#6366f1` (Tailwind Indigo-500). Reserved for special integrations like Instapay.

### C. Typography Colors (The Content Layer)
- **`text-primary` (Headings)**: `#ffffff` (White). For all major titles and headings.
- **`text-secondary` (Body/Labels)**: `#a1a1aa` (Zinc-400). For subtitles, body text, and form labels.
- **`text-muted` (Placeholders/Icons)**: `#52525b` (Zinc-600). For input placeholders and inactive icons.

### D. Border Colors
- **`border-subtle`**: `border-white/5` (5% opacity white). This is the default border for most cards and components.
- **`border-dashed`**: `border-zinc-700`. Used strictly for "empty state" containers.

---

## 3. Typography & Iconography

- **Font Family**: Prioritize a modern, geometric Arabic sans-serif. Recommended stack: `IBM Plex Sans Arabic`, `Cairo`, `Tajawal`.
- **Font Weights**:
  - **Bold (700)**: Page titles, large statistical numbers.
  - **Medium (500)**: Button text, active tab labels.
  - **Regular (400)**: Standard body text, input field text.
- **Icon Library**: `lucide-react`.
  - **Default State**: Outline icons with a stroke width of 1.5px or 2px.
  - **Active State**: Solid filled icons (where applicable) or increased stroke weight.

---

## 4. Component Architecture

### A. Global Header (Top Bar)
- **Layout**: `flex`, `row-reverse` (for RTL), `items-center`, `justify-between`, `h-20`, `px-6`.
- **Right Side (User Profile - in RTL)**:
  - **Avatar**: `w-10 h-10`, `rounded-full`, `bg-sky-500`, containing a white graduation cap icon.
  - **Text Block**: `flex flex-col` next to the avatar.
    - **Line 1 (Name)**: `text-sm`, `font-bold`, `text-white`.
    - **Line 2 (Grade)**: `text-xs`, `text-zinc-400`.
- **Left Side (Actions - in RTL)**:
  - **Wallet Pill**: A `rounded-full` container with `bg-zinc-950` and `border border-zinc-800`.
    - **Layout**: `flex items-center gap-2`, `pl-1 pr-4 py-1`.
    - **Content**: A gold `Wallet` icon, gold text (`100 EGP`), and a small blue circular "plus" button (`bg-sky-500`, `text-white`, `rounded-full`, `w-6 h-6`).
  - **Action Buttons**: A row of 4 circular buttons.
    - **Style**: `w-10 h-10`, `rounded-full`, `bg-zinc-800/50`, `text-zinc-400`, `hover:bg-zinc-700`.
    - **Icons**: `Bell`, `User`, `Settings`.
    - **Logout Button**: Differentiated with `text-red-500`.

### B. Navigation Dock (Floating Menu)
- **Position**: Centered horizontally, floating below the header.
- **Container**: `bg-zinc-800/80`, `backdrop-blur-sm`, `rounded-2xl`, `border border-white/5`, `p-2`.
- **Items (Tabs)**:
  - **Layout**: `flex flex-row`. Each item is `flex flex-col items-center justify-center gap-2`.
  - **Sizing**: Fixed aspect ratio, approx. `w-20 h-20`.
  - **Active State**: `bg-sky-500`, `rounded-xl`, `text-white`, `font-medium`. Animated with a subtle glow: `shadow-lg shadow-sky-500/20`.
  - **Inactive State**: `bg-transparent`, `text-zinc-500`.
  - **Animation**: `transition-all duration-300 ease-in-out` on all properties.

### C. "Empty State" Dashboard Container
- **Border**: `border-2 border-dashed border-zinc-700/50`.
- **Rounding**: `rounded-3xl`.
- **Sizing**: `min-h-[400px]` or `h-full`.
- **Content (Centered)**:
  - **Icon**: Large (`w-24 h-24`), outline style, `text-zinc-800` (very subtle).
  - **Title**: `text-lg`, `font-bold`, `text-white`.
  - **Subtitle**: `text-sm`, `text-zinc-500`.

### D. Cards (Standard & Interactive)
- **Base**: `bg-card` (`#18181b`).
- **Border**: `border border-subtle` (`border-white/5`).
- **Rounding**: `rounded-xl` or `rounded-2xl`.
- **Padding**: `p-4` or `p-6`.
- **Interaction**: `hover:border-sky-500/50`, `transition-colors`.

### E. Input Fields
- **Background**: `bg-input` (`#09090b`).
- **Border**: `border border-zinc-700`.
- **Text**: `text-white`.
- **Focus State**: `ring-2 ring-sky-500/50`, `border-sky-500`. No default outline.
- **Height**: Tall (`h-12` or `h-14`) for a modern feel and touch-friendliness.
- **Effect**: `shadow-inner` for a subtle "carved" or "inset" appearance.

### F. Buttons
- **Primary**: `bg-sky-500 hover:bg-sky-600`, `text-white`, `rounded-xl`, `font-medium`.
- **Ghost/Icon**: `bg-zinc-800 hover:bg-zinc-700`, `text-zinc-400`, `rounded-full`.
- **Selector (e.g., Payment Method)**: Large block-level button.
  - **Inactive**: `bg-transparent`, `border-zinc-700`.
  - **Selected**: `border-sky-500`, `ring-1 ring-sky-500`, `bg-sky-500/10`.

### G. Badges & Status Pills
- **Wallet Badge**: `bg-zinc-900`, `border border-zinc-700`, `rounded-full`, `px-4 py-1`.
- **Discount Badge**: `bg-zinc-700/50`, `text-white`, `text-xs`, `px-2 py-1`, `rounded-md`.

---

## 5. Iconography Mapping (Lucide-React)
- **Store**: `ShoppingBag`
- **Rewards**: `Gift`
- **Schedule**: `Calendar`
- **Flashcards**: `LibraryBig`
- **Summaries**: `Sparkles`
- **Assignments**: `ClipboardList`
- **Materials**: `Folder`
- **User Profile**: `UserCircle`
- **Settings**: `Settings`
- **Logout**: `LogOut` (Rotated 180deg for RTL logic)
- **Wallet**: `Wallet`
- **Credit Card**: `CreditCard`
- **Phone (Vodafone)**: `Phone`
- **Instapay Arrow**: `ArrowRight`

---

This document serves as the single source of truth for the application's visual style. All new development and redesign efforts must adhere to these specifications to maintain a cohesive and high-quality user experience.