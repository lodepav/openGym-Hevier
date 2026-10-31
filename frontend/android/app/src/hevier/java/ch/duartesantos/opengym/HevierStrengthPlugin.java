package ch.duartesantos.opengym;

import android.content.Context;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * [hevier] Keeps the row OpenBite reads (hevier/DECISIONS.md D95). The log lives in the WebView, and
 * OpenBite may ask with Go Hevier closed, so lib/strength-signal-run.js works the row out and leaves
 * it here, where HevierStrengthProvider answers from it.
 *
 *   const P = registerPlugin('HevierStrength');
 *   await P.put({ row });   // the row as a JSON string, or null for nothing to share
 */
@CapacitorPlugin(name = "HevierStrength")
public class HevierStrengthPlugin extends Plugin {

    static final String PREFS = "hevier_strength";
    static final String KEY = "row";

    @PluginMethod
    public void put(PluginCall call) {
        String row = call.getString("row");
        getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, row).apply();
        call.resolve();
    }
}
