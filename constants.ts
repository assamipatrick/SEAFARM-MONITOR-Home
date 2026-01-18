
import type { AppSettings, Theme, Denomination } from './types';
import { Language } from './types';
import { PERMISSIONS } from './permissions';

export const THEMES: Theme[] = [
  { id: 'dark-formal', name: 'Dark Formal', className: 'dark', font: 'font-serif' },
  { id: 'dark-glass', name: 'Dark Glass', className: 'dark glass-dark', font: 'font-sans' },
  { id: 'light-formal', name: 'Light Formal', className: 'light', font: 'font-serif' },
  { id: 'light-glass', name: 'Light Glass', className: 'light glass-light', font: 'font-sans' },
];

// Payroll configuration interfaces
interface PayrollBracket {
    from: number;
    to: number;
    rate: number;
}

interface PayrollSocialContribution {
    key: string;
    rate: number;
    cap?: number;
}

interface PayrollConfig {
    constants: {
        socialContributions: PayrollSocialContribution[];
        incomeTax: {
            brackets: PayrollBracket[];
            minimumPerception?: number;
        };
    };
    labels: {
        socialContributions: { key: string; label: string }[];
        incomeTax: string;
    };
}


export interface Country {
  code: string;
  name: string;
  currency: string;
  symbol: string;
  thousandsSeparator: string;
  decimalSeparator: string;
  denominations: Omit<Denomination, 'id'>[];
  payroll?: PayrollConfig;
}

const usDenominations: Omit<Denomination, 'id'>[] = [
    { value: 0.01, type: 'coin' }, { value: 0.05, type: 'coin' }, { value: 0.10, type: 'coin' },
    { value: 0.25, type: 'coin' }, { value: 0.50, type: 'coin' }, { value: 1, type: 'coin' },
    { value: 1, type: 'banknote' }, { value: 2, type: 'banknote' }, { value: 5, type: 'banknote' },
    { value: 10, type: 'banknote' }, { value: 20, type: 'banknote' }, { value: 50, type: 'banknote' },
    { value: 100, type: 'banknote' },
];

