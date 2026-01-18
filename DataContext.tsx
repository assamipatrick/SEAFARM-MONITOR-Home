
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import type { Site, Farmer, CreditType, FarmerCredit, Employee, SeaweedType, Module, CultivationCycle, ModuleStatusHistory, StockMovement, PressingSlip, PressedStockMovement, ExportDocument, SiteTransfer, ServiceProvider, SeaweedPriceHistory, Repayment, FarmerDelivery, CuttingOperation, SiteTransferHistoryEntry, Incident, IncidentType, IncidentSeverity, PeriodicTest, Role, MonthlyPayment, TestPeriod, PestObservation, User, Invitation, MessageLog, GalleryPhoto } from './types';
import { ModuleStatus, StockMovementType, PressedStockMovementType, SiteTransferStatus, ExportDocType, ContainerType, IncidentStatus, RecipientType, InvitationStatus } from './types';
import { PERMISSIONS } from './permissions';

// --- Default Seed Data ---
const defaultIncidentTypes: IncidentType[] = [
    { id: 'ENVIRONMENTAL', name: 'Environmental', isDefault: true },
    { id: 'EQUIPMENT_FAILURE', name: 'Equipment Failure', isDefault: true },
    { id: 'PEST_DISEASE', name: 'Pest/Disease', isDefault: true },
    { id: 'SECURITY', name: 'Security', isDefault: true },
    { id: 'OTHER', name: 'Other', isDefault: true },
];
const defaultIncidentSeverities: IncidentSeverity[] = [
    { id: 'LOW', name: 'Low', isDefault: true },
    { id: 'MEDIUM', name: 'Medium', isDefault: true },
    { id: 'HIGH', name: 'High', isDefault: true },
    { id: 'CRITICAL', name: 'Critical', isDefault: true },
];
const defaultRoles: Role[] = [
    { 
        id: 'SITE_MANAGER', 
        name: 'Site Manager (Admin)', 
        permissions: [
            PERMISSIONS.DASHBOARD_VIEW,
            PERMISSIONS.OPERATIONS_VIEW,
            PERMISSIONS.INVENTORY_VIEW,
            PERMISSIONS.STAKEHOLDERS_VIEW,
            PERMISSIONS.MONITORING_VIEW,
            PERMISSIONS.REPORTS_VIEW,
            PERMISSIONS.SETTINGS_VIEW,
            PERMISSIONS.USERS_VIEW,
            PERMISSIONS.ROLES_VIEW,
            PERMISSIONS.SITES_VIEW,
            PERMISSIONS.MODULES_VIEW,
            PERMISSIONS.SITES_MANAGE, 
            PERMISSIONS.MODULES_MANAGE, 
            PERMISSIONS.EMPLOYEES_MANAGE, 
            PERMISSIONS.FARMERS_MANAGE, 
            PERMISSIONS.INCIDENTS_MANAGE,
            PERMISSIONS.SETTINGS_GENERAL_MANAGE,
            PERMISSIONS.ROLES_MANAGE,
            PERMISSIONS.USERS_INVITE,
            PERMISSIONS.PAYMENTS_MANAGE,
            PERMISSIONS.CREDITS_MANAGE,
            PERMISSIONS.PAYROLL_MANAGE,
            PERMISSIONS.INVENTORY_MANAGE_ON_SITE,
            PERMISSIONS.EXPORTS_MANAGE,
            PERMISSIONS.GALLERY_VIEW,
            PERMISSIONS.GALLERY_MANAGE
        ], 
        isDefault: true 
    },
    { 
        id: 'OPERATIONS_LEAD', 
        name: 'Operations Lead', 
        permissions: [
            PERMISSIONS.DASHBOARD_VIEW,
            PERMISSIONS.OPERATIONS_VIEW,
            PERMISSIONS.FARM_MAP_VIEW,
            PERMISSIONS.OPERATIONAL_CALENDAR_VIEW,
            PERMISSIONS.CYCLES_VIEW,
            PERMISSIONS.CYCLES_MANAGE, 
            PERMISSIONS.HARVESTING_VIEW,
            PERMISSIONS.HARVESTING_MANAGE, 
            PERMISSIONS.DRYING_VIEW,
            PERMISSIONS.DRYING_MANAGE, 
            PERMISSIONS.BAGGING_VIEW,
            PERMISSIONS.BAGGING_MANAGE,
            PERMISSIONS.MODULES_VIEW,
            PERMISSIONS.SITES_VIEW,
            PERMISSIONS.GALLERY_VIEW
        ], 
        isDefault: true 
    },
    { 
        id: 'ACCOUNTANT', 
        name: 'Accountant', 
        permissions: [
            PERMISSIONS.DASHBOARD_VIEW,
            PERMISSIONS.STAKEHOLDERS_VIEW,
            PERMISSIONS.PAYMENTS_VIEW,
            PERMISSIONS.PAYMENTS_MANAGE, 
            PERMISSIONS.CREDITS_VIEW,
            PERMISSIONS.CREDITS_MANAGE, 
            PERMISSIONS.PAYROLL_VIEW,
            PERMISSIONS.PAYROLL_MANAGE,
            PERMISSIONS.REPORTS_VIEW
        ], 
        isDefault: true 
    },
];

const defaultUsers: User[] = [
  { id: 'user-admin', email: 'admin@seafarm.com', password: 'password', firstName: 'Admin', lastName: 'User', roleId: 'SITE_MANAGER' }
];
const defaultCreditTypes: CreditType[] = [
    { id: 'ct-1', name: 'Rice', hasQuantity: true, unit: 'Kg', hasUnitPrice: true, isDirectAmount: false },
    { id: 'ct-2', name: 'Cash Advance', hasQuantity: false, hasUnitPrice: false, isDirectAmount: true },
    { id: 'ct-3', name: 'Cutting Service Fee', hasQuantity: false, unit: '', hasUnitPrice: false, isDirectAmount: true },
];


// --- Helper function for localStorage ---
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved === null) {
      return defaultValue;
    }
    const parsed = JSON.parse(saved);
    return parsed !== null && parsed !== undefined ? parsed : defaultValue;
  } catch (error) {
    console.error(`Error loading ${key} from localStorage`, error);
    return defaultValue;
  }
}

