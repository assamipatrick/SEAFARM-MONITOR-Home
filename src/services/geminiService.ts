import { GoogleGenAI, Type } from "@google/genai";
import type { 
    PestObservation, 
    Site, 
    Module, 
    Farmer, 
    CultivationCycle, 
    PeriodicTest, 
    SeaweedType,
    IncidentType,
    IncidentSeverity
} from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to run prompt with basic text model
async function runPrompt(prompt: string): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return response.text || '';
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Error generating content.";
    }
}

export const generatePestAnalysisNarrative = async (
    trendData: any[],
    latestObservation: PestObservation | undefined,
    language: 'en' | 'fr'
): Promise<string> => {
    const serializedTrend = trendData.map(d => {
        const pests = Object.keys(d).filter(k => k !== 'label').map(k => `${k}: ${d[k].toFixed(2)}`).join(', ');
        return `- ${d.label}: ${pests}`;
    }).join('\n');

    const serializedLatest = latestObservation
        ? Object.entries(latestObservation)
            .filter(([key]) => key !== 'id' && key !== 'date' && key !== 'siteId')
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ')
        : 'No data';

    const promptEN = `
        You are an expert marine biologist analyzing pest and disease data for a seaweed farm.
        Write a concise, insightful report in English based on the following data (levels are 0-4).

        Pest Level Trends (6-month average):
        ${serializedTrend}

        Latest Monthly Observation (average across all sites):
        ${serializedLatest}

        Provide a report with the following three sections, using "###" for headings:

        ### 1. Summary of Current State
        Briefly describe the overall pest and disease situation this month based on the latest observation.

        ### 2. Trend Analysis
        Analyze the 6-month trend data. Are pest levels generally increasing, decreasing, or stable? Identify any specific pests that show a worrying upward trend.

        ### 3. Key Risks & Recommendations
        Based on both the current state and trends, identify the top 1-2 pest-related risks for the farm. Provide specific, actionable recommendations.
    `;

    const promptFR = `
        Vous êtes un biologiste marin expert analysant les données sur les parasites et les maladies pour une ferme d'algues.
        Rédigez un rapport concis et perspicace en français basé sur les données suivantes (les niveaux sont de 0 à 4).

        Tendances des niveaux de parasites (moyenne sur 6 mois) :
        ${serializedTrend}

        Dernière observation mensuelle (moyenne sur tous les sites) :
        ${serializedLatest}

        Fournissez un rapport avec les trois sections suivantes, en utilisant "###" pour les en-têtes :

        ### 1. Résumé de la situation actuelle
        Décrivez brièvement la situation globale des parasites et maladies ce mois-ci en vous basant sur la dernière observation.

        ### 2. Analyse des Tendances
        Analysez les données de tendance sur 6 mois. Les niveaux de parasites sont-ils généralement en augmentation, en diminution ou stables ? Identifiez tout parasite spécifique qui montre une tendance à la hausse inquiétante.

        ### 3. Risques Clés & Recommandations
        Sur la base de l'état actuel et des tendances, identifiez les 1 ou 2 principaux risques liés aux parasites pour la ferme. Fournissez des recommandations spécifiques et pratiques.
    `;
    
    return runPrompt(language === 'fr' ? promptFR : promptEN);
};

export const generateFarmerPerformanceNarrative = async (data: any, language: 'en' | 'fr'): Promise<string> => {
    const promptEN = `
        You are a supportive agricultural advisor for a seaweed farm. Write a monthly performance review for a specific farmer.
        Write in English. Tone: Professional, encouraging, and constructive.

        Farmer: ${data.farmerName} (Site: ${data.siteName})
        Period: ${data.period}

        Data:
        - Planted: ${data.production.plantedLines} lines
        - Harvested: ${data.production.harvestedLines} lines
        - Total Weight: ${data.production.harvestedWeight.toFixed(2)} kg
        - Average Growth Rate: ${data.efficiency.avgGrowthRate.toFixed(2)} %/day
        - Currently Active Cycles: ${data.efficiency.activeCycles}
        - Incidents Reported: ${data.incidentsCount}

        Instructions:
        1. Start with a summary of their production.
        2. Evaluate their efficiency based on growth rate (Standard is ~3-4%).
        3. Mention their engagement based on planted lines.
        4. Address any incidents.
        5. Conclude with advice.
        Format with "###" headings.
    `;

    const promptFR = `
        Vous êtes un conseiller agricole bienveillant pour une ferme d'algues. Rédigez un bilan de performance mensuel pour un fermier spécifique.
        Rédigez en français. Ton : Professionnel, encourageant et constructif.

        Fermier : ${data.farmerName} (Site : ${data.siteName})
        Période : ${data.period}

        Données :
        - Planté : ${data.production.plantedLines} lignes
        - Récolté : ${data.production.harvestedLines} lignes
        - Poids Total : ${data.production.harvestedWeight.toFixed(2)} kg
        - Taux de Croissance Moyen : ${data.efficiency.avgGrowthRate.toFixed(2)} %/jour
        - Cycles Actuellement Actifs : ${data.efficiency.activeCycles}
        - Incidents Signalés : ${data.incidentsCount}

        Instructions :
        1. Commencez par un résumé de leur production.
        2. Évaluez leur efficacité (Standard ~3-4%).
        3. Mentionnez leur engagement.
        4. Abordez les incidents s'il y en a.
        5. Concluez par un conseil.
        Utilisez "###" pour les titres de section.
    `;

    return runPrompt(language === 'fr' ? promptFR : promptEN);
};

