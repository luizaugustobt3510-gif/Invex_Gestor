# Design Tokens

Token reference for **Invexgestor**. Use utility classes and CSS variables — never raw values.

## Colors

Apply with any color utility: `bg-<name>`, `text-<name>`, `border-<name>`, `ring-<name>`, `divide-<name>`, etc.

| Name | CSS variable |
|---|---|
| `background` | `--background` |
| `foreground` | `--foreground` |
| `card` | `--card` |
| `card-foreground` | `--card-foreground` |
| `popover` | `--popover` |
| `popover-foreground` | `--popover-foreground` |
| `primary` | `--primary` |
| `primary-foreground` | `--primary-foreground` |
| `primary-glow` | `--primary-glow` |
| `secondary` | `--secondary` |
| `secondary-foreground` | `--secondary-foreground` |
| `muted` | `--muted` |
| `muted-foreground` | `--muted-foreground` |
| `accent` | `--accent` |
| `accent-foreground` | `--accent-foreground` |
| `success` | `--success` |
| `success-foreground` | `--success-foreground` |
| `success-light` | `--success-light` |
| `warning` | `--warning` |
| `warning-foreground` | `--warning-foreground` |
| `warning-light` | `--warning-light` |
| `danger` | `--danger` |
| `danger-foreground` | `--danger-foreground` |
| `danger-light` | `--danger-light` |
| `destructive` | `--destructive` |
| `destructive-foreground` | `--destructive-foreground` |
| `info` | `--info` |
| `info-foreground` | `--info-foreground` |
| `border` | `--border` |
| `input` | `--input` |
| `ring` | `--ring` |
| `gradient-primary` | `--gradient-primary` |
| `sidebar-background` | `--sidebar-background` |
| `sidebar-foreground` | `--sidebar-foreground` |
| `sidebar-primary` | `--sidebar-primary` |
| `sidebar-primary-foreground` | `--sidebar-primary-foreground` |
| `sidebar-accent` | `--sidebar-accent` |
| `sidebar-accent-foreground` | `--sidebar-accent-foreground` |
| `sidebar-border` | `--sidebar-border` |
| `sidebar-ring` | `--sidebar-ring` |
| `inv-ink` | `--inv-ink` |
| `inv-ink-soft` | `--inv-ink-soft` |
| `inv-paper` | `--inv-paper` |
| `inv-sand` | `--inv-sand` |
| `inv-leaf` | `--inv-leaf` |
| `inv-leaf-soft` | `--inv-leaf-soft` |
| `inv-glow` | `--inv-glow` |
| `routine-orange` | `--routine-orange` |
| `routine-blue` | `--routine-blue` |
| `routine-green` | `--routine-green` |
| `routine-rose` | `--routine-rose` |

## Typography

Typography classes (`font-*` for families, `text-*` for sizes):

| Class | CSS variable |
|---|---|
| — | `--inv-line` |

## Border Radius

Border-radius classes:

| Class | CSS variable |
|---|---|
| `rounded` | `--radius` |

## Shadows

Box-shadow classes:

| Class | CSS variable |
|---|---|
| `shadow-card` | `--shadow-card` |
| `shadow-elevated` | `--shadow-elevated` |

## Other

Reference via `var(--name)` in inline styles or CSS.

| CSS variable |
|---|
| `--gradient-subtle` |
| `--transition-smooth` |

