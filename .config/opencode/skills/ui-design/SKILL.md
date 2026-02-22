---
name: ui-design
description: Terminal user interface design - visual hierarchy, layout, and clear interfaces
category: UI Frameworks
---

# Skill: ui-design

## What I do

I help you design effective terminal user interfaces (TUIs). I focus on visual hierarchy, layout composition, and clear information display. I ensure that your terminal applications are readable, usable, and look professional while respecting the constraints of the terminal environment.

## When to use me

- When you're building a new TUI application.
- When you're styling components like buttons, lists, or tables in the terminal.
- When you're choosing a colour palette for your CLI.
- When you're designing the layout of a dashboard or complex form.

## Core principles

1. **Visual hierarchy**, use bold text, colour, and spacing to draw attention to the most important elements.
2. **Predictable layout**, use consistent spacing and alignment to create a sense of order and structure.
3. **Clear status indicators**, provide immediate visual feedback for ongoing processes using spinners or progress bars.
4. **Responsive design**, ensure that your TUI adapts gracefully to different terminal widths and heights.

## Patterns & examples

### Styling with Lip Gloss
Use a consistent pattern for styling TUI components.
- **Pattern**, Define base styles for common elements like headers, borders, and focused items. Use padding and margins to create breathing room.

### Colour palette selection
Choose colours that are accessible and look good on most terminal themes.
- **Good**, Use high-contrast colours for primary actions and subtle shades for background elements. Avoid relying purely on colour for meaning.

### Keyboard shortcuts display
Make it easy for users to discover and remember shortcuts.
- **Example**, Display a footer or sidebar with common shortcuts like `[q] quit`, `[?] help`, or `[enter] select`.

### Status and progress
Keep the user informed about background tasks.
- **Pattern**, Use a spinner for tasks with unknown duration and a progress bar for tasks with a known number of steps.

## Anti-patterns to avoid

- ❌ **Information overload**, crowding the screen with too many elements. Use spacing and progressive disclosure to keep it simple.
- ❌ **Illegible colour combinations**, using colours that are hard to read on certain backgrounds (e.g., light yellow on white).
- ❌ **Rigid layouts**, designing UIs that break when the terminal window is resized.
- ❌ **Hidden focus**, failing to clearly indicate which element is currently selected or has focus.

## KB Reference

`~/vaults/baphled/3. Resources/Knowledge Base/AI Development System/Skills/UI-Frameworks/UI Design.md`

## Related skills

- `ux-design`, for designing the interaction flow.
- `bubble-tea-expert`, for building TUIs with the Elm architecture.
- `huh`, for building interactive forms.
- `accessibility`, for making your TUI inclusive.
