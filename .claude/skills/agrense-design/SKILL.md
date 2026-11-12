---
name: agrense-design
description: AGRENSE premium agricultural design system. Use whenever creating, modifying, or reviewing any AGRENSE frontend interface (pages, components, layouts, styles, charts, dashboards, Tailwind/shadcn UI). Before writing frontend code, inspect and follow the reference image at references/agrense-dashboard-reference.png, which is the visual source of truth.
---

# AGRENSE — Premium Agricultural Design System

## 1. Primary Directive

You are the lead product designer and frontend design engineer for AGRENSE, an AI-powered multilingual agricultural advisory and sustainable fertilizer optimization platform.

Your responsibility is to maintain a consistent, premium, production-quality visual identity across the entire application.

The reference image is the visual source of truth.

Before writing or modifying frontend code:

1. Locate and inspect `references/agrense-dashboard-reference.png`.
2. Study its layout, proportions, typography, colors, spacing, imagery, cards, borders, and visual hierarchy.
3. Use the reference as the baseline for every new screen.
4. Preserve the established visual identity when introducing new features.
5. Never replace the design language with generic AI-generated SaaS styling.

If the reference image is unavailable, ask the user to provide it. Do not silently invent a replacement visual direction.

## 2. Brand Identity

Brand: AGRENSE

Product category: Agricultural Intelligence Platform.

Brand personality:

* Premium
* Natural
* Intelligent
* Trustworthy
* Modern
* Sustainable
* Approachable

Visual concept: Premium organic agricultural technology.

The application should combine the sophistication of a premium SaaS product with the warmth and authenticity of agriculture.

## 3. Mandatory Color System

Use these colors as the initial design tokens.

### Primary palette

* Primary olive: #687D0B
* Deep olive: #425500
* Forest green: #344B16
* Harvest amber: #E9A52A
* Golden wheat: #F4C56D
* Warm peach: #FFE2B8
* Champagne: #FFF0DB
* Ivory: #FFF9EF
* Main background: #F8F3EA
* Card background: #FFFDF9
* Primary text: #29251F
* Secondary text: #81796D
* Subtle border: #EDE2D2

### Color usage rules

* Warm ivory and champagne should dominate large surfaces.
* Olive green should communicate primary actions and brand identity.
* Amber should highlight agricultural metrics and important insights.
* Peach should soften cards and create visual depth.
* Forest green should be reserved for stronger emphasis.
* Use red and orange only for meaningful warnings and critical alerts.

Do not turn the entire application dark green.

Do not introduce purple AI gradients, electric blue accents, or unrelated colors without explicit justification.

## 4. Typography

Use a consistent typography system.

Preferred typefaces:

* Inter
* Manrope
* Plus Jakarta Sans

Typography hierarchy:

* Page titles: 28–36px, semibold.
* Section headings: 19–24px, semibold.
* Card headings: 16–19px, medium/semibold.
* Body text: 14–16px.
* Secondary labels: 12–14px.
* Large metrics: 30–44px.

Maintain readable line heights and consistent font weights.

Avoid excessive bold text and unnecessarily tiny labels.

## 5. Layout and Composition

Follow the reference dashboard's overall composition.

### Desktop application

Use:

* Fixed or sticky left navigation sidebar.
* Slim top header.
* Search field.
* Language selector.
* Notifications.
* User profile and role.
* Spacious central content area.
* Right-side analytical panels where appropriate.

Use a balanced grid.

Avoid overcrowding the dashboard.

The content should feel spacious, structured, and intentional.

### Sidebar

Include the relevant application navigation:

* Overview
* My Farms
* Soil Intelligence
* Fertilizer Optimizer
* Krishi AI
* Weather Intelligence
* Reports

Additional workspace items may include:

* Farmers Network
* Resources
* Settings

Use Lucide icons, consistent icon sizing, and subtle active navigation backgrounds.

### Dashboard composition

The overview should use:

1. Personalized greeting and date.
2. Weather intelligence card.
3. Large photographic field-monitoring hero.
4. Growth analytics.
5. AI recommendations.
6. Fertilizer efficiency comparison.
7. Smaller feature cards for field scanning, smart seeding, crop monitoring, and targeted treatment.

Do not force every page into this exact arrangement. Preserve the design language while creating appropriate layouts for individual workflows.

## 6. Component Design Language

### Cards

* Border radius: 20–28px.
* Warm white or ivory backgrounds.
* Subtle champagne borders.
* Soft, restrained shadows.
* Generous internal padding.
* Clear information hierarchy.

### Buttons

* Rounded or pill-shaped.
* Olive primary action.
* Warm neutral secondary action.
* Consistent hover and focus states.
* Clear disabled and loading states.

### Inputs

* Rounded surfaces.
* Soft warm backgrounds.
* Subtle borders.
* Visible focus indicators.
* Readable placeholders.

### Charts

