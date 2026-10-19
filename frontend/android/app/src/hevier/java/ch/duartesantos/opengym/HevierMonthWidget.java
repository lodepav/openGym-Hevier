package ch.duartesantos.opengym;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.os.Bundle;
import android.util.DisplayMetrics;
import android.view.View;
import android.widget.RemoteViews;
import java.util.Calendar;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * [hevier] The home-screen month widget (hevier/DECISIONS.md D44, PLAN.md §5 item 21): this
 * month's calendar, trained days filled in the calendar's colours (strength blue, cardio green,
 * deload orange), the planned days from today on a dot in their routine's colour (D68), today
 * ringed, and the month's "N workouts · N sets". It draws from the snapshot
 * the app last handed over (HevierWidgetPlugin), never reads the log itself, and runs no code in
 * the background: it redraws when the app sends a new snapshot, when it is resized, and once after
 * midnight through an inexact alarm that does not wake the phone. A tap opens the Calendar.
 *
 * The grid is drawn into a bitmap the widget's own size, so it fills a 4×2 widget and any size it
 * is resized to.
 */
public class HevierMonthWidget extends AppWidgetProvider {

    private static final String PREFS = "hevier_widget";
    private static final String KEY = "snapshot";
    private static final String TICK = "ch.duartesantos.opengym.hevier.WIDGET_TICK";

    // The fork's dark theme (hevier/theme.css) and the calendar's colours (hevier.css).
    private static final int LABEL = 0xFFFFFFFF;
    private static final int LABEL_2 = 0xFF9A9EA7;
    private static final int LABEL_3 = 0x8C9A9EA7;
    private static final int BLUE = 0xFF008CFF;
    private static final int GREEN = 0xFF2FBF5B;
    private static final int ORANGE = 0xFFFF9F0A;

