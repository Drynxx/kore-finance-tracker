import { GoogleGenerativeAI } from '@google/generative-ai';

// Enable CORS for external automation hooks (iOS Shortcuts, MacroDroid, Tasker)
const setCorsHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );
};

// Built-in Kore Category Dictionary for zero-latency local categorization
const CATEGORY_DICTIONARY = {
    Food: [
        'cafea', 'coffee', 'espresso', 'cappuccino', 'latte', 'starbucks', '5togo', 'ted',
        'mancare', 'food', 'pizza', 'burger', 'shaorma', 'shawarma', 'kebab', 'dristor',
        'lidl', 'kaufland', 'mega image', 'mega', 'carrefour', 'auchan', 'profi', 'penny',
        'metro', 'selgros', 'restaurant', 'pranz', 'cina', 'mic dejun', 'breakfast', 'lunch',
        'dinner', 'glovo', 'tazz', 'bolt food', 'ubereats', 'paine', 'lapte', 'oua',
        'carne', 'legume', 'fructe', 'covrig', 'patiserie', 'luca', 'petru', 'mcdonalds',
        'kfc', 'subway', 'mesopotamia', 'noodles', 'sushi', 'cantina'
    ],
    Transport: [
        'uber', 'bolt', 'taxi', 'benzina', 'motorina', 'gaz', 'diesel', 'fuel', 'petrom',
        'omv', 'mol', 'rompetrol', 'lukoil', 'socar', 'spalatorie', 'parcare', 'parking',
        'metrou', 'metrorex', 'stb', 'ratb', 'autobuz', 'bus', 'tramvai', 'tren', 'cfr',
        'bilet', 'abonament transport', 'rovinieta', 'itp', 'asigurare auto', 'rca', 'service auto'
    ],
    Utilities: [
        'chirie', 'rent', 'curent', 'electricitate', 'gaz', 'intretinere', 'enel', 'eon',
        'hidroelectrica', 'electrica', 'engie', 'digi', 'rcs', 'rds', 'vodafone', 'orange',
        'telekom', 'utilitati', 'apa nova', 'factura', 'gunoi', 'caldura', 'termoenergetica'
    ],
    Shopping: [
        'haine', 'clothes', 'pantofi', 'shoes', 'adidasi', 'mall', 'zara', 'h&m', 'hm',
        'bershka', 'pull&bear', 'stradivarius', 'mango', 'massimo dutti', 'reserved',
        'decathlon', 'intersport', 'nike', 'adidas', 'puma', 'emag', 'altex', 'flanco',
        'ikea', 'jysk', 'dedeman', 'leroy merlin', 'brico depot', 'dm', 'sephora',
        'douglas', 'notino', 'farmacie', 'catena', 'dr max', 'help net', 'cumparaturi'
    ],
    Entertainment: [
        'cinema', 'film', 'movie', 'netflix', 'spotify', 'youtube', 'hbo', 'disney',
        'apple tv', 'steam', 'playstation', 'psn', 'xbox', 'game', 'joc', 'concert',
        'festival', 'untold', 'neversea', 'electric castle', 'bere', 'beer', 'vin', 'wine',
        'club', 'party', 'bar', 'pub', 'biliard', 'bowling', 'vacanta', 'hotel', 'airbnb', 'booking'
    ],
    Salary: [
        'salariu', 'salary', 'venit', 'avans', 'lichidare', 'bonus', 'prima', 'incasat',
        'primit bani', 'transfer primit', 'diurna', 'dividende', 'bursa', 'renta'
    ],
    Freelance: [
        'freelance', 'client', 'proiect', 'factura incasata', 'upwork', 'fiverr', 'consultanta', 'onorariu'
    ]
};

const matchCategory = (text) => {
    if (!text) return 'Other';
    const lower = text.toLowerCase();
    for (const [category, keywords] of Object.entries(CATEGORY_DICTIONARY)) {
        for (const kw of keywords) {
            if (lower.includes(kw)) {
                return category;
            }
        }
    }
    return 'Other';
};

