import type { NavItem } from '~/types/layout/navigation'

export const navItems: readonly NavItem[] = [
  { labelKey: 'character.card', to: '/character', icon: 'profile' },
  { labelKey: 'ui.nav.dmRelated', to: '/dm', icon: 'dice', disabled: true },
  { labelKey: 'ui.nav.otherTools', to: '/tools', icon: 'tool', disabled: true },
]