    static void save(Context ctx, String snapshot) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, snapshot).apply();
    }

    private static JSONObject load(Context ctx) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        try {
            String s = p.getString(KEY, null);
            return s == null ? null : new JSONObject(s);
        } catch (Exception e) {
            return null;
        }
    }

    /** Redraws every placed widget. */
    static void refresh(Context ctx) {
        AppWidgetManager m = AppWidgetManager.getInstance(ctx);
        int[] ids = m.getAppWidgetIds(new ComponentName(ctx, HevierMonthWidget.class));
        for (int id : ids) draw(ctx, m, id);
        if (ids.length > 0) scheduleMidnight(ctx);
    }

    @Override
    public void onUpdate(Context ctx, AppWidgetManager m, int[] ids) {
        for (int id : ids) draw(ctx, m, id);
        scheduleMidnight(ctx);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context ctx, AppWidgetManager m, int id, Bundle options) {
        draw(ctx, m, id);
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        if (TICK.equals(intent.getAction())) {
            refresh(ctx);
            return;
        }
        super.onReceive(ctx, intent);
    }

    @Override
    public void onDisabled(Context ctx) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(tickIntent(ctx));
    }

    private static PendingIntent tickIntent(Context ctx) {
        Intent i = new Intent(ctx, HevierMonthWidget.class).setAction(TICK);
        return PendingIntent.getBroadcast(ctx, 0, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    // RTC, not RTC_WAKEUP, and inexact: the day turns on the widget when the phone is next awake.
    private static void scheduleMidnight(Context ctx) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        Calendar c = Calendar.getInstance();
        c.add(Calendar.DAY_OF_MONTH, 1);
        c.set(Calendar.HOUR_OF_DAY, 0);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 30);
        c.set(Calendar.MILLISECOND, 0);
        am.set(AlarmManager.RTC, c.getTimeInMillis(), tickIntent(ctx));
    }

    private static void draw(Context ctx, AppWidgetManager m, int id) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.hevier_widget_month);
        JSONObject snap = load(ctx);
        Calendar now = Calendar.getInstance();
        int y = now.get(Calendar.YEAR), mo = now.get(Calendar.MONTH), today = now.get(Calendar.DAY_OF_MONTH);
        String key = String.format(Locale.ROOT, "%04d-%02d", y, mo + 1);

        Intent open = HevierWidgetPlugin.openIntent(ctx, "/calendar");
        PendingIntent tap = PendingIntent.getActivity(ctx, 1, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.hv_widget_root, tap);

        if (snap == null) {
            v.setTextViewText(R.id.hv_widget_month, ctx.getString(R.string.hevier_widget_name));
            v.setTextViewText(R.id.hv_widget_sum, "");
            v.setViewVisibility(R.id.hv_widget_grid, View.GONE);
            v.setViewVisibility(R.id.hv_widget_empty, View.VISIBLE);
            m.updateAppWidget(id, v);
            return;
        }
        JSONArray months = snap.optJSONArray("months");
        v.setTextViewText(R.id.hv_widget_month, months != null ? months.optString(mo, "") : "");
        JSONObject totals = snap.optJSONObject("totals");
        String sum = totals != null && totals.has(key) ? totals.optString(key) : snap.optString("empty", "");
        v.setTextViewText(R.id.hv_widget_sum, sum);
        v.setViewVisibility(R.id.hv_widget_empty, View.GONE);
        v.setViewVisibility(R.id.hv_widget_grid, View.VISIBLE);

        DisplayMetrics dm = ctx.getResources().getDisplayMetrics();
        Bundle o = m.getAppWidgetOptions(id);
        // Portrait: the width is the smallest the launcher reports and the height the largest.
        int wDp = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 250);
        int hDp = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 110);
        int w = Math.max(1, Math.round((wDp - 24) * dm.density));
        int h = Math.max(1, Math.round((hDp - 44) * dm.density));
        v.setImageViewBitmap(R.id.hv_widget_grid, grid(snap, y, mo, today, w, h, dm.density));
        m.updateAppWidget(id, v);
    }

    private static Bitmap grid(JSONObject snap, int y, int mo, int today, int w, int h, float density) {
        Bitmap b = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(b);
        int ws = snap.optInt("ws", 1);
        Calendar first = Calendar.getInstance();
        first.clear();
        first.set(y, mo, 1);
        int lead = ((first.get(Calendar.DAY_OF_WEEK) - 1) - ws + 7) % 7;
        int days = first.getActualMaximum(Calendar.DAY_OF_MONTH);
        int rows = (lead + days + 6) / 7;
        float cw = w / 7f, ch = h / (rows + 0.8f);
        float head = ch * 0.8f;
        float r = Math.min(cw, ch) * 0.44f;

        Paint text = new Paint(Paint.ANTI_ALIAS_FLAG);
        text.setTextAlign(Paint.Align.CENTER);
        text.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG);
        Paint ring = new Paint(Paint.ANTI_ALIAS_FLAG);
        ring.setStyle(Paint.Style.STROKE);
        ring.setStrokeWidth(Math.max(1.5f, 1.5f * density));

        JSONArray letters = snap.optJSONArray("days");
        text.setTextSize(Math.min(head * 0.62f, r * 0.9f));
        text.setColor(LABEL_3);
        for (int i = 0; i < 7; i++) {
            String l = letters != null ? letters.optString(i, "") : "";
            c.drawText(l, cw * i + cw / 2, head * 0.7f, text);
        }

        JSONObject kinds = snap.optJSONObject("kinds");
        JSONObject plans = snap.optJSONObject("plans");
        text.setTextSize(r * 0.95f);
        for (int d = 1; d <= days; d++) {
            int cell = lead + d - 1;
            float cx = cw * (cell % 7) + cw / 2;
            float cy = head + ch * (cell / 7) + ch / 2;
            String iso = String.format(Locale.ROOT, "%04d-%02d-%02d", y, mo + 1, d);
            String kind = kinds != null ? kinds.optString(iso, "") : "";
            int color = kindColor(kind);
            // A day that has passed since the snapshot was sent loses its dot (D68).
            int plan = color == 0 && d >= today && plans != null ? kindColor(plans.optString(iso, "")) : 0;
            if (color != 0) {
                fill.setColor(color);
                c.drawCircle(cx, cy, r, fill);
            }
            if (d == today) {
                ring.setColor(color != 0 ? LABEL : BLUE);
                c.drawCircle(cx, cy, color != 0 ? r - ring.getStrokeWidth() : r, ring);
            }
            if (plan != 0) {
                fill.setColor(plan);
                c.drawCircle(cx, cy + r * 0.62f, Math.max(1.5f * density, r * 0.12f), fill);
            }
            text.setColor(color != 0 || plan != 0 ? LABEL : d > today ? LABEL_3 : LABEL_2);
            Paint.FontMetrics fm = text.getFontMetrics();
            c.drawText(String.valueOf(d), cx, cy - (fm.ascent + fm.descent) / 2, text);
        }
        return b;
    }

    private static int kindColor(String kind) {
        return "cardio".equals(kind) ? GREEN : "deload".equals(kind) ? ORANGE : "strength".equals(kind) ? BLUE : 0;
    }
}