// Fast regex parsing for notification strings
const parseNotificationText = (text) => {
    const clean = text.toLowerCase().trim();

    // Regex for amounts supporting: "45.00", "45,00", "45 lei", "$45", "45 RON"
    const amountMatch = clean.match(/(?:spent|cheltuit|platit|am dat|cumparat|bought|paid|am bagat|plata de)?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:lei|ron|eur|usd|gbp|\$|€|£)?/i) ||
                        clean.match(/(\d+(?:[.,]\d{1,2})?)/);

    const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 0;

    let currency = 'RON';
    if (clean.includes('eur') || clean.includes('euro') || clean.includes('€')) currency = 'EUR';
    if (clean.includes('usd') || clean.includes('dollar') || clean.includes('$')) currency = 'USD';
    if (clean.includes('gbp') || clean.includes('lire') || clean.includes('£')) currency = 'GBP';

    const category = matchCategory(clean);

    const isIncome = /(salariu|salary|venit|avans|bonus|incasat|primit bani|transfer primit|diurna|income)/i.test(clean);
    const type = isIncome ? 'income' : 'expense';

    // Extract Merchant
    let merchant = text
        .replace(/(\d+(?:[.,]\d{1,2})?)/g, '')
        .replace(/^(google pay|google wallet|apple pay|wallet|revolut|bcr|ing|bt|raiffeisen|banca transilvania)[:\s-]*/gi, '')
        .replace(/\b(lei|ron|eur|euro|usd|spent|paid|purchase|la|pe|pentru|in|at|to|from|cu|de|a fost autorizata|plata de|plata pos|pos|tranzactie)\b/gi, '')
        .replace(/[^\w\s\u00C0-\u024F]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!merchant || merchant.length < 2) {
        merchant = category !== 'Other' ? category : 'Google/Apple Pay';
    }

    return {
        amount,
        currency,
        category,
        type,
        merchant
    };
};

