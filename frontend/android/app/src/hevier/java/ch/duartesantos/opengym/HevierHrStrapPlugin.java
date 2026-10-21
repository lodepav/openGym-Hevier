package ch.duartesantos.opengym;

import android.Manifest;
import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanFilter;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelUuid;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * [hevier] A Bluetooth heart-rate strap (hevier/DECISIONS.md D79): finds straps nearby, and while
 * a workout runs has HevierHrStrapService record the one picked. Any strap, armband or watch that
 * pushes its heart rate over Bluetooth's standard Heart Rate profile (0x180D) will do. Nearby
 * devices is the only permission (no location: the scan is declared neverForLocation); before
 * Android 12 a scan needs location instead.
 *
 *   const H = registerPlugin('HevierHrStrap');
 *   await H.status();                    // { bluetooth: 'on'|'off'|'none', permission, state, session, address, bpm, at }
 *   await H.request();                   // { permission: 'granted' | 'denied' }
 *   await H.scan({ ms: 8000 });          // { devices: [{ address, name, rssi }] }, 'device' events meanwhile
 *   await H.start({ session, address, name, title, connecting, live });
 *   await H.stop();
 *   await H.recording({ session });      // { text: '<ms> <hex>\n…' }, '' when there is none
 *   await H.sessions();                  // { sessions: ['a1', …] } the recordings on the phone
 *   await H.clear({ session });
 *   H.addListener('reading', ({ t, hex, bpm }) => …); H.addListener('state', ({ state, address }) => …)
 */
@SuppressLint("MissingPermission")   // every Bluetooth call is behind has()
@CapacitorPlugin(
    name = "HevierHrStrap",
    permissions = {
        @Permission(alias = "nearby", strings = { Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT }),
        @Permission(alias = "legacy", strings = { Manifest.permission.ACCESS_FINE_LOCATION }),
    }
)
public class HevierHrStrapPlugin extends Plugin {
    private final Handler main = new Handler(Looper.getMainLooper());
    private ScanCallback scanning;

    @Override
    public void load() {
        HevierHrStrapService.listener = new HevierHrStrapService.Listener() {
            @Override
            public void state(String state) {
                JSObject o = new JSObject();
                o.put("state", state);
                o.put("address", HevierHrStrapService.address);
                notifyListeners("state", o);
            }

            @Override
            public void reading(long t, String hex, int bpm) {
                JSObject o = new JSObject();
                o.put("t", t);
                o.put("hex", hex);
                o.put("bpm", bpm);
                notifyListeners("reading", o);
            }
        };
    }

    private String alias() {
        return Build.VERSION.SDK_INT >= 31 ? "nearby" : "legacy";
    }