export const generateSiteAnalysis = async (
    data: {
        sites: Site[];
        modules: Module[];
        farmers: Farmer[];
        cultivationCycles: CultivationCycle[];
        periodicTests: PeriodicTest[];
        seaweedTypes: SeaweedType[];
    },
    language: 'en' | 'fr'
): Promise<string> => {
    const siteSummary = data.sites.map(s => {
        const siteModules = data.modules.filter(m => m.siteId === s.id);
        const farmers = data.farmers.filter(f => f.siteId === s.id).length;
        const activeCycles = data.cultivationCycles.filter(c => siteModules.some(m => m.id === c.moduleId) && (c.status === 'PLANTED' || c.status === 'GROWING')).length;
        return `${s.name}: ${siteModules.length} modules, ${farmers} farmers, ${activeCycles} active cycles`;
    }).join('\n');

    const prompt = `
        Analyze the following seaweed farm site data.
        Language: ${language === 'fr' ? 'French' : 'English'}
        
        Sites Overview:
        ${siteSummary}
        
        Provide a strategic analysis of site utilization and potential capacity issues. Use "###" for headings.
    `;
    return runPrompt(prompt);
};

export const generateDryingSuggestion = async (
    data: { seaweedType: string; totalWeight: number; notes: string },
    language: 'en' | 'fr'
): Promise<string> => {
    const prompt = `
        As an aquaculture expert, suggest a drying strategy.
        Language: ${language === 'fr' ? 'French' : 'English'}
        
        Seaweed Type: ${data.seaweedType}
        Wet Weight: ${data.totalWeight} kg
        Harvest Notes: ${data.notes}
        
        Suggest estimated drying time, target moisture content, and specific precautions.
    `;
    return runPrompt(prompt);
};

export const analyzeIncidentDescription = async (
    description: string,
    moduleCodes: string[],
    incidentTypes: IncidentType[],
    incidentSeverities: IncidentSeverity[],
    language: 'en' | 'fr'
): Promise<{ suggestedType?: string; suggestedSeverity?: string; suggestedModuleCodes?: string[] }> => {
    const prompt = `
        Analyze this incident description from a seaweed farm: "${description}"
        
        Available Incident Types: ${incidentTypes.map(t => t.id).join(', ')}
        Available Severities: ${incidentSeverities.map(s => s.id).join(', ')}
        Available Module Codes: ${moduleCodes.join(', ')}
        
        Return a JSON object with:
        - suggestedType (string, one of available types)
        - suggestedSeverity (string, one of available severities)
        - suggestedModuleCodes (array of strings, matches found in description)
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestedType: { type: Type.STRING },
                        suggestedSeverity: { type: Type.STRING },
                        suggestedModuleCodes: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) {
        console.error("Gemini JSON analysis failed", e);
        return {};
    }
};

export const analyzeImageForPest = async (
    base64Image: string,
    language: 'en' | 'fr'
): Promise<{ description: string; severity: string; type: string; treatments: string }> => {
    const prompt = `
        Analyze this image of seaweed. It might show signs of disease (like Ice-Ice, EFA), pests (grazing), or be healthy.
        
        Identify the most likely issue.
        Output ONLY a JSON object with:
        - type: (one of: "PEST_DISEASE", "ENVIRONMENTAL", "OTHER")
        - severity: (one of: "LOW", "MEDIUM", "HIGH", "CRITICAL")
        - description: A short description of the visual symptoms observed in ${language === 'fr' ? 'French' : 'English'}.
        - treatments: A concise list of immediate actions or treatments recommended for this specific issue in ${language === 'fr' ? 'French' : 'English'}.
    `;

    try {
        const base64Data = base64Image.split(',')[1] || base64Image;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                    { text: prompt }
                ]
            },
        });
        let jsonString = response.text?.trim() || '{}';
        if (jsonString.startsWith('```json')) {
            jsonString = jsonString.substring(7, jsonString.length - 3).trim();
        } else if (jsonString.startsWith('```')) {
            jsonString = jsonString.substring(3, jsonString.length - 3).trim();
        }
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Gemini Image analysis failed", e);
        return { description: "Analysis failed", severity: "LOW", type: "OTHER", treatments: "" };
    }
};

