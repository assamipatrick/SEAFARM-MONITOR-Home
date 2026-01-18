// types.ts

export interface Theme {
    id: string;
    name: string;
    className: string;
    font: string;
}

export interface Denomination {
    id: string;
    type: 'coin' | 'banknote';
    value: number;
}

export interface CompanySettings {
    logoUrl: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    nif: string;
    rc: string;
    stat: string;
    capital: number;
}

export type CoordinateFormat = 'DMS' | 'DD';

export interface LocalizationSettings {
    country: string;
    currency: string;
    currencySymbol: string;
    thousandsSeparator: string;
    decimalSeparator: string;
    monetaryDecimals: number;
    nonMonetaryDecimals: number;
    denominations: Denomination[];
    coordinateFormat: CoordinateFormat;
}

export enum Language {
    EN = 'en',
    FR = 'fr',
}

export interface AppSettings {
    company: CompanySettings;
    localization: LocalizationSettings;
    theme: Theme;
    language: Language;
}

export interface User {
    id: string;
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    roleId: string;
    phone?: string;
    organizationId?: string;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
}

export enum InvitationStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    EXPIRED = 'EXPIRED',
}

export interface Invitation {
    id: string;
    token: string;
    recipient: string;
    channel: 'EMAIL' | 'WHATSAPP';
    roleId: string;
    status: InvitationStatus;
    createdAt: string;
    expiresAt: string;
    invitedBy: string;
}

export interface MessageLog {
    id: string;
    date: string;
    senderId: string;
    recipientCount: number;
    filterType: 'ALL' | 'SITE' | 'SELECTED';
    filterValue?: string;
    channel: 'SMS' | 'WHATSAPP';
    content: string;
    status: 'SENT' | 'FAILED';
}

export interface GalleryPhoto {
    id: string;
    date: string;
    url: string;
    comment: string;
    uploadedBy: string;
}

export interface Zone {
    id: string;
    name: string;
    geoPoints: string[];
}

export interface Site {
    id: string;
    name: string;
    code: string;
    location: string;
    managerId?: string;
    zones: Zone[];
}

export type EmployeeType = 'PERMANENT' | 'CASUAL';

export interface Employee {
    id: string;
    code: string;
    firstName: string;
    lastName: string;
    employeeType: EmployeeType;
    role: string;
    category: string;
    team?: string;
    phone: string;
    email: string;
    hireDate: string;
    siteId?: string;
    grossWage: number;
}

export interface Farmer {
    id: string;
    firstName: string;
    lastName: string;
    code: string;
    gender: 'Male' | 'Female' | 'Other';
    dob: string;
    birthPlace: string;
    idNumber: string;
    address: string;
    siteId: string;
    maritalStatus: 'Single' | 'Married' | 'Divorced' | 'Widowed';
    nationality: string;
    parentsInfo: string;
    phone?: string;
}

export interface ServiceProvider {
    id: string;
    name: string;
    serviceType: string;
    contactPerson?: string;
    phone: string;
    email?: string;
    address?: string;
}

export interface ModuleCutInfo {
    moduleId: string;
    linesCut: number;
}

export interface CuttingOperation {
    id: string;
    date: string;
    siteId: string;
    serviceProviderId: string;
    moduleCuts: ModuleCutInfo[];
    unitPrice: number;
    totalAmount: number;
    isPaid: boolean;
    paymentDate?: string;
    notes?: string;
    seaweedTypeId: string;
    beneficiaryFarmerId?: string;
}

export interface CreditType {
    id: string;
    name: string;
    hasQuantity: boolean;
    unit?: string;
    hasUnitPrice: boolean;
    isDirectAmount: boolean;
}

export interface FarmerCredit {
    id: string;
    date: string;
    siteId: string;
    farmerId: string;
    creditTypeId: string;
    quantity?: number;
    unitPrice?: number;
    totalAmount: number;
    relatedOperationId?: string;
    notes?: string;
}

export interface Repayment {
    id: string;
    date: string;
    farmerId: string;
    amount: number;
    method: 'cash' | 'harvest_deduction';
    notes?: string;
    paymentRunId?: string;
}

export enum RecipientType {
    FARMER = 'FARMER',
    EMPLOYEE = 'EMPLOYEE',
    SERVICE_PROVIDER = 'SERVICE_PROVIDER',
}

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface MonthlyPayment {
    id: string;
    date: string;
    period: string;
    recipientType: RecipientType;
    recipientId: string;
    amount: number;
    method: 'cash' | 'bank_transfer' | 'mobile_money';
    notes?: string;
    paymentRunId?: string;
    paymentStatus?: PaymentStatus;
    transactionId?: string;
    mobileProvider?: string;
    phoneNumber?: string;
}

export interface SeaweedPriceHistory {
    date: string;
    wetPrice: number;
    dryPrice: number;
}

