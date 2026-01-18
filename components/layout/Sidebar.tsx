
import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { navItems } from '../../constants';
import Icon from '../ui/Icon';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
}

interface NavItem {
    label: { en: string; fr: string; };
    path?: string;
    icon: string;
    permission?: string;
    children?: NavItem[];
}

// Tooltip component for collapsed sidebar
const Tooltip: React.FC<{ text: string }> = ({ text }) => (
    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-900/90 dark:bg-black/90 backdrop-blur text-white text-sm font-medium rounded-md shadow-lg whitespace-nowrap z-50 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity delay-150 pointer-events-none">
        {text}
        <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-gray-900/90 dark:border-r-black/90" />
    </div>
);


const Sidebar: React.FC<SidebarProps> = ({ isOpen, setOpen }) => {
  const { language, t } = useLocalization();
  const { can } = useAuth();
  const { pathname } = useLocation();

  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({});
  
  const accessibleNavItems = useMemo(() => {
    return navItems.map(item => {
      if (!item.permission || can(item.permission)) {
        if (item.children) {
          const accessibleChildren = item.children.filter(child => !child.permission || can(child.permission));
          if (accessibleChildren.length > 0) {
            return { ...item, children: accessibleChildren };
          }
          // If a parent has a direct path, it might be visible even if children are not
          if (item.path) {
            return { ...item, children: [] };
          }
        } else {
          return item;
        }
      }
      return null;
    }).filter((item): item is NavItem => item !== null);
  }, [can]);

  useEffect(() => {
    const nextOpenMenus: { [key: string]: boolean } = {};
    accessibleNavItems.forEach(item => {
        if (item.children) {
            const isChildActive = item.children.some(child => child.path && pathname.startsWith(child.path));
            if (isChildActive) {
                nextOpenMenus[item.label.en] = true;
            }
        }
    });
    setOpenMenus(nextOpenMenus);
  }, [pathname, accessibleNavItems]);

  const toggleMenu = (label: string) => {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const NavItemLink: React.FC<{ item: NavItem }> = ({ item }) => (
    <div className="relative group">
        <NavLink
            to={item.path!}
            onClick={() => { if (window.innerWidth < 768) setOpen(false); }}
            className={({ isActive }) => 
                `flex items-center p-2 my-1 rounded-md transition-all duration-200 w-full ${
                    isActive 
                        ? 'bg-blue-600/90 text-white shadow-lg shadow-blue-500/30 backdrop-blur-sm'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/10'
                }`
            }
        >
            <Icon name={item.icon} className="w-5 h-5 flex-shrink-0" />
            {isOpen && <span className="ml-3 whitespace-nowrap">{item.label[language]}</span>}
        </NavLink>
        {!isOpen && <Tooltip text={item.label[language]} />}
    </div>
  );

  const AccordionItem: React.FC<{ item: NavItem }> = ({ item }) => {
    const isChildActive = item.children?.some(child => child.path && pathname.startsWith(child.path)) || false;
    const isMenuOpen = openMenus[item.label.en] || false;

    return (
        <div>
            <div className="relative group">
                <div
                    onClick={() => toggleMenu(item.label.en)}
                    className={`flex items-center justify-between p-2 my-1 rounded-md cursor-pointer transition-all duration-200 ${
                        isChildActive
                            ? 'bg-blue-100/80 dark:bg-blue-900/40 font-semibold text-blue-800 dark:text-blue-200 backdrop-blur-sm'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/10'
                    }`}
                >
                    <div className="flex items-center">
                        <Icon name={item.icon} className="w-5 h-5 flex-shrink-0" />
                        {isOpen && <span className="ml-3 whitespace-nowrap">{item.label[language]}</span>}
                    </div>
                    {isOpen && <Icon name="ChevronDown" className={`w-5 h-5 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />}
                </div>
                {!isOpen && <Tooltip text={item.label[language]} />}
            </div>
            {isMenuOpen && isOpen && (
                <div className="pl-6 ml-4 border-l-2 border-blue-200/50 dark:border-blue-800/50">
                    {item.children?.map(child => <NavItemLink key={child.path} item={child} />)}
                </div>
            )}
        </div>
    )
  };

  return (
    <aside className={`fixed top-0 left-0 h-full bg-white/70 dark:bg-black/40 backdrop-blur-xl border-r border-white/20 dark:border-gray-700/50 transition-all duration-300 z-50 ${isOpen ? 'w-64' : 'w-16'} ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      <div className="flex items-center justify-between p-3 h-[73px]">
        {isOpen && <span className="text-xl font-bold ml-1 text-gray-800 dark:text-white">{t('appName')}</span>}
        <button onClick={() => setOpen(!isOpen)} className="p-2 rounded-md hover:bg-white/50 dark:hover:bg-white/10 hidden md:inline-flex text-gray-600 dark:text-gray-300">
          <Icon name="Menu" className="w-6 h-6" />
        </button>
      </div>
      <nav className="p-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700" style={{ height: 'calc(100vh - 73px)' }}>
        {accessibleNavItems.map(item => (
          item.children && item.children.length > 0
            ? <AccordionItem key={item.label.en} item={item} /> 
            : <NavItemLink key={item.path} item={item} />
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