export const generateFarmOverviewNarrative = async (data: any, language: 'en' | 'fr'): Promise<string> => {
    const prompt = `
        Write an executive summary for the monthly seaweed farm report.
        Language: ${language === 'fr' ? 'French' : 'English'}
        Data: ${JSON.stringify(data)}
        
        Focus on production vs targets, line utilization, and overall health. Use "###" for headings.
    `;
    return runPrompt(prompt);
};

export const generateEmployeeDistributionNarrative = async (data: any, language: 'en' | 'fr'): Promise<string> => {
    const prompt = `
        Analyze employee distribution.
        Language: ${language === 'fr' ? 'French' : 'English'}
        Data: ${JSON.stringify(data)}
        
        Comment on the ratio of permanent vs casual staff and site allocation. Use "###" for headings.
    `;
    return runPrompt(prompt);
};

export const generateOverallSiteStockNarrative = async (data: any, language: 'en' | 'fr'): Promise<string> => {
    const prompt = `
        As a logistics manager for a seaweed farm, analyze the current on-site stock levels.
        Language: ${language === 'fr' ? 'French' : 'English'}
        
        Current Stock Data:
        ${JSON.stringify(data)}
        
        Task:
        1. Identify any sites with unusually high stock accumulation (bottlenecks).
        2. Point out stock imbalances between sites or seaweed types.
        3. Recommend if transfers to the central warehouse are needed.
        
        Keep it brief and actionable. Use "###" for section headers.
    `;
    return runPrompt(prompt);
};

export const generateExportNarrative = async (data: any, currency: string, language: 'en' | 'fr'): Promise<string> => {
    const prompt = `
        Summarize export activity.
        Language: ${language === 'fr' ? 'French' : 'English'}
        Currency: ${currency}
        Data: ${JSON.stringify(data)}
        
        Highlight total volume, value, and main destinations. Use "###" for headings.
    `;
    return runPrompt(prompt);
};

export const generateCreditNarrative = async (data: any, currency: string, language: 'en' | 'fr'): Promise<string> => {
    const prompt = `
        Analyze farmer credit situation.
        Language: ${language === 'fr' ? 'French' : 'English'}
        Currency: ${currency}
        Data: ${JSON.stringify(data)}
        
        Comment on new credits vs reimbursements and overall debt health. Use "###" for headings.
    `;
    return runPrompt(prompt);
};