    private boolean has() {
        Context ctx = getContext();
        if (Build.VERSION.SDK_INT >= 31)
            return ctx.checkSelfPermission(Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED
                && ctx.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
        return ctx.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private BluetoothAdapter adapter() {
        BluetoothManager bm = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        return bm == null ? null : bm.getAdapter();
    }

    @PluginMethod
    public void status(PluginCall call) {
        BluetoothAdapter a = adapter();
        boolean le = getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE);
        JSObject o = new JSObject();
        o.put("bluetooth", a == null || !le ? "none" : a.isEnabled() ? "on" : "off");
        o.put("permission", has() ? "granted" : getPermissionState(alias()).toString());
        o.put("state", HevierHrStrapService.state);
        o.put("session", HevierHrStrapService.session);
        o.put("address", HevierHrStrapService.address);
        o.put("bpm", HevierHrStrapService.lastBpm);
        o.put("at", HevierHrStrapService.lastAt);
        call.resolve(o);
    }

    @PluginMethod
    public void request(PluginCall call) {
        if (has()) {
            JSObject o = new JSObject();
            o.put("permission", "granted");
            call.resolve(o);
            return;
        }
        requestPermissionForAlias(alias(), call, "afterPermission");
    }

    @PermissionCallback
    private void afterPermission(PluginCall call) {
        JSObject o = new JSObject();
        o.put("permission", has() ? "granted" : "denied");
        call.resolve(o);
    }

    /** Straps advertising the Heart Rate service, for `ms` (8 s by default), strongest signal first. */
    @PluginMethod
    public void scan(PluginCall call) {
        if (!has()) {
            call.reject("Bluetooth not allowed", "permission");
            return;
        }
        BluetoothAdapter a = adapter();
        BluetoothLeScanner scanner = a == null || !a.isEnabled() ? null : a.getBluetoothLeScanner();
        if (scanner == null) {
            call.reject("Bluetooth is off", "off");
            return;
        }
        stopScan();
        Map<String, JSObject> found = Collections.synchronizedMap(new LinkedHashMap<>());
        scanning = new ScanCallback() {
            @Override
            public void onScanResult(int type, ScanResult r) {
                String addr = r.getDevice().getAddress();
                String name = r.getScanRecord() != null ? r.getScanRecord().getDeviceName() : null;
                if (name == null) name = r.getDevice().getName();
                JSObject d = new JSObject();
                d.put("address", addr);
                d.put("name", name == null ? "" : name);
                d.put("rssi", r.getRssi());
                boolean fresh = !found.containsKey(addr);
                found.put(addr, d);
                if (fresh) notifyListeners("device", d);
            }

            @Override
            public void onScanFailed(int code) {
                call.reject("scan failed " + code, "failed");
                scanning = null;
            }
        };
        ScanFilter only = new ScanFilter.Builder().setServiceUuid(new ParcelUuid(HevierHrStrapService.HR_SERVICE)).build();
        ScanSettings fast = new ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build();
        scanner.startScan(Collections.singletonList(only), fast, scanning);
        int ms = Math.max(1000, Math.min(30_000, call.getInt("ms", 8000)));
        ScanCallback mine = scanning;
        main.postDelayed(() -> {
            if (scanning != mine) return;
            stopScan();
            JSArray list = new JSArray();
            found.values().stream()
                .sorted((x, y) -> Integer.compare(y.getInteger("rssi", -200), x.getInteger("rssi", -200)))
                .forEach(list::put);
            JSObject o = new JSObject();
            o.put("devices", list);
            call.resolve(o);
        }, ms);
    }

    private void stopScan() {
        if (scanning == null) return;
        BluetoothAdapter a = adapter();
        BluetoothLeScanner scanner = a == null ? null : a.getBluetoothLeScanner();
        if (scanner != null && has()) scanner.stopScan(scanning);
        scanning = null;
    }

    @PluginMethod
    public void start(PluginCall call) {
        String session = call.getString("session"), address = call.getString("address");
        if (session == null || address == null || !BluetoothAdapter.checkBluetoothAddress(address)) {
            call.reject("session and address are needed", "failed");
            return;
        }
        if (!has()) {
            call.reject("Bluetooth not allowed", "permission");
            return;
        }
        Intent i = new Intent(getContext(), HevierHrStrapService.class);
        i.putExtra("session", session);
        i.putExtra("address", address);
        for (String k : new String[] { "name", "title", "connecting", "live" }) i.putExtra(k, call.getString(k, ""));
        try {
            if (Build.VERSION.SDK_INT >= 26) getContext().startForegroundService(i);
            else getContext().startService(i);
            call.resolve();
        } catch (Exception e) {
            // Android refuses a foreground service started from the background; the next opening tries again.
            call.reject(e.getMessage(), "failed");
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getContext().stopService(new Intent(getContext(), HevierHrStrapService.class));
        call.resolve();
    }

    @PluginMethod
    public void recording(PluginCall call) {
        String session = call.getString("session");
        JSObject o = new JSObject();
        try {
            File f = session == null ? null : HevierHrStrapService.file(getContext(), session);
            o.put("text", f != null && f.exists() ? new String(Files.readAllBytes(f.toPath()), StandardCharsets.US_ASCII) : "");
            call.resolve(o);
        } catch (Exception e) {
            call.reject(e.getMessage(), "failed");
        }
    }

    @PluginMethod
    public void sessions(PluginCall call) {
        JSArray list = new JSArray();
        File[] files = new File(getContext().getFilesDir(), HevierHrStrapService.DIR).listFiles();
        if (files != null) for (File f : files) if (f.getName().endsWith(".txt")) list.put(f.getName().substring(0, f.getName().length() - 4));
        JSObject o = new JSObject();
        o.put("sessions", list);
        call.resolve(o);
    }

    @PluginMethod
    public void clear(PluginCall call) {
        String session = call.getString("session");
        if (session != null && !session.equals(HevierHrStrapService.session)) HevierHrStrapService.file(getContext(), session).delete();
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        stopScan();
        HevierHrStrapService.listener = null;
    }
}
