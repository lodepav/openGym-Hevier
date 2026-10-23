package ch.duartesantos.opengym;

import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanFilter;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.ParcelUuid;
import android.util.Log;
import java.util.Collections;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * [hevier] Records a Bluetooth heart-rate strap while a workout runs (hevier/DECISIONS.md D79).
 * Foreground, so the connection holds with the screen locked and the app in the background: it
 * connects to the strap the user picked, subscribes to its Heart Rate Measurement (0x2A37), and
 * appends each notification as it came, `<ms> <hex>\n`, to `files/hevier-hr/<workout id>.txt`.
 * The app decodes the file when the workout is saved (hevier/lib/hr-strap.js). A strap that goes
 * out of reach or switches off is waited for and reconnected, for as long as the workout runs.
 * Started and stopped by HevierHrStrapPlugin; it keeps the strap's last reading for the plugin.
 */
@SuppressLint("MissingPermission")   // the plugin starts it only with Bluetooth allowed
public class HevierHrStrapService extends Service {
    static final UUID HR_SERVICE = uuid16(0x180D);
    static final UUID HR_MEASUREMENT = uuid16(0x2A37);
    static final UUID CCCD = uuid16(0x2902);
    static final String CHANNEL_ID = "hevier-hr-strap";
    static final int NOTIFICATION_ID = 7913;
    static final String DIR = "hevier-hr";
    static final String TAG = "HevierHrStrap";

    static UUID uuid16(int n) {
        return UUID.fromString(String.format("0000%04x-0000-1000-8000-00805f9b34fb", n));
    }

    /** What the plugin hears: the connection's state and each reading. */
    interface Listener {
        void state(String state);
        void reading(long t, String hex, int bpm);
    }

    static volatile Listener listener;
    static volatile String state = "off";            // off · connecting · connected
    static volatile String session;
    static volatile String address;
    static volatile long lastAt;
    static volatile int lastBpm;

    private final Handler main = new Handler(Looper.getMainLooper());
    private BluetoothGatt gatt;
    private FileOutputStream out;
    private boolean running;
    private int retries;
    private String title = "Heart rate strap", connecting = "Connecting to {0}…", live = "{0} bpm", name = "";
    private long shownAt;
    private long connectedAt;
    private long lostAt;
    private ScanCallback finding;
    // The one pending reconnect, so a second path to connect() (find) can cancel it.
    private final Runnable reconnect = () -> connect(retries > 1);
    static final long STALL_MS = 30_000;
    // A strap that wants to be paired before it notifies (a Garmin watch's broadcast may): the
    // pairing is asked for once a workout, and the subscription made again once it is done.
    private boolean bondAsked;
    private int bondWaits;
    private final Runnable afterBond = this::subscribeAfterBond;

    static File file(Context ctx, String id) {
        return new File(new File(ctx.getFilesDir(), DIR), id.replaceAll("[^A-Za-z0-9_-]", "_") + ".txt");
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String id = intent == null ? null : intent.getStringExtra("session");
        String addr = intent == null ? null : intent.getStringExtra("address");
        if (id == null || addr == null) {
            stopSelf();
            return START_NOT_STICKY;
        }
        title = extra(intent, "title", title);
        connecting = extra(intent, "connecting", connecting);
        live = extra(intent, "live", live);
        name = extra(intent, "name", addr);
        goForeground(connecting.replace("{0}", name));
        if (running && id.equals(session) && addr.equals(address)) return START_NOT_STICKY;
        close();
        session = id;
        address = addr;
        try {
            File f = file(this, id);
            f.getParentFile().mkdirs();
            out = new FileOutputStream(f, true);
        } catch (IOException e) {
            stopSelf();
            return START_NOT_STICKY;
        }
        running = true;
        retries = 0;
        bondAsked = false;
        connect(false);
        main.postDelayed(this::watch, STALL_MS / 2);
        return START_NOT_STICKY;
    }

