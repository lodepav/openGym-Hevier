package ch.duartesantos.opengym;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

/**
 * [hevier] The exercise pictures downloaded once, kept across updates (hevier/DECISIONS.md D115).
 * The lean APK carries no public/exercise-media; this plugin downloads the media zip into the
 * app's own storage (files/exercise-media/, which an update keeps) and answers
 * https://localhost/exercise-media/... from there, so the web code's URLs never change. The
 * contract is in frontend/src/hevier/lib/media-pack.js:
 *
 *   const P = registerPlugin('HevierMedia');
 *   await P.status();     // { bundled, version, bytes }
 *   await P.network();    // { metered }
 *   await P.download({ url, sha256, version, bytes });   // { version }; 'progress' { phase, fraction }
 *   await P.cancel();
 *   await P.remove();
 *
 * A download rejects with the code 'checksum', 'space', 'cancelled' or 'failed'.
 */
@CapacitorPlugin(name = "HevierMedia")
public class HevierMediaPlugin extends Plugin {

    static final String ROUTE = "/exercise-media/";
    static final String DIR = "exercise-media";
    static final String VERSION_FILE = ".version";
    static final String PART = "hevier-media.zip.part";
    /** parseRange's answer for a range that starts past the end of the file (a 416). */
    static final long[] UNSATISFIABLE = { -1, -1 };
    private static final Pattern RANGE = Pattern.compile("^bytes=(\\d+)-(\\d*)$");
    private static final int MAX_HOPS = 5;
    private static final long PROGRESS_MS = 100;

    private boolean bundled;
    /** The download calls waiting for the run in progress, which a second call joins. */
    private final List<PluginCall> pending = new ArrayList<>();
    private boolean running;
    private volatile boolean cancelled;

    @Override
    public void load() {
        bundled = carriesMedia();
        cleanLeftovers();
        if (bundled) return;
        Bridge bridge = getBridge();
        bridge.setWebViewClient(new MediaClient(bridge, bridge.getWebViewClient(), mediaDir()));
    }

    private boolean carriesMedia() {
        try {
            String[] list = getContext().getAssets().list("public/exercise-media/still");
            return list != null && list.length > 0;
        } catch (IOException e) {
            return false;
        }
    }

    /** What a run killed half-way (the app closed or crashed) left behind. */
    private void cleanLeftovers() {
        File files = getContext().getFilesDir();
        File old = new File(files, DIR + ".old");
        File fresh = new File(files, DIR + ".new");
        // Killed between the two renames: the old copy is the only one, so it goes back.
        if (old.isDirectory() && !mediaDir().exists()) old.renameTo(mediaDir());
        deleteTree(old);
        deleteTree(fresh);
        new File(getContext().getCacheDir(), PART).delete();
    }

    private File mediaDir() {
        return new File(getContext().getFilesDir(), DIR);
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        r.put("bundled", bundled);
        String version = installedVersion();
        r.put("version", version == null ? JSObject.NULL : version);
        r.put("bytes", sizeOf(mediaDir()));
        call.resolve(r);
    }

    private String installedVersion() {
        File f = new File(mediaDir(), VERSION_FILE);
        if (!f.isFile()) return null;
        try {
            String v = new String(Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8).trim();
            return v.isEmpty() ? null : v;
        } catch (IOException e) {
            return null;
        }
    }

    @PluginMethod
    public void network(PluginCall call) {
        ConnectivityManager cm = (ConnectivityManager) getContext().getSystemService(Context.CONNECTIVITY_SERVICE);
        JSObject r = new JSObject();
        r.put("metered", cm != null && cm.isActiveNetworkMetered());
        call.resolve(r);
    }

    @PluginMethod
    public void download(PluginCall call) {
        String url = call.getString("url");
        String sha256 = call.getString("sha256");
        String version = call.getString("version");
        // optLong, not getLong: a size under 2 GB arrives as an Integer, which getLong drops.
        long bytes = call.getData().optLong("bytes", 0);
        if (url == null || sha256 == null || version == null) {
            call.reject("url, sha256 and version are needed", "failed");
            return;
        }
        call.setKeepAlive(true);
        synchronized (pending) {
            pending.add(call);
            if (running) return;
            running = true;
        }
        cancelled = false;
        Thread t = new Thread(() -> run(url, sha256, version, bytes), "hevier-media");
        t.start();
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        synchronized (pending) {
            if (running) cancelled = true;
        }
        call.resolve();
    }

