package com.clientemax.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private static final int FILE_CHOOSER_REQUEST = 1001;
    private static final int IMPORT_BACKUP_REQUEST = 2001;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings webSettings = webView.getSettings();

        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setUseWideViewPort(true);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setBuiltInZoomControls(false);
        webSettings.setDisplayZoomControls(false);

        webView.setWebViewClient(new WebViewClient());

        webView.setWebChromeClient(new WebChromeClient() {

            @Override
            public boolean onShowFileChooser(
                    WebView webView,
                    ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams
            ) {

                MainActivity.this.filePathCallback = filePathCallback;

                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);

                // MAIS COMPATÍVEL
                intent.setType("*/*");

                intent.addCategory(Intent.CATEGORY_OPENABLE);

                startActivityForResult(
                        Intent.createChooser(intent, "Selecionar arquivo"),
                        FILE_CHOOSER_REQUEST
                );

                return true;
            }
        });

        webView.addJavascriptInterface(new AndroidBridge(), "Android");

        webView.loadUrl("file:///android_asset/index.html");

        getOnBackPressedDispatcher().addCallback(this,
                new OnBackPressedCallback(true) {
                    @Override
                    public void handleOnBackPressed() {

                        if (webView.canGoBack()) {
                            webView.goBack();
                        } else {
                            finish();
                        }
                    }
                });
    }

    public class AndroidBridge {

        @android.webkit.JavascriptInterface
        public void importarBackup() {

            runOnUiThread(() -> {

                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);

                // MAIS COMPATÍVEL
                intent.setType("*/*");

                intent.addCategory(Intent.CATEGORY_OPENABLE);

                startActivityForResult(
                        Intent.createChooser(intent, "Selecionar Backup"),
                        IMPORT_BACKUP_REQUEST
                );
            });
        }
    }

    @Override
    protected void onActivityResult(
            int requestCode,
            int resultCode,
            @Nullable Intent data
    ) {

        super.onActivityResult(requestCode, resultCode, data);

        // INPUT NORMAL
        if (requestCode == FILE_CHOOSER_REQUEST) {

            if (filePathCallback == null)
                return;

            Uri[] results = null;

            if (resultCode == Activity.RESULT_OK && data != null) {

                Uri uri = data.getData();

                if (uri != null) {
                    results = new Uri[]{uri};
                }
            }

            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        }

        // IMPORTAÇÃO BACKUP
        if (requestCode == IMPORT_BACKUP_REQUEST) {

            if (resultCode == Activity.RESULT_OK && data != null) {

                Uri uri = data.getData();

                if (uri != null) {

                    try {

                        InputStream inputStream =
                                getContentResolver().openInputStream(uri);

                        BufferedReader reader =
                                new BufferedReader(
                                        new InputStreamReader(inputStream)
                                );

                        StringBuilder builder = new StringBuilder();

                        String line;

                        while ((line = reader.readLine()) != null) {
                            builder.append(line);
                        }

                        reader.close();

                        String conteudo = builder.toString();

                        // MODO SEGURO SEM BASE64
                        final String safe =
                                org.json.JSONObject.quote(conteudo);

                        final String js =
                                "javascript:(function(){" +
                                "importarBackupDoAndroid(" + safe + ");" +
                                "})()";

                        webView.evaluateJavascript(js, null);

                    } catch (Exception e) {

                        e.printStackTrace();

                        webView.evaluateJavascript(
                                "javascript:alert('Erro ao importar backup: "
                                        + e.getMessage().replace("'", "")
                                        + "')",
                                null
                        );
                    }
                }
            }
        }
    }
}