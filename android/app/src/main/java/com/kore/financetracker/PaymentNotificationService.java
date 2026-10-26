package com.kore.financetracker;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;
import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.TimeZone;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class PaymentNotificationService extends NotificationListenerService {

    private static final String TAG = "KorePaymentTracker";
    private static final String PREFS_NAME = "kore_payment_prefs";
    private static final String CHANNEL_ID = "kore_payment_alerts";
    
    // Set of target package names for digital wallets & major banking apps
    private static final Set<String> TARGET_PACKAGES = new HashSet<>();
    static {
        // Digital Wallets
        TARGET_PACKAGES.add("com.google.android.apps.walletnfcrel"); // Google Wallet / Google Pay
        TARGET_PACKAGES.add("com.paypal.android.p2pmobile");         // PayPal

        // International Fintech
        TARGET_PACKAGES.add("com.revolut.revolut");                 // Revolut
        TARGET_PACKAGES.add("com.transferwise.android");            // Wise
        TARGET_PACKAGES.add("com.monzo.android");                   // Monzo
        TARGET_PACKAGES.add("com.chase.sig.android");               // Chase
        TARGET_PACKAGES.add("com.n26.android");                     // N26

        // Major Romanian Banking Apps
        TARGET_PACKAGES.add("ro.btrl.btpay");                       // BT Pay
        TARGET_PACKAGES.add("ro.btrl.neobt");                       // NeoBT / BT24
        TARGET_PACKAGES.add("com.ing.mobile");                      // ING Bank Romania / Home'Bank
        TARGET_PACKAGES.add("ro.bcr.george");                       // George Romania (BCR)
        TARGET_PACKAGES.add("ro.bcr.mobilebanking");                // BCR Mobile
        TARGET_PACKAGES.add("ro.raiffeisen.smartmobile");           // Raiffeisen Smart Mobile
        TARGET_PACKAGES.add("ro.cec.mobile");                       // CEC Bank Mobile
        TARGET_PACKAGES.add("ro.brd.mobile");                       // BRD Mobile
        TARGET_PACKAGES.add("com.experian.android.mybrdnet");       // MyBRD Mobile
        TARGET_PACKAGES.add("eu.unicreditgroup.mca.ro");            // UniCredit Romania
        TARGET_PACKAGES.add("ro.alphabank.alphasafe");              // Alpha Bank Romania
    }

    // Amount & Currency Regex with strict word boundaries (\b) to prevent matching
    // normal words like "sincronizare", "audio", "cadou", "ulei"
    private static final Pattern AMOUNT_PATTERN = Pattern.compile(
        "(?:^|\\s|[-+])([$€£¥₹]|\\b(?:RON|LEI|LEU|EUR|USD|GBP|CAD|AUD|CHF)\\b)\\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})?|[0-9]+(?:[.,][0-9]{1,2})?)|" +
        "(?:^|\\s|[-+])([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})?|[0-9]+(?:[.,][0-9]{1,2})?)\\s*([$€£¥₹]|\\b(?:RON|LEI|LEU|EUR|USD|GBP|CAD|AUD|CHF)\\b)",
        Pattern.CASE_INSENSITIVE
    );

    // Cache of recent notification hashes to prevent duplicate logging within 60 seconds
    private static final Set<String> RECENT_HASHES = new HashSet<>();
    private static long LAST_CACHE_CLEAR = System.currentTimeMillis();

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        Log.i(TAG, "KorePaymentNotificationService created and active");
    }

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        Log.i(TAG, "Notification Listener connected to Android OS");
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) return;

        String packageName = sbn.getPackageName();
        
        // Read user tracking preferences
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean isTrackingEnabled = prefs.getBoolean("tracking_enabled", true);
        if (!isTrackingEnabled) return;

        Bundle extras = sbn.getNotification().extras;
        if (extras == null) return;

        CharSequence titleCs = extras.getCharSequence("android.title");
        CharSequence textCs = extras.getCharSequence("android.text");
        CharSequence bigTextCs = extras.getCharSequence("android.bigText");

        String title = titleCs != null ? titleCs.toString() : "";
        String text = textCs != null ? textCs.toString() : "";
        String bigText = bigTextCs != null ? bigTextCs.toString() : "";

        String combinedText = (title + " " + text + " " + bigText).replaceAll("\\s+", " ").trim();
        if (combinedText.isEmpty()) return;

        // 1. Immediately drop common non-payment noise (OTPs, declined transactions, balance alerts, bill reminders)
        if (isNoiseOrExcludedNotification(combinedText)) {
            Log.d(TAG, "Notification excluded as noise/non-payment: " + combinedText);
            return;
        }

        // 2. Package filtering:
        // - Known banking/wallet apps: accepted if not excluded above
        // - Google Play Services (com.google.android.gms): accepted ONLY if explicitly a Google Wallet / Google Pay prompt
        // - Other apps (e.g. SMS/carrier): accepted ONLY if they contain explicit completed financial transaction verbs
        boolean isTargetPackage = TARGET_PACKAGES.contains(packageName);
        boolean isGmsWallet = isGooglePlayWalletPrompt(packageName, title, combinedText, sbn);
        boolean hasExplicitPaymentVerbs = containsExplicitTransactionVerbs(combinedText);

        if (!isTargetPackage && !isGmsWallet && !hasExplicitPaymentVerbs) {
            return;
        }

        // 3. Deduplicate: avoid re-processing identical notification text within 60s
        long now = System.currentTimeMillis();
        if (now - LAST_CACHE_CLEAR > 60000) {
            RECENT_HASHES.clear();
            LAST_CACHE_CLEAR = now;
        }

        String hash = packageName + ":" + combinedText;
        if (RECENT_HASHES.contains(hash)) {
            return;
        }
        RECENT_HASHES.add(hash);

        Log.i(TAG, "Potential payment notification intercepted from [" + packageName + "]: " + combinedText);

        // 4. Parse payment details (amount, currency, merchant, category, type: expense vs income)
        ParsedTransaction tx = parseTransaction(title, text, bigText);
        if (tx == null || tx.amount <= 0) {
            Log.d(TAG, "Could not extract valid amount from notification");
            return;
        }

        Log.i(TAG, "Parsed Transaction: Type=" + tx.type + ", Amount=" + tx.amount + " " + tx.currency + ", Merchant=" + tx.merchant + ", Category=" + tx.category);

        // 5. Save to local SharedPreferences queue for React app sync
        saveToLocalQueue(tx);

        // 6. Post directly to Appwrite REST API in background if credentials exist
        postToAppwrite(tx);

        // 7. Post user confirmation notification
        postConfirmationNotification(tx);

        // 8. Notify Capacitor bridge if app is running
        PaymentTrackerPlugin.notifyNewTransaction(tx);
    }

    /**
     * Filters out non-transactional notifications: OTP codes, balance reports, declined cards, and bill reminders.
     */
    public static boolean isNoiseOrExcludedNotification(String text) {
        String lower = text.toLowerCase(Locale.ROOT);

        // 1. One-time Passwords, 2FA, Verification Codes
        if (lower.contains("cod") || lower.contains("code") || lower.contains("parola") ||
            lower.contains("otp") || lower.contains("securitate") || lower.contains("security code") ||
            lower.contains("autentificare") || lower.contains("verificare") || lower.contains("verification") ||
            lower.contains("one-time") || lower.contains("parola unica")) {
            return true;
        }

        // 2. Failed, Declined, Cancelled transactions
        if (lower.contains("respins") || lower.contains("esuat") || lower.contains("declin") ||
            lower.contains("failed") || lower.contains("anulat") || lower.contains("cancelled") ||
            lower.contains("insuficient") || lower.contains("insufficient") || lower.contains("neautorizat") ||
            lower.contains("blocat") || lower.contains("blocked")) {
            return true;
        }

        // 3. Balance inquiries & account statements (not a new transaction)
        if (lower.contains("sold disponibil") || lower.contains("soldul contului") || lower.contains("soldul tau") ||
            lower.contains("available balance") || lower.contains("account balance") || lower.contains("extras de cont") ||
            lower.contains("raport cont")) {
            return true;
        }

        // 4. Invoices / bills due (reminders, not yet paid)
        if (lower.contains("de plata pana") || lower.contains("termen de plata") || lower.contains("factura emisa") ||
            lower.contains("scadenta") || lower.contains("bill due") || lower.contains("payment due")) {
            return true;
        }

        return false;
    }

    /**
     * Checks if notification from com.google.android.gms specifically represents Google Wallet/Pay.
     */
    private boolean isGooglePlayWalletPrompt(String packageName, String title, String text, StatusBarNotification sbn) {
        if (!"com.google.android.gms".equals(packageName)) return false;

        String lowerTitle = title.toLowerCase(Locale.ROOT);
        String lowerText = text.toLowerCase(Locale.ROOT);

        boolean hasWalletTitle = lowerTitle.contains("google pay") || lowerTitle.contains("google wallet") || lowerTitle.contains("wallet");
        boolean hasPaymentKeyword = lowerText.contains("paid") || lowerText.contains("spent") || lowerText.contains("purchase") || lowerText.contains("platit");

        if (hasWalletTitle && hasPaymentKeyword) return true;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && sbn != null && sbn.getNotification() != null) {
            String channelId = sbn.getNotification().getChannelId();
            if (channelId != null) {
                String lowerChannel = channelId.toLowerCase(Locale.ROOT);
                if ((lowerChannel.contains("wallet") || lowerChannel.contains("pay")) && hasPaymentKeyword) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Verifies that the notification contains an explicit completed transaction verb.
     */
    public static boolean containsExplicitTransactionVerbs(String text) {
        String lower = text.toLowerCase(Locale.ROOT);
        return lower.contains("paid") || lower.contains("spent") || lower.contains("purchase") ||
               lower.contains("received") || lower.contains("refund") || lower.contains("credited") ||
               lower.contains("ai platit") || lower.contains("plata efectuata") || lower.contains("cumparare pos") ||
               lower.contains("plata pos") || lower.contains("cheltuit") || lower.contains("ai primit") ||
               lower.contains("transfer primit") || lower.contains("incasat") || lower.contains("salariu") ||
               lower.contains("alimentare cont") || lower.contains("rambursat");
    }

    /**
     * Detects whether the transaction represents an expense or an income.
     */
    public static String detectTransactionType(String text) {
        String lower = text.toLowerCase(Locale.ROOT);

        // Explicit Income Signals (Romanian & English)
        if (lower.contains("ai primit") || lower.contains("primit de la") || lower.contains("transfer primit") ||
            lower.contains("incasat") || lower.contains("incasare") || lower.contains("salariu") ||
            lower.contains("alimentare cont") || lower.contains("alimentat cu") || lower.contains("depunere") ||
            lower.contains("creditare cont") || lower.contains("rambursat") || lower.contains("rambursare") ||
            lower.contains("restituire") || lower.contains("intrat in cont") || lower.contains("ti-a trimis") ||
            lower.contains("a trimis bani") || lower.contains("bani primiti") ||
            lower.contains("you received") || lower.contains("received from") || lower.contains("transfer from") ||
            lower.contains("income") || lower.contains("salary") || lower.contains("refund") ||
            lower.contains("refunded") || lower.contains("credited") || lower.contains("deposit") ||
            lower.contains("top-up") || lower.contains("top up") || lower.contains("added money") ||
            lower.contains("sent you") || lower.matches(".*\\+\\s*([$€£¥₹]|RON|LEI|[0-9]).*")) {
            return "income";
        }

        // Explicit Expense Signals
        if (lower.contains("ai platit") || lower.contains("platit la") || lower.contains("plata la") ||
            lower.contains("plata efectuata") || lower.contains("plata pos") || lower.contains("cumparare pos") ||
            lower.contains("cumparare") || lower.contains("cheltuit") || lower.contains("ai cheltuit") ||
            lower.contains("tranzactie card") || lower.contains("plata cu cardul") || lower.contains("debitat") ||
            lower.contains("you paid") || lower.contains("paid to") || lower.contains("spent at") ||
            lower.contains("spent") || lower.contains("purchase") || lower.contains("sent to") ||
            lower.contains("debited") || lower.matches(".*-\\s*([$€£¥₹]|RON|LEI|[0-9]).*")) {
            return "expense";
        }

        // Default to expense if unclear
        return "expense";
    }

    public static class ParsedTransaction {
        public String id;
        public double amount;
        public String type; // "expense" | "income"
        public String currency;
        public String merchant;
        public String category;
        public String note;
        public String date;
        public String rawText;

        public JSONObject toJson() {
            JSONObject obj = new JSONObject();
            try {
                obj.put("id", id);
                obj.put("amount", amount);
                obj.put("type", type);
                obj.put("currency", currency);
                obj.put("merchant", merchant);
                obj.put("category", category);
                obj.put("note", note);
                obj.put("date", date);
                obj.put("rawText", rawText);
            } catch (Exception ignored) {}
            return obj;
        }
    }

    /**
     * Parses amount, merchant, category, and type (expense vs income) from notification contents.
     */
    public static ParsedTransaction parseTransaction(String title, String text, String bigText) {
        String fullContent = (title + " " + text + " " + bigText).replaceAll("\\s+", " ").trim();
        
        Matcher m = AMOUNT_PATTERN.matcher(fullContent);

        double amount = 0;
        String currency = "RON";

        if (m.find()) {
            String curr1 = m.group(1);
            String val1 = m.group(2);
            String val2 = m.group(3);
            String curr2 = m.group(4);

            String rawVal = val1 != null ? val1 : val2;
            String rawCurr = curr1 != null ? curr1 : curr2;

            if (rawVal != null) {
                amount = parseAmount(rawVal);
            }
            if (rawCurr != null) {
                currency = normalizeCurrency(rawCurr);
            }
        }

        if (amount <= 0) return null;

        // Determine transaction type (expense vs income vs transfer)
        boolean isAtm = Pattern.compile("\\b(?:retragere(?:\\s+de)?\\s+numerar|bancomat|atm\\s+withdrawal|cash\\s+withdrawal)\\b", Pattern.CASE_INSENSITIVE).matcher(fullContent).find();

        String type;
        String merchant;
        String category;

        if (isAtm) {
            type = "transfer";
            merchant = "ATM";
            category = "Other";
        } else {
            type = detectTransactionType(fullContent);
            merchant = "income".equals(type) ? "Income" : "Payment";

            if ("income".equals(type)) {
                Pattern senderPattern = Pattern.compile("(?:de\\s+la|from|expeditor|primit\\s+de\\s+la)\\s+([A-Za-z0-9&'’\\- ]+?)(?:\\s+pe|\\s+in|\\s+cu|\\.|,|$)", Pattern.CASE_INSENSITIVE);
                Matcher senderMatcher = senderPattern.matcher(fullContent);
                if (senderMatcher.find()) {
                    String found = senderMatcher.group(1).trim();
                    if (found.length() > 1 && found.length() < 35 && !found.equalsIgnoreCase("your card") && !found.equalsIgnoreCase("contul tau")) {
                        merchant = found;
                    }
                } else if (!title.equalsIgnoreCase("Google Pay") && !title.equalsIgnoreCase("Google Wallet") && !title.equalsIgnoreCase("Revolut") && title.length() > 2) {
                    merchant = title.trim();
                }
            } else {
                Pattern merchantPattern = Pattern.compile("(?:to|at|la|către|la\\s+comerciantul)\\s+([A-Za-z0-9&'’\\- ]+?)(?:\\s+on|\\s+using|\\s+with|\\s+cu|\\.|,|$)", Pattern.CASE_INSENSITIVE);
                Matcher merchantMatcher = merchantPattern.matcher(fullContent);
                if (merchantMatcher.find()) {
                    String found = merchantMatcher.group(1).trim();
                    if (found.length() > 1 && found.length() < 35 && !found.equalsIgnoreCase("your card") && !found.equalsIgnoreCase("cardul tau")) {
                        merchant = found;
                    }
                } else if (!title.equalsIgnoreCase("Google Pay") && !title.equalsIgnoreCase("Google Wallet") && !title.equalsIgnoreCase("Wallet") && title.length() > 2) {
                    merchant = title.trim();
                }
            }

            category = "income".equals(type) 
                ? categorizeIncome(merchant + " " + fullContent)
                : categorizeExpense(merchant + " " + fullContent);
        }

        ParsedTransaction tx = new ParsedTransaction();
        tx.id = UUID.randomUUID().toString();
        tx.amount = Math.round(amount * 100.0) / 100.0;
        tx.type = type;
        tx.currency = currency;
        tx.merchant = merchant;
        tx.category = category;
        
        String source = title.isEmpty() ? "Bank Notification" : title;
        if ("transfer".equals(type)) {
            tx.note = "ATM Withdrawal -> Pocket Cash";
        } else if ("income".equals(type)) {
            tx.note = "Auto-tracked income from: " + merchant;
        } else {
            tx.note = "Auto-tracked via " + source + ": " + merchant;
        }
        
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
        tx.date = sdf.format(new Date());
        tx.rawText = fullContent;

        return tx;
    }

    private static double parseAmount(String raw) {
        if (raw == null || raw.trim().isEmpty()) return 0;
        String clean = raw.trim();
        try {
            // Handle European formatting (1.250,50) vs US formatting (1,250.50)
            if (clean.contains(".") && clean.contains(",")) {
                if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
                    clean = clean.replace(".", "").replace(",", ".");
                } else {
                    clean = clean.replace(",", "");
                }
            } else if (clean.contains(",")) {
                clean = clean.replace(",", ".");
            }
            return Double.parseDouble(clean);
        } catch (Exception e) {
            return 0;
        }
    }

    private static String normalizeCurrency(String raw) {
        if (raw == null) return "RON";
        String c = raw.trim().toUpperCase(Locale.ROOT);
        if (c.equals("$")) return "USD";
        if (c.equals("€")) return "EUR";
        if (c.equals("£")) return "GBP";
        if (c.equals("LEI") || c.equals("LEU")) return "RON";
        return c;
    }

    private static String categorizeIncome(String text) {
        String lower = text.toLowerCase(Locale.ROOT);
        if (lower.contains("salariu") || lower.contains("salary")) {
            return "Salary";
        }
        if (lower.contains("freelance") || lower.contains("proiect") || lower.contains("client") || lower.contains("upwork") || lower.contains("fiverr")) {
            return "Freelance";
        }
        if (lower.contains("ramburs") || lower.contains("refund") || lower.contains("restituire")) {
            return "Other";
        }
        return "Salary";
    }

    private static String categorizeExpense(String text) {
        String lower = text.toLowerCase(Locale.ROOT);
        if (lower.matches(".*(starbucks|coffee|cafe|cafea|mcdonald|kfc|burger|restaurant|pizza|food|mancare|pranz|cina|bistro|bar|pub|subway|bakery|patiserie|glovo|wolt|tazz|uber eats|bolt food).*")) {
            return "Food";
        }
        if (lower.matches(".*(mega image|lidl|kaufland|carrefour|aldi|tesco|walmart|target|market|supermarket|grocery|auchan|penny|profi|metro|selgros).*")) {
            return "Food";
        }
        if (lower.matches(".*(uber|bolt|lyft|taxi|train|tren|metro|metrou|bus|autobuz|stb|shell|omv|petrom|mol|rompetrol|lukoil|bp|gas|benzina|motorina|fuel|parking|parcare|transit).*")) {
            return "Transport";
        }
        if (lower.matches(".*(netflix|spotify|steam|playstation|xbox|cinema|film|movie|theatre|disney|hbo|apple music|youtube|party|club|concert|festival).*")) {
            return "Entertainment";
        }
        if (lower.matches(".*(amazon|ebay|emag|altex|flanco|zara|h&m|hm|ikea|apple store|clothing|haine|shoes|adidasi|shop|store|mall|decathlon|dedeman|leroy).*")) {
            return "Shopping";
        }
        if (lower.matches(".*(electric|power|water|apa nova|vodafone|orange|digi|telekom|enel|eon|hidroelectrica|internet|utility|utilitati|chirie|rent).*")) {
            return "Utilities";
        }
        return "Other";
    }

    private void saveToLocalQueue(ParsedTransaction tx) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String existing = prefs.getString("pending_transactions", "[]");
        try {
            JSONArray arr = new JSONArray(existing);
            arr.put(tx.toJson());
            prefs.edit().putString("pending_transactions", arr.toString()).apply();
        } catch (Exception e) {
            Log.e(TAG, "Failed to save transaction to local queue", e);
        }
    }

    private void postToAppwrite(ParsedTransaction tx) {
        new Thread(() -> {
            try {
                SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                String endpoint = prefs.getString("appwrite_endpoint", "https://fra.cloud.appwrite.io/v1");
                String projectId = prefs.getString("appwrite_project_id", "69247271000fd2e093f0");
                String databaseId = prefs.getString("appwrite_database_id", "692472be00265c68d4e3");
                String collectionId = prefs.getString("appwrite_collection_id", "transaction");
                String userId = prefs.getString("appwrite_user_id", "");
                String jwt = prefs.getString("appwrite_jwt", "");

                if (userId.isEmpty()) {
                    Log.w(TAG, "No Appwrite user credentials stored. Transaction queued locally.");
                    return;
                }

                URL url = new URL(endpoint + "/databases/" + databaseId + "/collections/" + collectionId + "/documents");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("X-Appwrite-Project", projectId);
                if (!jwt.isEmpty()) {
                    conn.setRequestProperty("X-Appwrite-JWT", jwt);
                }
                conn.setDoOutput(true);
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                JSONObject body = new JSONObject();
                body.put("documentId", "unique()");
                JSONObject data = new JSONObject();
                data.put("userId", userId);
                data.put("type", tx.type);
                // Signed amount: negative for expenses, positive for income
                double signedAmount = "income".equals(tx.type) ? Math.abs(tx.amount) : -Math.abs(tx.amount);
                data.put("amount", signedAmount);
                data.put("category", tx.category);
                data.put("date", tx.date);
                data.put("note", tx.note);
                body.put("data", data);

                byte[] out = body.toString().getBytes(StandardCharsets.UTF_8);
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(out);
                }

                int code = conn.getResponseCode();
                Log.i(TAG, "Appwrite HTTP response code: " + code);
                if (code >= 200 && code < 300) {
                    // Successfully posted directly to Appwrite. Remove from local queue so it is not double-synced
                    removeFromLocalQueue(tx.id);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error posting transaction to Appwrite directly in background", e);
            }
        }).start();
    }

    private void removeFromLocalQueue(String id) {
        if (id == null) return;
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String existing = prefs.getString("pending_transactions", "[]");
            JSONArray arr = new JSONArray(existing);
            JSONArray updated = new JSONArray();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject item = arr.getJSONObject(i);
                if (!id.equals(item.optString("id"))) {
                    updated.put(item);
                }
            }
            prefs.edit().putString("pending_transactions", updated.toString()).apply();
            Log.d(TAG, "Removed transaction " + id + " from local queue after Appwrite post");
        } catch (Exception e) {
            Log.e(TAG, "Failed to remove transaction from local queue", e);
        }
    }

    private void postConfirmationNotification(ParsedTransaction tx) {
        try {
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) return;

            Intent intent = new Intent(this, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            intent.putExtra("from_payment_notification", true);
            intent.putExtra("transaction_amount", tx.amount);
            intent.putExtra("transaction_type", tx.type);
            intent.putExtra("transaction_merchant", tx.merchant);

            PendingIntent pendingIntent = PendingIntent.getActivity(
                    this,
                    (int) System.currentTimeMillis(),
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            String formattedAmount = String.format(Locale.US, "%.2f", tx.amount);
            boolean isIncome = "income".equals(tx.type);
            String title = (isIncome ? "💰 Logged Income: +" : "✅ Logged Expense: -") + tx.currency + " " + formattedAmount;
            String text = tx.merchant + " (" + tx.category + ") • Auto-added to Kore";

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                    .setSmallIcon(android.R.drawable.ic_input_add)
                    .setContentTitle(title)
                    .setContentText(text)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setAutoCancel(true)
                    .setContentIntent(pendingIntent);

            manager.notify((int) System.currentTimeMillis(), builder.build());
        } catch (Exception e) {
            Log.e(TAG, "Failed to send confirmation notification", e);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Kore Payment Tracker Alerts",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Instant confirmations when transactions are logged from Google Pay & banking apps");
            channel.enableVibration(true);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
