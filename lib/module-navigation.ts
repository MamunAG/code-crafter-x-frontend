export type ModuleLeafItem = {
  label: string
  href: string
  description?: string
  permissionMenuName?: string
}

export type ModuleNavItem = ModuleLeafItem & {
  children?: ModuleNavItem[]
}

export type ModuleGroup = {
  label: string
  description?: string
  items: ModuleNavItem[]
}

export type ModuleNavigationItem = {
  key: "app-config" | "merchandising" | "iam"
  label: string
  href: string
  description: string
  groups: ModuleGroup[]
}

export type NavigationPermissionRecord = {
  canView: boolean
  menu?: {
    menuName?: string | null
    moduleEntry?: {
      moduleName?: string | null
    } | null
  } | null
}

export const MODULE_NAVIGATION: ModuleNavigationItem[] = [
  {
    key: "app-config",
    label: "App Config",
    href: "/app-config",
    description: "Global configuration, identity settings, and platform setup.",
    groups: [
      {
        label: "Core",
        description: "Primary application controls.",
        items: [
          // {
          //   label: "General settings",
          //   href: "/app-config/core/general",
          //   description: "Company name, locale, and default system rules.",
          //   children: [
          //     {
          //       label: "Company profile",
          //       href: "/app-config/core/general/company-profile",
          //     },
          //     {
          //       label: "Locale defaults",
          //       href: "/app-config/core/general/locale-defaults",
          //     },
          //     {
          //       label: "Fiscal calendar",
          //       href: "/app-config/core/general/fiscal-calendar",
          //     },
          //   ],
          // },
          {
            label: "Factory Setup",
            href: "/app-config/core/factory",
            description: "Create and manage application module entries.",
          },
          {
            label: "Module",
            href: "/app-config/core/module-entry",
            description: "Create and manage application module entries.",
          },
          {
            label: "Menu",
            href: "/app-config/core/menu",
            description: "Create and manage organization-specific menu entries.",
          },
        ],
      },
      {
        label: "Data",
        description: "Reference data for the platform.",
        items: [
          {
            label: "Country Setup",
            href: "/app-config/data/countries",
            permissionMenuName: "Country Setup",
          },
          {
            label: "Currency Setup",
            href: "/app-config/data/currencies",
            permissionMenuName: "Currency Setup",
          },
          {
            label: "Unit Setup",
            href: "/app-config/data/units",
            permissionMenuName: "Unit Setup",
          },
        ],
      },
      // {
      //   label: "Integrations",
      //   description: "External services and delivery channels.",
      //   items: [
      //     {
      //       label: "Email",
      //       href: "/app-config/integrations/email",
      //       children: [
      //         { label: "SMTP", href: "/app-config/integrations/email/smtp" },
      //         { label: "Templates", href: "/app-config/integrations/email/templates" },
      //       ],
      //     },
      //     {
      //       label: "Storage",
      //       href: "/app-config/integrations/storage",
      //       children: [
      //         { label: "Uploads", href: "/app-config/integrations/storage/uploads" },
      //         { label: "Media", href: "/app-config/integrations/storage/media" },
      //       ],
      //     },
      //     {
      //       label: "Dummy settings",
      //       href: "/app-config/integrations/dummy-settings",
      //       description: "Temporary placeholder submenu for layout testing.",
      //       children: [
      //         {
      //           label: "Dummy child A",
      //           href: "/app-config/integrations/dummy-settings/dummy-child-a",
      //         },
      //         {
      //           label: "Dummy child B",
      //           href: "/app-config/integrations/dummy-settings/dummy-child-b",
      //         },
      //       ],
      //     },
      //   ],
      // },
    ],
  },
  {
    key: "merchandising",
    label: "Merchandising",
    href: "/merchandising",
    description: "Product planning, sourcing, and production operations.",
    groups: [
      {
        label: "Masters",
        description: "Foundational product attributes.",
        items: [
          {
            label: "Core",
            href: "",
            children: [
              {
                label: "Buyer Setup",
                href: "/merchandising/masters/buyers",
                permissionMenuName: "Buyer Setup",
              },
              {
                label: "Style Setup",
                href: "/merchandising/masters/styles",
                permissionMenuName: "Style Setup",
              },
              {
                label: "Color Setup",
                href: "/merchandising/masters/colors",
                permissionMenuName: "Color Setup",
              },
              {
                label: "Size Setup",
                href: "/merchandising/masters/sizes",
                permissionMenuName: "Size Setup",
              },
              {
                label: "Embellishment",
                href: "/merchandising/masters/embellishments",
                permissionMenuName: "Embellishment",
              },
            ],
          },
        ],
      },

      // {
      //   label: "Sourcing",
      //   description: "Buyers, styles, and costing.",
      //   items: [
      //     {
      //       label: "Buyers",
      //       href: "/merchandising/sourcing/buyers",
      //       children: [
      //         { label: "Contacts", href: "/merchandising/sourcing/buyers/contacts" },
      //         { label: "Regions", href: "/merchandising/sourcing/buyers/regions" },
      //       ],
      //     },
      //     {
      //       label: "Styles",
      //       href: "/merchandising/sourcing/styles",
      //       children: [
      //         { label: "Tech packs", href: "/merchandising/sourcing/styles/tech-packs" },
      //         { label: "Samples", href: "/merchandising/sourcing/styles/samples" },
      //       ],
      //     },
      //     {
      //       label: "Cost sheets",
      //       href: "/merchandising/sourcing/cost-sheets",
      //       children: [
      //         { label: "BOM", href: "/merchandising/sourcing/cost-sheets/bom" },
      //         { label: "Pricing", href: "/merchandising/sourcing/cost-sheets/pricing" },
      //       ],
      //     },
      //   ],
      // },
      {
        label: "Production",
        description: "Orders, tracking, and execution.",
        items: [
          //     {
          //       label: "Seasons",
          //       href: "/merchandising/production/seasons",
          //       children: [
          //         { label: "Planning", href: "/merchandising/production/seasons/planning" },
          //         { label: "Closures", href: "/merchandising/production/seasons/closures" },
          //       ],
          //     },
          {
            label: "Orders",
            href: "/merchandising/production",
            children: [
              { label: "Work orders", href: "/merchandising/production/orders/work-orders" },
              { label: "Status", href: "/merchandising/production/orders/status" },
            ],
          },
          //     {
          //       label: "Dummy merchandising",
          //       href: "/merchandising/production/dummy-merchandising",
          //       description: "Temporary placeholder submenu for menu depth testing.",
          //       children: [
          //         {
          //           label: "Dummy child A",
          //           href: "/merchandising/production/dummy-merchandising/dummy-child-a",
          //         },
          //         {
          //           label: "Dummy child B",
          //           href: "/merchandising/production/dummy-merchandising/dummy-child-b",
          //         },
          //       ],
          //     },
        ],
      },
    ],
  },
  {
    key: "iam",
    label: "IAM",
    href: "/iam",
    description: "Users, roles, permissions, and account security.",
    groups: [
      {
        label: "Identity",
        description: "People and team records.",
        items: [
          {
            label: "Users",
            href: "/iam/identity/users",
            children: [
              { label: "Accounts", href: "/iam/identity/users/accounts" },
              { label: "Profiles", href: "/iam/identity/users/profiles" },
            ],
          },
          {
            label: "Teams",
            href: "/iam/identity/teams",
            children: [
              { label: "Members", href: "/iam/identity/teams/members" },
              { label: "Invites", href: "/iam/identity/teams/invites" },
            ],
          },
        ],
      },
      {
        label: "Access",
        description: "Authorization and policy controls.",
        items: [
          {
            label: "Roles",
            href: "/iam/access/roles",
            children: [
              { label: "Role matrix", href: "/iam/access/roles/matrix" },
              { label: "Defaults", href: "/iam/access/roles/defaults" },
            ],
          },
          {
            label: "Permissions",
            href: "/iam/access/permissions",
            children: [
              { label: "Policies", href: "/iam/access/permissions/policies" },
              { label: "Rules", href: "/iam/access/permissions/rules" },
            ],
          },
          {
            label: "User menu access",
            href: "/iam/access/menu-permissions",
            description: "Grant view, create, update, and delete menu access to users.",
          },
          {
            label: "Organization access",
            href: "/iam/access/organization-requests",
            description: "Review membership requests and assign users to organizations.",
          },
        ],
      },
      {
        label: "Security",
        description: "Sessions and audit history.",
        items: [
          {
            label: "Sessions",
            href: "/iam/security/sessions",
            children: [
              { label: "Active sessions", href: "/iam/security/sessions/active" },
              { label: "Devices", href: "/iam/security/sessions/devices" },
            ],
          },
          {
            label: "Audit logs",
            href: "/iam/security/audit-logs",
            children: [
              { label: "Events", href: "/iam/security/audit-logs/events" },
              { label: "Exports", href: "/iam/security/audit-logs/exports" },
            ],
          },
          {
            label: "Dummy IAM",
            href: "/iam/security/dummy-iam",
            description: "Temporary placeholder submenu for nested navigation testing.",
            children: [
              {
                label: "Dummy child A",
                href: "/iam/security/dummy-iam/dummy-child-a",
              },
              {
                label: "Dummy child B",
                href: "/iam/security/dummy-iam/dummy-child-b",
              },
            ],
          },
        ],
      },
    ],
  },
]