export interface SeaweedType {
    id: string;
    name: string;
    scientificName: string;
    description: string;
    wetPrice: number;
    dryPrice: number;
    priceHistory: SeaweedPriceHistory[];
}

export enum ModuleStatus {
    CREATED = 'CREATED',
    FREE = 'FREE',
    ASSIGNED = 'ASSIGNED',
    CUTTING = 'CUTTING',
    PLANTED = 'PLANTED',
    GROWING = 'GROWING',
    HARVESTED = 'HARVESTED',
    DRYING = 'DRYING',
    BAGGING = 'BAGGING',
    BAGGED = 'BAGGED',
    IN_STOCK = 'IN_STOCK',
    EXPORTED = 'EXPORTED',
    MAINTENANCE = 'MAINTENANCE',
    STORED = 'STORED',
}

export type HistoryStatus = keyof typeof ModuleStatus;

export interface ModuleStatusHistory {
    status: HistoryStatus;
    date: string;
    notes?: string;
}

export interface Module {
    id: string;
    code: string;
    siteId: string;
    zoneId: string;
    farmerId?: string;
    lines: number;
    poles: {
        galvanized: number;
        wood: number;
        plastic: number;
    };
    statusHistory: ModuleStatusHistory[];
    latitude?: string;
    longitude?: string;
}

export interface CultivationCycle {
    id: string;
    moduleId: string;
    seaweedTypeId: string;
    plantingDate: string;
    status: ModuleStatus;
    initialWeight: number;
    cuttingOperationId?: string;
    linesPlanted?: number;
    harvestDate?: string;
    harvestedWeight?: number;
    linesHarvested?: number;
    cuttingsTakenAtHarvestKg?: number;
    dryingStartDate?: string;
    dryingCompletionDate?: string;
    actualDryWeightKg?: number;
    baggingStartDate?: string;
    baggedDate?: string;
    baggedBagsCount?: number;
    baggedWeightKg?: number;
    bagWeights?: number[];
    stockDate?: string;
    exportDate?: string;
    processingNotes?: string;
    paymentRunId?: string;
}

export interface PredictionResult {
    predictedHarvestDateStart: string;
    predictedHarvestDateEnd: string;
    predictedYieldKgMin: number;
    predictedYieldKgMax: number;
    confidenceScore: number;
    reasoning: string;
}

export enum StockMovementType {
    INITIAL_STOCK = 'INITIAL_STOCK',
    BAGGING_TRANSFER = 'BAGGING_TRANSFER',
    EXPORT_OUT = 'EXPORT_OUT',
    FARMER_DELIVERY = 'FARMER_DELIVERY',
    PRESSING_OUT = 'PRESSING_OUT',
    PRESSING_IN = 'PRESSING_IN',
    SITE_TRANSFER_IN = 'SITE_TRANSFER_IN',
    SITE_TRANSFER_OUT = 'SITE_TRANSFER_OUT',
    ADJUSTMENT_IN = 'ADJUSTMENT_IN',
    ADJUSTMENT_OUT = 'ADJUSTMENT_OUT',
}

export interface StockMovement {
    id: string;
    date: string;
    siteId: string;
    seaweedTypeId: string;
    type: StockMovementType;
    designation: string;
    inKg?: number;
    inBags?: number;
    outKg?: number;
    outBags?: number;
    relatedId?: string;
}

export interface FarmerDelivery {
    id: string;
    slipNo: string;
    date: string;
    siteId: string;
    farmerId: string;
    seaweedTypeId: string;
    totalWeightKg: number;
    totalBags: number;
    bagWeights: number[];
    destination: 'SITE_STORAGE' | 'PRESSING_WAREHOUSE_BULK';
    paymentRunId?: string;
}

export interface PressingSlip {
    id: string;
    slipNo: string;
    date: string;
    sourceSiteId: string; 
    seaweedTypeId: string;
    consumedWeightKg: number;
    consumedBags: number;
    producedWeightKg: number;
    producedBalesCount: number;
    exportDocId?: string;
}

export enum PressedStockMovementType {
    INITIAL_STOCK = 'INITIAL_STOCK',
    PRESSING_IN = 'PRESSING_IN',
    EXPORT_OUT = 'EXPORT_OUT',
    RETURN_TO_SITE = 'RETURN_TO_SITE',
    BULK_IN_FROM_SITE = 'BULK_IN_FROM_SITE',
    PRESSING_CONSUMPTION = 'PRESSING_CONSUMPTION',
    FARMER_DELIVERY = 'FARMER_DELIVERY',
    ADJUSTMENT_IN = 'ADJUSTMENT_IN',
    ADJUSTMENT_OUT = 'ADJUSTMENT_OUT',
}

export interface PressedStockMovement {
    id: string;
    date: string;
    siteId: string;
    seaweedTypeId: string;
    type: PressedStockMovementType;
    designation: string;
    inBales?: number;
    outBales?: number;
    inKg?: number;
    outKg?: number;
    relatedId?: string;
}

