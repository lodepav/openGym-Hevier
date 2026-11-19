package ch.duartesantos.opengym;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.CookieManager;
import android.window.OnBackInvokedDispatcher;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * [hevier] The screen behind HevierHevyLoginPlugin (hevier/DECISIONS.md D138): hevy.com's login
 * page in a WebView of its own. Once the page has logged in, hevy.com sets the `auth2.0-token`
 * cookie; the screen hands its value back and closes. Back goes back a page, or closes the screen
 * without a login. Only hevy.com's session cookies are cleared first, so an old, already refreshed
 * session is not handed back; the app's own WebView keeps its cookies.
 */
public class HevierHevyLoginActivity extends Activity {

    static final String EXTRA_COOKIE = "cookie";
    private static final String SITE = "https://hevy.com";
    private static final String NAME = "auth2.0-token";
    private static final long POLL_MS = 500;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private WebView web;
    private boolean done;

    private final Runnable poll = new Runnable() {
        @Override
        public void run() {
            if (done) return;
            String value = cookieValue(CookieManager.getInstance().getCookie(SITE));
            if (value != null) {
                finishWith(value);
                return;
            }
            handler.postDelayed(this, POLL_MS);
        }
    };

    /** The value of `auth2.0-token` in a Cookie header, when it carries an access token. */
    static String cookieValue(String header) {
        if (header == null) return null;
        for (String part : header.split(";")) {
            String p = part.trim();
            if (p.startsWith(NAME + "=")) {
                String v = p.substring(NAME.length() + 1);
                return v.contains("access_token") ? v : null;
            }
        }
        return null;
    }

    @SuppressLint("SetJavaScriptEnabled")   // hevy.com's login page is a script page
    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        CookieManager cookies = CookieManager.getInstance();
        for (String domain : new String[] { SITE, "https://.hevy.com" }) {
            cookies.setCookie(domain, NAME + "=; Max-Age=0; Path=/");
        }
        cookies.flush();
        web = new WebView(this);
        web.setBackgroundColor(Color.BLACK);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        // The page as in a phone's browser: some sign-in checks refuse a WebView's "; wv".
        s.setUserAgentString(s.getUserAgentString().replace("; wv", ""));
        web.setWebViewClient(new WebViewClient());
        // Below the status bar and above the navigation bar (edge to edge from Android 15).
        web.setOnApplyWindowInsetsListener((v, insets) -> {
            android.graphics.Insets bars = insets.getInsets(android.view.WindowInsets.Type.systemBars() | android.view.WindowInsets.Type.ime());
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return insets;
        });
        setContentView(web);
        web.loadUrl(SITE + "/login");
        handler.postDelayed(poll, POLL_MS);
        // The app runs on Android 13 and up (D116), where back comes this way (predictive back).
        getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::back);
    }

    private void finishWith(String value) {
        done = true;
        setResult(RESULT_OK, new Intent().putExtra(EXTRA_COOKIE, value));
        finish();
    }

    private void back() {
        if (web != null && web.canGoBack()) web.goBack();
        else {
            done = true;
            setResult(RESULT_CANCELED);
            finish();
        }
    }

    @Override
    protected void onDestroy() {
        done = true;
        handler.removeCallbacks(poll);
        if (web != null) web.destroy();
        super.onDestroy();
    }
}
