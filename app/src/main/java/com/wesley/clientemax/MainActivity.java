package com.wesley.clientemax;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteStatement;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import java.io.File;
import java.io.FileOutputStream;
import java.io.FileWriter;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Date;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private SQLiteDatabase sqliteDb;

    private static final int PERMISSION_REQUEST_CODE = 100;
    private static final String URL_ONLINE = "https://thgwesley.github.io/ClineteMax/";
    private static final String URL_OFFLINE = "file:///android_asset/index.html";
    private static final String BACKUP_DIR =
        Environment.getExternalStorageDirectory() + "/Cliente Max/backup";

    // Launcher para selecionar arquivo de backup (importar)
    private ActivityResultLauncher<String[]> seletorArquivo;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Registra o seletor de arquivo ANTES de usar
        seletorArquivo = registerForActivityResult(
            new ActivityResultContracts.OpenDocument(),
            uri -> {
                if (uri == null) return;
                try {
                    InputStream is = getContentResolver().openInputStream(uri);
                    ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                    byte[] chunk = new byte[4096];
                    int read;
                    while ((read = is.read(chunk)) != -1) {
                        buffer.write(chunk, 0, read);
                    }
                    is.close();
                    String conteudo = buffer.toString("UTF-8");
                    // Envia conteúdo para o JS
                    String escaped = conteudo.replace("\\", "\\\\").replace("'", "\\'")
                                             .replace("\n", "\\n").replace("\r", "");
                    runOnUiThread(() ->
                        webView.evaluateJavascript(
                            "importarBackupDoAndroid('" + escaped + "')", null));
                } catch (Exception e) {
                    e.printStackTrace();
                    runOnUiThread(() ->
                        Toast.makeText(this, "Erro ao ler o arquivo.", Toast.LENGTH_SHORT).show());
                }
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

            @Override
            public void onReceivedError(WebView view, int errorCode,
                    String description, String failingUrl) {
                if (failingUrl.equals(URL_ONLINE)) {
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

    // ==========================================
    // INTERFACE JS ↔ JAVA
    // ==========================================
    public class ClienteMaxInterface {

        // Backup automático (SQLite + arquivo)
        @JavascriptInterface
        public void salvarBackup(String dadosJson) {
            salvarNoSQLite(dadosJson);
            salvarArquivoJson(dadosJson);
        }

        // Recupera último backup do SQLite
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

        // ── EXPORTAR BACKUP ──────────────────────────────────────
        // Salva o JSON em Downloads e abre compartilhamento
        @JavascriptInterface
        public void exportarBackupJson(String dadosJson, String nomeArquivo) {
            try {
                // Salva também no diretório interno de backup
                salvarArquivoJson(dadosJson);

                // Salva em Downloads para compartilhar
                File downloads = Environment.getExternalStoragePublicDirectory(
                    Environment.DIRECTORY_DOWNLOADS);
                if (!downloads.exists()) downloads.mkdirs();

                File arquivo = new File(downloads, nomeArquivo);
                FileWriter writer = new FileWriter(arquivo);
                writer.write(dadosJson);
                writer.flush();
                writer.close();

                // Compartilha via Intent (abre gerenciador/apps)
                Uri uri = FileProvider.getUriForFile(
                    MainActivity.this,
                    getPackageName() + ".provider",
                    arquivo);

                Intent intent = new Intent(Intent.ACTION_SEND);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_STREAM, uri);
                intent.putExtra(Intent.EXTRA_SUBJECT, "Backup Cliente Max");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                runOnUiThread(() ->
                    startActivity(Intent.createChooser(intent, "Exportar Backup")));

            } catch (Exception e) {
                e.printStackTrace();
                runOnUiThread(() ->
                    Toast.makeText(MainActivity.this,
                        "Erro ao exportar backup.", Toast.LENGTH_SHORT).show());
            }
        }

        // ── ABRIR SELETOR DE ARQUIVO (IMPORTAR) ─────────────────
        @JavascriptInterface
        public void abrirSeletorArquivo() {
            runOnUiThread(() ->
                seletorArquivo.launch(new String[]{"application/json", "*/*"}));
        }

        // ── COMPARTILHAR RELATÓRIO (PNG em Base64) ───────────────
        @JavascriptInterface
        public void compartilharImagem(String base64Data, String nomeArquivo) {
            try {
                // Remove prefixo data:image/png;base64, se existir
                String base64 = base64Data;
                if (base64.contains(",")) {
                    base64 = base64.substring(base64.indexOf(",") + 1);
                }

                byte[] bytes = Base64.decode(base64, Base64.DEFAULT);

                // Salva em cache interno (não precisa de permissão)
                File cacheDir = new File(getCacheDir(), "relatorios");
                if (!cacheDir.exists()) cacheDir.mkdirs();

                File imageFile = new File(cacheDir, nomeArquivo);
                FileOutputStream fos = new FileOutputStream(imageFile);
                fos.write(bytes);
                fos.flush();
                fos.close();

                Uri uri = FileProvider.getUriForFile(
                    MainActivity.this,
                    getPackageName() + ".provider",
                    imageFile);

                Intent intent = new Intent(Intent.ACTION_SEND);
                intent.setType("image/png");
                intent.putExtra(Intent.EXTRA_STREAM, uri);
                intent.putExtra(Intent.EXTRA_SUBJECT, "Relatório Cliente Max");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                runOnUiThread(() ->
                    startActivity(Intent.createChooser(intent, "Compartilhar Relatório")));

            } catch (Exception e) {
                e.printStackTrace();
                runOnUiThread(() ->
                    Toast.makeText(MainActivity.this,
                        "Erro ao compartilhar relatório.", Toast.LENGTH_SHORT).show());
            }
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