    @PluginMethod
    public void remove(PluginCall call) {
        deleteTree(mediaDir());
        call.resolve();
    }

    /** One download, on its own thread: fetch, check, unpack, swap, then answer every waiting call. */
    private void run(String url, String sha256, String version, long bytes) {
        File part = new File(getContext().getCacheDir(), PART);
        File files = getContext().getFilesDir();
        File fresh = new File(files, DIR + ".new");
        File old = new File(files, DIR + ".old");
        String code = null;
        String message = null;
        try {
            if (bytes > 0 && files.getUsableSpace() < (long) (2.1 * bytes)) throw new Refused("space", "Not enough free space");
            String got = fetch(url, part, bytes);
            if (!got.equalsIgnoreCase(sha256)) throw new Refused("checksum", "The download does not match its checksum");
            deleteTree(fresh);
            unpack(part, fresh);
            write(new File(fresh, VERSION_FILE), version);
            checkCancelled();
            File current = mediaDir();
            deleteTree(old);
            if (current.exists() && !current.renameTo(old)) throw new IOException("could not move the old media aside");
            if (!fresh.renameTo(current)) {
                old.renameTo(current);
                throw new IOException("could not move the new media in");
            }
            deleteTree(old);
        } catch (Refused e) {
            code = e.code;
            message = e.getMessage();
        } catch (Exception e) {
            code = cancelled ? "cancelled" : "failed";
            message = String.valueOf(e.getMessage());
        } finally {
            part.delete();
            if (code != null) deleteTree(fresh);
        }
        List<PluginCall> calls;
        synchronized (pending) {
            calls = new ArrayList<>(pending);
            pending.clear();
            running = false;
            cancelled = false;
        }
        for (PluginCall c : calls) {
            c.setKeepAlive(false);
            if (code == null) {
                JSObject r = new JSObject();
                r.put("version", version);
                c.resolve(r);
            } else {
                c.reject(message, code);
            }
            getBridge().releaseCall(c);
        }
    }