    private static String extra(Intent i, String k, String def) {
        String v = i.getStringExtra(k);
        return v == null || v.isEmpty() ? def : v;
    }

    private void setState(String s) {
        if ("connecting".equals(s) && !"connecting".equals(state)) lostAt = System.currentTimeMillis();
        state = s;
        Listener l = listener;
        if (l != null) l.state(s);
        if (!"connected".equals(s)) notifyText(connecting.replace("{0}", name));
    }

    private void connect(boolean auto) {
        if (!running) return;
        // Only one client at a time: a reconnect still pending, or a client left open, would leak a
        // GATT client that keeps reaching for the strap (Android has few of them).
        main.removeCallbacks(reconnect);
        main.removeCallbacks(afterBond);   // the pairing poll belongs to the link closed here
        if (gatt != null) {
            gatt.close();
            gatt = null;
        }
        BluetoothManager bm = (BluetoothManager) getSystemService(Context.BLUETOOTH_SERVICE);
        BluetoothAdapter adapter = bm == null ? null : bm.getAdapter();
        if (adapter == null || !adapter.isEnabled()) {
            setState("connecting");
            main.postDelayed(reconnect, 10_000);
            return;
        }
        setState("connecting");
        BluetoothDevice device = adapter.getRemoteDevice(address);
        // A direct connect is quick while the strap is in reach; after a drop, autoConnect waits
        // for it to come back for as long as it takes, at the radio's own low duty cycle.
        gatt = device.connectGatt(this, auto, callback, BluetoothDevice.TRANSPORT_LE);
    }

    private void retry() {
        if (gatt != null) {
            gatt.close();
            gatt = null;
        }
        if (!running) return;
        setState("connecting");
        retries++;
        main.removeCallbacks(reconnect);
        main.postDelayed(reconnect, Math.min(10_000, 1000L * retries));
    }

    /**
     * A link that holds but carries nothing (the strap's broadcast switched off and on, a GATT
     * change missed) is dropped after 30 s, and the reconnect subscribes afresh.
     */
    private void watch() {
        if (!running) return;
        long since = Math.max(lastAt, connectedAt);
        if ("connected".equals(state) && gatt != null && System.currentTimeMillis() - since > STALL_MS) gatt.disconnect();
        else if ("connecting".equals(state) && System.currentTimeMillis() - lostAt > STALL_MS / 2) find();
        main.postDelayed(this::watch, STALL_MS / 2);
    }

    /**
     * Out of reach for a while: a watch or band that pushes its heart rate may have come back under
     * a new private address, so look for a heart-rate device of the same name and move to it. The
     * app keeps the new address (HevierHrStrapPlugin's 'state' event carries it).
     */
    private void find() {
        if (finding != null || name.isEmpty() || BluetoothAdapter.checkBluetoothAddress(name)) return;
        BluetoothManager bm = (BluetoothManager) getSystemService(Context.BLUETOOTH_SERVICE);
        BluetoothAdapter adapter = bm == null ? null : bm.getAdapter();
        BluetoothLeScanner scanner = adapter == null || !adapter.isEnabled() ? null : adapter.getBluetoothLeScanner();
        if (scanner == null) return;
        ScanCallback cb = new ScanCallback() {
            @Override
            public void onScanResult(int type, ScanResult r) {
                String n = r.getScanRecord() != null ? r.getScanRecord().getDeviceName() : null;
                String a = r.getDevice().getAddress();
                main.post(() -> {
                    if (finding != this || !name.equals(n)) return;
                    stopFinding();
                    if (a.equals(address) || !"connecting".equals(state)) return;
                    address = a;
                    if (gatt != null) {
                        gatt.close();
                        gatt = null;
                    }
                    retries = 0;
                    connect(false);
                });
            }
        };
        finding = cb;
        ScanFilter only = new ScanFilter.Builder().setServiceUuid(new ParcelUuid(HR_SERVICE)).build();
        scanner.startScan(Collections.singletonList(only), new ScanSettings.Builder().build(), cb);
        main.postDelayed(() -> {
            if (finding == cb) stopFinding();
        }, 8000);
    }