export enum ExportDocType {
    COMMERCIAL_INVOICE = 'COMMERCIAL_INVOICE',
    PACKING_LIST = 'PACKING_LIST',
    CERTIFICATE_OF_ORIGIN = 'CERTIFICATE_OF_ORIGIN',
}

export enum ContainerType {
    GP20 = "20' GP",
    GP40 = "40' GP",
    HC40 = "40' HC",
}

export interface ExportContainer {
    id: string;
    containerNo: string;
    sealNo: string;
    containerType: ContainerType;
    volumeM3: number;
    tareKg: number;
    packageWeightKg?: number;
    seaweedWeightKg: number;
    packagesCount: number;
    grossWeightKg: number;
    unitPrice: number;
    value: number;
}

export interface ExportDocument {
    id: string;
    docNo: string;
    docType: ExportDocType;
    invoiceNo: string;
    date: string;
    seaweedTypeId: string;
    nature: string;
    poNo: string;
    domiciliationNo: string;
    destinationCountry: string;
    city: string;
    
    notifyParty: string;
    notifyPartyAddress?: string;
    notifyPartyEmail?: string;
    notifyPartyPhone?: string;

    debtor: string;
    debtorAddress?: string;
    debtorEmail?: string;
    debtorPhone?: string;

    vessel: string;
    seaWaybill: string;
    voyageNo: string;
    currency: 'EUR' | 'USD';
    localExchangeRate: number;
    pressingSlipIds: string[];
    containers: ExportContainer[];
    customsNomenclature: string;
    countryOfOrigin: string;
    incoterms: string;
    paymentTerms: string;
    swiftBank: string;
    rexReference?: string;
}

export enum SiteTransferStatus {
    AWAITING_OUTBOUND = 'AWAITING_OUTBOUND',
    IN_TRANSIT = 'IN_TRANSIT',
    PENDING_RECEPTION = 'PENDING_RECEPTION',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export interface SiteTransferHistoryEntry {
    status: SiteTransferStatus;
    date: string;
    notes?: string;
}

export interface SiteTransfer {
    id: string;
    date: string;
    sourceSiteId: string;
    destinationSiteId: string;
    seaweedTypeId: string;
    managerId?: string;
    transporter: string;
    weightKg: number;
    bags: number;
    status: SiteTransferStatus;
    completionDate?: string;
    receivedWeightKg?: number;
    receivedBags?: number;
    notes?: string;
    history: SiteTransferHistoryEntry[];
    transport?: 'Boat' | 'Truck';
    representative?: string;
    bagWeights: number[];
}

export interface IncidentType {
    id: string;
    name: string;
    isDefault?: boolean;
}

export interface IncidentSeverity {
    id: string;
    name: string;
    isDefault?: boolean;
}

export interface Role {
    id: string;
    name: string;
    permissions: string[];
    isDefault?: boolean;
}

export enum IncidentStatus {
    OPEN = 'OPEN',
    IN_PROGRESS = 'IN_PROGRESS',
    RESOLVED = 'RESOLVED',
    CLOSED = 'CLOSED',
}

export interface Incident {
    id: string;
    date: string;
    siteId: string;
    type: string;
    severity: string;
    affectedModuleIds: string[];
    reportedById: string;
    status: IncidentStatus;
    resolutionNotes?: string;
    resolvedDate?: string;
    description: string;
}

export type TestPeriod = 'PLANTING' | 'PERIOD_1' | 'PERIOD_2' | 'PERIOD_3' | 'PERIOD_4' | 'PERIOD_5';

export interface PeriodicTest {
    id: string;
    identity: string;
    date: string;
    siteId: string;
    seaweedTypeId: string;
    zoneId: string;
    period: TestPeriod;
    weightKg: number;
    growthRate: number | null;
    temperature: number | null;
    salinity: number | null;
    precipitation: number | null;
    windSpeed: number | null;
    windDirection: number | null;
    waveHeight: number | null;
    weatherDataSource: 'auto' | 'manual';
    conductorId: string;
}

export interface PestObservation {
    id: string;
    date: string;
    siteId: string;
    EFA: number;
    HYDROCLATHRUS: number;
    CHAETOMORPHA: number;
    ENTEROMORPHA: number;
    ICE_ICE: number;
    FISH_GRAZING: number;
    TURTLE_GRAZING: number;
    SEDIMENT: number;
}

export interface CombinedModuleData {
    module: Module;
    cycle?: CultivationCycle;
    site?: Site;
    zone?: Zone;
    seaweedType?: SeaweedType;
    farmer?: Farmer;
    alert?: {
        type: 'unassigned_long';
        message: string;
    };
}

export interface Notification {
    id: string;
    type: string;
    messageKey: string;
    messageParams: Record<string, string | number>;
    date: string;
    relatedId: string;
    path: string;
}