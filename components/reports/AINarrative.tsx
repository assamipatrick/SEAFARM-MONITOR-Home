import React, { useState, FC } from 'react';
import { useLocalization } from '../../contexts/LocalizationContext';
import Button from '../ui/Button';
import Icon from '../ui/Icon';

interface AINarrativeProps {
    title: string;
    generator: () => Promise<string>;
    className?: string;
    minimal?: boolean;
}

const AINarrative: FC<AINarrativeProps> = ({ title, generator, className, minimal = false }) => {
    const { t } = useLocalization();
    const [narrative, setNarrative] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        setIsLoading(true);
        setError('');
        try {
            const result = await generator();
            // This formatting logic is for the Gemini Pro responses that use markdown.
            const formattedResult = result
                .split('###')
                .map(section => {
                    if (!section.trim()) return '';
                    const [title, ...content] = section.trim().split('\n');
                    const cleanTitle = title.replace(/^[0-9.]+\s*/, '');
                    // Always make titles bold for readability
                    const header = `**${cleanTitle}**`;
                    return `\n${header}\n${content.join('\n').trim()}`;
                })
                .join('\n')
                .trim();
            setNarrative(formattedResult);
        } catch (e) {
            console.error("Error generating narrative", e);
            setError(t('errorGeneratingNarrative'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`flex flex-col h-full ${className || 'mt-4'}`}>
             <div className="no-print mb-1 flex-shrink-0">
                <Button onClick={handleGenerate} disabled={isLoading} className="!text-xs !py-0.5 !px-2 h-6">
                    <Icon name={isLoading ? 'Activity' : 'Bot'} className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                    {title}
                </Button>
            </div>
            <div className={`${minimal ? 'flex-grow overflow-hidden' : 'p-4 bg-white rounded-lg border border-gray-200'} min-h-[20px]`}>
                {isLoading && <p className="text-xs italic text-center text-black">{t('loading')}...</p>}
                {error && <p className="text-xs text-red-600 text-center">{error}</p>}
                {narrative && (
                    <div className={minimal ? "text-xs leading-normal text-black whitespace-pre-wrap font-normal h-full text-justify" : "prose prose-sm max-w-none whitespace-pre-wrap text-black"}
                         dangerouslySetInnerHTML={{
                             // Always replace markdown bold with <strong> for both modes.
                             __html: narrative.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />')
                         }}
                    />
                )}
            </div>
        </div>
    );
};

export default AINarrative;