const eurDenominations: Omit<Denomination, 'id'>[] = [
    { value: 0.01, type: 'coin' }, { value: 0.02, type: 'coin' }, { value: 0.05, type: 'coin' },
    { value: 0.10, type: 'coin' }, { value: 0.20, type: 'coin' }, { value: 0.50, type: 'coin' },
    { value: 1, type: 'coin' }, { value: 2, type: 'coin' },
    { value: 5, type: 'banknote' }, { value: 10, type: 'banknote' }, { value: 20, type: 'banknote' },
    { value: 50, type: 'banknote' }, { value: 100, type: 'banknote' }, { value: 200, type: 'banknote' },
    { value: 500, type: 'banknote' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  company: {
    logoUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMjAgNjAiIHdpZHRoPSIyMjAiIGhlaWdodD0iNjAiPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZDEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMDZiNmQ0O3N0b3Atb3BhY2l0eToxIiAvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6IzA4OTFiMjtzdG9wLW9wYWNpdHk6MSIgLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48c3R5bGU+LmxvZ28tdGV4dCB7IGZvbnQtZmFtaWx5OiAnU2Vnb2UgVUknLCAnUm9ib3RvJywgJ0hlbHZldGljYSBOZXVlJywgc2Fucy1zZXJpZjsgZm9udC1zaXplOiAzMnB4OyBmb250LXdlaWdodDogNjAwOyBmaWxsOiB1cmwoI2dyYWQxKTsgfTwvc3R5bGU+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTAsIDEwKSI+PHBhdGggZD0iTTE1LDAgQzUsNSA1LDE1IDE1LDIwIFMyNSwyNSAxNSwzMCBDNSwzNSA1LDQ1IDE1LDUwIiBzdHJva2U9Im5vbmUiIGZpbGw9IiMwODkxYjIiIHRyYW5zZm9ybT0ic2NhbGUoMC44KSB0cmFuc2xhdGUoMCwgLTUpIi8+PHBhdGggZD0iTTIwLDAgQzEwLDUgMTAsMTUgMjAsMjAgUzMwLDI1IDIwLDMwIEMxMCwzNSAxMCw0NSAyMCw1MCIgc3Ryb2tlPSJub25lIiBmaWxsPSIjMDZiNmQ0IiB0cmFuc2Zvcm09InNjYWxlKDAuNykgdHJhbnNsYXRlKDUsIC01KSIvPjwvZz48dGV4dCB4PSI1MCIgeT0iNDAiIGNsYXNzPSJsb2dvLXRleHQiPlNFQUZBUk08L3RleHQ+PC9zdmc+',
    name: 'OceanReef Seaweed Inc.',
    phone: '+1 (555) 123-4567',
    email: 'contact@oceanreef.com',
    address: '123 Ocean Drive, Marine City, MC 45678',
    nif: '123456789',
    rc: 'RC/XYZ/2024/001',
    stat: 'STAT-98765',
    capital: 1000000,
  },
  localization: {
    country: 'US',
    currency: 'USD',
    currencySymbol: '$',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    monetaryDecimals: 2,
    nonMonetaryDecimals: 2,
    denominations: usDenominations.map(d => ({ id: `d-${d.value}-${d.type}`, ...d })),
    coordinateFormat: 'DMS',
  },
  theme: THEMES[0],
  language: Language.EN,
};

export const COUNTRIES: Country[] = [
    { 
        code: 'BR', name: 'Brazil', currency: 'BRL', symbol: 'R$',
        thousandsSeparator: '.',
        decimalSeparator: ',',
        denominations: [
            { value: 0.05, type: 'coin' }, { value: 0.10, type: 'coin' }, { value: 0.25, type: 'coin' }, { value: 0.50, type: 'coin' }, { value: 1, type: 'coin' },
            { value: 2, type: 'banknote' }, { value: 5, type: 'banknote' }, { value: 10, type: 'banknote' },
            { value: 20, type: 'banknote' }, { value: 50, type: 'banknote' }, { value: 100, type: 'banknote' }, { value: 200, type: 'banknote' },
        ],
    },
    { 
        code: 'CA', name: 'Canada', currency: 'CAD', symbol: '$',
        thousandsSeparator: ',',
        decimalSeparator: '.',
        denominations: [
            { value: 0.05, type: 'coin' }, { value: 0.10, type: 'coin' }, { value: 0.25, type: 'coin' },
            { value: 1, type: 'coin' }, { value: 2, type: 'coin' },
            { value: 5, type: 'banknote' }, { value: 10, type: 'banknote' }, { value: 20, type: 'banknote' },
            { value: 50, type: 'banknote' }, { value: 100, type: 'banknote' },
        ],
    },
    { 
        code: 'CL', name: 'Chile', currency: 'CLP', symbol: '$',
        thousandsSeparator: '.',
        decimalSeparator: ',',
        denominations: [
            { value: 10, type: 'coin' }, { value: 50, type: 'coin' }, { value: 100, type: 'coin' }, { value: 500, type: 'coin' },
            { value: 1000, type: 'banknote' }, { value: 2000, type: 'banknote' }, { value: 5000, type: 'banknote' },
            { value: 10000, type: 'banknote' }, { value: 20000, type: 'banknote' },
        ],
    },
    { 
        code: 'CN', name: 'China', currency: 'CNY', symbol: '¥',
        thousandsSeparator: ',',
        decimalSeparator: '.',
        denominations: [
            { value: 0.1, type: 'coin' }, { value: 0.5, type: 'coin' }, { value: 1, type: 'coin' },
            { value: 1, type: 'banknote' }, { value: 5, type: 'banknote' }, { value: 10, type: 'banknote' },
            { value: 20, type: 'banknote' }, { value: 50, type: 'banknote' }, { value: 100, type: 'banknote' },
        ],
    },
    { 
        code: 'FR', name: 'France', currency: 'EUR', symbol: '€',
        thousandsSeparator: ' ',
        decimalSeparator: ',',
        denominations: eurDenominations,
    },
    { 
        code: 'IN', name: 'India', currency: 'INR', symbol: '₹',
        thousandsSeparator: ',',
        decimalSeparator: '.',
        denominations: [
            { value: 1, type: 'coin' }, { value: 2, type: 'coin' }, { value: 5, type: 'coin' }, { value: 10, type: 'coin' }, { value: 20, type: 'coin' },
            { value: 10, type: 'banknote' }, { value: 20, type: 'banknote' }, { value: 50, type: 'banknote' },
            { value: 100, type: 'banknote' }, { value: 200, type: 'banknote' }, { value: 500, type: 'banknote' }, { value: 2000, type: 'banknote' },
        ],
    },
    { 
        code: 'ID', name: 'Indonesia', currency: 'IDR', symbol: 'Rp',
        thousandsSeparator: '.',
        decimalSeparator: ',',
        denominations: [
            { value: 100, type: 'coin' }, { value: 200, type: 'coin' }, { value: 500, type: 'coin' }, { value: 1000, type: 'coin' },
            { value: 1000, type: 'banknote' }, { value: 2000, type: 'banknote' }, { value: 5000, type: 'banknote' },
            { value: 10000, type: 'banknote' }, { value: 20000, type: 'banknote' }, { value: 50000, type: 'banknote' },
            { value: 100000, type: 'banknote' },
        ],
    },
    { 
        code: 'IE', name: 'Ireland', currency: 'EUR', symbol: '€',
        thousandsSeparator: '.',
        decimalSeparator: ',',
        denominations: eurDenominations,
    },
    { 
        code: 'JP', name: 'Japan', currency: 'JPY', symbol: '¥',
        thousandsSeparator: ',',
        decimalSeparator: '.',
        denominations: [
            { value: 1, type: 'coin' }, { value: 5, type: 'coin' }, { value: 10, type: 'coin' },
            { value: 50, type: 'coin' }, { value: 100, type: 'coin' }, { value: 500, type: 'coin' },
            { value: 1000, type: 'banknote' }, { value: 2000, type: 'banknote' }, { value: 5000, type: 'banknote' },
            { value: 10000, type: 'banknote' },
        ],
    },
    { 
        code: 'MG', name: 'Madagascar', currency: 'MGA', symbol: 'Ar',
        thousandsSeparator: ' ',
        decimalSeparator: ',',
        denominations: [
            { value: 1, type: 'coin' }, { value: 2, type: 'coin' }, { value: 5, type: 'coin' },
            { value: 10, type: 'coin' }, { value: 20, type: 'coin' }, { value: 50, type: 'coin' },
            { value: 100, type: 'banknote' }, { value: 200, type: 'banknote' }, { value: 500, type: 'banknote' },
            { value: 1000, type: 'banknote' }, { value: 2000, type: 'banknote' }, { value: 5000, type: 'banknote' },
            { value: 10000, type: 'banknote' }, { value: 20000, type: 'banknote' },
        ],
        payroll: {
            constants: {
                socialContributions: [
                    { key: 'cnaps', rate: 0.01, cap: 2041600 },
                    { key: 'sanitary', rate: 0.01, cap: 2041600 },
                ],
                incomeTax: {
                    brackets: [
                        { from: 0, to: 350000, rate: 0 },
                        { from: 350000, to: 400000, rate: 0.05 },
                        { from: 400000, to: 500000, rate: 0.10 },
                        { from: 500000, to: 600000, rate: 0.15 },
                        { from: 600000, to: Infinity, rate: 0.20 },
                    ],
                    minimumPerception: 3000,
                }
            },
            labels: {
                socialContributions: [
                    { key: 'cnaps', label: 'CNaPS' },
                    { key: 'sanitary', label: 'OSTIE / SANITAIRE' },
                ],
                incomeTax: 'IRSA'
            }
        }
    },
    { 
        code: 'MY', name: 'Malaysia', currency: 'MYR', symbol: 'RM',
        thousandsSeparator: ',',
        decimalSeparator: '.',
        denominations: [
            { value: 0.05, type: 'coin' }, { value: 0.1, type: 'coin' }, { value: 0.2, type: 'coin' }, { value: 0.5, type: 'coin' },
            { value: 1, type: 'banknote' }, { value: 5, type: 'banknote' }, { value: 10, type: 'banknote' },
            { value: 20, type: 'banknote' }, { value: 50, type: 'banknote' }, { value: 100, type: 'banknote' },
        ],
    },
    { 
        code: 'KP', name: 'North Korea', currency: 'KPW', symbol: '₩',
        thousandsSeparator: ',',
        decimalSeparator: '.',
        denominations: [
            { value: 10, type: 'coin' }, { value: 50, type: 'coin' }, { value: 100, type: 'coin' },
            { value: 1, type: 'banknote' }, { value: 5, type: 'banknote' }, { value: 10, type: 'banknote' }, { value: 50, type: 'banknote' }, { value: 100, type: 'banknote' }, { value: 200, type: 'banknote' }, { value: 500, type: 'banknote' }, { value: 1000, type: 'banknote' }, { value: 2000, type: 'banknote' }, { value: 5000, type: 'banknote' },
        ],
    },
    { 
        code: 'NO', name: 'Norway', currency: 'NOK', symbol: 'kr',
        thousandsSeparator: '.',
        decimalSeparator: ',',
        denominations: [
            { value: 1, type: 'coin' }, { value: 5, type: 'coin' }, { value: 10, type: 'coin' }, { value: 20, type: 'coin' },
            { value: 50, type: 'banknote' }, { value: 100, type: 'banknote' }, { value: 200, type: 'banknote' },
            { value: 500, type: 'banknote' }, { value: 1000, type: 'banknote' },
        ],
    },
    { 
        code: 'PH', name: 'Philippines', currency: 'PHP', symbol: '₱',
        thousandsSeparator: ',',
        decimalSeparator: '.',
        denominations: [
            { value: 1, type: 'coin' }, { value: 5, type: 'coin' }, { value: 10, type: 'coin' }, { value: 20, type: 'coin' },
            { value: 20, type: 'banknote' }, { value: 50, type: 'banknote' }, { value: 100, type: 'banknote' },
            { value: 200, type: 'banknote' }, { value: 500, type: 'banknote' }, { value: 1000, type: 'banknote' },
        ],
    },
    { 
        code: 'KR', name: 'South Korea', currency: 'KRW', symbol: '₩',
        thousandsSeparator: ',',
        decimalSeparator: '.',
        denominations: [
            { value: 10, type: 'coin' }, { value: 50, type: 'coin' }, { value: 100, type: 'coin' }, { value: 500, type: 'coin' },
            { value: 1000, type: 'banknote' }, { value: 5000, type: 'banknote' }, { value: 10000, type: 'banknote' },
            { value: 50000, type: 'banknote' },
        ],
    },
    { 
        code: 'TZ', name: 'Tanzania', currency: 'TZS', symbol: 'TSh',
        thousandsSeparator: ',',
        decimalSeparator: '.',
        denominations: [
            { value: 50, type: 'coin' }, { value: 100, type: 'coin' }, { value: 200, type: 'coin' }, { value: 500, type: 'coin' },
            { value: 500, type: 'banknote' }, { value: 1000, type: 'banknote' }, { value: 2000, type: 'banknote' },
            { value: 5000, type: 'banknote' }, { value: 10000, type: 'banknote' },
        ],
    },
    { 
        code: 'GB', name: 'United Kingdom', currency: 'GBP', symbol: '£',
        thousandsSeparator: ',',
        decimalSeparator: '.',
        denominations: [
            { value: 0.01, type: 'coin' }, { value: 0.02, type: 'coin' }, { value: 0.05, type: 'coin' },
            { value: 0.10, type: 'coin' }, { value: 0.20, type: 'coin' }, { value: 0.50, type: 'coin' },
            { value: 1, type: 'coin' }, { value: 2, type: 'coin' },
            { value: 5, type: 'banknote' }, { value: 10, type: 'banknote' }, { value: 20, type: 'banknote' },
            { value: 50, type: 'banknote' },
        ],
    },
    { 
        code: 'US', name: 'United States', currency: 'USD', symbol: '$',
        thousandsSeparator: ',',
        decimalSeparator: '.',
        denominations: usDenominations,
    },
    { 
        code: 'VN', name: 'Vietnam', currency: 'VND', symbol: '₫',
        thousandsSeparator: '.',
        decimalSeparator: ',',
        denominations: [
            { value: 200, type: 'coin' }, { value: 500, type: 'coin' }, { value: 1000, type: 'coin' }, { value: 2000, type: 'coin' }, { value: 5000, type: 'coin' },
            { value: 10000, type: 'banknote' }, { value: 20000, type: 'banknote' }, { value: 50000, type: 'banknote' },
            { value: 100000, type: 'banknote' }, { value: 200000, type: 'banknote' }, { value: 500000, type: 'banknote' },
        ],
    },
];

export const INCOTERMS = [
    'EXW (Ex Works)',
    'FCA (Free Carrier)',
    'CPT (Carriage Paid To)',
    'CIP (Carriage and Insurance Paid To)',
    'DAP (Delivered at Place)',
    'DPU (Delivered at Place Unloaded)',
    'DDP (Delivered Duty Paid)',
    'FAS (Free Alongside Ship)',
    'FOB (Free on Board)',
    'CFR (Cost and Freight)',
    'CIF (Cost, Insurance and Freight)',
];

export const PAYMENT_TERMS = [
    'Cash in Advance (Prepayment)',
    'Letter of Credit (L/C)',
    'Documentary Collection (D/C)',
    'Open Account (O/A)',
    'Consignment',
];

export interface NavItem {
    label: { en: string; fr: string; };
    path?: string;
    icon: string;
    permission?: string;
    children?: NavItem[];
}

export const navItems: NavItem[] = [
    { label: { en: 'Dashboard', fr: 'Tableau de bord' }, path: '/dashboard', icon: 'Home', permission: PERMISSIONS.DASHBOARD_VIEW },
    { 
      label: { en: 'Operations', fr: 'Opérations' }, 
      icon: 'Layers',
      permission: PERMISSIONS.OPERATIONS_VIEW,
      children: [
        { label: { en: 'Farm Map', fr: 'Carte de la ferme' }, path: '/operations/map', icon: 'Map' },
        { label: { en: 'Operational Calendar', fr: 'Calendrier Opérationnel' }, path: '/operations/calendar', icon: 'Calendar' },
        { label: { en: 'Production Sites', fr: 'Sites de production' }, path: '/sites', icon: 'MapPin' },
        { label: { en: 'Seaweed Types', fr: "Types d'algues" }, path: '/seaweed-types', icon: 'Beaker' },
        { label: { en: 'Module Management', fr: 'Gestion des modules' }, path: '/modules', icon: 'Grid' },
        { label: { en: 'Cutting Operations', fr: 'Opérations de coupe' }, path: '/operations/cutting', icon: 'Scissors' },
        { label: { en: 'Cultivation Cycle', fr: 'Cycle de culture' }, path: '/cultivation', icon: 'GitBranch' },
        { label: { en: 'Harvest & Processing', fr: 'Récolte et traitement' }, path: '/harvesting', icon: 'Scissors' },
        { label: { en: 'Drying Management', fr: 'Gestion du séchage' }, path: '/drying', icon: 'Wind' },
        { label: { en: 'Bagging', fr: 'Mise en sac' }, path: '/bagging', icon: 'Archive' },
      ]
    },
    {
      label: { en: 'Inventory', fr: 'Inventaire' },
      icon: 'Package',
      permission: PERMISSIONS.INVENTORY_VIEW,
      children: [
        { label: { en: 'On-Site Storage', fr: 'Stockage sur site' }, path: '/inventory/on-site-storage', icon: 'Warehouse' },
        { label: { en: 'Farmer Dry Deliveries', fr: 'Livraisons sèches des fermiers' }, path: '/inventory/farmer-deliveries', icon: 'Truck' },
        { label: { en: 'Shipping Slips', fr: "Bons d'expédition" }, path: '/inventory/site-transfers', icon: 'ArrowRightLeft' },
        { label: { en: 'Pressing Warehouse', fr: 'Magasin de presse' }, path: '/inventory/pressed-warehouse', icon: 'Building' },
        { label: { en: 'Exports', fr: 'Exportations' }, path: '/exports', icon: 'Globe' },
      ]
    },
    {
      label: { en: 'Stakeholders & Payments', fr: 'Acteurs et paiements' },
      icon: 'Users',
      permission: PERMISSIONS.STAKEHOLDERS_VIEW,
      children: [
        { label: { en: 'Farmer Management', fr: 'Gestion des fermiers' }, path: '/farmers', icon: 'User' },
        { label: { en: 'Employee Management', fr: 'Gestion des employés' }, path: '/employees', icon: 'Briefcase' },
        { label: { en: 'Service Providers', fr: 'Prestataires de services' }, path: '/providers', icon: 'Truck' },
        { label: { en: 'Farmer Credits', fr: 'Crédits fermiers' }, path: '/farmer-credits', icon: 'CreditCard' },
        { label: { en: 'Document Payments', fr: 'Paiements sur document' }, path: '/document-payments', icon: 'FileText' },
      ]
    },
    {
      label: { en: 'Monitoring', fr: 'Suivi' },
      icon: 'Activity',
      permission: PERMISSIONS.MONITORING_VIEW,
      children: [
        { label: { en: 'Periodic Tests', fr: 'Tests périodiques' }, path: '/monitoring/tests', icon: 'Beaker' },
        { label: { en: 'Incident Management', fr: 'Gestion des incidents' }, path: '/monitoring/incidents', icon: 'AlertTriangle' },
      ]
    },
    { label: { en: 'Reports', fr: 'Rapports' }, path: '/reports', icon: 'FileSpreadsheet', permission: PERMISSIONS.REPORTS_VIEW },
    { label: { en: 'User Manual', fr: "Manuel d'utilisateur" }, path: '/manual', icon: 'BookOpen' },
    { 
      label: { en: 'Settings', fr: 'Paramètres' }, 
      icon: 'Settings',
      permission: PERMISSIONS.SETTINGS_VIEW,
      children: [
        { label: { en: 'General', fr: 'Généraux' }, path: '/settings/general', icon: 'SlidersHorizontal' },
        { label: { en: 'User Management', fr: 'Gestion des utilisateurs' }, path: '/settings/users', icon: 'Users' },
        { label: { en: 'Roles', fr: 'Rôles' }, path: '/settings/roles', icon: 'UserCog' },
        { label: { en: 'Incident Types', fr: "Types d'incident" }, path: '/settings/incident-types', icon: 'Layers' },
        { label: { en: 'Incident Severities', fr: "Sévérités d'incident" }, path: '/settings/incident-severities', icon: 'TrendingUp' },
      ]
    },
];

export const CYCLE_DURATION_DAYS = 45;
export const NEARING_HARVEST_DAYS = 7;
export const UNASSIGNED_ALERT_THRESHOLD_DAYS = 30;
