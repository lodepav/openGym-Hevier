package ch.duartesantos.opengym;

import android.webkit.WebView;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The phone's font size zooms the page's text again, as before upstream 1.4.5. Upstream's
 * TextScalePlugin pins the WebView's textZoom to 100 and lets the page grow its rem sizes instead,
 * capped at 140 %; the fork's own screens size their text in px, so they stopped following the
 * phone. Registered after TextScalePlugin, this puts the zoom back and removes the page's bridge,
 * so Text size "Default" does not scale the page a second time.
 */
@CapacitorPlugin(name = "HevierTextZoom")
public class HevierTextZoomPlugin extends Plugin {
    @Override
    public void load() {
        WebView web = getBridge() != null ? getBridge().getWebView() : null;
        if (web == null) return;
        web.getSettings().setTextZoom(Math.round(TextScalePlugin.scaleOf(getContext()) * 100));
        web.removeJavascriptInterface("OpenGymText");
    }
}
