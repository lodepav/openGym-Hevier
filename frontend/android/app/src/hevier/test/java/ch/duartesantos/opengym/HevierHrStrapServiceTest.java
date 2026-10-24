package ch.duartesantos.opengym;

import static org.junit.Assert.*;

import org.junit.Test;

/** When the strap service looks for a strap out of reach (hevier/DECISIONS.md D79). */
public class HevierHrStrapServiceTest {
    @Test
    public void notInTheFirstFifteenSeconds() {
        assertFalse(HevierHrStrapService.findDue(10_000, Long.MAX_VALUE));
        assertFalse(HevierHrStrapService.findDue(15_000, Long.MAX_VALUE));
    }

    @Test
    public void everyWatchForTheFirstTwoMinutes() {
        assertTrue(HevierHrStrapService.findDue(16_000, Long.MAX_VALUE));
        assertTrue(HevierHrStrapService.findDue(90_000, 15_000));
        assertTrue(HevierHrStrapService.findDue(119_000, 15_000));
    }

    @Test
    public void thenOnceAMinute() {
        assertFalse(HevierHrStrapService.findDue(120_000, 15_000));
        assertFalse(HevierHrStrapService.findDue(600_000, 45_000));
        assertTrue(HevierHrStrapService.findDue(600_000, 60_000));
    }
}