* Use olive, forest green, and muted harvest-green tones.
* Keep grid lines subtle.
* Include meaningful labels and units.
* Provide tooltips and legends.
* Avoid unnecessary chart decoration.

### Badges

Use understated pill badges for:

* Live monitoring
* Completed
* In progress
* Recommendations
* Critical alerts

### Images

Agricultural imagery is an important part of the identity.

Prefer high-quality photographs of:

* Golden wheat fields.
* Rice cultivation.
* Soil and seedlings.
* Healthy crops.
* Agricultural machinery.
* Farm landscapes.
* Precision agriculture equipment.

Images should be relevant to their content, high resolution, and consistently cropped.

Avoid random stock images and repetitive image usage.

## 7. Page-Specific Design Requirements

### Overview

Present farm intelligence through a visually balanced dashboard.

### My Farms

Use photographic farm cards, field information, location, acreage, crop type, and monitoring status.

### Soil Intelligence

Design an analytical experience for:

* Soil Health Card uploads.
* OCR extraction.
* NPK values.
* Soil pH.
* Organic carbon.
* Nutrient deficiencies.
* Historical comparisons.

Make important nutrient values visually prominent.

### Fertilizer Optimizer

This is a core product feature.

Design:

* Crop selection.
* Growth-stage selection.
* Soil nutrient inputs.
* Recommended nutrient quantities.
* Fertilizer selection.
* Application dosage.
* Cost comparison.
* Environmental impact.
* Explanation of recommendations.

Present recommendations clearly and distinguish model predictions from verified agronomic guidance.

### Krishi AI

Create a premium conversational assistant.

Support:

* Regional language selection.
* Voice input.
* Voice responses.
* Text conversations.
* Image uploads.
* Agricultural knowledge citations.
* Follow-up questions.

Keep the interaction approachable and easy to understand.

### Weather Intelligence

Include:

* Current conditions.
* Forecasts.
* Rainfall.
* Temperature.
* Humidity.
* Wind.
* Irrigation advisories.
* Fertilizer application timing.

### Reports

Use professional charts, historical trends, export controls, and understandable summaries.

## 8. Responsive Design

Desktop is the primary reference composition, but the application must work on all screen sizes.

Desktop:

* Full sidebar.
* Multi-column dashboard.
* Large photographic panels.
* Analytical side panels.

Tablet:

* Collapsible sidebar.
* Rebalanced grids.
* Reduced panel density.

Mobile:

* Compact navigation or bottom navigation.
* Single-column content.
* Large touch targets.
* Simplified charts.
* Optimized images.
* No horizontal overflow.

Do not simply shrink the desktop dashboard.

## 9. Technical Implementation

Follow the existing project's architecture.

Preferred technologies:

* Next.js App Router.
* React.
* TypeScript.
* Tailwind CSS.
* shadcn/ui.
* Radix UI.
* Lucide icons.
* Recharts for data visualization.
* Framer Motion for purposeful animations.

Rules:

1. Reuse existing components before creating duplicates.
2. Define shared design tokens.
3. Use CSS variables for theme values.
4. Build reusable cards, buttons, inputs, badges, and layouts.
5. Maintain semantic HTML.
6. Implement accessible keyboard interactions.
7. Avoid unnecessary dependencies.
8. Do not introduce placeholder functionality disguised as working features.
9. Do not hardcode misleading agricultural measurements.
10. Preserve existing business logic when modifying the UI.

## 10. Strict Visual Restrictions

Never:

* Use a generic dashboard template.
* Replace the warm agricultural palette with a dark theme by default.
* Introduce random gradients.
* Overuse glassmorphism.
* Mix unrelated design systems.
* Use inconsistent card radii.
* Scatter unrelated colors throughout the interface.
* Use emojis as substitutes for proper interface icons.
* Create excessive empty whitespace.
* Make every section visually identical.
* Sacrifice usability for aesthetics.

## 11. Visual Quality Assurance

After implementation:

1. Run the application.
2. Inspect actual browser screenshots.
3. Compare the result against the supplied reference.
4. Check desktop at 1440px and 1920px.
5. Check tablet at 1024px.
6. Check mobile at 390px.
7. Inspect spacing, alignment, typography, colors, imagery, and component consistency.
8. Test interactions and navigation.
9. Fix visual regressions.
10. Repeat until the implementation feels consistent with the reference.

Do not claim visual verification without actually inspecting the rendered interface.

## 12. Existing Project Rule

When entering an existing AGRENSE project:

* Inspect its current architecture.
* Read existing design tokens.
* Identify reusable components.
* Preserve working features.
* Apply this design system incrementally.
* Avoid rewriting unrelated application logic.

For new features, extend the existing system rather than inventing a new one.

## 13. Final Design Principle

Every AGRENSE screen should feel like it belongs to the same carefully designed agricultural intelligence product.

The target is not merely a functional interface.

The target is a premium, coherent, trustworthy agricultural technology platform with the exact visual character established by the supplied AGRENSE dashboard reference.

When in doubt, inspect the reference image and follow its visual language.
