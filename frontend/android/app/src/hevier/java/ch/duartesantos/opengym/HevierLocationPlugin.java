package ch.duartesantos.opengym;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationManager;
import android.os.Build;
import android.os.CancellationSignal;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * [hevier] The phone's position, once, for the gym picker's "Find gyms nearby" (hevier/DECISIONS.md
 * D47), until upstream's v1.4.3 brings its own (GymReminderPlugin.currentPosition, which this
 * ports: the same providers, the same 25 s wait and the same last-known fallback). Only on a tap,
 * while the app is open: no background permission, nothing watched. Unlike upstream's, an
 * approximate ("coarse") grant is enough, as a gym two kilometres around needs no more.
 *
 *   const L = registerPlugin('HevierLocation');
 *   await L.request();     // { location: 'granted' | 'denied' | 'prompt' }, asks the first time
 *   await L.position();    // { lat, lng, accuracy }
 */
@CapacitorPlugin(
    name = "HevierLocation",
    permissions = {
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }),
    }
)
public class HevierLocationPlugin extends Plugin {

    private static boolean has(Context ctx, String p) {
        return ctx.checkSelfPermission(p) == PackageManager.PERMISSION_GRANTED;
    }

    private static boolean hasFine(Context ctx) {
        return has(ctx, Manifest.permission.ACCESS_FINE_LOCATION);
    }

    private static boolean hasAny(Context ctx) {
        return hasFine(ctx) || has(ctx, Manifest.permission.ACCESS_COARSE_LOCATION);
    }

    private JSObject state() {
        JSObject r = new JSObject();
        r.put("location", hasAny(getContext()) ? "granted" : getPermissionState("location").toString());
        return r;
    }

    @PluginMethod
    public void request(PluginCall call) {
        if (hasAny(getContext())) {
            call.resolve(state());
            return;
        }
        requestPermissionForAlias("location", call, "afterPermission");
    }

    @PermissionCallback
    private void afterPermission(PluginCall call) {
        JSObject r = new JSObject();
        r.put("location", hasAny(getContext()) ? "granted" : "denied");
        call.resolve(r);
    }

    /** One fix, from whichever provider is on; a recent last known one if none answers in time. */
    @PluginMethod
    public void position(PluginCall call) {
        Context ctx = getContext();
        if (!hasAny(ctx)) {
            call.reject("location not allowed");
            return;
        }
        LocationManager lm = (LocationManager) ctx.getSystemService(Context.LOCATION_SERVICE);
        if (lm == null) {
            call.reject("no location service");
            return;
        }
        // GPS answers only a precise grant; the fused and network providers answer either.
        boolean fine = hasFine(ctx);
        String provider = null;
        for (String p : new String[] { Build.VERSION.SDK_INT >= 31 ? LocationManager.FUSED_PROVIDER : null, fine ? LocationManager.GPS_PROVIDER : null, LocationManager.NETWORK_PROVIDER }) {
            if (p != null && lm.getAllProviders().contains(p) && lm.isProviderEnabled(p)) {
                provider = p;
                break;
            }
        }
        if (provider == null) {
            call.reject("location is switched off");
            return;
        }
        AtomicBoolean done = new AtomicBoolean(false);
        Handler main = new Handler(Looper.getMainLooper());
        final String used = provider;
        Runnable fallback = () -> {
            if (done.getAndSet(true)) return;
            Location last = lastKnown(lm);
            if (last != null && System.currentTimeMillis() - last.getTime() < 10 * 60_000L) answer(call, last);
            else call.reject("no fix");
        };
        try {
            if (Build.VERSION.SDK_INT >= 30) {
                CancellationSignal cancel = new CancellationSignal();
                lm.getCurrentLocation(used, cancel, ctx.getMainExecutor(), loc -> {
                    if (loc == null) {
                        fallback.run();
                        return;
                    }
                    if (done.getAndSet(true)) return;
                    answer(call, loc);
                });
                main.postDelayed(() -> {
                    cancel.cancel();
                    fallback.run();
                }, 25_000);
            } else {
                lm.requestSingleUpdate(used, new android.location.LocationListener() {
                    @Override
                    public void onLocationChanged(Location loc) {
                        if (done.getAndSet(true)) return;
                        answer(call, loc);
                    }

                    @Override
                    public void onStatusChanged(String p, int s, android.os.Bundle b) {}

                    @Override
                    public void onProviderEnabled(String p) {}

                    @Override
                    public void onProviderDisabled(String p) {}
                }, Looper.getMainLooper());
                main.postDelayed(fallback, 25_000);
            }
        } catch (SecurityException e) {
            call.reject("location not allowed");
        }
    }

    private static Location lastKnown(LocationManager lm) {
        Location best = null;
        try {
            for (String p : lm.getProviders(true)) {
                Location l = lm.getLastKnownLocation(p);
                if (l != null && (best == null || l.getTime() > best.getTime())) best = l;
            }
        } catch (SecurityException ignored) {
            // asked without permission: nothing known
        }
        return best;
    }

    private static void answer(PluginCall call, Location loc) {
        JSObject r = new JSObject();
        r.put("lat", loc.getLatitude());
        r.put("lng", loc.getLongitude());
        r.put("accuracy", loc.hasAccuracy() ? loc.getAccuracy() : null);
        call.resolve(r);
    }
}