interface DataContextType {
  sites: Site[];
  addSite: (site: Omit<Site, 'id'>) => void;
  updateSite: (site: Site) => void;
  deleteSite: (siteId: string) => void;
  employees: Employee[];
  addEmployee: (employee: Omit<Employee, 'id'>) => void;
  updateEmployee: (employee: Employee) => void;
  deleteEmployee: (employeeId: string) => void;
  deleteMultipleEmployees: (employeeIds: string[]) => void;
  updateEmployeesSite: (employeeIds: string[], siteId: string) => void;
  farmers: Farmer[];
  addFarmer: (farmer: Omit<Farmer, 'id'>) => void;
  updateFarmer: (farmer: Farmer) => void;
  deleteFarmer: (farmerId: string) => void;
  deleteMultipleFarmers: (farmerIds: string[]) => void;
  updateFarmersSite: (farmerIds: string[], siteId: string) => void;
  getFarmersBySite: (siteId: string) => Farmer[];
  serviceProviders: ServiceProvider[];
  addServiceProvider: (provider: Omit<ServiceProvider, 'id'>) => void;
  updateServiceProvider: (provider: ServiceProvider) => void;
  deleteServiceProvider: (providerId: string) => void;
  creditTypes: CreditType[];
  addCreditType: (creditType: Omit<CreditType, 'id'>) => void;
  updateCreditType: (creditType: CreditType) => void;
  deleteCreditType: (creditTypeId: string) => void;
  farmerCredits: FarmerCredit[];
  addFarmerCredit: (credit: Omit<FarmerCredit, 'id'>) => void;
  addMultipleFarmerCredits: (credits: Omit<FarmerCredit, 'id'>[]) => void;
  repayments: Repayment[];
  addRepayment: (repayment: Omit<Repayment, 'id'>) => void;
  addMultipleRepayments: (repayments: Omit<Repayment, 'id'>[]) => void;
  monthlyPayments: MonthlyPayment[];
  addMonthlyPayment: (payment: Omit<MonthlyPayment, 'id'>) => void;
  addMultipleMonthlyPayments: (payments: Omit<MonthlyPayment, 'id'>[]) => void;
  updateMonthlyPayment: (payment: MonthlyPayment) => void;
  deleteMonthlyPayment: (paymentId: string) => void;
  seaweedTypes: SeaweedType[];
  addSeaweedType: (seaweedType: Omit<SeaweedType, 'id' | 'priceHistory'>) => void;
  updateSeaweedType: (seaweedType: SeaweedType) => void;
  deleteSeaweedType: (seaweedTypeId: string) => void;
  updateSeaweedPrices: (seaweedTypeId: string, newPrice: SeaweedPriceHistory) => void;
  modules: Module[];
  cultivationCycles: CultivationCycle[];
  addModule: (moduleData: Omit<Module, 'id' | 'farmerId' | 'statusHistory'>) => void;
  updateModule: (moduleData: Module) => void;
  deleteModule: (moduleId: string) => void;
  deleteMultipleModules: (moduleIds: string[]) => void;
  updateModulesFarmer: (moduleIds: string[], farmerId: string) => void;
  addCultivationCycle: (cycleData: Omit<CultivationCycle, 'id'>, farmerId: string) => void;
  updateCultivationCycle: (cycleData: CultivationCycle) => void;
  updateMultipleCultivationCycles: (cycles: CultivationCycle[]) => void;
  deleteCultivationCycle: (cycleId: string) => void;
  startCultivationFromCuttings: (cuttingData: Omit<CuttingOperation, 'id'>, cycleData: Omit<CultivationCycle, 'id'>, beneficiaryFarmerId: string) => void;
  stockMovements: StockMovement[];
  addStockMovement: (movement: Omit<StockMovement, 'id'>) => void;
  addMultipleStockMovements: (movements: Omit<StockMovement, 'id'>[]) => void;
  recordReturnFromPressing: (data: {
    date: string;
    siteId: string;
    seaweedTypeId: string;
    designation: string;
    kg: number;
    bags: number;
    pressingSlipId: string;
  }) => void;
  farmerDeliveries: FarmerDelivery[];
  addFarmerDelivery: (data: Omit<FarmerDelivery, 'id' | 'slipNo'>) => void;
  deleteFarmerDelivery: (deliveryId: string) => void;
  addInitialStock: (data: Omit<StockMovement, 'id' | 'type' | 'relatedId'>) => void;
  transferBaggedToStock: (cycleIds: string[], date?: string) => void;
  exportStockBatch: (cycleId: string) => void;
  pressingSlips: PressingSlip[];
  pressedStockMovements: PressedStockMovement[];
  addPressingSlip: (slipData: Omit<PressingSlip, 'id' | 'slipNo'>) => void;
  updatePressingSlip: (slip: PressingSlip) => void;
  deletePressingSlip: (slipId: string) => void;
  addInitialPressedStock: (data: Omit<PressedStockMovement, 'id' | 'type' | 'relatedId'>) => void;
  addPressedStockAdjustment: (data: Omit<PressedStockMovement, 'id' | 'relatedId'>) => void;
  exportDocuments: ExportDocument[];
  addExportDocument: (docData: Omit<ExportDocument, 'id' | 'docNo'>, sourceSiteId: string) => void;
  updateExportDocument: (docData: ExportDocument) => void;
  deleteExportDocument: (docId: string) => void;
  siteTransfers: SiteTransfer[];
  addSiteTransfer: (transferData: Omit<SiteTransfer, 'id' | 'status' | 'history'>) => void;
  updateSiteTransfer: (transfer: SiteTransfer) => void;
  cuttingOperations: CuttingOperation[];
  addCuttingOperation: (operationData: Omit<CuttingOperation, 'id'>) => void;
  updateCuttingOperation: (operation: CuttingOperation) => void;
  updateMultipleCuttingOperations: (operationIds: string[], paymentDate: string) => void;
  deleteCuttingOperation: (operationId: string) => void;
  incidents: Incident[];
  addIncident: (incident: Omit<Incident, 'id'>) => void;
  updateIncident: (incident: Incident) => void;
  deleteIncident: (incidentId: string) => void;
  incidentTypes: IncidentType[];
  addIncidentType: (type: Omit<IncidentType, 'id'>) => void;
  updateIncidentType: (type: IncidentType) => void;
  deleteIncidentType: (typeId: string) => void;
  incidentSeverities: IncidentSeverity[];
  addIncidentSeverity: (severity: Omit<IncidentSeverity, 'id'>) => void;
  updateIncidentSeverity: (severity: IncidentSeverity) => void;
  deleteIncidentSeverity: (severityId: string) => void;
  roles: Role[];
  addRole: (role: Omit<Role, 'id'>) => Role | undefined;
  updateRole: (role: Role) => void;
  deleteRole: (roleId: string) => void;
  periodicTests: PeriodicTest[];
  addPeriodicTest: (test: Omit<PeriodicTest, 'id'>) => void;
  updatePeriodicTest: (test: PeriodicTest) => void;
  deletePeriodicTest: (testId: string) => void;
  pestObservations: PestObservation[];
  users: User[];
  findUserByEmail: (email: string) => User | undefined;
  addUser: (userData: Omit<User, 'id'>, invitationToken?: string) => User | undefined;
  setUserPasswordResetToken: (email: string, token: string, expires: Date) => boolean;
  findUserByPasswordResetToken: (token: string) => User | undefined;
  updateUserPassword: (userId: string, newPassword: string) => boolean;
  updateUser: (user: User) => void;
  markCyclesAsPaid: (cycleIds: string[], paymentRunId: string) => void;
  markDeliveriesAsPaid: (deliveryIds: string[], paymentRunId: string) => void;
  invitations: Invitation[];
  addInvitation: (data: Omit<Invitation, 'id' | 'token' | 'createdAt'>) => Invitation;
  deleteInvitation: (invitationId: string) => void;
  findInvitationByToken: (token: string) => Invitation | undefined;
  addMessageLog: (log: Omit<MessageLog, 'id'>) => void;
  messageLogs: MessageLog[];
  galleryPhotos: GalleryPhoto[];
  addGalleryPhoto: (photo: Omit<GalleryPhoto, 'id'>) => void;
  updateGalleryPhotoComment: (id: string, comment: string) => void;
  deleteGalleryPhoto: (id: string) => void;
  clearAllData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sites, setSites] = useState<Site[]>(() => loadFromStorage('sites', []));
  const [employees, setEmployees] = useState<Employee[]>(() => loadFromStorage('employees', []));
  const [farmers, setFarmers] = useState<Farmer[]>(() => loadFromStorage('farmers', []));
  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>(() => loadFromStorage('serviceProviders', []));
  const [creditTypes, setCreditTypes] = useState<CreditType[]>(() => loadFromStorage('creditTypes', defaultCreditTypes));
  const [farmerCredits, setFarmerCredits] = useState<FarmerCredit[]>(() => loadFromStorage('farmerCredits', []));
  const [repayments, setRepayments] = useState<Repayment[]>(() => loadFromStorage('repayments', []));
  const [monthlyPayments, setMonthlyPayments] = useState<MonthlyPayment[]>(() => loadFromStorage('monthlyPayments', []));
  const [seaweedTypes, setSeaweedTypes] = useState<SeaweedType[]>(() => loadFromStorage('seaweedTypes', []));
  const [modules, setModules] = useState<Module[]>(() => loadFromStorage('modules', []));
  const [cultivationCycles, setCultivationCycles] = useState<CultivationCycle[]>(() => loadFromStorage('cultivationCycles', []));
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => loadFromStorage('stockMovements', []));
  const [pressingSlips, setPressingSlips] = useState<PressingSlip[]>(() => loadFromStorage('pressingSlips', []));
  const [pressedStockMovements, setPressedStockMovements] = useState<PressedStockMovement[]>(() => loadFromStorage('pressedStockMovements', []));
  const [exportDocuments, setExportDocuments] = useState<ExportDocument[]>(() => loadFromStorage('exportDocuments', []));
  const [siteTransfers, setSiteTransfers] = useState<SiteTransfer[]>(() => loadFromStorage('siteTransfers', []));
  const [cuttingOperations, setCuttingOperations] = useState<CuttingOperation[]>(() => loadFromStorage('cuttingOperations', []));
  const [farmerDeliveries, setFarmerDeliveries] = useState<FarmerDelivery[]>(() => loadFromStorage('farmerDeliveries', []));
  const [incidents, setIncidents] = useState<Incident[]>(() => loadFromStorage('incidents', []));
  const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>(() => loadFromStorage('incidentTypes', defaultIncidentTypes));
  const [incidentSeverities, setIncidentSeverities] = useState<IncidentSeverity[]>(() => loadFromStorage('incidentSeverities', defaultIncidentSeverities));
  const [roles, setRoles] = useState<Role[]>(() => loadFromStorage('roles', defaultRoles));
  const [periodicTests, setPeriodicTests] = useState<PeriodicTest[]>(() => loadFromStorage('periodicTests', []));
  const [pestObservations, setPestObservations] = useState<PestObservation[]>(() => loadFromStorage('pestObservations', []));
  const [users, setUsers] = useState<User[]>(() => loadFromStorage('users', defaultUsers));
  const [invitations, setInvitations] = useState<Invitation[]>(() => loadFromStorage('invitations', []));
  const [messageLogs, setMessageLogs] = useState<MessageLog[]>(() => loadFromStorage('messageLogs', []));
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>(() => loadFromStorage('galleryPhotos', []));
  
  const seedInitialized = useRef(false);

  useEffect(() => { localStorage.setItem('sites', JSON.stringify(sites)); }, [sites]);
  useEffect(() => { localStorage.setItem('employees', JSON.stringify(employees)); }, [employees]);
  useEffect(() => { localStorage.setItem('farmers', JSON.stringify(farmers)); }, [farmers]);
  useEffect(() => { localStorage.setItem('serviceProviders', JSON.stringify(serviceProviders)); }, [serviceProviders]);
  useEffect(() => { localStorage.setItem('creditTypes', JSON.stringify(creditTypes)); }, [creditTypes]);
  useEffect(() => { localStorage.setItem('farmerCredits', JSON.stringify(farmerCredits)); }, [farmerCredits]);
  useEffect(() => { localStorage.setItem('repayments', JSON.stringify(repayments)); }, [repayments]);
  useEffect(() => { localStorage.setItem('monthlyPayments', JSON.stringify(monthlyPayments)); }, [monthlyPayments]);
  useEffect(() => { localStorage.setItem('seaweedTypes', JSON.stringify(seaweedTypes)); }, [seaweedTypes]);
  useEffect(() => { localStorage.setItem('modules', JSON.stringify(modules)); }, [modules]);
  useEffect(() => { localStorage.setItem('cultivationCycles', JSON.stringify(cultivationCycles)); }, [cultivationCycles]);
  useEffect(() => { localStorage.setItem('stockMovements', JSON.stringify(stockMovements)); }, [stockMovements]);
  useEffect(() => { localStorage.setItem('pressingSlips', JSON.stringify(pressingSlips)); }, [pressingSlips]);
  useEffect(() => { localStorage.setItem('pressedStockMovements', JSON.stringify(pressedStockMovements)); }, [pressedStockMovements]);
  useEffect(() => { localStorage.setItem('exportDocuments', JSON.stringify(exportDocuments)); }, [exportDocuments]);
  useEffect(() => { localStorage.setItem('siteTransfers', JSON.stringify(siteTransfers)); }, [siteTransfers]);
  useEffect(() => { localStorage.setItem('cuttingOperations', JSON.stringify(cuttingOperations)); }, [cuttingOperations]);
  useEffect(() => { localStorage.setItem('farmerDeliveries', JSON.stringify(farmerDeliveries)); }, [farmerDeliveries]);
  useEffect(() => { localStorage.setItem('incidents', JSON.stringify(incidents)); }, [incidents]);
  useEffect(() => { localStorage.setItem('incidentTypes', JSON.stringify(incidentTypes)); }, [incidentTypes]);
  useEffect(() => { localStorage.setItem('incidentSeverities', JSON.stringify(incidentSeverities)); }, [incidentSeverities]);
  useEffect(() => { localStorage.setItem('roles', JSON.stringify(roles)); }, [roles]);
  useEffect(() => { localStorage.setItem('periodicTests', JSON.stringify(periodicTests)); }, [periodicTests]);
  useEffect(() => { localStorage.setItem('pestObservations', JSON.stringify(pestObservations)); }, [pestObservations]);
  useEffect(() => { localStorage.setItem('users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('invitations', JSON.stringify(invitations)); }, [invitations]);
  useEffect(() => { localStorage.setItem('messageLogs', JSON.stringify(messageLogs)); }, [messageLogs]);
  useEffect(() => { localStorage.setItem('galleryPhotos', JSON.stringify(galleryPhotos)); }, [galleryPhotos]);

  // Seeding logic to ensure data presence for demonstration
  useEffect(() => {
    if (seedInitialized.current) return;
    seedInitialized.current = true;

    const seedDate = new Date().toISOString().split('T')[0];
    
    // Check for specific requested slip to avoid re-seeding if data exists
    const reqSlipId = 'ps-req-002';
    
    // Only proceed if this specific slip doesn't exist
    if (!pressingSlips.some(s => s.id === reqSlipId)) {
        
        let targetTypeId = 'seaweed-type-1';
        let typeToUse = seaweedTypes.find(t => t.id === targetTypeId);
        
        // 1. Ensure Seaweed Type 'seaweed-type-1' exists
        if (!typeToUse) {
            const newType = {
                id: targetTypeId,
                name: 'Spinosum (Type 1)',
                scientificName: 'Eucheuma denticulatum',
                description: 'Requested Seaweed Type',
                wetPrice: 400,
                dryPrice: 1800,
                priceHistory: []
            };
            setSeaweedTypes(prev => [...prev, newType]);
        }

        // 2. Add Initial Stock (Bulk) to support consumption (500kg)
        // We'll add 1000kg to be safe.
        const initStock: PressedStockMovement = {
            id: `psm-init-${reqSlipId}`,
            date: seedDate,
            siteId: 'pressing-warehouse',
            seaweedTypeId: targetTypeId,
            type: PressedStockMovementType.BULK_IN_FROM_SITE,
            designation: 'Initial Bulk Stock (Seed)',
            inKg: 1000,
            inBales: 20 // 20 bags approx
        };

        // 3. Create the Pressing Slip
        const slip: PressingSlip = {
            id: reqSlipId,
            slipNo: 'PRESS-REQ-TODAY',
            date: seedDate,
            sourceSiteId: 'pressing-warehouse',
            seaweedTypeId: targetTypeId,
            consumedWeightKg: 500,
            consumedBags: 8,
            producedWeightKg: 150,
            producedBalesCount: 15
        };

        // 4. Create Movements (Consumption & Production)
        const consMove: PressedStockMovement = {
            id: `psm-cons-${reqSlipId}`,
            date: seedDate,
            siteId: 'pressing-warehouse',
            seaweedTypeId: targetTypeId,
            type: PressedStockMovementType.PRESSING_CONSUMPTION,
            designation: `Consumed for Pressing Slip ${slip.slipNo}`,
            outKg: 500,
            outBales: 8,
            relatedId: reqSlipId
        };

        const prodMove: PressedStockMovement = {
            id: `psm-prod-${reqSlipId}`,
            date: seedDate,
            siteId: 'pressing-warehouse',
            seaweedTypeId: targetTypeId,
            type: PressedStockMovementType.PRESSING_IN,
            designation: `Produced from Pressing Slip ${slip.slipNo}`,
            inKg: 150,
            inBales: 15,
            relatedId: reqSlipId
        };

        setPressedStockMovements(prev => [...prev, initStock, consMove, prodMove]);
        setPressingSlips(prev => [...prev, slip]);
    }
    
    // Original demo seed logic (if empty db)
    if (pressingSlips.length === 0) {
        // ... (Optional: Keep existing logic or let the specific one above suffice for demo)
    }
  }, [pressingSlips, seaweedTypes]); // Dependencies allow checking existing state

  const addSite = (site: Omit<Site, 'id'>) => setSites(prev => [...prev, { ...site, id: `site-${Date.now()}` }]);
  const updateSite = (updatedSite: Site) => setSites(prev => prev.map(s => s.id === updatedSite.id ? updatedSite : s));
  const deleteSite = (siteId: string) => setSites(prev => prev.filter(s => s.id !== siteId));
  
  const getFarmersBySite = (siteId: string) => farmers.filter(f => f.siteId === siteId);

  const addEmployee = (employee: Omit<Employee, 'id'>) => {
    const newEmployee: Employee = { ...employee, id: `emp-${Date.now()}` };
    setEmployees(prev => [...prev, newEmployee]);
  };
  const updateEmployee = (updatedEmployee: Employee) => {
    setEmployees(prev => prev.map(e => e.id === updatedEmployee.id ? updatedEmployee : e));
  };
  const deleteEmployee = (employeeId: string) => {
    setEmployees(prev => prev.filter(e => e.id !== employeeId));
    setSites(prevSites => 
      prevSites.map(site => 
        site.managerId === employeeId 
          ? { ...site, managerId: undefined } 
          : site
      )
    );
  };
  const deleteMultipleEmployees = (employeeIds: string[]) => {
    const idSet = new Set(employeeIds);
    setEmployees(prev => prev.filter(e => !idSet.has(e.id)));
    setSites(prevSites =>
      prevSites.map(site =>
        site.managerId && idSet.has(site.managerId)
          ? { ...site, managerId: undefined }
          : site
      )
    );
  };
  const updateEmployeesSite = (employeeIds: string[], siteId: string) => {
    const idSet = new Set(employeeIds);
    setEmployees(prev => prev.map(e => (idSet.has(e.id) ? { ...e, siteId } : e)));
  };

  const addFarmer = (farmer: Omit<Farmer, 'id'>) => setFarmers(prev => [...prev, { ...farmer, id: `farm-${Date.now()}` }]);
  const updateFarmer = (updatedFarmer: Farmer) => setFarmers(prev => prev.map(f => f.id === updatedFarmer.id ? updatedFarmer : f));
  const deleteFarmer = (farmerId: string) => {
    setFarmers(prev => prev.filter(f => f.id !== farmerId));
    setFarmerCredits(prev => prev.filter(fc => fc.farmerId !== farmerId));
    setRepayments(prev => prev.filter(r => r.farmerId !== farmerId));
  };
   const deleteMultipleFarmers = (farmerIds: string[]) => {
    const idSet = new Set(farmerIds);
    setFarmers(prev => prev.filter(f => !idSet.has(f.id)));
    setFarmerCredits(prev => prev.filter(fc => !idSet.has(fc.farmerId)));
    setRepayments(prev => prev.filter(r => !idSet.has(r.farmerId)));
  };
  const updateFarmersSite = (farmerIds: string[], siteId: string) => {
    const idSet = new Set(farmerIds);
    setFarmers(prev => prev.map(f => (idSet.has(f.id) ? { ...f, siteId } : f)));
  };

  const addServiceProvider = (provider: Omit<ServiceProvider, 'id'>) => setServiceProviders(prev => [...prev, { ...provider, id: `sp-${Date.now()}` }]);
  const updateServiceProvider = (updatedProvider: ServiceProvider) => setServiceProviders(prev => prev.map(p => p.id === updatedProvider.id ? updatedProvider : p));
  const deleteServiceProvider = (providerId: string) => setServiceProviders(prev => prev.filter(p => p.id !== providerId));

  const addCreditType = (creditType: Omit<CreditType, 'id'>) => setCreditTypes(prev => [...prev, { ...creditType, id: `ct-${Date.now()}` }]);
  const updateCreditType = (updatedCreditType: CreditType) => setCreditTypes(prev => prev.map(ct => ct.id === updatedCreditType.id ? updatedCreditType : ct));
  const deleteCreditType = (creditTypeId: string) => {
    setCreditTypes(prev => prev.filter(ct => ct.id !== creditTypeId));
    setFarmerCredits(prev => prev.filter(fc => fc.creditTypeId !== creditTypeId));
  };
  const addFarmerCredit = (credit: Omit<FarmerCredit, 'id'>) => setFarmerCredits(prev => [...prev, { ...credit, id: `fc-${Date.now()}` }]);
  const addMultipleFarmerCredits = (credits: Omit<FarmerCredit, 'id'>[]) => {
    const newCredits = credits.map(credit => ({...credit, id: `fc-${Date.now()}-${Math.random()}`}));
    setFarmerCredits(prev => [...prev, ...newCredits]);
  };
  const addRepayment = (repayment: Omit<Repayment, 'id'>) => setRepayments(prev => [...prev, { ...repayment, id: `rep-${Date.now()}` }]);
  const addMultipleRepayments = (repayments: Omit<Repayment, 'id'>[]) => {
      const newRepayments = repayments.map(repayment => ({...repayment, id: `rep-${Date.now()}-${Math.random()}`}));
      setRepayments(prev => [...prev, ...newRepayments]);
  };

  const addMonthlyPayment = (payment: Omit<MonthlyPayment, 'id'>) => {
    const newPayment: MonthlyPayment = { ...payment, id: `pay-${Date.now()}` };
    setMonthlyPayments(prev => [...prev, newPayment]);
  };
  const addMultipleMonthlyPayments = (payments: Omit<MonthlyPayment, 'id'>[]) => {
    const newPayments = payments.map(p => ({ ...p, id: `pay-${Date.now()}-${Math.random()}` }));
    setMonthlyPayments(prev => [...prev, ...newPayments]);
  };
  const updateMonthlyPayment = (updatedPayment: MonthlyPayment) => {
      setMonthlyPayments(prev => prev.map(p => p.id === updatedPayment.id ? updatedPayment : p));
  };
  const deleteMonthlyPayment = (paymentId: string) => {
      setMonthlyPayments(prev => prev.filter(p => p.id !== paymentId));
  };

  const addSeaweedType = (seaweedType: Omit<SeaweedType, 'id' | 'priceHistory'>) => {
    const newType: SeaweedType = {
        ...seaweedType,
        id: `st-${Date.now()}`,
        priceHistory: [
            {
                date: new Date().toISOString().split('T')[0],
                wetPrice: seaweedType.wetPrice,
                dryPrice: seaweedType.dryPrice,
            },
        ],
    };
    setSeaweedTypes(prev => [...prev, newType]);
  };
  const updateSeaweedType = (updatedType: SeaweedType) => setSeaweedTypes(prev => prev.map(st => st.id === updatedType.id ? updatedType : st));
  const deleteSeaweedType = (seaweedTypeId: string) => setSeaweedTypes(prev => prev.filter(st => st.id !== seaweedTypeId));
  
  const updateSeaweedPrices = (seaweedTypeId: string, newPrice: SeaweedPriceHistory) => {
    setSeaweedTypes(prev => prev.map(st => {
        if (st.id === seaweedTypeId) {
            const newHistory = [...st.priceHistory, newPrice];
            return {
                ...st,
                wetPrice: newPrice.wetPrice,
                dryPrice: newPrice.dryPrice,
                priceHistory: newHistory,
            };
        }
        return st;
    }));
  };

  const addModule = (moduleData: Omit<Module, 'id' | 'farmerId' | 'statusHistory'>) => {
    const newModule: Module = { 
      ...moduleData, 
      id: `mod-${Date.now()}`,
      statusHistory: [
        { status: 'CREATED', date: new Date().toISOString() },
        { status: 'FREE', date: new Date().toISOString(), notes: 'Module is ready for assignment.' }
      ]
    };
    setModules(prev => [...prev, newModule]);
  };
  
  const updateModule = (moduleData: Module) => {
    setModules(prev => prev.map(m => m.id === moduleData.id ? moduleData : m));
  };
  
  const deleteModule = (moduleId: string) => {
    setModules(prev => prev.filter(m => m.id !== moduleId));
    setCultivationCycles(prev => prev.filter(c => c.moduleId !== moduleId));
  };
  
  const deleteMultipleModules = (moduleIds: string[]) => {
    const idSet = new Set(moduleIds);
    setModules(prev => prev.filter(m => !idSet.has(m.id)));
    setCultivationCycles(prev => prev.filter(c => c.moduleId && !idSet.has(c.moduleId)));
  };

  const updateModulesFarmer = (moduleIds: string[], farmerId: string) => {
    const idSet = new Set(moduleIds);
    const farmer = farmers.find(f => f.id === farmerId);
    if (!farmer) return;

    setModules(prev => prev.map(m => {
        if (idSet.has(m.id)) {
            const newHistoryEntry: ModuleStatusHistory = {
                status: 'ASSIGNED',
                date: new Date().toISOString(),
                notes: `Assigned to farmer ${farmer.firstName} ${farmer.lastName}`
            };
            return {
                ...m,
                farmerId,
                statusHistory: [...m.statusHistory, newHistoryEntry]
            };
        }
        return m;
    }));
  };

  const addCultivationCycle = (cycleData: Omit<CultivationCycle, 'id'>, farmerId: string) => {
    const latestCuttingOp = cycleData.cuttingOperationId 
        ? cuttingOperations.find(op => op.id === cycleData.cuttingOperationId)
        : [...cuttingOperations]
            .filter(op => op.moduleCuts.some(mc => mc.moduleId === cycleData.moduleId) && new Date(op.date) <= new Date(cycleData.plantingDate))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];


    const module = modules.find(m => m.id === cycleData.moduleId);
    if (!module) return;

    const newCycle: CultivationCycle = { 
        ...cycleData, 
        id: `cyc-${Date.now()}`,
        linesPlanted: cycleData.linesPlanted || module.lines,
        cuttingOperationId: latestCuttingOp?.id 
    };
    setCultivationCycles(prev => [...prev, newCycle]);

    const farmer = farmers.find(f => f.id === farmerId);
    setModules(prev => prev.map(m => {
        if (m.id === cycleData.moduleId) {
            const newHistory: ModuleStatusHistory[] = [...m.statusHistory];
            
            if (latestCuttingOp) {
                 newHistory.push({ status: 'CUTTING', date: latestCuttingOp.date });
            }
            newHistory.push({ status: 'ASSIGNED', date: cycleData.plantingDate, notes: `Assigned to farmer ${farmer?.firstName} ${farmer?.lastName}` });
            newHistory.push({ status: 'PLANTED', date: cycleData.plantingDate });
            
            return { ...m, farmerId: farmerId, statusHistory: newHistory };
        }
        return m;
    }));
  };

  const updateCultivationCycle = (cycleData: CultivationCycle) => {
    let originalCycle: CultivationCycle | undefined;
    setCultivationCycles(prev => {
        originalCycle = prev.find(c => c.id === cycleData.id);
        return prev.map(c => c.id === cycleData.id ? cycleData : c);
    });

    if (originalCycle && originalCycle.status !== cycleData.status) {
        setModules(prev => prev.map(m => {
            if (m.id === cycleData.moduleId) {
                const statusDate = cycleData.exportDate || cycleData.stockDate || cycleData.baggingStartDate || cycleData.dryingStartDate || cycleData.harvestDate || new Date().toISOString();
                
                const newHistoryEntry: ModuleStatusHistory = {
                    status: cycleData.status,
                    date: statusDate,
                };
                const updatedHistory = [...m.statusHistory, newHistoryEntry];
                let updatedModule = { ...m, statusHistory: updatedHistory };

                if (cycleData.status === ModuleStatus.IN_STOCK) {
                    updatedHistory.push({
                        status: 'FREE',
                        date: cycleData.stockDate || new Date().toISOString(),
                        notes: 'Cycle completed. Module is available.'
                    });
                    updatedModule = { ...updatedModule, farmerId: undefined };
                }
                
                return updatedModule;
            }
            return m;
        }));
    }
  };

  const updateMultipleCultivationCycles = (cyclesToUpdate: CultivationCycle[]) => {
    const cyclesMap = new Map(cyclesToUpdate.map(c => [c.id, c]));
    const updatedCycles = cultivationCycles.map(c => cyclesMap.get(c.id) || c);
    setCultivationCycles(updatedCycles);

    const modulesToUpdateMap = new Map<string, CultivationCycle>();
    cyclesToUpdate.forEach(c => {
        if (c.status === ModuleStatus.IN_STOCK) {
            modulesToUpdateMap.set(c.moduleId, c);
        }
    });

    if (modulesToUpdateMap.size > 0) {
        setModules(prevModules => prevModules.map(m => {
            if (modulesToUpdateMap.has(m.id)) {
                const cycle = modulesToUpdateMap.get(m.id)!;
                const newHistory: ModuleStatusHistory[] = [
                    ...m.statusHistory,
                    { status: ModuleStatus.IN_STOCK, date: cycle.stockDate || new Date().toISOString() },
                    { status: 'FREE', date: cycle.stockDate || new Date().toISOString(), notes: 'Cycle completed. Module is available.' }
                ];
                return { ...m, farmerId: undefined, statusHistory: newHistory };
            }
            return m;
        }));
    }
  };

  const deleteCultivationCycle = (cycleId: string) => {
    setCultivationCycles(prev => prev.filter(c => c.id !== cycleId));
  };

  const startCultivationFromCuttings = (
      cuttingData: Omit<CuttingOperation, 'id'>,
      cycleData: Omit<CultivationCycle, 'id'>,
      beneficiaryFarmerId: string
  ) => {
      const opId = `cut-${Date.now()}`;
      const newOp: CuttingOperation = { ...cuttingData, id: opId, beneficiaryFarmerId };
      setCuttingOperations(prev => [...prev, newOp]);
      
      const cuttingCreditTypeId = 'ct-3';
      const newCredits: FarmerCredit[] = [];
      cuttingData.moduleCuts.forEach(moduleCut => {
           const module = modules.find(m => m.id === moduleCut.moduleId);
           if (beneficiaryFarmerId) {
                const creditAmount = moduleCut.linesCut * cuttingData.unitPrice;
                if (creditAmount > 0) {
                    newCredits.push({
                        id: `fc-${Date.now()}-${Math.random()}`,
                        date: cuttingData.date,
                        siteId: cuttingData.siteId,
                        farmerId: beneficiaryFarmerId,
                        creditTypeId: cuttingCreditTypeId,
                        totalAmount: creditAmount,
                        relatedOperationId: opId,
                        notes: `Cutting/Planting service for module ${module?.code || moduleCut.moduleId}`,
                    });
                }
           }
      });
      if (newCredits.length > 0) setFarmerCredits(prev => [...prev, ...newCredits]);

      const cycleWithOpId = { ...cycleData, cuttingOperationId: opId };
      addCultivationCycle(cycleWithOpId, beneficiaryFarmerId);
  };
  
  const addStockMovement = (movement: Omit<StockMovement, 'id'>) => {
      const newMovement: StockMovement = { ...movement, id: `sm-${Date.now()}`};
      setStockMovements(prev => [...prev, newMovement]);
  };
  
  const addMultipleStockMovements = (movements: Omit<StockMovement, 'id'>[]) => {
      const newMovements = movements.map(m => ({ ...m, id: `sm-${Date.now()}-${Math.random()}` }));
      setStockMovements(prev => [...prev, ...newMovements]);
  };

  const findUserByEmail = (email: string): User | undefined => {
      return users.find(user => user.email.toLowerCase() === email.toLowerCase());
  };

  const findInvitationByToken = (token: string): Invitation | undefined => {
    const inv = invitations.find(i => i.token === token && i.status === InvitationStatus.PENDING);
    if (inv && new Date(inv.expiresAt) > new Date()) {
        return inv;
    }
    return undefined;
  };

  const addUser = (userData: Omit<User, 'id'>, invitationToken?: string): User | undefined => {
      if (users.some(user => user.email.toLowerCase() === userData.email.toLowerCase())) {
          return undefined;
      }
      if (invitationToken) {
        setInvitations(prev => prev.map(inv => inv.token === invitationToken ? { ...inv, status: InvitationStatus.ACCEPTED } : inv));
      }
      const newUser: User = {
          id: `user-${Date.now()}`,
          ...userData
      };
      setUsers(prev => [...prev, newUser]);
      return newUser;
  };

  const addInvitation = (invitationData: Omit<Invitation, 'id' | 'token' | 'createdAt'>): Invitation => {
    const newInvitation: Invitation = {
        ...invitationData,
        id: `inv-${Date.now()}`,
        token: `inv-token-${Date.now()}-${Math.random()}`,
        createdAt: new Date().toISOString(),
    };
    setInvitations(prev => [...prev, newInvitation]);
    return newInvitation;
  };
  
  const deleteInvitation = (invitationId: string) => {
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
  };

  const setUserPasswordResetToken = (email: string, token: string, expires: Date): boolean => {
    let userFound = false;
    setUsers(prevUsers => prevUsers.map(user => {
        if (user.email.toLowerCase() === email.toLowerCase()) {
            userFound = true;
            return { ...user, passwordResetToken: token, passwordResetExpires: expires };
        }
        return user;
    }));
    return userFound;
  };

  const findUserByPasswordResetToken = (token: string): User | undefined => {
      const user = users.find(u => u.passwordResetToken === token);
      if (user && user.passwordResetExpires && new Date() < new Date(user.passwordResetExpires)) {
          return user;
      }
      return undefined;
  };

  const updateUserPassword = (userId: string, newPassword: string): boolean => {
      let userFound = false;
      setUsers(prevUsers => prevUsers.map(user => {
          if (user.id === userId) {
              userFound = true;
              return { ...user, password: newPassword, passwordResetToken: undefined, passwordResetExpires: undefined };
          }
          return user;
      }));
      return userFound;
  };

  const recordReturnFromPressing = (data: {
    date: string;
    siteId: string;
    seaweedTypeId: string;
    designation: string;
    kg: number;
    bags: number;
    pressingSlipId: string;
  }) => {
    addStockMovement({
      date: data.date,
      siteId: data.siteId,
      seaweedTypeId: data.seaweedTypeId,
      type: StockMovementType.PRESSING_IN,
      designation: data.designation,
      inKg: data.kg,
      inBags: data.bags,
      relatedId: data.pressingSlipId,
    });

    const pressedMovement: PressedStockMovement = {
      id: `psm-${Date.now()}`,
      date: data.date,
      siteId: 'pressing-warehouse',
      seaweedTypeId: data.seaweedTypeId,
      type: PressedStockMovementType.RETURN_TO_SITE,
      designation: `Return to site: ${sites.find(s => s.id === data.siteId)?.name || data.siteId}`,
      outBales: data.bags,
      outKg: data.kg,
      relatedId: data.pressingSlipId,
    };
    setPressedStockMovements(prev => [...prev, pressedMovement]);
  };

  const addFarmerDelivery = (data: Omit<FarmerDelivery, 'id' | 'slipNo'>) => {
    const slipNo = `DEL-${new Date().getFullYear()}-${String(farmerDeliveries.length + 1).padStart(3, '0')}`;
    const newDelivery: FarmerDelivery = { ...data, id: `fd-${Date.now()}`, slipNo };
    setFarmerDeliveries(prev => [...prev, newDelivery]);

    const farmer = farmers.find(f => f.id === data.farmerId);
    const designation = `Delivery from ${farmer?.firstName || ''} ${farmer?.lastName || ''} (${slipNo})`;

    if (data.destination === 'PRESSING_WAREHOUSE_BULK') {
        const pressedMovement: PressedStockMovement = {
            id: `psm-${Date.now()}`,
            date: data.date,
            siteId: 'pressing-warehouse',
            seaweedTypeId: data.seaweedTypeId,
            type: PressedStockMovementType.FARMER_DELIVERY, 
            designation,
            inKg: data.totalWeightKg,
            inBales: data.totalBags, 
            relatedId: newDelivery.id
        };
        setPressedStockMovements(prev => [...prev, pressedMovement]);
    } else {
        addStockMovement({
            date: data.date,
            siteId: data.siteId,
            seaweedTypeId: data.seaweedTypeId,
            type: StockMovementType.FARMER_DELIVERY,
            designation,
            inKg: data.totalWeightKg,
            inBags: data.totalBags,
            relatedId: newDelivery.id,
        });
    }
  };

  const deleteFarmerDelivery = (deliveryId: string) => {
    setFarmerDeliveries(prev => prev.filter(d => d.id !== deliveryId));
    setStockMovements(prev => prev.filter(m => m.relatedId !== deliveryId || m.type !== StockMovementType.FARMER_DELIVERY));
    setPressedStockMovements(prev => prev.filter(m => m.relatedId !== deliveryId || m.type !== PressedStockMovementType.FARMER_DELIVERY));
  };

  const addInitialStock = (data: Omit<StockMovement, 'id' | 'type' | 'relatedId'>) => {
    const newMovement: StockMovement = {
        ...data,
        id: `sm-${Date.now()}`,
        type: StockMovementType.INITIAL_STOCK,
    };
    setStockMovements(prev => [...prev, newMovement]);
  };

  const transferBaggedToStock = (cycleIds: string[], date?: string) => {
      const stockDate = date || new Date().toISOString().split('T')[0];
      const cyclesToUpdate = cultivationCycles
          .filter(c => cycleIds.includes(c.id) && c.status === ModuleStatus.BAGGED)
          .map(c => ({
              ...c,
              status: ModuleStatus.IN_STOCK,
              stockDate: stockDate,
          }));
      
      const stockMovementsToAdd = cyclesToUpdate.map(cycle => {
          const module = modules.find(m => m.id === cycle.moduleId);
          if (!module || !cycle.baggedWeightKg || !cycle.baggedBagsCount) return null;
          return {
              date: stockDate,
              siteId: module.siteId,
              seaweedTypeId: cycle.seaweedTypeId,
              type: StockMovementType.BAGGING_TRANSFER,
              designation: `From Bagging (Module ${module.code})`,
              inKg: cycle.baggedWeightKg,
              inBags: cycle.baggedBagsCount,
              relatedId: cycle.id,
          };
      }).filter((m): m is NonNullable<typeof m> => m !== null);
  
      if (cyclesToUpdate.length > 0) {
          updateMultipleCultivationCycles(cyclesToUpdate);
      }
      if (stockMovementsToAdd.length > 0) {
          addMultipleStockMovements(stockMovementsToAdd);
      }
  };

  const exportStockBatch = (cycleId: string) => {
    const cycle = cultivationCycles.find(c => c.id === cycleId);
    if (!cycle) return;

    const updatedCycle: CultivationCycle = {
      ...cycle,
      status: ModuleStatus.EXPORTED,
      exportDate: new Date().toISOString().split('T')[0],
    };
    updateCultivationCycle(updatedCycle);

    const module = modules.find(m => m.id === cycle.moduleId);
    if (module && cycle.harvestedWeight) {
      addStockMovement({
        date: updatedCycle.exportDate!,
        siteId: module.siteId,
        seaweedTypeId: cycle.seaweedTypeId,
        type: StockMovementType.EXPORT_OUT,
        designation: `Export from Batch (Module ${module.code})`,
        outKg: cycle.harvestedWeight,
        outBags: Math.ceil(cycle.harvestedWeight / 50),
        relatedId: cycle.id,
      });
    }
  };

  const addPressingSlip = (slipData: Omit<PressingSlip, 'id' | 'slipNo'>) => {
    const slipNo = `PRESS-${new Date().getFullYear()}-${String(pressingSlips.length + 1).padStart(3, '0')}`;
    const newSlip: PressingSlip = { ...slipData, id: `ps-${Date.now()}`, slipNo };
    setPressingSlips(prev => [...prev, newSlip]);

    const consumptionMovement: PressedStockMovement = {
      id: `psm-cons-${Date.now()}`,
      date: newSlip.date,
      siteId: 'pressing-warehouse',
      seaweedTypeId: newSlip.seaweedTypeId,
      type: PressedStockMovementType.PRESSING_CONSUMPTION,
      designation: `Consumed for Pressing Slip ${newSlip.slipNo}`,
      outKg: newSlip.consumedWeightKg,
      outBales: newSlip.consumedBags,
      relatedId: newSlip.id,
    };

    const productionMovement: PressedStockMovement = {
        id: `psm-prod-${Date.now()}`,
        date: newSlip.date,
        siteId: 'pressing-warehouse',
        seaweedTypeId: newSlip.seaweedTypeId,
        type: PressedStockMovementType.PRESSING_IN,
        designation: `Produced from Pressing Slip ${newSlip.slipNo}`,
        inBales: newSlip.producedBalesCount,
        inKg: newSlip.producedWeightKg,
        relatedId: newSlip.id,
    };
    setPressedStockMovements(prev => [...prev, consumptionMovement, productionMovement]);
  };

  const updatePressingSlip = (updatedSlip: PressingSlip) => {
      setPressingSlips(prev => prev.map(s => s.id === updatedSlip.id ? updatedSlip : s));
      
      setPressedStockMovements(prev => {
          const otherMovements = prev.filter(m => m.relatedId !== updatedSlip.id);
          const consumptionMovement: PressedStockMovement = {
              id: `psm-upd-cons-${Date.now()}`, date: updatedSlip.date, siteId: 'pressing-warehouse',
              seaweedTypeId: updatedSlip.seaweedTypeId, type: PressedStockMovementType.PRESSING_CONSUMPTION,
              designation: `Consumed for Pressing Slip ${updatedSlip.slipNo}`, 
              outKg: updatedSlip.consumedWeightKg, 
              outBales: updatedSlip.consumedBags,
              relatedId: updatedSlip.id,
          };
          const productionMovement: PressedStockMovement = {
              id: `psm-upd-prod-${Date.now()}`, date: updatedSlip.date, siteId: 'pressing-warehouse',
              seaweedTypeId: updatedSlip.seaweedTypeId, type: PressedStockMovementType.PRESSING_IN,
              designation: `Produced from Pressing Slip ${updatedSlip.slipNo}`, 
              inBales: updatedSlip.producedBalesCount, 
              inKg: updatedSlip.producedWeightKg, 
              relatedId: updatedSlip.id,
          };
          return [...otherMovements, consumptionMovement, productionMovement];
      });
  };

  const deletePressingSlip = (slipId: string) => {
      setPressingSlips(prev => prev.filter(s => s.id !== slipId));
      setPressedStockMovements(prev => prev.filter(m => m.relatedId !== slipId));
  };
  
  const addInitialPressedStock = (data: Omit<PressedStockMovement, 'id' | 'type' | 'relatedId'>) => {
    const newMovement: PressedStockMovement = {
        ...data,
        id: `psm-${Date.now()}`,
        type: PressedStockMovementType.INITIAL_STOCK,
    };
    setPressedStockMovements(prev => [...prev, newMovement]);
  };

  const addPressedStockAdjustment = (data: Omit<PressedStockMovement, 'id' | 'relatedId'>) => {
      const newMovement: PressedStockMovement = {
          ...data,
          id: `psm-adj-${Date.now()}`,
          relatedId: `adj-${Date.now()}`, 
      };
      setPressedStockMovements(prev => [...prev, newMovement]);
  };

  const addExportDocument = (docData: Omit<ExportDocument, 'id' | 'docNo'>, sourceSiteId: string) => {
    const docNo = `EXP-${new Date().getFullYear()}-${String(exportDocuments.length + 1).padStart(3, '0')}`;
    const newDoc: ExportDocument = { 
        ...docData, 
        id: `ed-${Date.now()}`, 
        docNo,
        containers: docData.containers.map(c => ({...c, id: `ec-${Date.now()}-${Math.random()}`}))
    };
    setExportDocuments(prev => [...prev, newDoc]);

    setPressingSlips(prev => prev.map(slip => 
        newDoc.pressingSlipIds.includes(slip.id) 
            ? { ...slip, exportDocId: newDoc.id } 
            : slip
    ));
    
    const slipsForMovement = pressingSlips.filter(s => newDoc.pressingSlipIds.includes(s.id));
    const totalBalesExported = slipsForMovement.reduce((sum, slip) => sum + slip.producedBalesCount, 0);
    const totalWeightExported = slipsForMovement.reduce((sum, slip) => sum + slip.producedWeightKg, 0);

    if (totalBalesExported > 0) {
        const outMovement: PressedStockMovement = {
            id: `psm-${Date.now()}`,
            date: newDoc.date,
            siteId: 'pressing-warehouse',
            seaweedTypeId: newDoc.seaweedTypeId,
            type: PressedStockMovementType.EXPORT_OUT,
            designation: `Export Shipment ${newDoc.docNo}`,
            outBales: totalBalesExported,
            outKg: totalWeightExported,
            relatedId: newDoc.id,
        };
        setPressedStockMovements(prev => [...prev, outMovement]);
    }
  };
  
  const updateExportDocument = (updatedDoc: ExportDocument) => {
    let originalDoc: ExportDocument | undefined;
    setExportDocuments(prev => {
        originalDoc = prev.find(d => d.id === updatedDoc.id);
        return prev.map(d => d.id === updatedDoc.id ? updatedDoc : d);
    });

    if (!originalDoc) return;
    
    const oldSlipIds = new Set(originalDoc.pressingSlipIds);
    const newSlipIds = new Set(updatedDoc.pressingSlipIds);

    setPressingSlips(prev => prev.map(slip => {
        if (newSlipIds.has(slip.id)) return { ...slip, exportDocId: updatedDoc.id };
        if (oldSlipIds.has(slip.id) && !newSlipIds.has(slip.id)) return { ...slip, exportDocId: undefined };
        return slip;
    }));
    
    const updatedMovements = pressedStockMovements.filter(m => m.relatedId !== updatedDoc.id);
    const slipsForMovement = pressingSlips.filter(s => newSlipIds.has(s.id));
    const totalBalesExported = slipsForMovement.reduce((sum, s) => sum + s.producedBalesCount, 0);
    const totalWeightExported = slipsForMovement.reduce((sum, s) => sum + s.producedWeightKg, 0);

    if (totalBalesExported > 0) {
        const newMovement: PressedStockMovement = {
            id: `psm-${Date.now()}`,
            date: updatedDoc.date,
            siteId: 'pressing-warehouse',
            seaweedTypeId: updatedDoc.seaweedTypeId,
            type: PressedStockMovementType.EXPORT_OUT,
            designation: `Export Shipment ${updatedDoc.docNo}`,
            outBales: totalBalesExported,
            outKg: totalWeightExported,
            relatedId: updatedDoc.id,
        };
        updatedMovements.push(newMovement);
    }
    setPressedStockMovements(updatedMovements);
  };


  const deleteExportDocument = (docId: string) => {
      const docToDelete = exportDocuments.find(d => d.id === docId);
      if (!docToDelete) return;

      setPressingSlips(prev => prev.map(slip => 
          docToDelete.pressingSlipIds.includes(slip.id)
              ? { ...slip, exportDocId: undefined }
              : slip
      ));

      setExportDocuments(prev => prev.filter(d => d.id !== docId));
      setPressedStockMovements(prev => prev.filter(m => m.relatedId !== docId));
  };
  
  const addSiteTransfer = (transferData: Omit<SiteTransfer, 'id' | 'status' | 'history'>) => {
    const newTransfer: SiteTransfer = {
        ...transferData,
        id: `st-${Date.now()}`,
        status: SiteTransferStatus.AWAITING_OUTBOUND,
        history: [{
            status: SiteTransferStatus.AWAITING_OUTBOUND,
            date: new Date().toISOString(),
            notes: 'Transfer initiated.'
        }]
    };
    setSiteTransfers(prev => [...prev, newTransfer]);

    addStockMovement({
        date: newTransfer.date,
        siteId: newTransfer.sourceSiteId,
        seaweedTypeId: newTransfer.seaweedTypeId,
        type: StockMovementType.SITE_TRANSFER_OUT,
        designation: `Transfer to ${sites.find(s => s.id === newTransfer.destinationSiteId)?.name} (${newTransfer.id})`,
        outKg: newTransfer.weightKg,
        outBags: newTransfer.bags,
        relatedId: newTransfer.id,
    });
  };

  const updateSiteTransfer = (updatedTransfer: SiteTransfer) => {
    const originalTransfer = siteTransfers.find(t => t.id === updatedTransfer.id);
    if (!originalTransfer) return;

    const finalTransfer = { ...updatedTransfer };

    if (originalTransfer.status !== finalTransfer.status) {
        let notes = '';
        switch(finalTransfer.status) {
            case SiteTransferStatus.IN_TRANSIT:
                notes = 'Marked as in transit.';
                break;
            case SiteTransferStatus.COMPLETED:
                notes = `Completed. Received ${finalTransfer.receivedWeightKg}kg in ${finalTransfer.receivedBags} bags.`;
                break;
            case SiteTransferStatus.CANCELLED:
                notes = `Cancelled. Reason: ${finalTransfer.notes}`;
                break;
        }
        const newHistoryEntry: SiteTransferHistoryEntry = {
            status: finalTransfer.status,
            date: new Date().toISOString(),
            notes,
        };
        finalTransfer.history = [...(originalTransfer.history || []), newHistoryEntry];
    }

    setSiteTransfers(prev => prev.map(t => t.id === finalTransfer.id ? finalTransfer : t));

    if (originalTransfer.status !== SiteTransferStatus.COMPLETED && finalTransfer.status === SiteTransferStatus.COMPLETED) {
        if (finalTransfer.destinationSiteId === 'pressing-warehouse') {
            const pressedMovement: PressedStockMovement = {
                id: `psm-${Date.now()}`,
                date: finalTransfer.completionDate || new Date().toISOString().split('T')[0],
                siteId: 'pressing-warehouse',
                seaweedTypeId: finalTransfer.seaweedTypeId,
                type: PressedStockMovementType.BULK_IN_FROM_SITE,
                designation: `Transfer from ${sites.find(s => s.id === finalTransfer.sourceSiteId)?.name} (${finalTransfer.id})`,
                inKg: finalTransfer.receivedWeightKg,
                inBales: finalTransfer.receivedBags,
                relatedId: finalTransfer.id,
            };
            setPressedStockMovements(prev => [...prev, pressedMovement]);
        } else {
            addStockMovement({
                date: finalTransfer.completionDate || new Date().toISOString().split('T')[0],
                siteId: finalTransfer.destinationSiteId,
                seaweedTypeId: finalTransfer.seaweedTypeId,
                type: StockMovementType.SITE_TRANSFER_IN,
                designation: `Transfer from ${sites.find(s => s.id === finalTransfer.sourceSiteId)?.name} (${finalTransfer.id})`,
                inKg: finalTransfer.receivedWeightKg,
                inBags: finalTransfer.receivedBags,
                relatedId: finalTransfer.id,
            });
        }
    }

    if (originalTransfer.status !== SiteTransferStatus.CANCELLED && finalTransfer.status === SiteTransferStatus.CANCELLED) {
        addStockMovement({
            date: finalTransfer.completionDate || new Date().toISOString().split('T')[0],
            siteId: finalTransfer.sourceSiteId,
            seaweedTypeId: finalTransfer.seaweedTypeId,
            type: StockMovementType.SITE_TRANSFER_IN, 
            designation: `Cancelled Transfer ${finalTransfer.id}: ${finalTransfer.notes || ''}`.trim(),
            inKg: finalTransfer.weightKg, 
            inBags: finalTransfer.bags, 
            relatedId: finalTransfer.id,
        });
    }
  };
  
  const addCuttingOperation = (operationData: Omit<CuttingOperation, 'id'>) => {
    const newOperation: CuttingOperation = { ...operationData, id: `cut-${Date.now()}`};
    
    const cutting_credit_type_id = 'ct-3';
    const newCredits: Omit<FarmerCredit, 'id'>[] = [];

    operationData.moduleCuts.forEach(moduleCut => {
        const module = modules.find(m => m.id === moduleCut.moduleId);
        if (module && module.farmerId) {
            const creditAmount = moduleCut.linesCut * operationData.unitPrice;
            if (creditAmount > 0) {
                newCredits.push({
                    date: operationData.date,
                    siteId: operationData.siteId,
                    farmerId: module.farmerId,
                    creditTypeId: cutting_credit_type_id,
                    totalAmount: creditAmount,
                    relatedOperationId: newOperation.id,
                    notes: `Cutting service for module ${module.code}`,
                });
            }
        }
    });
    
    setCuttingOperations(prev => [...prev, newOperation]);
    if (newCredits.length > 0) {
        const fullNewCredits = newCredits.map(c => ({...c, id: `fc-${Date.now()}-${Math.random()}`}));
        setFarmerCredits(prev => [...prev, ...fullNewCredits]);
    }
  };

  const updateCuttingOperation = (updatedOperation: CuttingOperation) => {
      const originalOperation = cuttingOperations.find(op => op.id === updatedOperation.id);
      if (!originalOperation) return;

      const originalModuleIds = originalOperation.moduleCuts.map(mc => mc.moduleId).sort();
      const updatedModuleIds = updatedOperation.moduleCuts.map(mc => mc.moduleId).sort();

      const fieldsChanged = originalOperation.unitPrice !== updatedOperation.unitPrice ||
                            JSON.stringify(originalModuleIds) !== JSON.stringify(updatedModuleIds) ||
                            originalOperation.date !== updatedOperation.date ||
                            originalOperation.siteId !== updatedOperation.siteId;

      if (fieldsChanged) {
        const otherCredits = farmerCredits.filter(credit => credit.relatedOperationId !== updatedOperation.id);
        const cutting_credit_type_id = 'ct-3';
        const newCredits: Omit<FarmerCredit, 'id'>[] = [];
        
        updatedOperation.moduleCuts.forEach(moduleCut => {
            const module = modules.find(m => m.id === moduleCut.moduleId);
            if (module && module.farmerId) {
                const creditAmount = moduleCut.linesCut * updatedOperation.unitPrice;
                if (creditAmount > 0) {
                    newCredits.push({
                        date: updatedOperation.date,
                        siteId: updatedOperation.siteId,
                        farmerId: module.farmerId,
                        creditTypeId: cutting_credit_type_id,
                        totalAmount: creditAmount,
                        relatedOperationId: updatedOperation.id,
                        notes: `Cutting service for module ${module.code}`,
                    });
                }
            }
        });

        const fullNewCredits = newCredits.map(c => ({...c, id: `fc-${Date.now()}-${Math.random()}`}));
        setFarmerCredits([...otherCredits, ...fullNewCredits]);
      }
      
      setCuttingOperations(prev => prev.map(op => op.id === updatedOperation.id ? updatedOperation : op));
  };

  const updateMultipleCuttingOperations = (operationIds: string[], paymentDate: string) => {
    const idSet = new Set(operationIds);
    setCuttingOperations(prev => prev.map(op => 
        idSet.has(op.id) ? { ...op, isPaid: true, paymentDate } : op
    ));
  };

  const deleteCuttingOperation = (operationId: string) => {
      setCuttingOperations(prev => prev.filter(op => op.id !== operationId));
      setFarmerCredits(prev => prev.filter(credit => credit.relatedOperationId !== operationId));
  };
  
  const addIncident = (incident: Omit<Incident, 'id'>) => setIncidents(prev => [...prev, { ...incident, id: `inc-${Date.now()}` }]);
  const updateIncident = (updatedIncident: Incident) => setIncidents(prev => prev.map(i => i.id === updatedIncident.id ? updatedIncident : i));
  const deleteIncident = (incidentId: string) => setIncidents(prev => prev.filter(i => i.id !== incidentId));

  const addIncidentType = (type: Omit<IncidentType, 'id'>) => {
    const newId = type.name.toUpperCase().replace(/\s/g, '_');
    if (incidentTypes.some(t => t.id === newId || t.name.toLowerCase() === type.name.toLowerCase())) return;
    setIncidentTypes(prev => [...prev, { ...type, id: newId, isDefault: false }]);
  };

  const updateIncidentType = (updatedType: IncidentType) => {
    setIncidentTypes(prev => prev.map(it => 
        it.id === updatedType.id ? { ...it, name: updatedType.name } : it
    ));
  };

  const deleteIncidentType = (typeId: string) => {
      setIncidentTypes(prev => prev.filter(it => it.id !== typeId && !it.isDefault));
      const otherType = incidentTypes.find(it => it.id === 'OTHER');
      if (otherType) {
          setIncidents(prev => prev.map(i => i.type === typeId ? { ...i, type: otherType.id } : i));
      }
  };
  
  const addIncidentSeverity = (severity: Omit<IncidentSeverity, 'id'>) => {
      const newId = severity.name.toUpperCase().replace(/\s/g, '_');
      if (incidentSeverities.some(s => s.id === newId || s.name.toLowerCase() === severity.name.toLowerCase())) return;
      setIncidentSeverities(prev => [...prev, { ...severity, id: newId, isDefault: false }]);
  };
  
  const updateIncidentSeverity = (updatedSeverity: IncidentSeverity) => {
    setIncidentSeverities(prev => prev.map(is => 
        is.id === updatedSeverity.id ? { ...is, name: updatedSeverity.name } : is
    ));
  };

  const deleteIncidentSeverity = (severityId: string) => {
      setIncidentSeverities(prev => prev.filter(is => is.id !== severityId && !is.isDefault));
      const lowSeverity = incidentSeverities.find(is => is.id === 'LOW');
      if (lowSeverity) {
          setIncidents(prev => prev.map(i => i.severity === severityId ? { ...i, severity: lowSeverity.id } : i));
      }
  };

  const addRole = (role: Omit<Role, 'id'>): Role | undefined => {
    const newId = role.name.toUpperCase().replace(/\s/g, '_');
    if (roles.some(r => r.id === newId || r.name.toLowerCase() === role.name.toLowerCase())) return;
    const newRole = { ...role, id: newId, isDefault: false };
    setRoles(prev => [...prev, newRole]);
    return newRole;
  };

  const updateRole = (updatedRole: Role) => {
    setRoles(prev => prev.map(it => 
        it.id === updatedRole.id ? updatedRole : it
    ));
  };

  const deleteRole = (roleId: string) => {
      setRoles(prev => prev.filter(it => it.id !== roleId && !it.isDefault));
  };
  
  const addPeriodicTest = (test: Omit<PeriodicTest, 'id'>) => {
    const newTest: PeriodicTest = { ...test, id: `pt-${Date.now()}` };
    setPeriodicTests(prev => [...prev, newTest]);
  };
  
  const updatePeriodicTest = (updatedTest: PeriodicTest) => {
    setPeriodicTests(prev => prev.map(t => t.id === updatedTest.id ? updatedTest : t));
  };
  
  const deletePeriodicTest = (testId: string) => {
      setPeriodicTests(prev => prev.filter(t => t.id !== testId));
  };

  const markCyclesAsPaid = (cycleIds: string[], paymentRunId: string) => {
    const idSet = new Set(cycleIds);
    setCultivationCycles(prev => prev.map(c => 
        idSet.has(c.id) ? { ...c, paymentRunId } : c
    ));
  };

  const markDeliveriesAsPaid = (deliveryIds: string[], paymentRunId: string) => {
    const idSet = new Set(deliveryIds);
    setFarmerDeliveries(prev => prev.map(d => 
        idSet.has(d.id) ? { ...d, paymentRunId } : d
    ));
  };

  const updateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const addMessageLog = (log: Omit<MessageLog, 'id'>) => {
      setMessageLogs(prev => [{ ...log, id: `msg-${Date.now()}` }, ...prev]);
  };

  const addGalleryPhoto = (photo: Omit<GalleryPhoto, 'id'>) => {
      setGalleryPhotos(prev => [{ ...photo, id: `photo-${Date.now()}` }, ...prev]);
  };

  const updateGalleryPhotoComment = (id: string, comment: string) => {
      setGalleryPhotos(prev => prev.map(p => p.id === id ? { ...p, comment } : p));
  };

  const deleteGalleryPhoto = (id: string) => {
      setGalleryPhotos(prev => prev.filter(p => p.id !== id));
  };

  const clearAllData = () => {
      localStorage.removeItem('sites');
      localStorage.removeItem('employees');
      localStorage.removeItem('farmers');
      localStorage.removeItem('serviceProviders');
      localStorage.removeItem('creditTypes');
      localStorage.removeItem('farmerCredits');
      localStorage.removeItem('repayments');
      localStorage.removeItem('monthlyPayments');
      localStorage.removeItem('seaweedTypes');
      localStorage.removeItem('modules');
      localStorage.removeItem('cultivationCycles');
      localStorage.removeItem('stockMovements');
      localStorage.removeItem('pressingSlips');
      localStorage.removeItem('pressedStockMovements');
      localStorage.removeItem('exportDocuments');
      localStorage.removeItem('siteTransfers');
      localStorage.removeItem('cuttingOperations');
      localStorage.removeItem('farmerDeliveries');
      localStorage.removeItem('incidents');
      localStorage.removeItem('incidentTypes');
      localStorage.removeItem('incidentSeverities');
      localStorage.removeItem('roles');
      localStorage.removeItem('periodicTests');
      localStorage.removeItem('pestObservations');
      localStorage.removeItem('users');
      localStorage.removeItem('invitations');
      localStorage.removeItem('messageLogs');
      localStorage.removeItem('galleryPhotos');
      
      setSites([]);
      setEmployees([]);
      setFarmers([]);
      setServiceProviders([]);
      setCreditTypes(defaultCreditTypes);
      setFarmerCredits([]);
      setRepayments([]);
      setMonthlyPayments([]);
      setSeaweedTypes([]);
      setModules([]);
      setCultivationCycles([]);
      setStockMovements([]);
      setPressingSlips([]);
      setPressedStockMovements([]);
      setExportDocuments([]);
      setSiteTransfers([]);
      setCuttingOperations([]);
      setFarmerDeliveries([]);
      setIncidents([]);
      setIncidentTypes(defaultIncidentTypes);
      setIncidentSeverities(defaultIncidentSeverities);
      setRoles(defaultRoles);
      setPeriodicTests([]);
      setPestObservations([]);
      setUsers(defaultUsers);
      setInvitations([]);
      setMessageLogs([]);
      setGalleryPhotos([]);
  };

  const value = { 
      sites, addSite, updateSite, deleteSite, 
      employees, addEmployee, updateEmployee, deleteEmployee, deleteMultipleEmployees, updateEmployeesSite, 
      farmers, addFarmer, updateFarmer, getFarmersBySite, deleteFarmer, deleteMultipleFarmers, updateFarmersSite, 
      serviceProviders, addServiceProvider, updateServiceProvider, deleteServiceProvider, 
      creditTypes, addCreditType, updateCreditType, deleteCreditType, 
      farmerCredits, addFarmerCredit, addMultipleFarmerCredits, 
      repayments, addRepayment, addMultipleRepayments, 
      monthlyPayments, addMonthlyPayment, addMultipleMonthlyPayments, updateMonthlyPayment, deleteMonthlyPayment, 
      seaweedTypes, addSeaweedType, updateSeaweedType, deleteSeaweedType, updateSeaweedPrices, 
      modules, cultivationCycles, addModule, updateModule, deleteModule, deleteMultipleModules, updateModulesFarmer, 
      addCultivationCycle, updateCultivationCycle, updateMultipleCultivationCycles, deleteCultivationCycle, startCultivationFromCuttings, 
      stockMovements, addStockMovement, addMultipleStockMovements, recordReturnFromPressing, 
      farmerDeliveries, addFarmerDelivery, deleteFarmerDelivery, 
      addInitialStock, transferBaggedToStock, exportStockBatch, 
      pressingSlips, pressedStockMovements, addPressingSlip, updatePressingSlip, deletePressingSlip, addInitialPressedStock, addPressedStockAdjustment,
      exportDocuments, addExportDocument, updateExportDocument, deleteExportDocument, 
      siteTransfers, addSiteTransfer, updateSiteTransfer, 
      cuttingOperations, addCuttingOperation, updateCuttingOperation, updateMultipleCuttingOperations, deleteCuttingOperation, 
      incidents, addIncident, updateIncident, deleteIncident, 
      incidentTypes, addIncidentType, updateIncidentType, deleteIncidentType, 
      incidentSeverities, addIncidentSeverity, updateIncidentSeverity, deleteIncidentSeverity, 
      roles, addRole, updateRole, deleteRole, 
      periodicTests, addPeriodicTest, updatePeriodicTest, deletePeriodicTest, 
      pestObservations, 
      users, findUserByEmail, addUser, setUserPasswordResetToken, findUserByPasswordResetToken, updateUserPassword, updateUser,
      markCyclesAsPaid, markDeliveriesAsPaid, 
      invitations, addInvitation, deleteInvitation, findInvitationByToken,
      addMessageLog, messageLogs,
      galleryPhotos, addGalleryPhoto, updateGalleryPhotoComment, deleteGalleryPhoto,
      clearAllData 
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
