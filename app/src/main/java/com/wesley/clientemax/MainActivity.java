package com.clientemax.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
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

        WebSettings settings = webView.getSettings();

        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setDatabaseEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

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

        // TROQUE PELO SEU LINK/PÁGINA
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

        @JavascriptInterface
        public void importarBackup() {

            runOnUiThread(new Runnable() {

                @Override
                public void run() {

                    Intent intent = new Intent(Intent.ACTION_GET_CONTENT);

                    intent.setType("*/*");

                    intent.addCategory(Intent.CATEGORY_OPENABLE);

                    startActivityForResult(
                            Intent.createChooser(intent, "Selecionar Backup"),
                            IMPORT_BACKUP_REQUEST
                    );
                }
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

            if (filePathCallback == null) {
                return;
            }

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

                        // ESCAPA CARACTERES
                        conteudo = conteudo
                                .replace("\\", "\\\\")
                                .replace("'", "\\'");

                        final String js =
                                "javascript:importarBackupDoAndroid('"
                                        + conteudo +
                                        "')";

                        runOnUiThread(new Runnable() {

                            @Override
                            public void run() {

                                webView.loadUrl(js);
                            }
                        });

                    } catch (Exception e) {

                        e.printStackTrace();

                        final String erro = e.getMessage();

                        runOnUiThread(new Runnable() {

                            @Override
                            public void run() {

                                webView.loadUrl(
                                        "javascript:alert('Erro ao importar backup')"
                                );
                            }
                        });
                    }
                }
            }
        }
    }
}