    /** Streams url to part, following redirects by hand, and returns the SHA-256 of what came. */
    private String fetch(String url, File part, long expected) throws Exception {
        HttpURLConnection conn = null;
        URL at = new URL(url);
        for (int hop = 0; ; hop++) {
            // https, or http to the phone itself: a test zip served through `adb reverse` (media-pack.js).
            boolean local = "http".equals(at.getProtocol()) && "localhost".equals(at.getHost());
            if (!"https".equals(at.getProtocol()) && !local) throw new IOException("not https: " + at);
            conn = (HttpURLConnection) at.openConnection();
            conn.setInstanceFollowRedirects(false);
            conn.setConnectTimeout(20_000);
            conn.setReadTimeout(30_000);
            int status = conn.getResponseCode();
            if (status >= 300 && status < 400 && status != 304) {
                String next = conn.getHeaderField("Location");
                conn.disconnect();
                if (next == null || hop >= MAX_HOPS) throw new IOException("too many redirects");
                at = new URL(at, next);
                continue;
            }
            if (status != 200) {
                conn.disconnect();
                throw new IOException("HTTP " + status);
            }
            break;
        }
        long total = conn.getContentLengthLong();
        if (total <= 0) total = expected;
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream in = conn.getInputStream(); OutputStream out = new FileOutputStream(part)) {
            byte[] buf = new byte[64 * 1024];
            long done = 0;
            long last = 0;
            int n;
            while ((n = in.read(buf)) != -1) {
                checkCancelled();
                out.write(buf, 0, n);
                digest.update(buf, 0, n);
                done += n;
                long now = System.currentTimeMillis();
                if (total > 0 && now - last >= PROGRESS_MS) {
                    last = now;
                    progress("download", Math.min(1.0, (double) done / total));
                }
            }
        } finally {
            conn.disconnect();
        }
        progress("download", 1.0);
        return hex(digest.digest());
    }

    /** Unpacks the zip into target, refusing any entry that would land outside it. */
    private void unpack(File zip, File target) throws Exception {
        if (!target.mkdirs() && !target.isDirectory()) throw new IOException("could not make " + target);
        try (ZipFile z = new ZipFile(zip)) {
            int count = Math.max(1, z.size());
            int done = 0;
            long last = 0;
            byte[] buf = new byte[64 * 1024];
            for (Enumeration<? extends ZipEntry> it = z.entries(); it.hasMoreElements(); ) {
                checkCancelled();
                ZipEntry e = it.nextElement();
                File f = inside(target, e.getName());
                if (f == null) throw new IOException("entry outside the folder: " + e.getName());
                if (e.isDirectory()) {
                    f.mkdirs();
                } else {
                    File parent = f.getParentFile();
                    if (parent != null) parent.mkdirs();
                    try (InputStream in = z.getInputStream(e); OutputStream out = new FileOutputStream(f)) {
                        int n;
                        while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
                    }
                }
                done++;
                long now = System.currentTimeMillis();
                if (now - last >= PROGRESS_MS) {
                    last = now;
                    progress("unpack", (double) done / count);
                }
            }
        }
        progress("unpack", 1.0);
    }

    private void checkCancelled() throws Refused {
        if (cancelled) throw new Refused("cancelled", "Cancelled");
    }

    private void progress(String phase, double fraction) {
        JSObject e = new JSObject();
        e.put("phase", phase);
        e.put("fraction", fraction);
        notifyListeners("progress", e);
    }

    private static void write(File f, String text) throws IOException {
        try (OutputStream out = new FileOutputStream(f)) {
            out.write(text.getBytes(StandardCharsets.UTF_8));
        }
    }

    private static String hex(byte[] bytes) {
        StringBuilder s = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) s.append(String.format(Locale.ROOT, "%02x", b));
        return s.toString();
    }

    private static long sizeOf(File f) {
        if (f.isFile()) return f.length();
        File[] list = f.listFiles();
        long total = 0;
        if (list != null) for (File c : list) total += sizeOf(c);
        return total;
    }

    private static void deleteTree(File f) {
        if (!f.exists()) return;
        // A link is deleted, never followed.
        if (f.isDirectory() && !Files.isSymbolicLink(f.toPath())) {
            File[] list = f.listFiles();
            if (list != null) for (File c : list) deleteTree(c);
        }
        f.delete();
    }

    /** A download refused with one of the contract's codes. */
    private static final class Refused extends Exception {
        final String code;

        Refused(String code, String message) {
            super(message);
            this.code = code;
        }
    }

    // ---- the pure helpers, unit-tested in HevierMediaPluginTest ----

    /**
     * The file rel names under root, or null when its canonical path would leave root (a "../",
     * an absolute path, a link pointing out) or names root itself.
     */
    static File inside(File root, String rel) {
        if (rel == null || rel.isEmpty()) return null;
        try {
            String base = root.getCanonicalPath();
            File f = new File(root, rel).getCanonicalFile();
            return f.getPath().startsWith(base + File.separator) ? f : null;
        } catch (IOException e) {
            return null;
        }
    }

    /** The content type of a media file, by its extension. */
    static String mimeOf(String name) {
        String n = name.toLowerCase(Locale.ROOT);
        if (n.endsWith(".webp")) return "image/webp";
        if (n.endsWith(".mp4")) return "video/mp4";
        if (n.endsWith(".md")) return "text/markdown";
        return "application/octet-stream";
    }

    /**
     * A single "bytes=a-b" or "bytes=a-" Range header against a file of length bytes: { start, end }
     * inclusive, end clamped to the last byte; UNSATISFIABLE when a starts past the end; null for
     * no header or one this does not read (the whole file is sent).
     */
    static long[] parseRange(String header, long length) {
        if (header == null) return null;
        Matcher m = RANGE.matcher(header.trim());
        if (!m.matches()) return null;
        long start;
        long end;
        try {
            start = Long.parseLong(m.group(1));
            end = m.group(2).isEmpty() ? length - 1 : Long.parseLong(m.group(2));
        } catch (NumberFormatException e) {
            return null;
        }
        if (start >= length) return UNSATISFIABLE;
        if (end < start) return null;
        return new long[] { start, Math.min(end, length - 1) };
    }

    /**
     * Capacitor's own WebViewClient (or the one set before this, such as the Play build's
     * AnimationPacks client), plus https://localhost/exercise-media/... from the installed media.
     */
    static final class MediaClient extends BridgeWebViewClient {
        private final Bridge bridge;
        private final BridgeWebViewClient before;
        private final File root;

        MediaClient(Bridge bridge, BridgeWebViewClient before, File root) {
            super(bridge);
            this.bridge = bridge;
            this.before = before;
            this.root = root;
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri url = request.getUrl();
            String path = url.getPath();
            if (path != null && path.startsWith(ROUTE) && bridge.getHost().equals(url.getHost())) {
                return serve(path.substring(ROUTE.length()), request.getRequestHeaders());
            }
            if (before != null) return before.shouldInterceptRequest(view, request);
            return super.shouldInterceptRequest(view, request);
        }

        private WebResourceResponse serve(String rel, Map<String, String> requestHeaders) {
            File f = inside(root, rel);
            if (f != null && f.isFile()) {
                try {
                    return found(f, requestHeaders);
                } catch (IOException ignored) {
                    // gone between the check and the read: a 404 like any other miss
                }
            }
            Map<String, String> headers = new HashMap<>();
            headers.put("Cache-Control", "no-store");
            return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", headers, new ByteArrayInputStream(new byte[0]));
        }

        private WebResourceResponse found(File f, Map<String, String> requestHeaders) throws IOException {
            String mime = mimeOf(f.getName());
            long length = f.length();
            Map<String, String> headers = new HashMap<>();
            headers.put("Cache-Control", "max-age=3600");
            headers.put("Accept-Ranges", "bytes");
            long[] range = parseRange(header(requestHeaders, "Range"), length);
            if (range == UNSATISFIABLE) {
                headers.put("Content-Range", "bytes */" + length);
                return new WebResourceResponse(mime, null, 416, "Range Not Satisfiable", headers, new ByteArrayInputStream(new byte[0]));
            }
            InputStream in = new FileInputStream(f);
            if (range == null) {
                headers.put("Content-Length", String.valueOf(length));
                return new WebResourceResponse(mime, null, 200, "OK", headers, in);
            }
            long count = range[1] - range[0] + 1;
            skipFully(in, range[0]);
            headers.put("Content-Range", "bytes " + range[0] + "-" + range[1] + "/" + length);
            headers.put("Content-Length", String.valueOf(count));
            return new WebResourceResponse(mime, null, 206, "Partial Content", headers, new Bounded(in, count));
        }

        private static String header(Map<String, String> headers, String name) {
            if (headers == null) return null;
            for (Map.Entry<String, String> e : headers.entrySet()) {
                if (name.equalsIgnoreCase(e.getKey())) return e.getValue();
            }
            return null;
        }

        private static void skipFully(InputStream in, long n) throws IOException {
            while (n > 0) {
                long s = in.skip(n);
                if (s <= 0) {
                    in.close();
                    throw new IOException("short file");
                }
                n -= s;
            }
        }
    }

    /** At most limit bytes of the stream it wraps: the body of a 206. */
    static final class Bounded extends FilterInputStream {
        private long left;

        Bounded(InputStream in, long limit) {
            super(in);
            left = limit;
        }

        @Override
        public int read() throws IOException {
            if (left <= 0) return -1;
            int b = super.read();
            if (b >= 0) left--;
            return b;
        }

        @Override
        public int read(byte[] b, int off, int len) throws IOException {
            if (left <= 0) return -1;
            int n = super.read(b, off, (int) Math.min(len, left));
            if (n > 0) left -= n;
            return n;
        }

        @Override
        public long skip(long n) throws IOException {
            long s = super.skip(Math.min(n, left));
            left -= s;
            return s;
        }

        @Override
        public int available() throws IOException {
            return (int) Math.min(super.available(), left);
        }
    }
}
