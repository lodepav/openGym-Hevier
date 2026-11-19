package ch.duartesantos.opengym;

import android.app.Activity;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * [hevier] Hevy's login for the export to Hevy (hevier/DECISIONS.md D138): opens hevy.com's own
 * login page in a screen of the app (HevierHevyLoginActivity) and answers with the value of the
 * session cookie hevy.com sets, `auth2.0-token`. The page's own reCAPTCHA stays a person's step.
 * No dependency.
 *
 *   const L = registerPlugin('HevierHevyLogin');
 *   const { cookie } = await L.login();   // rejects "cancelled" when the screen is closed
 */
@CapacitorPlugin(name = "HevierHevyLogin")
public class HevierHevyLoginPlugin extends Plugin {

    @PluginMethod
    public void login(PluginCall call) {
        startActivityForResult(call, new Intent(getContext(), HevierHevyLoginActivity.class), "loginResult");
    }

    @ActivityCallback
    private void loginResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        String cookie = data != null ? data.getStringExtra(HevierHevyLoginActivity.EXTRA_COOKIE) : null;
        if (result.getResultCode() != Activity.RESULT_OK || cookie == null) {
            call.reject("cancelled", "cancelled");
            return;
        }
        JSObject ret = new JSObject();
        ret.put("cookie", cookie);
        call.resolve(ret);
    }
}