export const generateHarvestPrediction = async (
    cycle: CultivationCycle, 
    module: Module, 
    seaweedType: SeaweedType, 
    history: CultivationCycle[], 
    weather: PeriodicTest[], 
    language: 'en' | 'fr'
) => {
    const simplifiedHistory = history.map(h => ({
        planted: h.plantingDate,
        harvested: h.harvestDate,
        yield: h.harvestedWeight
    }));
    const simplifiedWeather = weather.map(w => ({
        temp: w.temperature,
        salinity: w.salinity,
        date: w.date
    }));

    const prompt = `
        Predict harvest date and yield for a seaweed cycle.
        Language: ${language === 'fr' ? 'French' : 'English'}
        
        Current Cycle: Planted ${cycle.plantingDate}, Type ${seaweedType.name}, Initial Weight ${cycle.initialWeight}kg.
        Historical Data: ${JSON.stringify(simplifiedHistory.slice(0, 10))}
        Recent Weather: ${JSON.stringify(simplifiedWeather.slice(0, 5))}
        
        Return JSON with:
        - predictedHarvestDateStart (YYYY-MM-DD)
        - predictedHarvestDateEnd (YYYY-MM-DD)
        - predictedYieldKgMin (number)
        - predictedYieldKgMax (number)
        - confidenceScore (0.0 to 1.0)
        - reasoning (string)
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: { 
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        predictedHarvestDateStart: { type: Type.STRING },
                        predictedHarvestDateEnd: { type: Type.STRING },
                        predictedYieldKgMin: { type: Type.NUMBER },
                        predictedYieldKgMax: { type: Type.NUMBER },
                        confidenceScore: { type: Type.NUMBER },
                        reasoning: { type: Type.STRING }
                    }
                }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) {
        console.error("Gemini harvest prediction failed", e);
        return null;
    }
};

export const generateProductionAnalysis = async (data: any, language: 'en' | 'fr'): Promise<string> => {
    const prompt = `
        Analyze monthly production report data.
        Language: ${language === 'fr' ? 'French' : 'English'}
        Data: ${JSON.stringify(data).substring(0, 2000)}
        
        Highlight top performers, underperforming batches, and duration trends. Use "###" for headings.
    `;
    return runPrompt(prompt);
};

export const generateCreditAnalysis = async (data: any, summary: any, language: 'en' | 'fr'): Promise<string> => {
    const prompt = `
        Analyze credit report.
        Language: ${language === 'fr' ? 'French' : 'English'}
        Summary: ${JSON.stringify(summary)}
        
        Discuss credit usage trends and top borrowers. Use "###" for headings.
    `;
    return runPrompt(prompt);
};

export const generateInventoryAnalysis = async (data: any, summary: any, language: 'en' | 'fr'): Promise<string> => {
    const prompt = `
        Analyze inventory report.
        Language: ${language === 'fr' ? 'French' : 'English'}
        Summary: ${JSON.stringify(summary)}
        
        Discuss stock composition and value distribution. Use "###" for headings.
    `;
    return runPrompt(prompt);
};

export const generateGlobalFarmOverviewNarrative = async (data: any, lang: 'en'|'fr'): Promise<string> => {
    const prompt = `
        Agissez strictement en tant qu'analyste de données agricoles. Analysez les données JSON fournies qui correspondent au tableau "Aperçu Général de la Ferme".
        INSTRUCTIONS STRICTES :
        1. Ne donnez PAS de conseils généraux sur l'agriculture.
        2. Ne parlez QUE des chiffres présents dans les données. Assumez que tout champ manquant ou vide a une valeur de zéro.
        3. Interprétez les colonnes suivantes : 
           - Comparez le "Total Lignes à l'eau" par rapport aux "Total Lignes Récoltées".
           - Comparez la "Production (Kg)" entre les sites s'il y en a plusieurs.
           - Analysez le "Taux de croissance moyen" : est-il cohérent avec la production ?
           - Commentez la "Prévision de production" (m1, m2, m3) : la tendance est-elle à la hausse ou à la baisse ?
        
        Données : ${JSON.stringify(data)}
        Répondez en français de manière concise et factuelle.
    `;
    return runPrompt(prompt);
}

export const generateSalariesNarrative = async (data: any, lang: 'en'|'fr'): Promise<string> => {
    const prompt = `
        Agissez strictement en tant qu'analyste RH. Analysez les données JSON fournies correspondant au tableau "Répartition des Salariés par Site".
        INSTRUCTIONS STRICTES :
        1. Comparez les effectifs "Permanents" vs "Journaliers".
        2. Identifiez quel site a la masse salariale ("Montant du mois") la plus élevée.
        3. Calculez et mentionnez le coût moyen par employé si pertinent basé sur les totaux.
        4. Ne faites aucune supposition extérieure aux chiffres fournis. Assumez que tout champ manquant ou vide a une valeur de zéro.
        
        Données : ${JSON.stringify(data)}
        Répondez en français.
    `;
    return runPrompt(prompt);
}

export const generateSiteStocksNarrative = async (data: any, lang: 'en'|'fr'): Promise<string> => {
    const prompt = `
        Agissez strictement en tant qu'analyste de stock. Analysez les données JSON fournies correspondant au tableau "Stocks sur Sites".
        INSTRUCTIONS STRICTES :
        1. Pour chaque site/type d'algue, comparez le "Stock Ouverture" au "Stock Fermeture". Le stock a-t-il augmenté ou diminué ?
        2. Analysez les volumes d'"Entrées" (récoltes) par rapport aux "Sorties" (transferts/ventes).
        3. Signalez tout site où le stock de fermeture semble anormalement élevé par rapport aux sorties (accumulation).
        4. Assumez que tout champ manquant ou vide a une valeur de zéro.
        
        Données : ${JSON.stringify(data)}
        Répondez en français.
    `;
    return runPrompt(prompt);
}

export const generateWarehouseStocksNarrative = async (data: any, lang: 'en'|'fr'): Promise<string> => {
    const prompt = `
        Agissez strictement en tant qu'analyste logistique. Analysez les données JSON fournies correspondant au tableau "Stock Magasin de Presse".
        INSTRUCTIONS STRICTES :
        1. Distinguez clairement les "Algues en Vrac" (matière première) des "Algues Pressées" (produit fini).
        2. Commentez le taux de transformation : les sorties de Vrac correspondent-elles aux entrées de Pressé (approximativement) ?
        3. Analysez le stock final de balles prêtes à l'export.
        4. Assumez que tout champ manquant ou vide a une valeur de zéro.
        
        Données : ${JSON.stringify(data)}
        Répondez en français.
    `;
    return runPrompt(prompt);
}

export const generateExportsNarrative = async (data: any, lang: 'en'|'fr'): Promise<string> => {
    const prompt = `
        Agissez strictement en tant qu'analyste export. Analysez les données JSON fournies correspondant au tableau "Liste des Exportations Réalisées".
        INSTRUCTIONS STRICTES :
        1. Résumez le volume total (Kg) et la valeur totale exportée sur la période.
        2. Comparez ces chiffres aux totaux de l'année (si fournis).
        3. Mentionnez les principales destinations ou clients basés sur les colonnes "Destinataire" et "Facture N°".
        4. Assumez que tout champ manquant ou vide a une valeur de zéro.
        
        Données : ${JSON.stringify(data)}
        Répondez en français.
    `;
    return runPrompt(prompt);
}

export const generateMonthlyProductionNarrative = async (data: any, lang: 'en'|'fr'): Promise<string> => {
    const prompt = `
        Agissez strictement en tant qu'analyste de production. Analysez les données JSON fournies correspondant à la matrice "Production Mensuelle par Site".
        INSTRUCTIONS STRICTES :
        1. Identifiez le mois ayant la plus forte production (Kg) et celui avec la plus faible.
        2. Observez la tendance des "Taux de croissance (%)" au fil des mois : y a-t-il une saisonnalité visible ?
        3. Comparez la performance relative des différents sites sur les 3 derniers mois affichés.
        4. Assumez que tout champ manquant ou vide a une valeur de zéro.
        
        Données : ${JSON.stringify(data)}
        Répondez en français.
    `;
    return runPrompt(prompt);
}

export const generateCreditsSituationNarrative = async (data: any, lang: 'en'|'fr'): Promise<string> => {
    const prompt = `
        Agissez strictement en tant qu'analyste financier. Analysez les données JSON fournies correspondant au tableau "Situation des Crédits".
        INSTRUCTIONS STRICTES :
        1. Comparez les colonnes du "Mois Précédent" avec celles du "Mois En Cours" (Période actuelle).
        2. Le "Solde Crédits" a-t-il augmenté ou diminué ?
        3. Analysez le ratio entre "Total Remboursements" et l'encours de crédit. Le recouvrement est-il efficace sur cette période ?
        4. Ne citez que les chiffres du tableau. Assumez que tout champ manquant ou vide a une valeur de zéro.
        
        Données : ${JSON.stringify(data)}
        Répondez en français.
    `;
    return runPrompt(prompt);
}

export const generateIndividualFarmerStatsNarrative = async (data: any, lang: 'en'|'fr'): Promise<string> => {
    const prompt = `
        Agissez strictement en tant qu'analyste de performance. Analysez les données JSON fournies correspondant au tableau "Statistique Individuelle des Fermiers".
        INSTRUCTIONS STRICTES :
        1. Identifiez les 3 fermiers ayant la plus grosse production (Kg) sur la période la plus récente (colonne la plus à droite).
        2. Repérez les fermiers ayant des lignes plantées ("P") mais aucune récolte ("R") ou une production très faible ("Kg"), signalant un problème potentiel.
        3. Commentez la tendance générale : la majorité des fermiers sont-ils en phase de plantation ou de récolte ?
        4. Ne faites aucune supposition ou conseil. Basez-vous uniquement sur les chiffres. Assumez que tout champ manquant ou vide a une valeur de zéro.
        
        Données : ${JSON.stringify(data)}
        Répondez en français.
    `;
    return runPrompt(prompt);
}
