

declare var describe: any;
declare var it: any;
declare var expect: any;
declare var jest: any;
declare var beforeAll: any;
declare var afterEach: any;

import { generateHarvestPrediction, analyzeIncidentDescription } from '../geminiService';
import { GoogleGenAI } from "@google/genai";

// Mock the GoogleGenAI library
jest.mock('@google/genai', () => {
    return {
        GoogleGenAI: jest.fn().mockImplementation(() => ({
            models: {
                generateContent: jest.fn()
            }
        })),
        Type: {
            OBJECT: 'OBJECT',
            STRING: 'STRING',
            NUMBER: 'NUMBER',
            ARRAY: 'ARRAY'
        }
    };
});

describe('Gemini Service', () => {
    const mockGenerateContent = jest.fn();

    beforeAll(() => {
        (GoogleGenAI as unknown as any).mockImplementation(() => ({
            models: {
                generateContent: mockGenerateContent
            }
        }));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('generateHarvestPrediction', () => {
        it('should correctly parse a valid JSON response from the model', async () => {
            const mockResponseText = JSON.stringify({
                predictedHarvestDateStart: '2023-12-01',
                predictedHarvestDateEnd: '2023-12-05',
                predictedYieldKgMin: 50,
                predictedYieldKgMax: 60,
                confidenceScore: 0.85,
                reasoning: 'Good weather conditions.'
            });

            mockGenerateContent.mockResolvedValue({
                text: mockResponseText
            });

            // Dummy data inputs
            const cycle: any = { plantingDate: '2023-10-01', initialWeight: 10 };
            const module: any = { code: 'A1' };
            const type: any = { name: 'Cottonii' };
            
            const result = await generateHarvestPrediction(cycle, module, type, [], [], 'en');

            expect(result).not.toBeNull();
            expect(result.predictedYieldKgMin).toBe(50);
            expect(result.confidenceScore).toBe(0.85);
        });

        it('should return null if the model returns invalid JSON', async () => {
            mockGenerateContent.mockResolvedValue({
                text: "I cannot predict this." // Not JSON
            });

            const cycle: any = { plantingDate: '2023-10-01', initialWeight: 10 };
            
            // Console error is expected here, we can spy on it to keep test output clean or just let it happen
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            const result = await generateHarvestPrediction(cycle, {} as any, {} as any, [], [], 'en');
            
            expect(result).toBeNull();
            consoleSpy.mockRestore();
        });
    });

    describe('analyzeIncidentDescription', () => {
        it('should return structured data from description', async () => {
            const mockResponse = {
                suggestedType: 'PEST_DISEASE',
                suggestedSeverity: 'HIGH',
                suggestedModuleCodes: ['MOD-01']
            };

            mockGenerateContent.mockResolvedValue({
                text: JSON.stringify(mockResponse)
            });

            const result = await analyzeIncidentDescription(
                "There is white spot on seaweed in MOD-01",
                ['MOD-01', 'MOD-02'],
                [],
                [],
                'en'
            );

            expect(result.suggestedType).toBe('PEST_DISEASE');
            expect(result.suggestedModuleCodes).toContain('MOD-01');
        });
    });
});