export function getModuleNavigation(key: ModuleNavigationItem["key"]) {
  return MODULE_NAVIGATION.find((module) => module.key === key)
}

function normalizeNavigationKey(value?: string | null) {
  const normalizedValue = value?.trim().toLowerCase() ?? ""

  if (!normalizedValue) {
    return ""
  }

  return normalizedValue
}

export function filterModuleNavigationByPermissions(
  modules: ModuleNavigationItem[],
  permissions: NavigationPermissionRecord[],
  isAdmin: boolean,
) {
  if (isAdmin) {
    return modules
  }

  const visibleModuleSet = new Set<string>()

  permissions.forEach((permission) => {
    if (!permission.canView) {
      return
    }

    const moduleName = normalizeNavigationKey(permission.menu?.moduleEntry?.moduleName)

    if (moduleName) {
      visibleModuleSet.add(moduleName)
    }
  })

  return modules.filter((module) => {
    const moduleName = normalizeNavigationKey(module.label)
    if (!moduleName) {
      return false
    }

    return visibleModuleSet.has(moduleName)
  })
}

function buildVisibleMenuNameSet(permissions: NavigationPermissionRecord[]) {
  const visibleMenuNameSet = new Set<string>()

  permissions.forEach((permission) => {
    if (!permission.canView) {
      return
    }

    const menuName = normalizeNavigationKey(permission.menu?.menuName)

    if (menuName) {
      visibleMenuNameSet.add(menuName)
    }
  })

  return visibleMenuNameSet
}

function filterSidebarItemsByPermissions(
  items: ModuleNavItem[],
  visibleMenuNameSet: Set<string>,
): ModuleNavItem[] {
  return items.flatMap((item) => {
    const children = item.children?.length
      ? filterSidebarItemsByPermissions(item.children, visibleMenuNameSet)
      : []
    const permissionMenuName = normalizeNavigationKey(item.permissionMenuName)
    const canShowItem = permissionMenuName
      ? visibleMenuNameSet.has(permissionMenuName)
      : children.length > 0

    if (!canShowItem) {
      return []
    }

    return [
      {
        ...item,
        children: children.length ? children : undefined,
      },
    ]
  })
}

export function filterModuleSidebarGroupsByPermissions(
  groups: ModuleGroup[],
  permissions: NavigationPermissionRecord[],
  isAdmin: boolean,
) {
  if (isAdmin) {
    return groups
  }

  const visibleMenuNameSet = buildVisibleMenuNameSet(permissions)

  return groups.flatMap((group) => {
    const items = filterSidebarItemsByPermissions(group.items, visibleMenuNameSet)

    return items.length
      ? [
        {
          ...group,
          items,
        },
      ]
      : []
  })
}
