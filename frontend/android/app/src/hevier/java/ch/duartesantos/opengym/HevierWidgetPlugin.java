package ch.duartesantos.opengym;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * [hevier] The page's side of the home-screen month widget (hevier/DECISIONS.md D44). The page
 * hands over the snapshot it built (hevier/lib/month-widget.js), which is kept in the app's private
 * SharedPreferences for the widget to draw from; and a tap on the widget, which starts the app
 * with a route, is handed back to the page once.
 *
 *   const W = registerPlugin('HevierWidget');
 *   await W.update({ snapshot: json });
 *   await W.takeRoute();                       // { route: string | null }
 */
@CapacitorPlugin(name = "HevierWidget")
public class HevierWidgetPlugin extends Plugin {

    private static final String ROUTE = "hevier_route";
    private String route;

    @Override
    public void load() {
        Activity a = getActivity();
        if (a != null) keepRoute(a.getIntent());
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        keepRoute(intent);
    }

    private void keepRoute(Intent intent) {
        if (intent == null) return;
        String r = intent.getStringExtra(ROUTE);
        // The launcher activity is exported, so any app can send the extra: only the widget's own route.
        if (!"/calendar".equals(r)) return;
        route = r;
        intent.removeExtra(ROUTE);
    }

    @PluginMethod
    public void update(PluginCall call) {
        String snapshot = call.getString("snapshot");
        if (snapshot == null) {
            call.reject("no snapshot");
            return;
        }
        Context ctx = getContext();
        HevierMonthWidget.save(ctx, snapshot);
        HevierMonthWidget.refresh(ctx);
        call.resolve();
    }

    @PluginMethod
    public void takeRoute(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("route", route);
        route = null;
        call.resolve(ret);
    }

    /** The intent a tap on the widget starts the app with. */
    static Intent openIntent(Context ctx, String route) {
        Intent i = new Intent(ctx, MainActivity.class);
        i.setAction(Intent.ACTION_MAIN);
        i.addCategory(Intent.CATEGORY_LAUNCHER);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        i.putExtra(ROUTE, route);
        return i;
    }
}