    private void stopFinding() {
        if (finding == null) return;
        BluetoothManager bm = (BluetoothManager) getSystemService(Context.BLUETOOTH_SERVICE);
        BluetoothAdapter adapter = bm == null ? null : bm.getAdapter();
        BluetoothLeScanner scanner = adapter == null ? null : adapter.getBluetoothLeScanner();
        if (scanner != null && adapter.isEnabled()) scanner.stopScan(finding);
        finding = null;
    }

    private final BluetoothGattCallback callback = new BluetoothGattCallback() {
        @Override
        public void onConnectionStateChange(BluetoothGatt g, int status, int newState) {
            main.post(() -> {
                if (g != gatt) return;
                Log.i(TAG, "connection state " + newState + ", status " + status);
                if (newState == BluetoothProfile.STATE_CONNECTED && status == BluetoothGatt.GATT_SUCCESS) g.discoverServices();
                // A link that came up with an error, or went down, is made again: left as it was, it
                // stayed "connecting" for good.
                else if (newState == BluetoothProfile.STATE_DISCONNECTED || status != BluetoothGatt.GATT_SUCCESS) retry();
            });
        }

        @Override
        public void onServicesDiscovered(BluetoothGatt g, int status) {
            main.post(() -> {
                if (g != gatt) return;
                Log.i(TAG, "services discovered, status " + status);
                if (!subscribe(g)) g.disconnect();
            });
        }

        @Override
        public void onDescriptorWrite(BluetoothGatt g, BluetoothGattDescriptor d, int status) {
            main.post(() -> {
                if (g != gatt) return;
                Log.i(TAG, "subscribe status " + status + ", bond " + g.getDevice().getBondState());
                if (status == BluetoothGatt.GATT_SUCCESS) {
                    retries = 0;
                    connectedAt = System.currentTimeMillis();
                    setState("connected");
                } else if (needsPairing(status) && g.getDevice().getBondState() != BluetoothDevice.BOND_BONDED && pair(g)) {
                    // waiting for the pairing; subscribeAfterBond takes it from there
                } else g.disconnect();
            });
        }

        // The strap's GATT server was rebuilt on a link that stayed up: its new subscription is
        // off, so subscribe again (Android 12+; older ones fall to the watchdog).
        @Override
        public void onServiceChanged(BluetoothGatt g) {
            main.post(() -> {
                if (g == gatt) g.discoverServices();
            });
        }

        @Override
        public void onCharacteristicChanged(BluetoothGatt g, BluetoothGattCharacteristic c, byte[] value) {
            if (HR_MEASUREMENT.equals(c.getUuid())) record(value);
        }

        @Override
        @SuppressWarnings("deprecation")
        public void onCharacteristicChanged(BluetoothGatt g, BluetoothGattCharacteristic c) {
            if (Build.VERSION.SDK_INT < 33 && HR_MEASUREMENT.equals(c.getUuid())) record(c.getValue());
        }
    };

