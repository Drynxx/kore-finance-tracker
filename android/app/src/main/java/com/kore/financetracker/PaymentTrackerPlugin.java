package com.kore.financetracker;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Set;

@CapacitorPlugin(name = "PaymentTracker")
public class PaymentTrackerPlugin extends Plugin {

    private static final String PREFS_NAME = "kore_payment_prefs";
    private static PaymentTrackerPlugin sInstance;

    @Override
    public void load() {
        super.load();
        sInstance = this;
    }

    public static void notifyNewTransaction(PaymentNotificationService.ParsedTransaction tx) {
        if (sInstance != null && tx != null) {
            try {
                JSObject obj = new JSObject();
                obj.put("id", tx.id);
                obj.put("amount", tx.amount);
                obj.put("currency", tx.currency);
                obj.put("merchant", tx.merchant);
                obj.put("category", tx.category);
                obj.put("note", tx.note);
                obj.put("date", tx.date);
                sInstance.notifyListeners("onNewTransaction", obj);
            } catch (Exception ignored) {}
        }
    }

    @PluginMethod
    public void isPermissionGranted(PluginCall call) {
        try {
            Context context = getContext();
            Set<String> packageNames = NotificationManagerCompat.getEnabledListenerPackages(context);
            boolean isGranted = packageNames.contains(context.getPackageName());

            JSObject ret = new JSObject();
            ret.put("granted", isGranted);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error checking notification listener permission: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openPermissionSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to open notification settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void syncSession(PluginCall call) {
        try {
            String endpoint = call.getString("endpoint", "https://fra.cloud.appwrite.io/v1");
            String projectId = call.getString("projectId", "");
            String databaseId = call.getString("databaseId", "");
            String collectionId = call.getString("collectionId", "transaction");
            String userId = call.getString("userId", "");
            String jwt = call.getString("jwt", "");
            Boolean trackingEnabled = call.getBoolean("trackingEnabled", true);

            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit()
                    .putString("appwrite_endpoint", endpoint)
                    .putString("appwrite_project_id", projectId)
                    .putString("appwrite_database_id", databaseId)
                    .putString("appwrite_collection_id", collectionId)
                    .putString("appwrite_user_id", userId)
                    .putString("appwrite_jwt", jwt)
                    .putBoolean("tracking_enabled", trackingEnabled)
                    .apply();

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to sync session: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getPendingTransactions(PluginCall call) {
        try {
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String existing = prefs.getString("pending_transactions", "[]");
            JSONArray arr = new JSONArray(existing);

            // Clear the queue once retrieved
            prefs.edit().putString("pending_transactions", "[]").apply();

            JSArray resultArr = new JSArray();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject item = arr.getJSONObject(i);
                JSObject jsItem = new JSObject();
                jsItem.put("id", item.optString("id"));
                jsItem.put("amount", item.optDouble("amount"));
                jsItem.put("type", item.optString("type", "expense"));
                jsItem.put("currency", item.optString("currency", "USD"));
                jsItem.put("merchant", item.optString("merchant"));
                jsItem.put("category", item.optString("category"));
                jsItem.put("note", item.optString("note"));
                jsItem.put("date", item.optString("date"));
                resultArr.put(jsItem);
            }

            JSObject ret = new JSObject();
            ret.put("transactions", resultArr);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to get pending transactions: " + e.getMessage());
        }
    }

    @PluginMethod
    public void simulateNotification(PluginCall call) {
        try {
            String title = call.getString("title", "Google Pay");
            String text = call.getString("text", "Paid $14.50 to Starbucks");

            PaymentNotificationService.ParsedTransaction tx = PaymentNotificationService.parseTransaction(title, text, "");
            if (tx == null) {
                call.reject("Unable to parse transaction from test text: " + text);
                return;
            }

            // Save to pending queue
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String existing = prefs.getString("pending_transactions", "[]");
            JSONArray arr = new JSONArray(existing);
            arr.put(tx.toJson());
            prefs.edit().putString("pending_transactions", arr.toString()).apply();

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("transaction", JSObject.fromJSONObject(tx.toJson()));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Simulation failed: " + e.getMessage());
        }
    }
}
