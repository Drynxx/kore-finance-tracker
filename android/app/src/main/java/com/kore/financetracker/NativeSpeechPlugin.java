package com.kore.financetracker;

import android.Manifest;
import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.ArrayList;

@CapacitorPlugin(
    name = "NativeSpeech",
    permissions = {
        @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "microphone")
    }
)
public class NativeSpeechPlugin extends Plugin {

    private static final String TAG = "KoreNativeSpeech";
    private SpeechRecognizer speechRecognizer;
    private boolean isListening = false;

    @PluginMethod
    public void isAvailable(PluginCall call) {
        boolean available = SpeechRecognizer.isRecognitionAvailable(getContext());
        JSObject ret = new JSObject();
        ret.put("available", available);
        call.resolve(ret);
    }

    @PluginMethod
    public void startListening(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "microphoneCallback");
            return;
        }

        startRecognition(call);
    }

    @PermissionCallback
    private void microphoneCallback(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            startRecognition(call);
        } else {
            call.reject("Microphone permission was denied by user");
        }
    }

    private void startRecognition(PluginCall call) {
        final String language = call.getString("language", "ro-RO");

        getActivity().runOnUiThread(() -> {
            try {
                if (speechRecognizer != null) {
                    try {
                        speechRecognizer.destroy();
                    } catch (Exception ignored) {}
                    speechRecognizer = null;
                }

                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
                if (speechRecognizer == null) {
                    call.reject("SpeechRecognizer could not be created on this device.");
                    return;
                }

                speechRecognizer.setRecognitionListener(new RecognitionListener() {
                    @Override
                    public void onReadyForSpeech(Bundle params) {
                        isListening = true;
                        JSObject state = new JSObject();
                        state.put("isListening", true);
                        notifyListeners("listeningState", state);
                        Log.d(TAG, "SpeechRecognizer ready for speech");
                    }

                    @Override
                    public void onBeginningOfSpeech() {
                        Log.d(TAG, "Speech began");
                    }

                    @Override
                    public void onRmsChanged(float rmsdB) {}

                    @Override
                    public void onBufferReceived(byte[] buffer) {}

                    @Override
                    public void onEndOfSpeech() {
                        Log.d(TAG, "Speech ended");
                    }

                    @Override
                    public void onError(int error) {
                        isListening = false;
                        String errorMsg = getErrorMessage(error);
                        Log.w(TAG, "Speech error code " + error + ": " + errorMsg);

                        JSObject errObj = new JSObject();
                        errObj.put("error", errorMsg);
                        errObj.put("code", error);
                        notifyListeners("speechError", errObj);

                        JSObject state = new JSObject();
                        state.put("isListening", false);
                        notifyListeners("listeningState", state);
                    }

                    @Override
                    public void onResults(Bundle results) {
                        isListening = false;
                        ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        String bestMatch = (matches != null && !matches.isEmpty()) ? matches.get(0) : "";

                        JSObject res = new JSObject();
                        res.put("transcript", bestMatch);
                        res.put("isFinal", true);
                        notifyListeners("speechResult", res);

                        JSObject state = new JSObject();
                        state.put("isListening", false);
                        notifyListeners("listeningState", state);
                    }

                    @Override
                    public void onPartialResults(Bundle partialResults) {
                        ArrayList<String> matches = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        String partial = (matches != null && !matches.isEmpty()) ? matches.get(0) : "";

                        JSObject res = new JSObject();
                        res.put("transcript", partial);
                        res.put("isFinal", false);
                        notifyListeners("speechResult", res);
                    }

                    @Override
                    public void onEvent(int eventType, Bundle params) {}
                });

                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
                intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
                intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);

                speechRecognizer.startListening(intent);

                JSObject ret = new JSObject();
                ret.put("started", true);
                call.resolve(ret);
            } catch (Exception e) {
                Log.e(TAG, "Failed to start speech recognition", e);
                call.reject("Failed to start speech recognition: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void stopListening(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (speechRecognizer != null) {
                    speechRecognizer.stopListening();
                }
                isListening = false;

                JSObject state = new JSObject();
                state.put("isListening", false);
                notifyListeners("listeningState", state);

                JSObject ret = new JSObject();
                ret.put("stopped", true);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Failed to stop listening: " + e.getMessage());
            }
        });
    }

    private String getErrorMessage(int errorCode) {
        switch (errorCode) {
            case SpeechRecognizer.ERROR_AUDIO:
                return "Audio recording error";
            case SpeechRecognizer.ERROR_CLIENT:
                return "Client side error";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                return "Insufficient permissions for audio";
            case SpeechRecognizer.ERROR_NETWORK:
                return "Network error";
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
                return "Network timeout";
            case SpeechRecognizer.ERROR_NO_MATCH:
                return "No speech match found";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                return "Recognition service busy";
            case SpeechRecognizer.ERROR_SERVER:
                return "Server error";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                return "No speech input detected";
            default:
                return "Speech recognition error (" + errorCode + ")";
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (speechRecognizer != null) {
            try {
                speechRecognizer.destroy();
            } catch (Exception ignored) {}
            speechRecognizer = null;
        }
        super.handleOnDestroy();
    }
}
