package com.wesley.clientemax;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebChromeClient;
import android.webkit.JsResult;
import android.webkit.JsPromptResult;
import android.webkit.WebViewClient;
import android.app.AlertDialog;
import android.widget.EditText;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteStatement;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import java.io.File;
import java.io.FileOutputStream;
import java.io.FileWriter;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Date;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private SQLiteDatabase sqliteDb;

    private static final int PERMISSION_REQUEST_CODE = 100;
    private static final int MANAGE_STORAGE_REQUEST_CODE = 101;
    private static final int PICK_FILE_REQUEST_CODE = 102;
    private static final String URL_ONLINE = "https://thgwesley.github.io/ClineteMax/";
    private static final String URL_OFFLINE = "file:///android_asset/index.html";
    private static final String BACKUP_DIR =
        Environment.getExternalStorageDirectory() + "/Cliente Max/backup";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        solicitarPermissoes();
        inicializarSQLite();
        configurarWebView();
    }

    private void solicitarPermissoes() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (!Environment.isExternalStorageManager()) {
                new AlertDialog.Builder(this)
                    .setTitle("Permissão necessária")
                    .setMessage("O Cliente Max precisa de acesso ao armazenamento para criar backups automáticos em:\n\nCliente Max/backup/\n\nNa próxima tela, ative \"Permitir acesso a todos os arquivos\".")
                    .setPositiveButton("Continuar", (d, w) -> {
                        Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                        intent.setData(Uri.parse("package:" + getPackageName()));
                        startActivityForResult(intent, MANAGE_STORAGE_REQUEST_CODE);
                    })
                    .setCancelable(false)
                    .show();
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
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

    private boolean temPermissaoArmazenamento() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            return Environment.isExternalStorageManager();
        }
        return ContextCompat.checkSelfPermission(this,
            Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
    }

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

    private void inicializarSQLite() {
        sqliteDb = openOrCreateDatabase("clientemax.db", MODE_PRIVATE, null);
        sqliteDb.execSQL(
            "CREATE TABLE IF NOT EXISTS snapshots (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "dados TEXT NOT NULL," +
            "gerado_em TEXT NOT NULL)"
        );
    }

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

        // Habilita alert(), confirm() e prompt() na WebView
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                    .setMessage(message)
                    .setPositiveButton("OK", (d, w) -> result.confirm())
                    .setOnCancelListener(d -> result.cancel())
                    .show();
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                    .setMessage(message)
                    .setPositiveButton("Confirmar", (d, w) -> result.confirm())
                    .setNegativeButton("Cancelar", (d, w) -> result.cancel())
                    .setOnCancelListener(d -> result.cancel())
                    .show();
                return true;
            }

            @Override
            public boolean onJsPrompt(WebView view, String url, String message,
                    String defaultValue, JsPromptResult result) {
                EditText input = new EditText(MainActivity.this);
                input.setText(defaultValue);
                new AlertDialog.Builder(MainActivity.this)
                    .setMessage(message)
                    .setView(input)
                    .setPositiveButton("OK", (d, w) -> result.confirm(input.getText().toString()))
                    .setNegativeButton("Cancelar", (d, w) -> result.cancel())
                    .setOnCancelListener(d -> result.cancel())
                    .show();
                return true;
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }
            @Override
            public void onReceivedError(WebView view, int errorCode,
                    String description, String failingUrl) {
                if (failingUrl != null && failingUrl.equals(URL_ONLINE)) {
                    view.loadUrl(URL_OFFLINE);
                }
            }
        });
        if (temInternet()) {
            webView.loadUrl(URL_ONLINE);
        } else {
            webView.loadUrl(URL_OFFLINE);
        }
    }

    public class ClienteMaxInterface {

        @JavascriptInterface
        public void salvarBackup(String dadosJson) {
            salvarNoSQLite(dadosJson);
            if (temPermissaoArmazenamento()) {
                salvarArquivoJson(dadosJson);
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

        @JavascriptInterface
        public void compartilharImagem(String base64Data, String nomeArquivo) {
            try {
                String base64 = base64Data.contains(",")
                    ? base64Data.split(",")[1] : base64Data;
                byte[] bytes = android.util.Base64.decode(base64, android.util.Base64.DEFAULT);

                File cacheDir = new File(getCacheDir(), "relatorios");
                if (!cacheDir.exists()) cacheDir.mkdirs();
                File imgFile = new File(cacheDir, nomeArquivo);

                FileOutputStream fos = new FileOutputStream(imgFile);
                fos.write(bytes);
                fos.flush();
                fos.close();

                Uri uri = FileProvider.getUriForFile(
                    MainActivity.this,
                    getPackageName() + ".provider",
                    imgFile
                );

                Intent shareIntent = new Intent(Intent.ACTION_SEND);
                shareIntent.setType("image/png");
                shareIntent.putExtra(Intent.EXTRA_STREAM, uri);
                shareIntent.putExtra(Intent.EXTRA_SUBJECT, "Relatório Cliente Max");
                shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                runOnUiThread(() ->
                    startActivity(Intent.createChooser(shareIntent, "Compartilhar relatório")));
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public boolean temPermissao() {
            return temPermissaoArmazenamento();
        }

        @JavascriptInterface
        public void solicitarPermissao() {
            runOnUiThread(() -> solicitarPermissoes());
        }

        // Exportar backup JSON — salva em Downloads/ e compartilha
        @JavascriptInterface
        public void exportarBackupJson(String dadosJson, String nomeArquivo) {
            try {
                File dir = Environment.getExternalStoragePublicDirectory(
                    Environment.DIRECTORY_DOWNLOADS);
                if (!dir.exists()) dir.mkdirs();

                File arquivo = new File(dir, nomeArquivo);
                FileWriter writer = new FileWriter(arquivo);
                writer.write(dadosJson);
                writer.flush();
                writer.close();

                Uri uri = FileProvider.getUriForFile(
                    MainActivity.this,
                    getPackageName() + ".provider",
                    arquivo
                );

                Intent shareIntent = new Intent(Intent.ACTION_SEND);
                shareIntent.setType("application/json");
                shareIntent.putExtra(Intent.EXTRA_STREAM, uri);
                shareIntent.putExtra(Intent.EXTRA_SUBJECT, "Backup Cliente Max");
                shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                runOnUiThread(() ->
                    startActivity(Intent.createChooser(shareIntent, "Exportar backup")));
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        // Abre seletor de arquivo nativo para importar backup
        @JavascriptInterface
        public void abrirSeletorArquivo() {
            Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.setType("application/json");
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            runOnUiThread(() ->
                startActivityForResult(
                    Intent.createChooser(intent, "Selecionar backup"),
                    PICK_FILE_REQUEST_CODE));
        }
    }

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
                "(SELECT id FROM snapshots ORDER BY id DESC LIMIT 3)");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void salvarArquivoJson(String dadosJson) {
        try {
            File dir = new File(BACKUP_DIR);
            if (!dir.exists()) dir.mkdirs();

            String agora = new SimpleDateFormat(
                "yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(new Date());
            String hoje = new SimpleDateFormat(
                "yyyy-MM-dd", Locale.getDefault()).format(new Date());

            String payload = "{\"versao\":\"barber_v6\",\"geradoEm\":\"" + agora + "\",\"dados\":" + dadosJson + "}";

            escreverArquivo(new File(dir, "backup_atual.json"), payload);

            File snapDia = new File(dir, "backup_" + hoje + ".json");
            if (!snapDia.exists()) {
                escreverArquivo(snapDia, payload);
                File[] snapshots = dir.listFiles(f ->
                    f.getName().startsWith("backup_2") && f.getName().endsWith(".json"));
                if (snapshots != null && snapshots.length > 2) {
                    Arrays.sort(snapshots, Comparator.comparingLong(File::lastModified));
                    for (int i = 0; i < snapshots.length - 2; i++) {
                        snapshots[i].delete();
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void escreverArquivo(File arquivo, String conteudo) throws Exception {
        FileWriter writer = new FileWriter(arquivo);
        writer.write(conteudo);
        writer.flush();
        writer.close();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == PICK_FILE_REQUEST_CODE && resultCode == RESULT_OK && data != null) {
            try {
                Uri uri = data.getData();
                java.io.InputStream is = getContentResolver().openInputStream(uri);
                java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
                byte[] buf = new byte[4096];
                int n;
                while ((n = is.read(buf)) != -1) baos.write(buf, 0, n);
                is.close();
                String conteudo = baos.toString("UTF-8");

                // Passa como base64 para evitar quebra de caracteres especiais no JS
                String base64 = android.util.Base64.encodeToString(
                    conteudo.getBytes("UTF-8"), android.util.Base64.NO_WRAP);
                final String js = "(function(){ var b = atob('" + base64 + "'); importarBackupDoAndroid(b); })()";
                runOnUiThread(() -> webView.evaluateJavascript(js, null));
            } catch (Exception e) {
                e.printStackTrace();
            }
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
        if (sqliteDb != null && sqliteDb.isOpen()) sqliteDb.close();
    }
}
