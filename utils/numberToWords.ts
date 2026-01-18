// utils/numberToWords.ts

const en = {
    units: ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'],
    teens: ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'],
    tens: ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'],
    scales: ['', 'thousand', 'million', 'billion', 'trillion'],
    and: 'and',
    zero: 'zero'
};

const fr = {
    units: ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'],
    teens: ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'],
    tens: ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'],
    scales: ['', 'mille', 'million', 'milliard', 'billion'],
    and: 'et',
    zero: 'zéro'
};


const numberToWordsFR = (num: number): string => {
    if (num === 0) return fr.units[0];

    const convertChunk = (n: number): string => {
        if (n === 0) return '';
        if (n < 10) return fr.units[n];
        if (n < 20) return fr.teens[n - 10];

        const ten = Math.floor(n / 10);
        const unit = n % 10;

        if (ten === 7 || ten === 9) {
            return `${fr.tens[ten - 1]}-${fr.teens[unit]}`;
        }
        
        let str = fr.tens[ten];
        if (unit > 0) {
            if (unit === 1 && ten < 8 && ten > 1) { // 21, 31, 41, 51, 61
                str += ` et un`;
            } else {
                str += `-${fr.units[unit]}`;
            }
        } else if (ten === 8) { // 80
            str += 's';
        }
        return str;
    };

    const convertHundreds = (n: number): string => {
        const h = Math.floor(n / 100);
        const rem = n % 100;
        let str = '';
        if (h > 0) {
            str = h > 1 ? `${fr.units[h]} cent` : 'cent';
            if (rem === 0 && h > 1) { 
                str += 's';
            }
        }
        if (rem > 0) {
            str += (str ? ' ' : '') + convertChunk(rem);
        }
        return str;
    };
    
    let words: string[] = [];
    let i = 0;
    while (num > 0) {
        const chunk = num % 1000;
        if (chunk > 0) {
            let chunkStr = convertHundreds(chunk);
            if (i > 0) {
                if (chunk === 1 && i === 1) { // mille
                    chunkStr = '';
                }
                let scale = fr.scales[i];
                if (chunk > 1 && i > 1) {
                    scale += 's';
                }
                words.unshift(scale);
            }
            if(chunkStr) words.unshift(chunkStr);
        }
        num = Math.floor(num / 1000);
        i++;
    }
    
    let result = words.join(' ').trim();
    
    // "quatre-vingts" and "cents" logic
    result = result.replace(/quatre-vingt(?!\S)/g, 'quatre-vingts');
    result = result.replace(/quatre-vingts-un/g, 'quatre-vingt-un');
    result = result.replace(/quatre-vingts-onze/g, 'quatre-vingt-onze');

    result = result.replace(/cent(?!\S)/g, 'cents');
    for (let j = 1; j < 10; j++) {
        result = result.replace(new RegExp(`cents ${fr.units[j]}`, 'g'), `cent ${fr.units[j]}`);
        result = result.replace(new RegExp(`cents ${fr.teens[j-1]}`, 'g'), `cent ${fr.teens[j-1]}`);
    }
     for (let j = 2; j < 10; j++) {
        result = result.replace(new RegExp(`cents ${fr.tens[j]}`, 'g'), `cent ${fr.tens[j]}`);
    }
    result = result.replace(/cents et un/g, 'cent et un');
    result = result.replace(/cents mille/g, 'cent mille');


    return result.replace('un mille', 'mille');
};

const numberToWordsEN = (num: number): string => {
    if (num === 0) return en.zero;

    const convertChunk = (n: number): string => {
        if (n === 0) return '';
        if (n < 10) return en.units[n];
        if (n < 20) return en.teens[n - 10];
        
        const ten = Math.floor(n / 10);
        const unit = n % 10;
        return en.tens[ten] + (unit > 0 ? `-${en.units[unit]}` : '');
    };
    
    const convertHundreds = (n: number): string => {
        const h = Math.floor(n / 100);
        const rem = n % 100;
        let str = '';
        if (h > 0) {
            str = `${en.units[h]} hundred`;
        }
        if (rem > 0) {
            str += (str ? ` ${en.and} ` : '') + convertChunk(rem);
        }
        return str;
    };
    
    let words = [];
    let i = 0;
    while (num > 0) {
        const chunk = num % 1000;
        if (chunk > 0) {
            words.unshift(en.scales[i]);
            words.unshift(convertHundreds(chunk));
        }
        num = Math.floor(num / 1000);
        i++;
    }
    
    return words.filter(Boolean).join(' ').trim();
};

export const numberToWords = (num: number, lang: 'en' | 'fr' = 'en', currencySettings?: { currency?: string; monetaryDecimals?: number }): string => {
    const numToProcess = Math.floor(num);
    const decimalPart = Math.round((num - numToProcess) * (10 ** (currencySettings?.monetaryDecimals || 2)));
    
    let integerWords: string;
    if (lang === 'fr') {
        integerWords = numberToWordsFR(numToProcess);
    } else {
        integerWords = numberToWordsEN(numToProcess);
    }

    let result = integerWords;
    if (currencySettings?.currency) {
        result += ` ${currencySettings.currency}`;
    }

    if (decimalPart > 0) {
        let decimalWords: string;
        if (lang === 'fr') {
            decimalWords = numberToWordsFR(decimalPart);
        } else {
            decimalWords = numberToWordsEN(decimalPart);
        }
        const subunit = lang === 'fr' ? 'centimes' : 'cents';
        result += ` ${lang === 'fr' ? 'et' : 'and'} ${decimalWords} ${subunit}`;
    }

    if (result) {
        result = result.charAt(0).toUpperCase() + result.slice(1);
    }

    return result;
};