    /** Asks for Heart Rate Measurement's notifications; false when the strap has none. */
    private boolean subscribe(BluetoothGatt g) {
        BluetoothGattService svc = g.getService(HR_SERVICE);
        BluetoothGattCharacteristic c = svc == null ? null : svc.getCharacteristic(HR_MEASUREMENT);
        BluetoothGattDescriptor d = c == null ? null : c.getDescriptor(CCCD);
        if (d == null) return false;
        g.setCharacteristicNotification(c, true);
        if (Build.VERSION.SDK_INT >= 33) g.writeDescriptor(d, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
        else {
            d.setValue(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
            g.writeDescriptor(d);
        }
        return true;
    }

    // Refusals that mean "pair first": insufficient authentication or encryption, and the stack's
    // own GATT_AUTH_FAIL (137), which some phones report instead.
    static boolean needsPairing(int status) {
        return status == BluetoothGatt.GATT_INSUFFICIENT_AUTHENTICATION || status == BluetoothGatt.GATT_INSUFFICIENT_ENCRYPTION || status == 137;
    }

    /** Asks Android to pair with the strap, once a workout; false when it was asked already. */
    private boolean pair(BluetoothGatt g) {
        if (bondAsked) return false;
        bondAsked = true;
        BluetoothDevice dev = g.getDevice();
        if (dev.getBondState() == BluetoothDevice.BOND_NONE && !dev.createBond()) return false;
        Log.i(TAG, "pairing with the strap");
        bondWaits = 0;
        main.postDelayed(afterBond, 1000);
        return true;
    }

    // Polls the pairing (a minute, for the user to answer Android's prompt), then subscribes again
    // on the same link; a pairing refused or never answered drops the link, and the reconnect
    // tries without one.
    private void subscribeAfterBond() {
        if (!running || gatt == null) return;
        int bond = gatt.getDevice().getBondState();
        if (bond == BluetoothDevice.BOND_BONDED) {
            Log.i(TAG, "paired, subscribing again");
            if (!subscribe(gatt)) gatt.disconnect();
        } else if (bond == BluetoothDevice.BOND_NONE || ++bondWaits > 60) {
            Log.w(TAG, "not paired (bond " + bond + ")");
            gatt.disconnect();
        } else main.postDelayed(afterBond, 1000);
    }

    private void record(byte[] v) {
        if (v == null || v.length < 2) return;
        long t = System.currentTimeMillis();
        StringBuilder hex = new StringBuilder(v.length * 2);
        for (byte b : v) hex.append(String.format("%02x", b & 0xff));
        // The heart rate for the notification and the live display only; the app decodes the file.
        int bpm = (v[0] & 1) == 1 && v.length >= 3 ? (v[1] & 0xff) | ((v[2] & 0xff) << 8) : v[1] & 0xff;
        String h = hex.toString();
        main.post(() -> {
            if (!running || out == null) return;
            try {
                out.write((t + " " + h + "\n").getBytes(StandardCharsets.US_ASCII));
            } catch (IOException ignored) {
                // a full disk: the live display goes on
            }
            lastAt = t;
            lastBpm = bpm;
            Listener l = listener;
            if (l != null) l.reading(t, h, bpm);
            if (t - shownAt >= 5000 && bpm > 0) {
                shownAt = t;
                notifyText(live.replace("{0}", String.valueOf(bpm)));
            }
        });
    }

    private Notification build(String text) {
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL_ID) == null) {
            NotificationChannel ch = new NotificationChannel(CHANNEL_ID, title, NotificationManager.IMPORTANCE_LOW);
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent tap = open == null ? null : PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CHANNEL_ID) : new Notification.Builder(this);
        b.setSmallIcon(R.drawable.ic_stat_dumbbell).setContentTitle(title).setContentText(text).setOngoing(true).setOnlyAlertOnce(true).setShowWhen(false);
        if (tap != null) b.setContentIntent(tap);
        return b.build();
    }

    private void goForeground(String text) {
        Notification n = build(text);
        if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIFICATION_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE);
        else startForeground(NOTIFICATION_ID, n);
    }

    private void notifyText(String text) {
        if (!running) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm != null) nm.notify(NOTIFICATION_ID, build(text));
    }

    private void close() {
        running = false;
        stopFinding();
        main.removeCallbacksAndMessages(null);
        if (gatt != null) {
            gatt.disconnect();
            gatt.close();
            gatt = null;
        }
        if (out != null) {
            try {
                out.close();
            } catch (IOException ignored) {
            }
            out = null;
        }
    }

    @Override
    public void onDestroy() {
        close();
        state = "off";
        session = null;
        Listener l = listener;
        if (l != null) l.state("off");
        super.onDestroy();
    }
}
