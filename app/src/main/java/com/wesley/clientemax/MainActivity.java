package com.wesley.clientemax;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteStatement;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import android.widget.Toast;
import android.webkit.JavascriptInterface;
import androidx.core.content.FileProvider;
import java.io.FileOutputStream;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.io.File;
import java.io.FileWriter;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Date;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private SQLiteDatabase sqliteDb;
    private ValueCallback<Uri[]> fileChooserCallback;

    private static final int PERMISSION_REQUEST_CODE = 100;
    private static final String URL_ONLINE = "https://thgwesley.github.io/ClineteMax/";
    private static final String URL_OFFLINE = "file:///android_asset/index.html";
    private static final String BACKUP_DIR =
        Environment.getExternalStorageDirectory() + "/Cliente Max/backup";

    private ActivityResultLauncher<String[]> filePickerLauncher;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Registra o launcher do seletor de arquivos (deve ser antes de configurarWebView)
        filePickerLauncher = registerForActivityResult(
            new ActivityResultContracts.OpenDocument(),
            uri -> {
                if (fileChooserCallback == null) return;
                fileChooserCallback.onReceiveValue(uri != null ? new Uri[]{uri} : new Uri[0]);
                fileChooserCallback = null;
            }
        );

        solicitarPermissoes();
        inicializarSQLite();
        configurarWebView();
    }

    // ==========================================
    // VERIFICA CONEXÃO COM INTERNET
    // ==========================================
    private boolean temInternet() {
        try {
            ConnectivityManager cm = (ConnectivityManager)
                getSystemService(Context.CONNECTIVITY_SERVICE);
            NetworkInfo info = cm.getActiveNetworkInfo();
            return info != null && info.isConnected();
        } catch (Exception e) {
            return false;
        }
    }

    // ==========================================
    // PERMISSÕES
    // ==========================================
    private void solicitarPermissoes() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
            Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            if (ContextCompat.checkSelfPermission(this,
                    Manifest.permission.WRITE_EXTERNAL_STORAGE)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this,
                    new String[]{
                        Manifest.permission.WRITE_EXTERNAL_STORAGE,
                        Manifest.permission.READ_EXTERNAL_STORAGE
                    }, PERMISSION_REQUEST_CODE);
            }
        }
    }

    // ==========================================
    // SQLITE
    // ==========================================
    private void inicializarSQLite() {
        sqliteDb = openOrCreateDatabase("clientemax.db", MODE_PRIVATE, null);
        sqliteDb.execSQL(
            "CREATE TABLE IF NOT EXISTS snapshots (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "dados TEXT NOT NULL," +
            "gerado_em TEXT NOT NULL" +
            ")"
        );
    }

    // ==========================================
    // WEBVIEW
    // ==========================================
    private void configurarWebView() {
        webView = findViewById(R.id.webview);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setDatabaseEnabled(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.addJavascriptInterface(new ClienteMaxInterface(), "AndroidBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }

            // Se falhar ao carregar online, cai pro offline
            @Override
            public void onReceivedError(WebView view, int errorCode,
                    String description, String failingUrl) {
                if (failingUrl.equals(URL_ONLINE)) {
                    view.loadUrl(URL_OFFLINE);
                }
            }
        });

        // WebChromeClient: necessário para input[type=file] funcionar no WebView
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView,
                    ValueCallback<Uri[]> callback,
                    FileChooserParams params) {
                // Cancela qualquer callback pendente
                if (fileChooserCallback != null) {
                    fileChooserCallback.onReceiveValue(new Uri[0]);
                }
                fileChooserCallback = callback;
                filePickerLauncher.launch(new String[]{"application/json", "*/*"});
                return true;
            }
        });

        // Carrega online se tiver internet, offline se não tiver
        if (temInternet()) {
            webView.loadUrl(URL_ONLINE);
        } else {
            webView.loadUrl(URL_OFFLINE);
        }
    }

    // ==========================================
    // INTERFACE JS ↔ JAVA
    // ==========================================
    public class ClienteMaxInterface {

        @JavascriptInterface
        public void salvarBackup(String dadosJson) {
            salvarNoSQLite(dadosJson);
            salvarArquivoJson(dadosJson);
        }

        // Exporta backup JSON via compartilhamento nativo
        @JavascriptInterface
        public void exportarBackupJson(String dadosJson, String nomeArquivo) {
            try {
                File cacheDir = new File(getCacheDir(), "backups");
                if (!cacheDir.exists()) cacheDir.mkdirs();

                File arquivo = new File(cacheDir, nomeArquivo);
                FileOutputStream fos = new FileOutputStream(arquivo);
                fos.write(dadosJson.getBytes("UTF-8"));
                fos.flush();
                fos.close();

                Uri uri = FileProvider.getUriForFile(
                    MainActivity.this, getPackageName() + ".provider", arquivo);

                Intent intent = new Intent(Intent.ACTION_SEND);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_STREAM, uri);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                runOnUiThread(() ->
                    startActivity(Intent.createChooser(intent, "Exportar Backup")));

            } catch (Exception e) {
                e.printStackTrace();
                runOnUiThread(() ->
                    Toast.makeText(MainActivity.this, "Erro ao exportar backup.", Toast.LENGTH_SHORT).show());
            }
        }

        // Compartilha relatório PNG (recebe base64 do canvas)
        @JavascriptInterface
        public void compartilharImagem(String base64Data, String nomeArquivo) {
            try {
                String base64 = base64Data.contains(",")
                    ? base64Data.substring(base64Data.indexOf(",") + 1)
                    : base64Data;

                byte[] bytes = Base64.decode(base64, Base64.DEFAULT);

                File cacheDir = new File(getCacheDir(), "relatorios");
                if (!cacheDir.exists()) cacheDir.mkdirs();

                File imageFile = new File(cacheDir, nomeArquivo);
                FileOutputStream fos = new FileOutputStream(imageFile);
                fos.write(bytes);
                fos.flush();
                fos.close();

                Uri uri = FileProvider.getUriForFile(
                    MainActivity.this, getPackageName() + ".provider", imageFile);

                Intent intent = new Intent(Intent.ACTION_SEND);
                intent.setType("image/png");
                intent.putExtra(Intent.EXTRA_STREAM, uri);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                runOnUiThread(() ->
                    startActivity(Intent.createChooser(intent, "Compartilhar Relatório")));

            } catch (Exception e) {
                e.printStackTrace();
                runOnUiThread(() ->
                    Toast.makeText(MainActivity.this, "Erro ao compartilhar relatório.", Toast.LENGTH_SHORT).show());
            }
        }

        @JavascriptInterface
        public String recuperarUltimoSQLite() {
            try {
                android.database.Cursor cursor = sqliteDb.rawQuery(
                    "SELECT dados FROM snapshots ORDER BY id DESC LIMIT 1", null);
                if (cursor.moveToFirst()) {
                    String dados = cursor.getString(0);
                    cursor.close();
                    return dados;
                }
                cursor.close();
            } catch (Exception e) {
                e.printStackTrace();
            }
            return null;
        }
    }

    // ==========================================
    // SALVAR NO SQLITE (máx 3 registros)
    // ==========================================
    private void salvarNoSQLite(String dadosJson) {
        try {
            String agora = new SimpleDateFormat(
                "yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(new Date());

            SQLiteStatement stmt = sqliteDb.compileStatement(
                "INSERT INTO snapshots (dados, gerado_em) VALUES (?, ?)");
            stmt.bindString(1, dadosJson);
            stmt.bindString(2, agora);
            stmt.executeInsert();
            stmt.close();

            sqliteDb.execSQL(
                "DELETE FROM snapshots WHERE id NOT IN " +
                "(SELECT id FROM snapshots ORDER BY id DESC LIMIT 3)"
            );
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // ==========================================
    // SALVAR .JSON (máx 3 arquivos)
    // ==========================================
    private void salvarArquivoJson(String dadosJson) {
        try {
            File dir = new File(BACKUP_DIR);
            if (!dir.exists()) dir.mkdirs();

            String agora = new SimpleDateFormat(
                "yyyy-MM-dd_HH-mm-ss", Locale.getDefault()).format(new Date());

            File arquivo = new File(dir, "backup_" + agora + ".json");
            FileWriter writer = new FileWriter(arquivo);
            writer.write("{\"versao\":\"barber_v6\",\"geradoEm\":\"" + agora + "\",\"dados\":");
            writer.write(dadosJson);
            writer.write("}");
            writer.flush();
            writer.close();

            // Mantém só os 3 mais recentes
            File[] arquivos = dir.listFiles(
                f -> f.getName().startsWith("backup_") && f.getName().endsWith(".json"));

            if (arquivos != null && arquivos.length > 3) {
                Arrays.sort(arquivos, Comparator.comparingLong(File::lastModified));
                for (int i = 0; i < arquivos.length - 3; i++) {
                    arquivos[i].delete();
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (sqliteDb != null && sqliteDb.isOpen()) {
            sqliteDb.close();
        }
    }
}
