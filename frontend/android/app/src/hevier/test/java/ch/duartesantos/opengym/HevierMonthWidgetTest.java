package ch.duartesantos.opengym;

import static org.junit.Assert.*;

import org.json.JSONObject;
import org.junit.Test;

/** The month widget's colours (hevier/DECISIONS.md D44, D123). */
public class HevierMonthWidgetTest {
    @Test
    public void theDayNumberIsBlackOnALightFillAndLightOnADarkOne() {
        assertEquals(HevierMonthWidget.ON_LIGHT, HevierMonthWidget.ink(0xFF34D08A));   // the default green
        assertEquals(HevierMonthWidget.ON_LIGHT, HevierMonthWidget.ink(0xFFFF9F0A));   // deload orange
        assertEquals(HevierMonthWidget.ON_LIGHT, HevierMonthWidget.ink(0xFFA3E635));   // openGym green
        assertEquals(HevierMonthWidget.ON_LIGHT, HevierMonthWidget.ink(0xFFFF7EB6));   // pink
        assertEquals(HevierMonthWidget.ON_LIGHT, HevierMonthWidget.ink(0xFF008CFF));   // Hevy blue: 6.0:1 black, 3.3:1 light
        assertEquals(HevierMonthWidget.LABEL, HevierMonthWidget.ink(0xFF5E2CA5));      // a dark custom violet
        assertEquals(HevierMonthWidget.LABEL, HevierMonthWidget.ink(0xFF000000));
    }

    @Test
    public void coloursComeFromTheSnapshotElseTheDefault() throws Exception {
        assertArrayEquals(new int[] { HevierMonthWidget.STRENGTH, HevierMonthWidget.CARDIO, HevierMonthWidget.DELOAD }, HevierMonthWidget.palette(null));
        JSONObject c = new JSONObject("{\"strength\":\"#008cff\",\"cardio\":\"#2fbf5b\",\"deload\":\"oops\"}");
        assertArrayEquals(new int[] { 0xFF008CFF, 0xFF2FBF5B, HevierMonthWidget.DELOAD }, HevierMonthWidget.palette(c));
    }

    @Test
    public void onlyAPlainHexIsAColour() {
        assertEquals(0xFF40C8E0, HevierMonthWidget.parse("#40C8E0", 0));
        assertEquals(7, HevierMonthWidget.parse("40c8e0", 7));
        assertEquals(7, HevierMonthWidget.parse("#40c8e0ff", 7));
        assertEquals(7, HevierMonthWidget.parse(null, 7));
    }
}
