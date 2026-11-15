package ch.duartesantos.opengym;

import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * [hevier] The launcher icon follows the accent (hevier/DECISIONS.md D123,
 * frontend/src/hevier/lib/accent-icon-run.js). The page saves the icon id here; the aliases are
 * switched only when the app goes to the background, as upstream's AppIconPlugin does, because
 * disabling the alias the running task started from closes the app on several Android versions
 * even with DONT_KILL_APP. Notifications, widgets and the fork's tools name MainActivity itself,
 * which is never disabled.
 *
 *   const I = registerPlugin('HevierIcon')
 *   await I.getIcon()                 // { id: 'green' }: the saved choice, applied or about to be
 *   await I.setIcon({ id: 'blue' })   // { id: 'blue' }
 */
@CapacitorPlugin(name = "HevierIcon")
public class HevierIconPlugin extends Plugin {
    private static final String TAG = "HevierIconPlugin";
    private static final String PREFS = "hevier_icon";
    private static final String KEY = "id";

    @PluginMethod
    public void getIcon(PluginCall call) {
        JSObject r = new JSObject();
        r.put("id", saved());
        call.resolve(r);
    }

    @PluginMethod
    public void setIcon(PluginCall call) {
        String id = call.getString("id");
        if (!HevierIcons.known(id)) {
            call.reject("unknown icon");
            return;
        }
        prefs().edit().putString(KEY, id).apply();
        JSObject r = new JSObject();
        r.put("id", id);
        call.resolve(r);
    }

    @Override
    protected void handleOnStop() {
        super.handleOnStop();
        reconcile();
    }

    // Every stop, not only after a pick: anything else that turned an alias on is undone too.
    private void reconcile() {
        PackageManager pm = getContext().getPackageManager();
        try {
            int[] states = new int[HevierIcons.ALIASES.length];
            for (int i = 0; i < states.length; i++) states[i] = pm.getComponentEnabledSetting(component(HevierIcons.ALIASES[i]));
            HevierIcons.Plan plan = HevierIcons.reconcile(saved(), states);
            if (plan.isEmpty()) return;
            // The new entry first, so the launcher never sees the app without one.
            if (plan.enable != null) {
                pm.setComponentEnabledSetting(component(plan.enable), PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
            }
            for (String alias : plan.disable) {
                pm.setComponentEnabledSetting(component(alias), PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
            }
        } catch (RuntimeException e) {
            Log.w(TAG, "could not switch the launcher icon", e);
        }
    }

    private String saved() {
        String id = prefs().getString(KEY, null);
        return HevierIcons.known(id) ? id : HevierIcons.DEFAULT_ID;
    }

    // The package is the applicationId (".hevier", ".hevier.test"), the class part MainActivity's package.
    private ComponentName component(String alias) {
        return new ComponentName(getContext(), MainActivity.class.getPackage().getName() + "." + alias);
    }

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