export default async function handler(req, res) {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    }

    try {
        const payload = req.body || {};
        const { apiKey, secret, text, amount, currency, merchant, category, source = 'Auto-Pay', date } = payload;

        // Verify API Key / Secret format: "kore_sync_[userId]_[token]" or direct userId
        const providedKey = apiKey || secret || req.headers['authorization']?.replace('Bearer ', '');
        let targetUserId = 'guest';

        if (providedKey) {
            if (providedKey.startsWith('kore_sync_')) {
                const parts = providedKey.split('_');
                // Format: kore_sync_[userId]_[randomToken]
                if (parts.length >= 3) {
                    targetUserId = parts[2];
                }
            } else {
                targetUserId = providedKey;
            }
        }

        let parsedTransaction = null;

        // Option A: Structured transaction provided directly by iOS Shortcut
        if (amount && (typeof amount === 'number' || !isNaN(parseFloat(amount)))) {
            const numAmount = Math.abs(parseFloat(amount));
            const inferredCategory = category || matchCategory(`${merchant || ''} ${category || ''}`);
            parsedTransaction = {
                amount: numAmount,
                currency: (currency || 'RON').toUpperCase(),
                category: inferredCategory,
                type: payload.type === 'income' ? 'income' : 'expense',
                merchant: merchant || inferredCategory
            };
        } 
        // Option B: Unstructured notification text from Google Pay / Apple Pay / SMS
        else if (text && typeof text === 'string') {
            // Check if local regex parses it cleanly
            const localParsed = parseNotificationText(text);

            if (localParsed.amount > 0 && localParsed.category !== 'Other') {
                parsedTransaction = localParsed;
            } else if (process.env.GEMINI_API_KEY && text.length > 5) {
                // Fallback to Gemini 3.6 Flash for intelligent semantic parsing
                try {
                    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
                    const prompt = `
Extract payment transaction from this text: "${text}".
Categories: Food, Transport, Utilities, Shopping, Entertainment, Salary, Freelance, Other.
Output JSON only:
{
  "amount": number,
  "currency": "RON"|"EUR"|"USD"|"GBP",
  "category": string,
  "merchant": string,
  "type": "expense"|"income"
}
`;
                    const result = await model.generateContent(prompt);
                    const cleanJson = result.response.text().replace(/```json\n?|\n?```/g, '').trim();
                    const aiData = JSON.parse(cleanJson);
                    if (aiData && aiData.amount > 0) {
                        parsedTransaction = {
                            amount: Math.abs(parseFloat(aiData.amount)),
                            currency: (aiData.currency || 'RON').toUpperCase(),
                            category: aiData.category || 'Other',
                            merchant: aiData.merchant || localParsed.merchant,
                            type: aiData.type || 'expense'
                        };
                    }
                } catch (geminiErr) {
                    console.warn('[QuickTransaction] Gemini parsing fallback error:', geminiErr.message);
                    parsedTransaction = localParsed;
                }
            } else {
                parsedTransaction = localParsed;
            }
        } else {
            return res.status(400).json({
                error: 'Invalid payload. Provide either "text" (notification string) or structured "amount" and "merchant".'
            });
        }

        if (!parsedTransaction || parsedTransaction.amount <= 0) {
            return res.status(422).json({
                error: 'Could not detect a valid transaction amount from input.'
            });
        }

        // Calculate signed amount
        const signedAmount = parsedTransaction.type === 'expense'
            ? -Math.abs(parsedTransaction.amount)
            : Math.abs(parsedTransaction.amount);

        const txDate = date || new Date().toISOString();
        const finalNote = `${parsedTransaction.merchant} [${source}]`.trim();

        const docData = {
            userId: targetUserId,
            type: parsedTransaction.type,
            amount: signedAmount,
            category: parsedTransaction.category || 'Other',
            date: txDate,
            note: finalNote
        };

        // Appwrite Database Direct Ingestion (If Appwrite Server Credentials Exist)
        const appwriteEndpoint = process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
        const appwriteProject = process.env.VITE_APPWRITE_PROJECT_ID || '69247271000fd2e093f0';
        const appwriteDbId = process.env.VITE_APPWRITE_DATABASE_ID || '692472be00265c68d4e3';
        const appwriteCollectionId = process.env.VITE_APPWRITE_COLLECTION_ID || 'transaction';
        const appwriteApiKey = process.env.APPWRITE_API_KEY;

        let documentId = `doc_${Date.now()}`;
        let savedToDb = false;

        if (appwriteApiKey && targetUserId !== 'guest') {
            try {
                const appwriteRes = await fetch(`${appwriteEndpoint}/databases/${appwriteDbId}/collections/${appwriteCollectionId}/documents`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Appwrite-Project': appwriteProject,
                        'X-Appwrite-Key': appwriteApiKey
                    },
                    body: JSON.stringify({
                        documentId: 'unique()',
                        data: docData
                    })
                });

                if (appwriteRes.ok) {
                    const appwriteJson = await appwriteRes.json();
                    documentId = appwriteJson.$id;
                    savedToDb = true;
                }
            } catch (dbErr) {
                console.warn('[QuickTransaction] Appwrite write failed:', dbErr.message);
            }
        }

        // Build notification confirmation payload (Tailored for iOS Shortcuts "Show Notification" & MacroDroid "Display Notification")
        const sign = parsedTransaction.type === 'expense' ? '-' : '+';
        const formattedSignedAmount = `${sign}${parsedTransaction.amount.toFixed(2)} ${parsedTransaction.currency}`;
        const absAmount = `${parsedTransaction.amount.toFixed(2)} ${parsedTransaction.currency}`;
        
        const confirmationTitle = `💳 Kore Finance • ${parsedTransaction.type === 'expense' ? 'Expense' : 'Income'} Logged`;
        const confirmationBody = `Logged ${absAmount} at ${parsedTransaction.merchant} (${parsedTransaction.category}) via ${source}`;

        return res.status(200).json({
            success: true,
            savedToDb,
            transaction: {
                id: documentId,
                ...docData,
                currency: parsedTransaction.currency,
                merchant: parsedTransaction.merchant
            },
            notification: {
                title: confirmationTitle,
                body: confirmationBody,
                sound: 'default'
            },
            message: confirmationBody
        });

    } catch (err) {
        console.error('[QuickTransaction] Internal error:', err);
        return res.status(500).json({
            error: err.message || 'Internal server error processing transaction.'
        });
    }
}
