package ch.duartesantos.opengym;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import java.util.List;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * [hevier] Read-only: the strength signal for OpenBite (hevier/DECISIONS.md D95), at
 * content://&lt;app id&gt;.strength/current. A signature-level permission guards it in the manifest,
 * so only an app signed with this app's key gets in. One row, or none for nothing to share. Columns
 * are read by name, and more may be added.
 */
public class HevierStrengthProvider extends ContentProvider {

    private static final String[] COLUMNS = {
        "trend", "level", "muscles", "detail", "exercises_tracked", "exercises_falling", "chain_days",
        "sets_7d", "sets_week_avg", "sessions_7d", "sessions_week_avg", "phase", "phase_days",
        "last_workout_at", "updated_at",
    };

    @Override
    public boolean onCreate() {
        return true;
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        MatrixCursor out = new MatrixCursor(COLUMNS);
        List<String> path = uri.getPathSegments();
        if (path.size() != 1 || !"current".equals(path.get(0))) return out;
        String row = getContext().getSharedPreferences(HevierStrengthPlugin.PREFS, Context.MODE_PRIVATE)
            .getString(HevierStrengthPlugin.KEY, null);
        if (row == null) return out;
        try {
            JSONObject o = new JSONObject(row);
            Object[] values = new Object[COLUMNS.length];
            for (int i = 0; i < COLUMNS.length; i++) values[i] = o.isNull(COLUMNS[i]) ? null : o.get(COLUMNS[i]);
            out.addRow(values);
        } catch (JSONException e) {
            // A row that cannot be read is no row: the next save writes a good one.
        }
        return out;
    }

    @Override
    public String getType(Uri uri) {
        return null;
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        throw new UnsupportedOperationException("read-only");
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        throw new UnsupportedOperationException("read-only");
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        throw new UnsupportedOperationException("read-only");
    }
}
