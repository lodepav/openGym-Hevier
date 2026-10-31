package ch.duartesantos.opengym;

import android.content.pm.PackageManager;
import android.content.pm.ProviderInfo;
import android.database.Cursor;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * [hevier] Reads OpenBite's phase (hevier/DECISIONS.md D93): cutting, maintaining or bulking, from
 * its read-only ContentProvider, on the phone, with nothing written back. The provider is OpenBite's
 * only when it is signed with this app's key; anything else answers as if OpenBite were not there,
 * as do no OpenBite, no row and a refused read. Debug builds also read OpenBite's develop build.
 *
 *   const P = registerPlugin('HevierPhase');
 *   await P.read();   // { phase, rate_kg_per_week, target_kcal, updated_at } or { phase: null }
 */
@CapacitorPlugin(name = "HevierPhase")
public class HevierPhasePlugin extends Plugin {

    private static final String[] TEXT = { "phase" };
    private static final String[] NUMBERS = { "rate_kg_per_week", "target_kcal", "updated_at" };

    private JSObject query(String pkg) {
        String authority = pkg + ".phase";
        PackageManager pm = getContext().getPackageManager();
        ProviderInfo info = pm.resolveContentProvider(authority, 0);
        if (info == null || pm.checkSignatures(info.packageName, getContext().getPackageName()) != PackageManager.SIGNATURE_MATCH) return null;
        Uri uri = Uri.parse("content://" + authority + "/current");
        try (Cursor c = getContext().getContentResolver().query(uri, null, null, null, null)) {
            if (c == null || !c.moveToFirst()) return null;
            JSObject out = new JSObject();
            for (String name : TEXT) {
                int i = c.getColumnIndex(name);
                out.put(name, i < 0 || c.isNull(i) ? JSObject.NULL : c.getString(i));
            }
            for (String name : NUMBERS) {
                int i = c.getColumnIndex(name);
                if (i < 0 || c.isNull(i)) out.put(name, JSObject.NULL);
                else if (name.equals("rate_kg_per_week")) out.put(name, c.getDouble(i));
                else out.put(name, c.getLong(i));
            }
            return out;
        } catch (RuntimeException e) {
            // SecurityException for a key or permission that does not match, or a provider that died.
            return null;
        }
    }

    @PluginMethod
    public void read(PluginCall call) {
        // Off Capacitor's one plugin thread: a read may have to start OpenBite's process first.
        new Thread(() -> {
            JSObject out = query("io.github.lodepav.openbite");
            if (out == null && BuildConfig.DEBUG) out = query("io.github.lodepav.openbite.develop");
            if (out == null) {
                out = new JSObject();
                out.put("phase", JSObject.NULL);
            }
            call.resolve(out);
        }, "HevierPhase").start();
    }
}
