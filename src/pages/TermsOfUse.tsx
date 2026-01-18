
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalization } from '../contexts/LocalizationContext';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';

const TermsOfUse: React.FC = () => {
  const { t, language } = useLocalization();
  const navigate = useNavigate();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Use the localized application name (e.g., "AlgaManage")
  const applicationName = t('appName');
  // The legal entity providing the service
  const serviceProvider = "LANXIS S.a.r.l";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-20 border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
                        {applicationName.charAt(0)}
                    </div>
                    <span className="font-bold text-lg hidden sm:block">{applicationName}</span>
                </div>
                <Button variant="secondary" onClick={() => navigate(-1)}>
                    <Icon name="X" className="w-5 h-5 mr-2" />
                    {t('close')}
                </Button>
            </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-8 md:py-12">
            <div className="bg-white dark:bg-gray-800 p-8 md:p-12 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                
                {/* Title Section */}
                <div className="border-b border-gray-200 dark:border-gray-700 pb-8 mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
                        {language === 'fr' ? "Conditions Générales d'Utilisation" : "Terms of Use"}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        {language === 'fr' 
                            ? `Éditeur du service : ${serviceProvider}` 
                            : `Service Provider: ${serviceProvider}`}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                        {language === 'fr' 
                            ? `Dernière mise à jour : ${new Date().toLocaleDateString('fr-FR')}` 
                            : `Last Updated: ${new Date().toLocaleDateString('en-US')}`}
                    </p>
                </div>
                
                {/* Content */}
                <div className="prose dark:prose-invert max-w-none text-sm md:text-base leading-relaxed text-justify space-y-8">
                    {language === 'fr' ? (
                        <>
                            <section>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">1. Acceptation des Conditions</h3>
                                <p>
                                    Bienvenue sur <strong>{applicationName}</strong>, un logiciel édité et fourni par <strong>{serviceProvider}</strong>. 
                                    En accédant à ce logiciel, en créant un compte ou en utilisant toute partie du Service pour la gestion de vos activités agricoles, vous acceptez d'être lié par les présentes Conditions Générales d'Utilisation (CGU).
                                </p>
                                <p className="mt-2">
                                    Si vous n'acceptez pas ces termes, vous ne devez pas accéder à l'Application ni l'utiliser. Ces conditions régissent la relation contractuelle entre vous (l'Utilisateur ou l'Entité Agricole) et {serviceProvider}.
                                </p>
                            </section>
                            
                            <section>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">2. Description du Service</h3>
                                <p>
                                    {serviceProvider} met à disposition {applicationName}, un système logiciel de gestion (ERP) conçu pour l'aquaculture et la culture d'algues. 
                                    Le Service fournit des outils numériques pour la gestion des sites de production, le suivi des cycles de culture, la gestion des stocks, le suivi des ressources humaines et la gestion financière.
                                </p>
                                <p className="mt-2">
                                    L'Application est fournie "telle quelle". {serviceProvider} se réserve le droit de modifier, suspendre ou interrompre tout aspect du Service (mises à jour, nouvelles fonctionnalités) à tout moment pour améliorer l'expérience utilisateur ou pour des raisons techniques.
                                </p>
                            </section>
                            
                            <section>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">3. Comptes et Sécurité</h3>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li><strong>Identifiants :</strong> Vous êtes responsable de la confidentialité de vos identifiants de connexion. Toute action effectuée via votre compte est réputée avoir été effectuée par vous ou votre organisation.</li>
                                    <li><strong>Exactitude :</strong> Vous vous engagez à fournir des informations exactes concernant votre entité agricole (nom, identifiants fiscaux) dans les paramètres de l'Application.</li>
                                    <li><strong>Sécurité :</strong> Vous devez informer {serviceProvider} immédiatement de toute violation de sécurité ou utilisation non autorisée de votre compte.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">4. Licence d'Utilisation et Propriété Intellectuelle</h3>
                                <p>
                                    {serviceProvider} vous accorde une licence limitée, non exclusive, non transférable et révocable pour utiliser {applicationName} uniquement pour vos besoins internes de gestion agricole.
                                </p>
                                <p className="mt-2">
                                    Tous les droits de propriété intellectuelle relatifs au logiciel, y compris le code source, les bases de données, les algorithmes et l'interface utilisateur, demeurent la propriété exclusive de <strong>{serviceProvider}</strong>.
                                </p>
                                <p className="mt-2">
                                    Vous ne pouvez pas :
                                </p>
                                <ul className="list-disc pl-5 space-y-1 mt-1">
                                    <li>Revendre, sous-licencier ou distribuer l'Application à des tiers sans accord écrit de {serviceProvider}.</li>
                                    <li>Copier, modifier ou créer des œuvres dérivées basées sur le logiciel.</li>
                                    <li>Tenter de décompiler ou d'extraire le code source de l'Application.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">5. Propriété des Données</h3>
                                <p>
                                    <strong>Vos Données :</strong> Vous conservez tous les droits, titres et intérêts sur les données que vous saisissez dans {applicationName} (données de récolte, informations sur vos fermiers, données financières, etc.).
                                </p>
                                <p className="mt-2">
                                    <strong>Usage :</strong> En utilisant le Service, vous accordez à {serviceProvider} le droit d'héberger, de traiter et d'afficher vos données uniquement dans le but de vous fournir le Service (par exemple, pour générer vos rapports ou vos tableaux de bord). {serviceProvider} s'engage à ne pas vendre vos données agricoles à des tiers.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">6. Limitation de Responsabilité</h3>
                                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-800">
                                    <p className="font-semibold mb-2">Avertissement sur les prédictions :</p>
                                    <p>
                                        {applicationName} inclut des outils d'analyse et de prédiction (via IA ou algorithmes) concernant les récoltes, la météo ou les risques biologiques. Ces informations sont fournies à titre indicatif uniquement pour aider à la prise de décision. 
                                        {serviceProvider} ne garantit pas l'exactitude de ces prédictions et ne saurait être tenu responsable des pertes de récoltes, des pertes financières ou des décisions agricoles prises sur la base de ces données.
                                    </p>
                                </div>
                                <p className="mt-4">
                                    Dans toute la mesure permise par la loi, {serviceProvider} ne sera pas responsable des dommages indirects, incidents ou consécutifs résultant de votre utilisation du Service.
                                </p>
                            </section>
                            
                            <section>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">7. Résiliation</h3>
                                <p>
                                    {serviceProvider} peut suspendre ou résilier votre accès au Service immédiatement, sans préavis ni responsabilité, en cas de violation des présentes Conditions.
                                </p>
                                <p className="mt-2">
                                    Vous pouvez cesser d'utiliser l'Application à tout moment. Sur demande, vos données peuvent être supprimées de nos serveurs, sous réserve des obligations légales de conservation.
                                </p>
                            </section>
                            
                            <section>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">8. Droit Applicable</h3>
                                <p>
                                    Tout litige relatif à l'interprétation ou à l'exécution des présentes conditions sera soumis à la compétence exclusive des tribunaux du lieu du siège social de {serviceProvider}.
                                </p>
                            </section>
                        </>
                    ) : (
                        <>
                            <section>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">1. Acceptance of Terms</h3>
                                <p>
                                    Welcome to <strong>{applicationName}</strong>, a software provided and published by <strong>{serviceProvider}</strong>.
                                    By accessing this software, creating an account, or using any part of the Service for managing your agricultural activities, you agree to be bound by these Terms of Use.
                                </p>
                                <p className="mt-2">
                                    If you do not agree to these terms, you must not access or use the Application. These terms govern the contractual relationship between you (the User or Agricultural Entity) and {serviceProvider}.
                                </p>
                            </section>
                            
                            <section>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">2. Description of Service</h3>
                                <p>
                                    {serviceProvider} provides {applicationName}, an ERP (Enterprise Resource Planning) management system designed for aquaculture and seaweed farming.
                                    The Service provides digital tools for production site management, cultivation cycle tracking, inventory management, human resources tracking, and financial management.
                                </p>
                                <p className="mt-2">
                                    The Application is provided "as is". {serviceProvider} reserves the right to modify, suspend, or discontinue any aspect of the Service (updates, new features) at any time to improve user experience or for technical reasons.
                                </p>
                            </section>
                            
                            <section>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">3. Accounts and Security</h3>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li><strong>Credentials:</strong> You are responsible for the confidentiality of your login credentials. Any action performed via your account is deemed to have been performed by you or your organization.</li>
                                    <li><strong>Accuracy:</strong> You agree to provide accurate information regarding your agricultural entity (name, tax IDs) within the Application settings.</li>
                                    <li><strong>Security:</strong> You must notify {serviceProvider} immediately of any security breach or unauthorized use of your account.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">4. License to Use and Intellectual Property</h3>
                                <p>
                                    {serviceProvider} grants you a limited, non-exclusive, non-transferable, and revocable license to use {applicationName} solely for your internal agricultural management needs.
                                </p>
                                <p className="mt-2">
                                    All intellectual property rights related to the software, including source code, databases, algorithms, and the user interface, remain the exclusive property of <strong>{serviceProvider}</strong>.
                                </p>
                                <p className="mt-2">
                                    You may not:
                                </p>
                                <ul className="list-disc pl-5 space-y-1 mt-1">
                                    <li>Resell, sublicense, or distribute the Application to third parties without written consent from {serviceProvider}.</li>
                                    <li>Copy, modify, or create derivative works based on the software.</li>
                                    <li>Attempt to decompile or extract the source code of the Application.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">5. Data Ownership</h3>
                                <p>
                                    <strong>Your Data:</strong> You retain all rights, title, and interest in the data you enter into {applicationName} (harvest data, farmer information, financial records, etc.).
                                </p>
                                <p className="mt-2">
                                    <strong>Usage:</strong> By using the Service, you grant {serviceProvider} the right to host, process, and display your data solely for the purpose of providing the Service to you (e.g., generating your reports or dashboards). {serviceProvider} commits not to sell your agricultural data to third parties.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">6. Limitation of Liability</h3>
                                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-800">
                                    <p className="font-semibold mb-2">Disclaimer regarding predictions:</p>
                                    <p>
                                        {applicationName} includes analysis and prediction tools (via AI or algorithms) regarding harvests, weather, or biological risks. This information is provided for indicative purposes only to assist in decision-making.
                                        {serviceProvider} does not guarantee the accuracy of these predictions and shall not be held liable for crop losses, financial losses, or agricultural decisions made based on this data.
                                    </p>
                                </div>
                                <p className="mt-4">
                                    To the fullest extent permitted by law, {serviceProvider} shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service.
                                </p>
                            </section>
                            
                            <section>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">7. Termination</h3>
                                <p>
                                    {serviceProvider} may suspend or terminate your access to the Service immediately, without prior notice or liability, in the event of a breach of these Terms.
                                </p>
                                <p className="mt-2">
                                    You may stop using the Application at any time. Upon request, your data can be deleted from our servers, subject to legal retention obligations.
                                </p>
                            </section>
                            
                            <section>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">8. Governing Law</h3>
                                <p>
                                    Any dispute relating to the interpretation or execution of these terms shall be subject to the exclusive jurisdiction of the courts where {serviceProvider} is registered.
                                </p>
                            </section>
                        </>
                    )}
                </div>
            </div>
        </main>
    </div>
  );
};

// FIX: Add default export to resolve the module loading error in App.tsx.
export default TermsOfUse;
