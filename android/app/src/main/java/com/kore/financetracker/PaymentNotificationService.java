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
    
    // Set of target package names for Google Pay, Google Wallet and popular financial apps
    private static final Set<String> TARGET_PACKAGES = new HashSet<>();
    static {
        TARGET_PACKAGES.add("com.google.android.apps.walletnfcrel"); // Google Wallet / Google Pay
        TARGET_PACKAGES.add("com.google.android.gms");               // Google Play Services Wallet prompts
        TARGET_PACKAGES.add("com.revolut.revolut");                 // Revolut
        TARGET_PACKAGES.add("com.transferwise.android");            // Wise
        TARGET_PACKAGES.add("com.monzo.android");                   // Monzo
        TARGET_PACKAGES.add("com.chase.sig.android");               // Chase
        TARGET_PACKAGES.add("ro.btrl.btpay");                       // BT Pay
        TARGET_PACKAGES.add("com.ing.mobile");                      // ING Bank
    }

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

        String combinedText = (title + " " + text + " " + bigText).trim();
        if (combinedText.isEmpty()) return;

        // Check if package is a target payment package OR matches strong payment keywords
        boolean isTargetPackage = TARGET_PACKAGES.contains(packageName);
        boolean hasPaymentKeywords = containsPaymentKeywords(combinedText);

        if (!isTargetPackage && !hasPaymentKeywords) {
            return;
        }

        // Deduplicate: avoid re-processing identical notification text within 60s
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

        // Parse payment details
        ParsedTransaction tx = parseTransaction(title, text, bigText);
        if (tx == null || tx.amount <= 0) {
            Log.d(TAG, "Could not extract valid amount from notification");
            return;
        }

        Log.i(TAG, "Parsed Transaction: Amount=" + tx.amount + ", Currency=" + tx.currency + ", Merchant=" + tx.merchant + ", Category=" + tx.category);

        // 1. Save to local SharedPreferences queue for React app sync
        saveToLocalQueue(tx);

        // 2. Post directly to Appwrite REST API in background if credentials exist
        postToAppwrite(tx);

        // 3. Post user confirmation notification
        postConfirmationNotification(tx);

        // 4. Notify Capacitor bridge if app is running
        PaymentTrackerPlugin.notifyNewTransaction(tx);
    }

    private boolean containsPaymentKeywords(String text) {
        String lower = text.toLowerCase(Locale.ROOT);
        return lower.contains("paid") || lower.contains("spent") || lower.contains("purchase") ||
               lower.contains("payment") || lower.contains("google pay") || lower.contains("google wallet") ||
               lower.contains("cheltuit") || lower.contains("plata") || lower.contains("tranzactie");
    }

    public static class ParsedTransaction {
        public String id;
        public double amount;
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
                obj.put("type", "expense");
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
     * Parses amount, merchant, and category from notification contents
     */
    public static ParsedTransaction parseTransaction(String title, String text, String bigText) {
        String fullContent = (title + " " + text + " " + bigText).replaceAll("\\s+", " ").trim();
        
        // Regex to extract Amount and Currency
        // Matches e.g. "$15.50", "15.50 USD", "45,00 RON", "€ 12.99", "£10"
        Pattern amountPattern = Pattern.compile("([$€£¥₹]|RON|USD|EUR|GBP|CAD|AUD|CHF|lei)\\s*([0-9]+(?:[.,][0-9]{1,2})?)|([0-9]+(?:[.,][0-9]{1,2})?)\\s*([$€£¥₹]|RON|USD|EUR|GBP|CAD|AUD|CHF|lei)", Pattern.CASE_INSENSITIVE);
        Matcher m = amountPattern.matcher(fullContent);

        double amount = 0;
        String currency = "USD";

        if (m.find()) {
            String curr1 = m.group(1);
            String val1 = m.group(2);
            String val2 = m.group(3);
            String curr2 = m.group(4);

            String rawVal = val1 != null ? val1 : val2;
            String rawCurr = curr1 != null ? curr1 : curr2;

            if (rawVal != null) {
                try {
                    amount = Double.parseDouble(rawVal.replace(",", "."));
                } catch (Exception ignored) {}
            }
            if (rawCurr != null) {
                currency = normalizeCurrency(rawCurr);
            }
        }

        if (amount <= 0) return null;

        // Extract Merchant
        String merchant = "Payment";
        // Check "to [Merchant]" or "at [Merchant]" or "la [Merchant]"
        Pattern merchantPattern = Pattern.compile("(?:to|at|la|from|către)\\s+([A-Za-z0-9&'’\\- ]+?)(?:\\s+on|\\s+using|\\s+with|\\.|,|$)", Pattern.CASE_INSENSITIVE);
        Matcher merchantMatcher = merchantPattern.matcher(fullContent);
        if (merchantMatcher.find()) {
            String found = merchantMatcher.group(1).trim();
            if (found.length() > 1 && found.length() < 35 && !found.equalsIgnoreCase("your card")) {
                merchant = found;
            }
        } else if (!title.equalsIgnoreCase("Google Pay") && !title.equalsIgnoreCase("Google Wallet") && !title.equalsIgnoreCase("Wallet") && title.length() > 2) {
            merchant = title.trim();
        }

        // Categorization based on merchant and keywords
        String category = categorize(merchant + " " + fullContent);

        ParsedTransaction tx = new ParsedTransaction();
        tx.id = UUID.randomUUID().toString();
        tx.amount = Math.round(amount * 100.0) / 100.0;
        tx.currency = currency;
        tx.merchant = merchant;
        tx.category = category;
        tx.note = "Auto-tracked via Google Pay: " + merchant;
        
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
        tx.date = sdf.format(new Date());
        tx.rawText = fullContent;

        return tx;
    }

    private static String normalizeCurrency(String raw) {
        String c = raw.trim().toUpperCase(Locale.ROOT);
        if (c.equals("$")) return "USD";
        if (c.equals("€")) return "EUR";
        if (c.equals("£")) return "GBP";
        if (c.equals("LEI")) return "RON";
        return c;
    }

    private static String categorize(String text) {
        String lower = text.toLowerCase(Locale.ROOT);
        if (lower.matches(".*(starbucks|coffee|cafe|mcdonald|kfc|burger|restaurant|pizza|food|bistro|bar|pub|subway|bakery|glovo|wolt|uber eats).*")) {
            return "Food & Dining";
        }
        if (lower.matches(".*(mega image|lidl|kaufland|carrefour|aldi|tesco|walmart|target|market|supermarket|grocery|auchan|penny).*")) {
            return "Groceries";
        }
        if (lower.matches(".*(uber|bolt|lyft|taxi|train|metro|bus|shell|omv|petrom|bp|gas|fuel|parking|transit).*")) {
            return "Transportation";
        }
        if (lower.matches(".*(netflix|spotify|steam|playstation|cinema|movie|theatre|disney|hbo|apple music).*")) {
            return "Entertainment";
        }
        if (lower.matches(".*(amazon|ebay|zara|h&m|ikea|apple store|clothing|shop|store).*")) {
            return "Shopping";
        }
        if (lower.matches(".*(electric|power|water|vodafone|orange|telekom|enel|internet|utility|utilities).*")) {
            return "Utilities";
        }
        return "General";
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
                data.put("type", "expense");
                data.put("amount", tx.amount);
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
            } catch (Exception e) {
                Log.e(TAG, "Error posting transaction to Appwrite directly in background", e);
            }
        }).start();
    }

    private void postConfirmationNotification(ParsedTransaction tx) {
        try {
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) return;

            Intent intent = new Intent(this, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            intent.putExtra("from_payment_notification", true);
            intent.putExtra("transaction_amount", tx.amount);
            intent.putExtra("transaction_merchant", tx.merchant);

            PendingIntent pendingIntent = PendingIntent.getActivity(
                    this,
                    (int) System.currentTimeMillis(),
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            String formattedAmount = String.format(Locale.US, "%.2f", tx.amount);
            String title = "✅ Logged: -" + tx.currency + " " + formattedAmount;
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
            channel.setDescription("Instant confirmations when transactions are logged from Google Pay");
            channel.enableVibration(true);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
