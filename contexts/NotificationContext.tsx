import React, { createContext, useContext, useState, useEffect } from 'react';
import { useData } from './DataContext';
import { UNASSIGNED_ALERT_THRESHOLD_DAYS, CYCLE_DURATION_DAYS, NEARING_HARVEST_DAYS } from '../constants';
import type { Notification } from '../types';
import { ModuleStatus } from '../types';

interface NotificationContextType {
  notifications: Notification[];
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { modules, cultivationCycles } = useData();
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const newNotifications: Notification[] = [];

        // 1. Unassigned modules check
        modules.forEach(module => {
            if (!module.farmerId) {
                const completedCycles = cultivationCycles
                    .filter(c => c.moduleId === module.id && c.harvestDate)
                    .sort((a, b) => new Date(b.harvestDate!).getTime() - new Date(a.harvestDate!).getTime());

                if (completedCycles.length > 0) {
                    const lastHarvestDate = new Date(completedCycles[0].harvestDate!);
                    const daysSinceHarvest = Math.floor((today.getTime() - lastHarvestDate.getTime()) / (1000 * 3600 * 24));

                    if (daysSinceHarvest > UNASSIGNED_ALERT_THRESHOLD_DAYS) {
                        newNotifications.push({
                            id: `unassigned-${module.id}`,
                            type: 'MODULE_UNASSIGNED',
                            messageKey: 'notification_unassigned',
                            messageParams: { code: module.code, days: UNASSIGNED_ALERT_THRESHOLD_DAYS },
                            date: today.toISOString(),
                            relatedId: module.id,
                            path: `/modules?highlight=${module.id}`
                        });
                    }
                }
            }
        });

        // 2. Harvest nearing/overdue check
        cultivationCycles.forEach(cycle => {
            if (cycle.status === ModuleStatus.PLANTED || cycle.status === ModuleStatus.GROWING) {
                const plantingDate = new Date(cycle.plantingDate);
                plantingDate.setHours(0, 0, 0, 0);
                const daysSincePlanting = Math.floor((today.getTime() - plantingDate.getTime()) / (1000 * 3600 * 24));
                const module = modules.find(m => m.id === cycle.moduleId);

                if (daysSincePlanting > CYCLE_DURATION_DAYS) {
                    newNotifications.push({
                        id: `overdue-${cycle.id}`,
                        type: 'HARVEST_OVERDUE',
                        messageKey: 'notification_overdue',
                        messageParams: { code: module?.code || 'N/A', days: daysSincePlanting },
                        date: today.toISOString(),
                        relatedId: cycle.id,
                        path: `/cultivation?highlight=${cycle.id}`
                    });
                } else if (daysSincePlanting > CYCLE_DURATION_DAYS - NEARING_HARVEST_DAYS) {
                     newNotifications.push({
                        id: `nearing-${cycle.id}`,
                        type: 'HARVEST_NEARING',
                        messageKey: 'notification_nearing',
                        messageParams: { code: module?.code || 'N/A', days: daysSincePlanting },
                        date: today.toISOString(),
                        relatedId: cycle.id,
                        path: `/cultivation?highlight=${cycle.id}`
                    });
                }
            }
        });

        newNotifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setNotifications(newNotifications);

    }, [modules, cultivationCycles]);

    return (
        <NotificationContext.Provider value={{ notifications }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = (): NotificationContextType => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
