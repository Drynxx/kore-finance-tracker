package com.kore.financetracker;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PaymentTrackerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
