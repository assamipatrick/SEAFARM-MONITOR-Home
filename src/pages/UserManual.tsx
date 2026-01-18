import React, { useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import Card from '../components/ui/Card';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';

// --- Visual Components for the Manual ---

const WorkflowDiagram: React.FC<{ steps: { title: string; icon: string; desc?: string }[] }> = ({ steps }) => {
    return (
        <div className="flex flex-col md:flex-row items-stretch justify-between gap-2 my-8 relative">
             {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-6 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700 -z-10 transform translate-y-1/2"></div>

            {steps.map((step, index) => (
                <div key={index} className="flex-1 flex flex-col items-center text-center group relative">
                     {/* Connecting Line (Mobile) */}
                    {index !== steps.length - 1 && (
                        <div className="md:hidden absolute left-1/2 bottom-0 w-1 h-8 bg-gray-200 dark:bg-gray-700 transform translate-y-full -translate-x-1/2"></div>
                    )}

                    <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 border-4 border-blue-100 dark:border-blue-900 flex items-center justify-center shadow-sm mb-3 z-10 group-hover:border-blue-500 transition-colors duration-300">
                        <Icon name={step.icon} className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-1">{step.title}</h4>
                    {step.desc && <p className="text-xs text-gray-500 dark:text-gray-400 px-2">{step.desc}</p>}
                </div>
            ))}
        </div>
    );
};

const FormGuide: React.FC<{ 
    title: string; 
    fields: { name: string; description: string; required?: boolean }[] 
}> = ({ title, fields }) => {
    return (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4 my-4">
            <h4 className="font-bold text-sm text-blue-800 dark:text-blue-300 mb-3 flex items-center">
                <Icon name="Edit" className="w-4 h-4 mr-2" />
                {title}
            </h4>
            <div className="grid grid-cols-1 gap-2">
                {fields.map((field, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-baseline text-xs">
                        <span className="font-mono font-semibold text-gray-700 dark:text-gray-300 w-32 shrink-0">
                            {field.name} {field.required && <span className="text-red-500">*</span>}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 italic border-l-2 border-gray-200 dark:border-gray-600 pl-2 sm:ml-2">
                            {field.description}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ArchitectureBox: React.FC<{ title: string; subItems: string[]; color: string }> = ({ title, subItems, color }) => {
    const bgColors = {
        blue: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
        green: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
        orange: 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800',
    };

    return (
        <div className={`p-4 rounded-lg border ${bgColors[color as keyof typeof bgColors]} flex-1 min-w-[200px]`}>
            <h4 className="font-bold mb-3 text-center uppercase text-sm">{title}</h4>
            <ul className="space-y-2">
                {subItems.map((item, idx) => (
                    <li key={idx} className="flex items-center text-xs bg-white dark:bg-gray-800 p-2 rounded shadow-sm">
                        <div className={`w-2 h-2 rounded-full mr-2 bg-${color}-500`}></div>
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    );
};

const TipBox: React.FC<{ text: string }> = ({ text }) => {
    const { t } = useLocalization();
    return (
        <div className="flex items-start p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 rounded-r text-xs my-4">
            <Icon name="Sun" className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" />
            <div>
                <span className="font-bold block mb-1">{t('tip_title')}</span>
                {text}
            </div>
        </div>
    );
};

const StatusLegend: React.FC = () => {
    const { t } = useLocalization();
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
                <h4 className="font-bold text-sm mb-3 text-gray-700 dark:text-gray-300">{t('legend_module_status')}</h4>
                <div className="flex flex-wrap gap-2">
                    {['FREE', 'ASSIGNED', 'PLANTED', 'GROWING', 'HARVESTED', 'DRYING'].map(s => (
                        <StatusBadge key={s} status={s} />
                    ))}
                </div>
                <p className="text-xs text-gray-500 mt-2 italic">
                    {t('legend_module_desc')}
                </p>
            </div>
            <div>
                <h4 className="font-bold text-sm mb-3 text-gray-700 dark:text-gray-300">{t('legend_incident_severity')}</h4>
                 <div className="flex flex-wrap gap-2">
                    {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(s => (
                        <StatusBadge key={s} status={s} />
                    ))}
                </div>
                <p className="text-xs text-gray-500 mt-2 italic">
                    {t('legend_incident_desc')}
                </p>
            </div>
        </div>
    );
}

// --- Manual Sections ---

const ManualSection: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <Card className="mb-4 overflow-hidden transition-all hover:shadow-md">
            <div className="flex justify-between items-center cursor-pointer select-none p-1" onClick={() => setIsOpen(!isOpen)}>
                <h2 className="text-lg font-bold uppercase tracking-wide text-gray-800 dark:text-gray-100">{title}</h2>
                <Icon name="ChevronDown" className={`w-6 h-6 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[5000px] opacity-100 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/50' : 'max-h-0 opacity-0'}`}>
                {children}
            </div>
        </Card>
    );
};

const UserManual: React.FC = () => {
    const { t } = useLocalization();

    return (
        <div className="pb-20 max-w-5xl mx-auto font-sans">
            <div className="mb-8 text-center">
                <h1 className="text-3xl md:text-4xl font-bold mb-2 text-blue-900 dark:text-blue-100">{t('userManual')}</h1>
                <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-sm">
                    {t('manual_introduction_text')}
                </p>
            </div>

            {/* 1. Architecture Overview */}
            <ManualSection title={t('manual_architecture_title')} defaultOpen>
                <div className="flex flex-wrap gap-4">
                    <ArchitectureBox 
                        title={t('operations')} 
                        color="green"
                        subItems={[t('siteManagementTitle'), t('moduleManagementTitle'), t('cultivationCycleManagementTitle'), t('harvestProcessingTitle')]}
                    />
                    <ArchitectureBox 
                        title={t('inventory')} 
                        color="orange"
                        subItems={[t('onSiteStorageTitle'), t('siteTransfersTitle'), t('pressedWarehouseTitle'), t('exports')]}
                    />
                    <ArchitectureBox 
                        title={t('stakeholders')} 
                        color="blue"
                        subItems={[t('farmerManagementTitle'), t('farmerCreditsTitle'), t('documentPaymentsTitle'), t('reports')]}
                    />
                </div>
            </ManualSection>

            {/* 2. Setup & Configuration */}
            <ManualSection title={t('manual_setup_title')}>
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    {t('manual_setup_desc')}
                </p>
                
                <WorkflowDiagram steps={[
                    { title: t('step_sites'), icon: 'MapPin', desc: t('step_desc_define_locations') },
                    { title: t('step_modules'), icon: 'Grid', desc: t('step_desc_create_infra') },
                    { title: t('step_farmers'), icon: 'User', desc: t('step_desc_add_personnel') },
                    { title: t('step_assign'), icon: 'UserCog', desc: t('step_desc_link_farmers') },
                ]} />

                <FormGuide 
                    title={t('siteManagementTitle')}
                    fields={[
                        { name: t('siteName'), description: t('field_site_name'), required: true },
                        { name: t('manager'), description: t('field_manager') },
                        { name: t('zones'), description: t('field_zones') },
                    ]}
                />
                
                <TipBox text={t('tip_map_interaction')} />
            </ManualSection>

            {/* 3. Production Cycle */}
            <ManualSection title={t('manual_production_title')}>
                <h3 className="font-bold text-md mb-2 text-gray-800 dark:text-gray-200">{t('cyclePerformance')}</h3>
                
                <WorkflowDiagram steps={[
                    { title: t('flow_planting'), icon: 'GitBranch' },
                    { title: t('flow_growing'), icon: 'Sun' },
                    { title: t('flow_harvest'), icon: 'Scissors' },
                    { title: t('flow_drying'), icon: 'Wind' },
                    { title: t('flow_bagging'), icon: 'Archive' },
                    { title: t('flow_stock'), icon: 'Warehouse' },
                ]} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormGuide 
                        title={t('guide_how_to_harvest')}
                        fields={[
                            { name: t('date'), description: t('date'), required: true },
                            { name: t('harvestedWeight'), description: t('field_harvest_weight'), required: true },
                            { name: t('cuttingsTaken'), description: t('field_cuttings_taken') },
                            { name: t('linesHarvested'), description: t('numberOfLines'), required: true },
                        ]}
                    />
                    <div className="p-4 text-sm text-gray-600 dark:text-gray-400">
                        <h4 className="font-bold mb-2">{t('notes')}</h4>
                        <ul className="list-disc list-inside space-y-1">
                            <li>{t('manual_desc_planting')}</li>
                            <li>{t('manual_desc_harvest')}</li>
                            <li>{t('manual_desc_processing')}</li>
                        </ul>
                    </div>
                </div>
                
                <TipBox text={t('tip_auto_growth')} />
            </ManualSection>

            {/* 4. Inventory Management - NEW DETAILED SECTION */}
            <ManualSection title={t('manual_inventory_title')}>
                 <div className="space-y-8">
                    {/* On-Site Storage */}
                    <section>
                        <h3 className="font-bold text-md text-blue-700 dark:text-blue-300 mb-2 flex items-center">
                            <Icon name="Warehouse" className="w-5 h-5 mr-2" />
                            {t('manual_storage_guide_title')}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('manual_storage_guide_text')}</p>
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900">
                            <h4 className="font-bold text-xs uppercase mb-2">{t('manual_step_normal_transfer_title')} :</h4>
                            <p className="text-xs whitespace-pre-wrap leading-relaxed">{t('manual_step_normal_transfer_text')}</p>
                        </div>
                    </section>

                    {/* Farmer Deliveries */}
                    <section>
                        <h3 className="font-bold text-md text-blue-700 dark:text-blue-300 mb-2 flex items-center">
                            <Icon name="Truck" className="w-5 h-5 mr-2" />
                            {t('manual_deliveries_guide_title')}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('manual_deliveries_guide_text')}</p>
                        <FormGuide 
                            title={t('recordDelivery')}
                            fields={[
                                { name: t('farmerLabel'), description: t('selectFarmer'), required: true },
                                { name: t('totalWeightKgDelivery'), description: 'Total weight of all delivered bags.', required: true },
                                { name: t('destination'), description: 'Where to store the seaweed (Site stock vs central warehouse).' },
                            ]}
                        />
                    </section>

                    {/* Site Transfers */}
                    <section>
                        <h3 className="font-bold text-md text-blue-700 dark:text-blue-300 mb-2 flex items-center">
                            <Icon name="ArrowRightLeft" className="w-5 h-5 mr-2" />
                            {t('manual_transfers_guide_title')}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('manual_transfers_guide_text')}</p>
                        <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-lg border border-orange-100 dark:border-orange-900">
                             <h4 className="font-bold text-xs uppercase mb-2">{t('manual_step_shipping_slip_title')} :</h4>
                             <p className="text-xs whitespace-pre-wrap leading-relaxed">{t('manual_step_shipping_slip_text')}</p>
                        </div>
                    </section>

                    {/* Pressed Warehouse */}
                    <section>
                        <h3 className="font-bold text-md text-blue-700 dark:text-blue-300 mb-2 flex items-center">
                            <Icon name="Building" className="w-5 h-5 mr-2" />
                            {t('manual_pressing_guide_title')}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('manual_pressing_guide_text')}</p>
                        <TipBox text="Remember to check the input and output weights. Transformation usually results in a minor weight loss due to dust and waste removal." />
                    </section>

                    {/* Exports */}
                    <section>
                        <h3 className="font-bold text-md text-blue-700 dark:text-blue-300 mb-2 flex items-center">
                            <Icon name="Globe" className="w-5 h-5 mr-2" />
                            {t('manual_exports_guide_title')}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('manual_exports_guide_text')}</p>
                        <div className="flex flex-wrap gap-2">
                             <StatusBadge status="COMMERCIAL_INVOICE" />
                             <StatusBadge status="PACKING_LIST" />
                             <StatusBadge status="CERTIFICATE_OF_ORIGIN" />
                        </div>
                    </section>
                 </div>
            </ManualSection>

            {/* 5. Monitoring - NEW DETAILED SECTION */}
            <ManualSection title={t('manual_monitoring_title')}>
                <div className="space-y-8">
                    {/* Periodic Tests */}
                    <section>
                        <h3 className="font-bold text-md text-blue-700 dark:text-blue-300 mb-2 flex items-center">
                            <Icon name="Beaker" className="w-5 h-5 mr-2" />
                            {t('manual_tests_guide_title')}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('manual_tests_guide_text')}</p>
                        <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-lg border border-purple-100 dark:border-purple-900">
                             <h4 className="font-bold text-xs uppercase mb-2">{t('manual_step_periodic_test_title')} :</h4>
                             <p className="text-xs whitespace-pre-wrap leading-relaxed">{t('manual_step_periodic_test_text')}</p>
                        </div>
                    </section>

                    {/* Incidents */}
                    <section>
                        <h3 className="font-bold text-md text-blue-700 dark:text-blue-300 mb-2 flex items-center">
                            <Icon name="AlertTriangle" className="w-5 h-5 mr-2" />
                            {t('manual_incidents_guide_title')}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('manual_incidents_guide_text')}</p>
                        <TipBox text={t('tip_ai_pest')} />
                    </section>
                </div>
            </ManualSection>

            {/* 6. Finance */}
            <ManualSection title={t('manual_finance_title')}>
                <p className="text-sm mb-4">{t('manual_finance_desc')}</p>
                
                 <FormGuide 
                    title={t('guide_how_to_pay')}
                    fields={[
                        { name: t('period'), description: t('deliveryPeriod'), required: true },
                        { name: t('paymentType'), description: t('desc_select_payment_type'), required: true },
                        { name: t('site'), description: t('desc_filter_site') },
                    ]}
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                     <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                         <h5 className="font-bold text-xs uppercase text-green-800 dark:text-green-300 mb-2">{t('manual_finance_formula_title')}</h5>
                         <p className="text-xs font-mono whitespace-pre-line">
                            <strong>{t('manual_finance_formula_text')}</strong>
                         </p>
                     </div>
                     <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
                         <h5 className="font-bold text-xs uppercase text-blue-800 dark:text-blue-300 mb-2">{t('reports')}</h5>
                         <p className="text-xs">
                            {t('manual_finance_reports_text')}
                         </p>
                     </div>
                </div>
            </ManualSection>

             {/* 7. Reports */}
             <ManualSection title={t('manual_reports_title')}>
                 <div className="space-y-2 text-sm">
                     <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                         <span className="font-bold text-blue-600">{t('globalFarmReport')}</span>: {t('report_type_global')}
                     </div>
                     <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                         <span className="font-bold text-blue-600">{t('individualFarmerReport')}</span>: {t('report_type_farmer')}
                     </div>
                     <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                         <span className="font-bold text-blue-600">{t('documentPaymentsTitle')}</span>: {t('report_type_payment')}
                     </div>
                 </div>
             </ManualSection>
             
             {/* 8. Status Legend */}
             <ManualSection title={t('status_legend_title')}>
                 <StatusLegend />
             </ManualSection>
            
            {/* Footer Note */}
            <div className="mt-8 text-center text-xs text-gray-400">
                <p>{t('appName')} v1.2 - {t('manual_introduction')}</p>
            </div>

        </div>
    );
};

export default UserManual;